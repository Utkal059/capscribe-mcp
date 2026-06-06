import { describe, it, expect } from 'vitest';
import { Transaction, TransferTransaction, Hbar } from '@hashgraph/sdk';
import { requirementsFor, buildTransferBytes } from '../src/hedera/paymentBuild';

describe('x402 payment build', () => {
  it('produces requirements matching the agent price', () => {
    const req = requirementsFor('capital-events');
    expect(req.scheme).toBe('exact');
    expect(req.network).toBe('hedera:testnet');
    expect(req.amount).toBe('50000000');
    expect(req.payTo).toBe('0.0.1001');
    expect(req.asset).toBe('0.0.0');
    expect(req.extra?.feePayer).toBe('0.0.7162784');
  });

  it('throws for an unknown agent', () => {
    expect(() => requirementsFor('nope')).toThrow();
  });

  it('builds a frozen transfer that debits payer and credits payTo', () => {
    const req = requirementsFor('capital-events');
    const b64 = buildTransferBytes(req, '0.0.2002');
    expect(b64.length).toBeGreaterThan(0);

    const tx = Transaction.fromBytes(Buffer.from(b64, 'base64'));
    expect(tx).toBeInstanceOf(TransferTransaction);

    const transfers = (tx as TransferTransaction).hbarTransfers;
    const amount = BigInt(req.amount);
    const payer = transfers.get('0.0.2002');
    const payee = transfers.get(req.payTo);
    expect(payer?.toTinybars().toString()).toBe((-amount).toString());
    expect(payee?.toTinybars().toString()).toBe(amount.toString());
  });

  it('rejects a zero amount', () => {
    const req = { ...requirementsFor('capital-events'), amount: '0' };
    expect(() => buildTransferBytes(req, '0.0.2002')).toThrow();
  });

  it('keeps Hbar tinybar math exact', () => {
    expect(Hbar.fromTinybars('50000000').toTinybars().toString()).toBe('50000000');
  });
});
