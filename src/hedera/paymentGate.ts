/**
 * x402 verify + settle against the blocky402 facilitator.
 *
 * `verify` checks the payer's signed transfer is valid for the advertised
 * requirements; `settle` adds the facilitator fee-payer signature and submits
 * it to Hedera, returning the on-chain transaction id. Execution of the paid
 * work only proceeds once settlement succeeds.
 */
import { config } from '../config';
import { logger } from '../logger';
import { withRetry } from '../util/retry';
import type {
  PaymentPayload,
  PaymentRequirements,
  SettleResponse,
  VerifyResponse,
} from '../types';

async function facilitatorPost<T>(path: string, body: unknown): Promise<T> {
  const res = await withRetry(
    () =>
      fetch(`${config.FACILITATOR_URL}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(30_000),
      }),
    { label: `facilitator${path}`, retries: 2 },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Facilitator ${path} returned HTTP ${res.status}: ${text.slice(0, 300)}`);
  }
  return (await res.json()) as T;
}

export interface SettlementOutcome {
  paymentTxId: string;
}

/** Verify and settle an x402 payment, returning the settled Hedera tx id. */
export async function verifyAndSettle(
  paymentPayload: PaymentPayload,
  requirements: PaymentRequirements,
): Promise<SettlementOutcome> {
  const body = {
    x402Version: 2,
    paymentPayload,
    paymentRequirements: requirements,
  };

  const verify = await facilitatorPost<VerifyResponse>('/verify', body);
  if (!verify.isValid) {
    throw new PaymentError(
      `Payment verification failed: ${verify.invalidReason ?? verify.invalidMessage ?? 'unknown'}`,
    );
  }
  logger.info('x402 payment verified');

  const settle = await facilitatorPost<SettleResponse>('/settle', body);
  if (!settle.success || !settle.transaction) {
    throw new PaymentError(
      `Settlement failed: ${settle.errorReason ?? settle.errorMessage ?? 'unknown'}`,
    );
  }
  logger.info({ paymentTxId: settle.transaction }, 'x402 payment settled');

  return { paymentTxId: settle.transaction };
}

/** Raised for buyer-facing payment failures (mapped to HTTP 402). */
export class PaymentError extends Error {
  readonly status = 402;
  constructor(message: string) {
    super(message);
    this.name = 'PaymentError';
  }
}
