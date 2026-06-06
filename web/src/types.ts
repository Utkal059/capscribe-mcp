export interface Finding {
  category: string;
  title: string;
  detail: string;
  date?: string | null;
  amount?: string | null;
}

export interface AnalysisResult {
  agentId: string;
  company: string;
  summary: string;
  findings: Finding[];
  processedAt: string;
}

export interface Reputation {
  score: number;
  runs: number;
}

export interface Agent {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: string;
  priceTinybars: string;
  priceHbar: string;
  category: string;
  inputLabel: string;
  inputPlaceholder: string;
  estModelCostUsdCents: number;
  reputation: Reputation;
}

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

export interface ReceiptLinks {
  payment: string | null;
  proofTopic: string | null;
  proofTx: string | null;
}

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

export interface RunResponse {
  receipt: PublicReceipt;
  links: ReceiptLinks;
  shareUrl: string;
}

export interface AppConfig {
  network: 'testnet' | 'mainnet';
  caip2Network: 'hedera:testnet' | 'hedera:mainnet';
  walletConnectProjectId: string | null;
  demoEnabled: boolean;
  feePayer: string;
}

export interface Analytics {
  totalRuns: number;
  totalAgents: number;
  hbarVolumeTinybars: string;
  byAgent: { agentId: string; runs: number; avgDurationMs: number }[];
  recentRuns: { id: string; agentId: string; createdAt: string }[];
}
