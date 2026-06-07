/**
 * Environment configuration with runtime validation.
 *
 * All process.env access goes through here so a misconfigured deployment fails
 * fast and loudly at boot instead of deep inside a request handler.
 */
import 'dotenv/config';
import { z } from 'zod';

const hederaId = z
  .string()
  .regex(/^\d+\.\d+\.\d+$/, 'must be a Hedera entity id like 0.0.12345');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3001),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace'])
    .default('info'),

  HEDERA_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
  HEDERA_ACCOUNT_ID: hederaId,
  HEDERA_PRIVATE_KEY: z.string().min(1, 'HEDERA_PRIVATE_KEY is required'),

  /** Account that receives the x402 payment. Defaults to the operator. */
  PAYMENT_RECEIVER: hederaId.optional(),
  /** Facilitator fee-payer account (pays Hedera fees, submits the tx). */
  FEE_PAYER: hederaId.default('0.0.7162784'),
  FACILITATOR_URL: z
    .string()
    .url()
    .default('https://api.testnet.blocky402.com'),

  /** Optional pre-created HCS topic for proofs. Auto-created if omitted. */
  HCS_TOPIC_ID: hederaId.optional(),

  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().default('claude-sonnet-4-6'),

  /** WalletConnect / Reown project id, exposed to the browser. */
  WALLETCONNECT_PROJECT_ID: z.string().optional(),

  /** Allow a wallet-free path for demos. Never enable on mainnet. */
  DEMO_BYPASS: z
    .enum(['true', 'false'])
    .default('false')
    .transform((v) => v === 'true'),

  /** Absolute or relative path for the JSON receipt store. */
  DATA_DIR: z.string().default('.data'),
});

// Treat empty-string env vars (common in template .env files) as unset so
// optional fields fall back to their defaults instead of failing validation.
const cleanedEnv = Object.fromEntries(
  Object.entries(process.env)
    .filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    .map(([k, v]) => [k, (v as string).trim()]),
);

const parsed = schema.safeParse(cleanedEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  - ${i.path.join('.') || '(root)'}: ${i.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`\nInvalid environment configuration:\n${issues}\n`);
  process.exit(1);
}

const env = parsed.data;

export const config = {
  ...env,
  paymentReceiver: env.PAYMENT_RECEIVER ?? env.HEDERA_ACCOUNT_ID,
  caip2Network: `hedera:${env.HEDERA_NETWORK}` as
    | 'hedera:testnet'
    | 'hedera:mainnet',
  isProd: env.NODE_ENV === 'production',
} as const;

export type AppConfig = typeof config;
