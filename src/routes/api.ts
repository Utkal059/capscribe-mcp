/** CapScribe HTTP API: marketplace, x402 payment prep, paid execution, proofs. */
import { Router, type Request, type Response } from 'express';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { config } from '../config';
import { logger } from '../logger';
import { AGENTS, getAgent, tinybarsToHbar } from '../agents/registry';
import { runAgent } from '../agents/engine';
import { requirementsFor, buildTransferBytes } from '../hedera/paymentBuild';
import { verifyAndSettle, PaymentError } from '../hedera/paymentGate';
import { publishProof } from '../hedera/agentKit';
import { asyncHandler } from '../middleware/error';
import { runLimiter } from '../middleware/rateLimit';
import { saveReceipt, getReceipt, listReceipts, toPublicReceipt, analytics } from '../store';
import { sha256Json, hashscanTx, hashscanTopic } from '../util/hash';
import type { PaymentPayload, Receipt } from '../types';

const hederaId = z.string().regex(/^\d+\.\d+\.\d+$/, 'expected a Hedera id like 0.0.123');

/** Coerce an Express 5 route param (string | string[]) to a single string. */
function pathParam(req: Request, key: string): string {
  const v = req.params[key];
  return Array.isArray(v) ? (v[0] ?? '') : (v ?? '');
}

export const api = Router();

/** Public runtime config the browser needs (no secrets). */
api.get('/config', (_req: Request, res: Response) => {
  res.json({
    network: config.HEDERA_NETWORK,
    caip2Network: config.caip2Network,
    walletConnectProjectId: config.WALLETCONNECT_PROJECT_ID ?? null,
    demoEnabled: config.DEMO_BYPASS && !config.isProd,
    feePayer: config.FEE_PAYER,
  });
});

/** Reputation derived deterministically from real usage. */
async function reputationFor(agentId: string): Promise<{ score: number; runs: number }> {
  const runs = (await listReceipts(undefined, 10_000)).filter((r) => r.agentId === agentId).length;
  const score = Math.min(5, Number((4.6 + runs * 0.01).toFixed(2)));
  return { score, runs };
}

api.get(
  '/agents',
  asyncHandler(async (_req: Request, res: Response) => {
    const agents = await Promise.all(
      AGENTS.map(async (a) => ({
        ...a,
        priceHbar: tinybarsToHbar(a.priceTinybars),
        reputation: await reputationFor(a.id),
      })),
    );
    res.json({ agents, network: config.HEDERA_NETWORK });
  }),
);

api.get(
  '/agents/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const agent = getAgent(pathParam(req, 'id'));
    if (!agent) return res.status(404).json({ error: 'Agent not found' });
    res.json({
      ...agent,
      priceHbar: tinybarsToHbar(agent.priceTinybars),
      reputation: await reputationFor(agent.id),
      paymentRequirements: requirementsFor(agent.id),
    });
    return undefined;
  }),
);

const prepareSchema = z.object({ agentId: z.string(), account: hederaId });

/** Build the x402 requirements + frozen transfer bytes for the wallet to sign. */
api.post(
  '/payment/prepare',
  asyncHandler(async (req: Request, res: Response) => {
    const { agentId, account } = prepareSchema.parse(req.body);
    if (!getAgent(agentId)) return res.status(404).json({ error: 'Agent not found' });
    const requirements = requirementsFor(agentId);
    if (account === requirements.payTo) {
      return res.status(400).json({
        error:
          'Self-payment not allowed: your connected wallet is the same account as the payment receiver. Connect a different wallet to pay, or configure PAYMENT_RECEIVER as a separate account.',
      });
    }
    const transactionBytes = buildTransferBytes(requirements, account);
    res.json({
      paymentRequirements: requirements,
      transactionBytes,
      walletConnectProjectId: config.WALLETCONNECT_PROJECT_ID ?? null,
    });
    return undefined;
  }),
);

const runSchema = z.object({
  input: z.string().min(1).optional(),
  drhpUrl: z.string().url().optional(),
  drhpText: z.string().min(1).optional(),
  company: z.string().max(200).optional(),
  account: hederaId.optional(),
  demo: z.boolean().optional(),
});

