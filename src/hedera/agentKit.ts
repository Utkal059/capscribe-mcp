/**
 * Proof-of-completion via the **Hedera Agent Kit**.
 *
 * This is the bounty's required Agent Kit integration. We instantiate the
 * Agent Kit's LangChain toolkit with the core Consensus plugin in AUTONOMOUS
 * mode and drive its `create_topic_tool` / `submit_topic_message_tool` to:
 *   1. provision a dedicated HCS topic for CapScribe receipts (once), and
 *   2. publish a signed, on-chain proof for every paid agent run.
 *
 * The proof message contains the agent id, payer, payment tx id and a SHA-256
 * hash of the result — a tamper-evident audit trail anchored on Hedera.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import {
  HederaLangchainToolkit,
  AgentMode,
  coreConsensusPlugin,
  coreConsensusPluginToolNames,
} from 'hedera-agent-kit';
import { operatorClient } from './client';
import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../util/retry';

const { CREATE_TOPIC_TOOL, SUBMIT_TOPIC_MESSAGE_TOOL } = coreConsensusPluginToolNames;

interface ToolLike {
  name: string;
  invoke: (input: Record<string, unknown>) => Promise<unknown>;
}

let toolkit: HederaLangchainToolkit | null = null;

function getTools(): ToolLike[] {
  if (!toolkit) {
    toolkit = new HederaLangchainToolkit({
      // hedera-agent-kit bundles its own @hashgraph/sdk copy; the Client shape
      // is identical at runtime, so we bridge the duplicated nominal types.
      client: operatorClient() as unknown as ConstructorParameters<
        typeof HederaLangchainToolkit
      >[0]['client'],
      configuration: {
        plugins: [coreConsensusPlugin],
        context: {
          mode: AgentMode.AUTONOMOUS,
          accountId: config.HEDERA_ACCOUNT_ID,
        },
      },
    });
  }
  return toolkit.getTools() as unknown as ToolLike[];
}

function tool(name: string): ToolLike {
  const t = getTools().find((x) => x.name === name);
  if (!t) throw new Error(`Agent Kit tool not found: ${name}`);
  return t;
}

/** Parse a tool's stringified `{ raw, humanMessage }` response. */
function parseToolResult(result: unknown): {
  status?: string;
  transactionId?: string;
  topicId?: string | null;
  text: string;
} {
  const text = typeof result === 'string' ? result : JSON.stringify(result);
  try {
    const obj = JSON.parse(text) as { raw?: Record<string, unknown> };
    const raw = obj.raw ?? {};
    return {
      status: typeof raw.status === 'string' ? raw.status : undefined,
      transactionId:
        typeof raw.transactionId === 'string' ? raw.transactionId : undefined,
      topicId: entityIdToString(raw.topicId),
      text,
    };
  } catch {
    return { text };
  }
}

/** Coerce a Hedera entity id from a string or a serialized SDK object. */
function entityIdToString(v: unknown): string | null {
  if (!v) return null;
  if (typeof v === 'string') return v;
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>;
    const part = (x: unknown): string =>
      typeof x === 'object' && x !== null && 'low' in (x as object)
        ? String((x as { low: number }).low)
        : String(x ?? 0);
    if ('num' in o) return `${part(o.shard)}.${part(o.realm)}.${part(o.num)}`;
  }
  return null;
}

const topicCachePath = () => path.resolve(config.DATA_DIR, 'topic.json');

/** Resolve the proof topic id, creating it via the Agent Kit if needed. */
export async function ensureProofTopic(): Promise<string> {
  if (config.HCS_TOPIC_ID) return config.HCS_TOPIC_ID;

  try {
    const cached = JSON.parse(await fs.readFile(topicCachePath(), 'utf8')) as {
      topicId?: string;
    };
    if (cached.topicId) return cached.topicId;
  } catch {
    /* no cache yet */
  }

  logger.info('creating HCS proof topic via Hedera Agent Kit…');
  const result = parseToolResult(
    await withRetry(
      () =>
        tool(CREATE_TOPIC_TOOL).invoke({
          topicMemo: 'CapScribe · x402 agent proof-of-completion receipts',
          isSubmitKey: false,
        }),
      { label: 'agentkit-create-topic', retries: 1 },
    ),
  );

  if (!result.topicId) {
    throw new Error(`Could not determine created topic id from: ${result.text.slice(0, 400)}`);
  }

  await fs.mkdir(config.DATA_DIR, { recursive: true });
  await fs.writeFile(topicCachePath(), JSON.stringify({ topicId: result.topicId }, null, 2));
  logger.info({ topicId: result.topicId }, 'HCS proof topic ready');
  return result.topicId;
}

export interface ProofResult {
  topicId: string;
  proofTxId: string | null;
}

/** Publish a proof-of-completion message to HCS via the Agent Kit. */
export async function publishProof(message: object): Promise<ProofResult> {
  const topicId = await ensureProofTopic();
  const payload = JSON.stringify({
    type: 'capscribe.proof.v1',
    ...message,
    at: new Date().toISOString(),
  });

  const result = parseToolResult(
    await withRetry(
      () =>
        tool(SUBMIT_TOPIC_MESSAGE_TOOL).invoke({ topicId, message: payload }),
      { label: 'agentkit-submit-message', retries: 1 },
    ),
  );

  logger.info(
    { topicId, proofTxId: result.transactionId, status: result.status },
    'HCS proof published',
  );
  return { topicId, proofTxId: result.transactionId ?? null };
}
