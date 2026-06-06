/** Canonical hashing + Hedera explorer link helpers. */
import { createHash } from 'node:crypto';
import { config } from '../config';

/** Deterministic SHA-256 of a JSON-serialisable value (sorted keys). */
export function sha256Json(value: unknown): string {
  return createHash('sha256').update(canonical(value)).digest('hex');
}

function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonical(obj[k])}`).join(',')}}`;
}

const NET = config.HEDERA_NETWORK;

/** HashScan link for a transaction id (accepts SDK or mirror-node format). */
export function hashscanTx(txId: string): string {
  return `https://hashscan.io/${NET}/transaction/${encodeURIComponent(txId)}`;
}

/** HashScan link for a topic. */
export function hashscanTopic(topicId: string): string {
  return `https://hashscan.io/${NET}/topic/${topicId}`;
}
