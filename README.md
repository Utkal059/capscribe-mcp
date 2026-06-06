# CapScribe — pay-to-run AI agents on Hedera

> **Pay an AI agent in HBAR and get a verifiable result.**
> Built for the **Hedera AI Agent Bounty — Week 3: MCP or x402 Agent**.

CapScribe is a marketplace of AI agents that perform **Indian IPO due diligence** on
DRHP (Draft Red Herring Prospectus) filings. A user connects a Hedera wallet, pays
for an agent with **HBAR via the x402 payment standard**, and that settlement
**automatically triggers execution**. Each completed run is anchored on the
**Hedera Consensus Service (HCS)** through the **Hedera Agent Kit**, producing a
tamper-evident proof-of-completion that anyone can verify on HashScan.

| Agent | What it does | Price |
| --- | --- | --- |
| **DRHP Capital Events** | Reconstructs the full share-capital history (allotments, bonus/rights issues, splits, ESOPs, conversions) into a dated timeline | 0.5 ℏ |
| **DRHP Risk & Red-Flags** | Ranks material risk factors HIGH / MEDIUM / LOW with rationale | 0.5 ℏ |
| **Full Due-Diligence** | **Multi-agent workflow** — runs both agents and synthesises a verdict | 1.0 ℏ |

---

## Why this fits Week 3

