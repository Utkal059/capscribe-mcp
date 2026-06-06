/** Structured logging via pino, pretty in dev and JSON in production. */
import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.LOG_LEVEL,
  transport: config.isProd
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'SYS:HH:MM:ss' },
      },
  redact: {
    paths: ['req.headers["x-payment"]', 'HEDERA_PRIVATE_KEY', 'ANTHROPIC_API_KEY'],
    censor: '[redacted]',
  },
});
