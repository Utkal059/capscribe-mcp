/** Assemble the x402 PaymentPayload header from a wallet-signed transfer. */
import { base64Utf8 } from './base64';
import type { PaymentRequirements } from '../types';

/**
 * Build the value for the `X-PAYMENT` header: a base64-encoded x402 v2
 * PaymentPayload carrying the signed transfer the facilitator will settle.
 */
export function buildPaymentHeader(
  requirements: PaymentRequirements,
  signedTransactionBase64: string,
): string {
  const payload = {
    x402Version: 2,
    accepted: requirements,
    payload: { transaction: signedTransactionBase64 },
  };
  return base64Utf8(JSON.stringify(payload));
}
