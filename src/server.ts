/** CapScribe server: static SPA + x402-gated agent marketplace API. */
import path from 'node:path';
import { promises as fs } from 'node:fs';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { config } from './config';
import { logger } from './logger';
import { api } from './routes/api';
import { apiLimiter } from './middleware/rateLimit';
import { errorHandler } from './middleware/error';

const app = express();

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  // Allow embedding inside wallet in-app browsers (e.g. HashPack's DAPPS tab).
  // X-Frame-Options has no "allow-all" value, so we omit it and use CSP
  // frame-ancestors instead, which permits framing by any origin.
  next();
});

app.use(cors());
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', network: config.HEDERA_NETWORK, time: new Date().toISOString() });
});

app.use('/api', apiLimiter, api);

// Serve the built frontend, with SPA fallback so /r/:id deep links resolve.
const webDist = path.resolve(__dirname, '../web/dist');
const indexHtml = path.join(webDist, 'index.html');

app.use(express.static(webDist));

app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
  fs.access(indexHtml)
    .then(() => res.sendFile(indexHtml))
    .catch(() =>
      res
        .status(200)
        .type('text/plain')
        .send('CapScribe API is running. Build the frontend with `npm run build:web`.'),
    );
});

app.use(errorHandler);

const server = app.listen(config.PORT, () => {
  logger.info(
    { port: config.PORT, network: config.HEDERA_NETWORK, demo: config.DEMO_BYPASS },
    `CapScribe → http://localhost:${config.PORT}`,
  );
});

const shutdown = (signal: string) => {
  logger.info({ signal }, 'shutting down');
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
};
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

export { app };