| Requirement | How CapScribe meets it |
| --- | --- |
| **Built using the Hedera Agent Kit (JS)** | `hedera-agent-kit` drives the on-chain proof: the Agent Kit's `coreConsensusPlugin` tools (`create_topic_tool`, `submit_topic_message_tool`) run in autonomous mode to provision a topic and publish every receipt. See [`src/hedera/agentKit.ts`](src/hedera/agentKit.ts). |
| **x402 payment-triggered execution** | The buyer signs an x402 `exact` HBAR transfer; the [blocky402](https://blocky402.com) facilitator verifies + settles it, and **only on successful settlement** does the agent run. See [`src/hedera/paymentGate.ts`](src/hedera/paymentGate.ts) and the `/api/agents/:id/run` flow in [`src/routes/api.ts`](src/routes/api.ts). |
| **Seamless pay → execute** | One flow in the UI: connect wallet → choose agent → sign → result appears, with HashScan proof links. |
| **Hosted UI + wallet integration** | React/Vite SPA with **HashPack / WalletConnect** signing (HBAR). Served by the same Node service. |
| **HBAR payments** | Native HBAR `exact` scheme on Hedera testnet (USDC-ready — the x402 layer supports HTS assets). |
| **Public repo + live demo** | This repo + a single-service deploy (Render/Railway/Fly/Docker). |
| **MCP** | The hosted Hedera MCP server and the Agent Kit MCP toolkit are first-class in this stack; the proof pipeline uses the same Agent Kit tooling exposed over MCP. |

### Unique features

Agent reputation score · marketplace · transaction history · **Hedera proof-of-completion**
· payment-verification links · performance analytics · **multi-agent execution** · AI cost
breakdown · user dashboard · **shareable result links** (`/r/:id`).

---

## How it works

```
┌────────────┐   1. connect (HashPack / WalletConnect)
│  Browser   │──────────────────────────────────────────────┐
│  (React)   │                                               │
└─────┬──────┘                                               ▼
      │ 2. POST /api/payment/prepare {agentId, account}   ┌──────────────┐
      │◀──────── frozen x402 transfer bytes ──────────────│  Express API │
      │ 3. wallet signs the transfer (payer only)         │   (Node/TS)  │
      │ 4. POST /api/agents/:id/run  (X-PAYMENT header)──▶ └──────┬───────┘
      │                                                          │ 5. verify + settle
      │                                                          ▼
      │                                                   ┌──────────────┐
      │                                                   │  blocky402   │  x402 facilitator
      │                                                   │  facilitator │  (adds fee-payer
      │                                                   └──────┬───────┘   sig, submits)
      │                                                          │ 6. settled → run agent
      │                                                          ▼
      │                                              ┌────────────────────────┐
      │                                              │ Claude (Anthropic)     │  analysis
      │                                              └───────────┬────────────┘
      │                                                          │ 7. publish proof
      │                                                          ▼
      │                                              ┌────────────────────────┐
      │                                              │ Hedera Agent Kit → HCS │  proof-of-completion
      │                                              └───────────┬────────────┘
      │ 8. {result, paymentTx, proofTx, resultHash}              │
      │◀─────────────────────────────────────────────────────────┘
```

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for full Mermaid diagrams and the data model.

The buyer **only ever signs their own transfer** — network fees are paid by the
facilitator's fee-payer account, and funds cannot move without the buyer's
signature. (Bounty safety rule compliant.)

---

## Quickstart

### Prerequisites

- Node.js **20+**
- A **Hedera testnet** account + private key — free at the [Hedera Portal](https://portal.hedera.com/dashboard)
- An **Anthropic API key** — [console.anthropic.com](https://console.anthropic.com)
- A **WalletConnect project id** for wallet payments — free at [dashboard.reown.com](https://dashboard.reown.com)
- The **HashPack** wallet (extension or mobile) with some testnet HBAR

### 1. Install & configure

```bash
git clone https://github.com/Utkal059/capscribe-mcp.git
cd capscribe-mcp
npm install
cp .env.example .env        # then fill in your keys
```

### 2. Build the frontend

```bash
npm run build:web
```

### 3. (Optional) provision the proof topic

```bash
npm run setup:topic         # prints HCS_TOPIC_ID; paste it into .env (or let the server auto-create it)
```

### 4. Run

```bash
npm run dev                 # backend on http://localhost:3001 (serves the built UI)
```

Open **http://localhost:3001**, connect HashPack, pick an agent, and run.

### Frontend dev with hot reload

```bash
# terminal 1
npm run dev                 # API on :3001
# terminal 2
npm run dev:web             # Vite on :5173, proxies /api → :3001
```

### Demo mode (no wallet)

For a wallet-free walkthrough on testnet, set `DEMO_BYPASS=true`. A "Try demo run"
button appears that skips settlement but still runs the real agent and writes a real
HCS proof. **Never enable on mainnet.**

---

## API

| Method | Route | Purpose |
| --- | --- | --- |
| `GET` | `/api/config` | Public runtime config (network, demo flag, WC project id) |
| `GET` | `/api/agents` | Marketplace catalog + reputation |
| `GET` | `/api/agents/:id` | Agent detail + x402 payment requirements |
| `POST` | `/api/payment/prepare` | Build the frozen x402 transfer bytes for the wallet to sign |
| `POST` | `/api/agents/:id/run` | **Pay-to-run** — settle x402 (via `X-PAYMENT`), execute, anchor proof |
| `GET` | `/api/receipts/:id` | Public receipt (shareable) |
| `GET` | `/api/receipts?payer=0.0.x` | Transaction history |
| `GET` | `/api/analytics` | Aggregate run stats |
| `GET` | `/health` | Liveness |

Returns HTTP **402** with the payment requirements when `/run` is called without a
valid `X-PAYMENT` header — standard x402 behaviour.

---

## Deployment

CapScribe is a **single Node service** (API + bundled SPA), so it deploys anywhere.

**Docker**

```bash
docker build -t capscribe .
docker run -p 3001:3001 --env-file .env capscribe
```

**Render / Railway / Fly**

- Build command: `npm install && npm run build`
- Start command: `npm start`
- Mount a small persistent disk at `DATA_DIR` (default `.data`) so receipts and the
  cached topic survive restarts.
- Set all `.env` variables in the dashboard.

See [`DEPLOYMENT.md`](DEPLOYMENT.md) for a step-by-step guide.

---

## Tech stack

- **Backend:** Node.js, Express 5, TypeScript (strict), Zod validation, pino logging,
  express-rate-limit, exponential-backoff retries.
- **Hedera:** `hedera-agent-kit` (HCS proof), `@hashgraph/sdk` (transfer build),
  `@x402/hedera` types, blocky402 facilitator.
- **AI:** Anthropic Claude.
- **Frontend:** React 18, Vite 5, Tailwind v4, `@hashgraph/hedera-wallet-connect`.
- **Persistence:** dependency-free JSON receipt store (no native modules).

---

## Testing

```bash
npm test            # vitest unit tests (payment build, hashing, registry, x402 header)
npm run typecheck   # strict tsc, backend
```

---

## Security & safety

- Private keys never leave the server; the browser only ever holds the user's wallet session.
- The buyer signs **only** the transfer authorising their own debit; fees are facilitator-paid.
- Input validated with Zod; rate-limited; payment terms re-checked server-side before settling
  (guards against under-payment / wrong recipient).
- `DEMO_BYPASS` is hard-disabled when `NODE_ENV=production`.

## License

MIT — see [`LICENSE`](LICENSE).
