# Deploying CapScribe

CapScribe is a **single Node service** that serves both the API and the bundled
React UI. Pick any host that runs Node 20+ with a small persistent disk. The demo
URL must stay live **≥ 90 days** per the bounty rules.

## 0. Get your credentials first

| Credential | Where |
| --- | --- |
| Hedera testnet account + key | https://portal.hedera.com/dashboard |
| Anthropic API key | https://console.anthropic.com |
| WalletConnect project id | https://dashboard.reown.com |
| Testnet HBAR (to pay agents) | the Hedera Portal faucet |

Fund both your **operator** account (pays the tiny HCS proof fee) and the **buyer**
wallet you'll demo with.

---

## Option A — Render (recommended, free tier works)

1. Push this repo to GitHub.
2. New → **Web Service** → connect the repo.
3. Settings:
   - **Environment:** Node
   - **Build command:** `npm install && npm run build`
   - **Start command:** `npm start`
   - **Instance:** Free or Starter
4. **Disks** → add a disk mounted at `/opt/render/project/src/.data`, and set
   `DATA_DIR=/opt/render/project/src/.data` so receipts persist across restarts.
5. **Environment** → add every variable from `.env.example` (real values).
6. Deploy. Your demo URL is the Render URL.

## Option B — Railway

1. New Project → Deploy from GitHub repo.
2. Variables → add all `.env` values; set `PORT=3001`.
3. Add a Volume mounted at `/app/.data`; set `DATA_DIR=/app/.data`.
4. Railway auto-detects `npm run build` / `npm start`. Generate a public domain.

## Option C — Docker (any VPS / Fly.io)

```bash
docker build -t capscribe .
docker run -d -p 3001:3001 --env-file .env -v capscribe-data:/app/.data --name capscribe capscribe
# or:
docker compose up -d
```

For **Fly.io**: `fly launch` (uses the Dockerfile), `fly volumes create capscribe_data`,
mount it at `/app/.data`, and `fly secrets set` each env var.

---

## After deploy — verify

1. Visit the URL → marketplace loads.
2. `GET /health` returns `{"status":"ok"}`.
3. Connect HashPack → your account shows in the header.
4. Run an agent → approve in the wallet → result appears with **HashScan** links for
   the payment tx and the HCS proof message. Open them to confirm on-chain.
5. Copy the share link (`/r/:id`) and open it in a fresh tab — the verifiable receipt
   loads.

## Notes

- `DEMO_BYPASS` must be **`false`** in production (it is force-disabled when
  `NODE_ENV=production` regardless).
- The first paid run auto-creates the HCS proof topic if `HCS_TOPIC_ID` is unset; run
  `npm run setup:topic` beforehand if you'd rather pin it.
- Keep the service warm — free tiers that sleep will still resume on the next request.
