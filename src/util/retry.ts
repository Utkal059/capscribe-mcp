/** Small exponential-backoff retry helper used for network/model calls. */
import { logger } from '../logger';

export interface RetryOptions {
  retries?: number;
  baseDelayMs?: number;
  label?: string;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  opts: RetryOptions = {},
): Promise<T> {
  const { retries = 2, baseDelayMs = 400, label = 'op' } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === retries) break;
      const delay = baseDelayMs * 2 ** attempt;
      logger.warn(
        { label, attempt: attempt + 1, delay, err: (err as Error)?.message },
        'retrying after failure',
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}
