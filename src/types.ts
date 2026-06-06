/**
 * Shared domain types for CapScribe.
 *
 * CapScribe is a pay-to-run AI agent marketplace on Hedera. A user pays in HBAR
 * via the x402 payment standard; settlement automatically triggers agent
 * execution, and a proof-of-completion is written to the Hedera Consensus
 * Service (HCS) through the Hedera Agent Kit.
 */

/**
 * A single structured finding produced by an agent. Generic enough to model a
 * DRHP capital event (category = event type), a risk factor (category =
 * severity), or any other structured insight, so the marketplace can host
 * multiple agents that share one rendering surface.
 */
export interface Finding {
  /** Short tag, e.g. "BONUS", "HIGH", "GOVERNANCE". */
  category: string;
  title: string;
  detail: string;
  date?: string | null;
  amount?: string | null;
}

/** Result returned by any CapScribe agent run. */
export interface AnalysisResult {
  agentId: string;
  company: string;
  summary: string;
  findings: Finding[];
  processedAt: string;
}

/** x402 payment requirements advertised by the resource server. */
export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  resource?: string;
  description?: string;
  mimeType?: string;
  extra?: Record<string, unknown>;
}

/** x402 PaymentPayload as expected by the facilitator (v2). */
export interface PaymentPayload {
  x402Version: number;
  accepted: PaymentRequirements;
  payload: { transaction: string };
  resource?: Record<string, unknown>;
  extensions?: Record<string, unknown>;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason?: string;
  invalidMessage?: string;
}

export interface SettleResponse {
  success: boolean;
  transaction?: string;
  errorReason?: string;
  errorMessage?: string;
}

/** Marketplace agent catalog entry. */
export interface AgentDefinition {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  /** Price in tinybars (1 HBAR = 100_000_000 tinybars). */
  priceTinybars: string;
  category: string;
  inputLabel: string;
  inputPlaceholder: string;
  /** Average model cost in USD cents, surfaced in the cost-breakdown UI. */
  estModelCostUsdCents: number;
}

/** Persisted record of a completed, paid agent run. */
export interface Receipt {
  id: string;
  agentId: string;
  agentName: string;
  company: string | null;
  payer: string | null;
  /** Hedera transaction id of the settled x402 payment. */
  paymentTxId: string;
  priceTinybars: string;
  /** SHA-256 of the canonical result JSON. */
  resultHash: string;
  /** HCS topic the proof was written to. */
  proofTopicId: string | null;
  /** Hedera transaction id of the HCS proof message. */
  proofTxId: string | null;
  /** Sequence number of the HCS proof message. */
  proofSequence: number | null;
  result: AnalysisResult;
  durationMs: number;
  demo: boolean;
  createdAt: string;
}

/** Public, privacy-trimmed view of a receipt for shareable links. */
export interface PublicReceipt {
  id: string;
  agentId: string;
  agentName: string;
  company: string | null;
  paymentTxId: string;
  resultHash: string;
  proofTopicId: string | null;
  proofTxId: string | null;
  proofSequence: number | null;
  result: AnalysisResult;
  createdAt: string;
  demo: boolean;
}
