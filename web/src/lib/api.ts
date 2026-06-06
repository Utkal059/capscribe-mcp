import type {
  Agent,
  Analytics,
  AppConfig,
  PaymentRequirements,
  PublicReceipt,
  ReceiptLinks,
  RunResponse,
} from '../types';

async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed (${res.status})`;
    try {
      const body = (await res.json()) as { error?: string };
      if (body.error) message = body.error;
    } catch {
      /* non-JSON error */
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export async function getConfig(): Promise<AppConfig> {
  return json(await fetch('/api/config'));
}

export async function getAgents(): Promise<{ agents: Agent[]; network: string }> {
  return json(await fetch('/api/agents'));
}

export async function preparePayment(
  agentId: string,
  account: string,
): Promise<{ paymentRequirements: PaymentRequirements; transactionBytes: string }> {
  return json(
    await fetch('/api/payment/prepare', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ agentId, account }),
    }),
  );
}

export interface RunArgs {
  agentId: string;
  input: string;
  company?: string;
  account?: string;
  /** base64-encoded x402 PaymentPayload for the X-PAYMENT header. */
  paymentHeader?: string;
  demo?: boolean;
}

export async function runAgent(args: RunArgs): Promise<RunResponse> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (args.paymentHeader) headers['x-payment'] = args.paymentHeader;
  return json(
    await fetch(`/api/agents/${args.agentId}/run`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        input: args.input,
        company: args.company,
        account: args.account,
        demo: args.demo,
      }),
    }),
  );
}

export async function getReceipt(
  id: string,
): Promise<{ receipt: PublicReceipt; links: ReceiptLinks }> {
  return json(await fetch(`/api/receipts/${id}`));
}

export async function getHistory(
  payer?: string,
): Promise<{ receipts: (PublicReceipt & { links: ReceiptLinks })[] }> {
  const q = payer ? `?payer=${encodeURIComponent(payer)}` : '';
  return json(await fetch(`/api/receipts${q}`));
}

export async function getAnalytics(): Promise<Analytics> {
  return json(await fetch('/api/analytics'));
}
