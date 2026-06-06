import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { promises as fs } from 'node:fs';
import { saveReceipt, getReceipt, listReceipts, analytics, toPublicReceipt } from '../src/store';
import type { Receipt } from '../src/types';

function makeReceipt(id: string, payer: string): Receipt {
  return {
    id,
    agentId: 'risk-scan',
    agentName: 'DRHP Risk & Red-Flags',
    company: 'TestCo',
    payer,
    paymentTxId: `0.0.7162784@${id}`,
    priceTinybars: '50000000',
    resultHash: 'a'.repeat(64),
    proofTopicId: '0.0.5005',
    proofTxId: `0.0.1001@${id}`,
    proofSequence: null,
    result: {
      agentId: 'risk-scan',
      company: 'TestCo',
      summary: 'ok',
      findings: [{ category: 'HIGH', title: 't', detail: 'd' }],
      processedAt: new Date().toISOString(),
    },
    durationMs: 1234,
    demo: false,
    createdAt: new Date().toISOString(),
  };
}

describe('receipt store', () => {
  beforeAll(async () => {
    await fs.rm('.data-test', { recursive: true, force: true });
  });
  afterAll(async () => {
    await fs.rm('.data-test', { recursive: true, force: true });
  });

  it('saves and retrieves a receipt', async () => {
    await saveReceipt(makeReceipt('r1', '0.0.2002'));
    const got = await getReceipt('r1');
    expect(got?.agentId).toBe('risk-scan');
    expect(await getReceipt('missing')).toBeUndefined();
  });

  it('filters history by payer', async () => {
    await saveReceipt(makeReceipt('r2', '0.0.3003'));
    expect((await listReceipts('0.0.3003')).length).toBe(1);
    expect((await listReceipts()).length).toBeGreaterThanOrEqual(2);
  });

  it('aggregates analytics', async () => {
    const a = await analytics();
    expect(a.totalRuns).toBeGreaterThanOrEqual(2);
    expect(BigInt(a.hbarVolumeTinybars) >= 100000000n).toBe(true);
    expect(a.byAgent.find((x) => x.agentId === 'risk-scan')?.runs).toBeGreaterThanOrEqual(2);
  });

  it('produces a privacy-trimmed public receipt', () => {
    const pub = toPublicReceipt(makeReceipt('r3', '0.0.4004'));
    expect(pub).not.toHaveProperty('payer');
    expect(pub).not.toHaveProperty('durationMs');
    expect(pub.id).toBe('r3');
  });
});