function decodePaymentHeader(header: string): PaymentPayload {
  const json = Buffer.from(header, 'base64').toString('utf8');
  return JSON.parse(json) as PaymentPayload;
}

/** The core pay-to-run endpoint: settle x402, execute the agent, anchor proof. */
api.post(
  '/agents/:id/run',
  runLimiter,
  asyncHandler(async (req: Request, res: Response) => {
    const agent = getAgent(pathParam(req, 'id'));
    if (!agent) return res.status(404).json({ error: 'Agent not found' });

    const body = runSchema.parse(req.body ?? {});
    const input = body.input ?? body.drhpUrl ?? body.drhpText;
    if (!input) {
      return res.status(400).json({ error: 'Provide `input` (DRHP text or a public URL).' });
    }

    const requirements = requirementsFor(agent.id);
    const xPayment = req.header('x-payment');
    const demoAllowed = config.DEMO_BYPASS && !config.isProd;
    const demo = demoAllowed && (body.demo === true || !xPayment);

    let paymentTxId: string;
    let payer: string | null = body.account ?? null;

    if (demo) {
      paymentTxId = `demo-${nanoid(10)}`;
      logger.warn('DEMO mode: skipping x402 settlement for this run');
    } else {
      if (!xPayment) {
        return res.status(402).json({ x402Version: 2, paymentRequirements: requirements });
      }
      const payload = decodePaymentHeader(xPayment);
      // Guard against under-payment / wrong recipient before settling.
      if (
        payload.accepted?.amount !== requirements.amount ||
        payload.accepted?.payTo !== requirements.payTo
      ) {
        throw new PaymentError('Payment terms do not match the agent price.');
      }
      const outcome = await verifyAndSettle(payload, requirements);
      paymentTxId = outcome.paymentTxId;
    }

    const startedAt = Date.now();
    const result = await runAgent(agent.id, input, body.company);
    const durationMs = Date.now() - startedAt;
    const resultHash = sha256Json(result);

    // Proof-of-completion is best-effort: a successful paid run is never failed
    // by an HCS hiccup, but we record whatever anchoring we achieved.
    let proofTopicId: string | null = null;
    let proofTxId: string | null = null;
    try {
      const proof = await publishProof({
        agent: agent.id,
        company: result.company,
        payer,
        paymentTxId,
        resultHash,
        findings: result.findings.length,
      });
      proofTopicId = proof.topicId;
      proofTxId = proof.proofTxId;
    } catch (err) {
      logger.error({ err }, 'HCS proof publication failed (run still delivered)');
    }

    const receipt: Receipt = {
      id: nanoid(12),
      agentId: agent.id,
      agentName: agent.name,
      company: result.company,
      payer,
      paymentTxId,
      priceTinybars: requirements.amount,
      resultHash,
      proofTopicId,
      proofTxId,
      proofSequence: null,
      result,
      durationMs,
      demo,
      createdAt: new Date().toISOString(),
    };
    await saveReceipt(receipt);

    res.json({
      receipt: toPublicReceipt(receipt),
      links: buildLinks(receipt),
      shareUrl: `/r/${receipt.id}`,
    });
    return undefined;
  }),
);

function buildLinks(r: Receipt) {
  return {
    payment: r.demo ? null : hashscanTx(r.paymentTxId),
    proofTopic: r.proofTopicId ? hashscanTopic(r.proofTopicId) : null,
    proofTx: r.proofTxId ? hashscanTx(r.proofTxId) : null,
  };
}

api.get(
  '/receipts',
  asyncHandler(async (req: Request, res: Response) => {
    const payer = typeof req.query.payer === 'string' ? req.query.payer : undefined;
    const list = await listReceipts(payer);
    res.json({ receipts: list.map((r) => ({ ...toPublicReceipt(r), links: buildLinks(r) })) });
  }),
);

api.get(
  '/receipts/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const r = await getReceipt(pathParam(req, 'id'));
    if (!r) return res.status(404).json({ error: 'Receipt not found' });
    res.json({ receipt: toPublicReceipt(r), links: buildLinks(r) });
    return undefined;
  }),
);

api.get(
  '/analytics',
  asyncHandler(async (_req: Request, res: Response) => {
    res.json(await analytics());
  }),
);
