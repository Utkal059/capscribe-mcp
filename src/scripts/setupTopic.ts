/**
 * One-time setup: provision the HCS proof topic via the Hedera Agent Kit and
 * print its id. Optional — the server auto-provisions on first run — but handy
 * for pinning HCS_TOPIC_ID in your environment.
 *
 *   npm run setup:topic
 */
import { ensureProofTopic } from '../hedera/agentKit';
import { logger } from '../logger';

ensureProofTopic()
  .then((topicId) => {
    logger.info({ topicId }, 'proof topic ready');
    // eslint-disable-next-line no-console
    console.log(`\nHCS_TOPIC_ID=${topicId}\n`);
    process.exit(0);
  })
  .catch((err) => {
    logger.error({ err }, 'failed to create proof topic');
    process.exit(1);
  });
