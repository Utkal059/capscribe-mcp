/**
 * Receipt persistence — an append-only JSON-file store.
 *
 * A plain-file store (rather than Postgres/SQLite) keeps the service single-
 * binary and dependency-light, so it deploys anywhere with a writable disk and
 * needs no native modules. Receipts are immutable, so a serialized write queue
 * is enough to keep the file consistent under concurrency.
 */
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from './config';
import { logger } from './logger';
import type { Receipt, PublicReceipt } from './types';

const FILE = path.resolve(config.DATA_DIR, 'receipts.json');

let cache: Receipt[] | null = null;
let writeChain: Promise<void> = Promise.resolve();

async function load(): Promise<Receipt[]> {
  if (cache) return cache;
  try {
    cache = JSON.parse(await fs.readFile(FILE, 'utf8')) as Receipt[];
  } catch {
    cache = [];
  }
  return cache;
}

async function persist(): Promise<void> {
  const data = JSON.stringify(cache ?? [], null, 2);
  await fs.mkdir(config.DATA_DIR, { recursive: true });
  await fs.writeFile(FILE, data);
}

export async function saveReceipt(receipt: Receipt): Promise<void> {
  const list = await load();
  list.unshift(receipt);
  writeChain = writeChain.then(persist).catch((err) => {
    logger.error({ err }, 'failed to persist receipt');
  });
  await writeChain;
}

export async function getReceipt(id: string): Promise<Receipt | undefined> {
  return (await load()).find((r) => r.id === id);
}

export async function listReceipts(payer?: string, limit = 50): Promise<Receipt[]> {
  const list = await load();
  const filtered = payer ? list.filter((r) => r.payer === payer) : list;
  return filtered.slice(0, limit);
}

/** Privacy-trimmed projection for shareable public links. */
export function toPublicReceipt(r: Receipt): PublicReceipt {
  return {
    id: r.id,
    agentId: r.agentId,
    agentName: r.agentName,
    company: r.company,
    paymentTxId: r.paymentTxId,
    resultHash: r.resultHash,
    proofTopicId: r.proofTopicId,
    proofTxId: r.proofTxId,
    proofSequence: r.proofSequence,
    result: r.result,
    createdAt: r.createdAt,
    demo: r.demo,
  };
}

export interface Analytics {
  totalRuns: number;
  totalAgents: number;
  hbarVolumeTinybars: string;
  byAgent: { agentId: string; runs: number; avgDurationMs: number }[];
  recentRuns: { id: string; agentId: string; createdAt: string }[];
}

export async function analytics(): Promise<Analytics> {
  const list = await load();
  const byAgentMap = new Map<string, { runs: number; totalMs: number }>();
  let volume = 0n;
  for (const r of list) {
    volume += BigInt(r.priceTinybars);
    const a = byAgentMap.get(r.agentId) ?? { runs: 0, totalMs: 0 };
    a.runs += 1;
    a.totalMs += r.durationMs;
    byAgentMap.set(r.agentId, a);
  }
  return {
    totalRuns: list.length,
    totalAgents: byAgentMap.size,
    hbarVolumeTinybars: volume.toString(),
    byAgent: [...byAgentMap.entries()].map(([agentId, v]) => ({
      agentId,
      runs: v.runs,
      avgDurationMs: Math.round(v.totalMs / v.runs),
    })),
    recentRuns: list.slice(0, 10).map((r) => ({
      id: r.id,
      agentId: r.agentId,
      createdAt: r.createdAt,
    })),
  };
}
