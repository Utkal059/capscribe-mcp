/**
 * Builds the x402 payment requirements and the partially-unsigned transfer
 * transaction the browser wallet (HashPack) will sign.
 *
 * The transaction shape exactly mirrors @x402/hedera's reference client signer:
 * a TransferTransaction that debits the payer and credits `payTo`, whose
 * transaction-id (and therefore fee payer) belongs to the facilitator's
 * `feePayer` account. The facilitator later adds its fee-payer signature and
 * submits the transaction, so the user only ever authorises the transfer — they
 * never pay network fees and their funds cannot move without their signature.
 */
import {
  AccountId,
  Hbar,
  TransferTransaction,
  TransactionId,
} from '@hashgraph/sdk';
import { config } from '../config';
import { networkClient } from './client';
import { getAgent } from '../agents/registry';
import type { PaymentRequirements } from '../types';

const HBAR_ASSET_ID = '0.0.0';

/** Payment requirements for a given marketplace agent. */
export function requirementsFor(agentId: string): PaymentRequirements {
  const agent = getAgent(agentId);
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);
  return {
    scheme: 'exact',
    network: config.caip2Network,
    amount: agent.priceTinybars,
    payTo: config.paymentReceiver,
    maxTimeoutSeconds: 300,
    asset: HBAR_ASSET_ID,
    resource: `capscribe:agent:${agentId}`,
    description: `CapScribe — ${agent.name}`,
    mimeType: 'application/json',
    extra: { feePayer: config.FEE_PAYER },
  };
}

/**
 * Build the frozen, unsigned transfer for a payer. Returned as base64 SDK bytes
 * that the browser deserialises, signs via the wallet, and re-serialises.
 */
export function buildTransferBytes(
  requirements: PaymentRequirements,
  payer: string,
): string {
  const amount = BigInt(requirements.amount);
  if (amount <= 0n) throw new Error('amount must be greater than zero');

  const payerId = AccountId.fromString(payer);
  const payToId = AccountId.fromString(requirements.payTo);
  const feePayer = requirements.extra?.feePayer;
  if (typeof feePayer !== 'string') {
    throw new Error('feePayer missing from payment requirements');
  }

  const tx = new TransferTransaction()
    .addHbarTransfer(payerId, Hbar.fromTinybars((-amount).toString()))
    .addHbarTransfer(payToId, Hbar.fromTinybars(amount.toString()))
    .setTransactionId(TransactionId.generate(AccountId.fromString(feePayer)))
    .setTransactionMemo('x402 payment · CapScribe');

  const client = networkClient();
  try {
    tx.freezeWith(client);
    return Buffer.from(tx.toBytes()).toString('base64');
  } finally {
    client.close();
  }
}
