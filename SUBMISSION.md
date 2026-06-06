# Bounty submission — Week 3: MCP or x402 Agent

Copy/paste the fields below into the submission form at
https://ai-bounties.hedera.com. Replace the bracketed placeholders.

---

**Project name:** CapScribe

**Bounty:** Week 3 — MCP or x402 Agent

**Project description (1–2 lines):**
> Pay an AI agent in HBAR via x402 and instantly get a verifiable IPO due-diligence
> report — every run is anchored on Hedera with the Hedera Agent Kit.

**Project summary (1–3 paragraphs):**
> CapScribe is a marketplace of AI agents that perform Indian IPO due diligence on DRHP
> (Draft Red Herring Prospectus) filings. A user connects HashPack, pays for an agent in
> HBAR using the x402 payment standard, and that settlement automatically triggers
> execution — there is no separate "run" step. Agents extract a company's full
> share-capital history, rank material risk factors, or run a multi-agent workflow that
> does both and synthesises a verdict.
>
> Payment and execution are tightly coupled: the buyer signs an x402 `exact` HBAR
> transfer, the blocky402 facilitator verifies and settles it, and only on a successful
> on-chain settlement does the agent run. Each completed run is anchored on the Hedera
> Consensus Service through the Hedera Agent Kit — the Agent Kit's consensus tools
> publish a proof message containing a SHA-256 hash of the result, the payment
> transaction id, and the payer. Anyone can open the shareable receipt link, recompute
> the hash, and match it against the on-chain HCS message, giving a trustless
> proof-of-completion.
>
> The whole experience is one hosted page: connect wallet → choose agent → sign → read
> the report, with one-click HashScan links to the payment transaction and the HCS
> proof. A dashboard surfaces transaction history, agent reputation, and aggregate
> analytics.

**GitHub repository URL:** https://github.com/Utkal059/capscribe-mcp

**Demo or social-media URL:** [your deployed URL, e.g. https://capscribe.onrender.com]

**Wallet address:** [your Hedera account id, e.g. 0.0.xxxxxxx]

**Implementation details:**
> Backend: Node.js + Express + TypeScript (strict), Zod-validated. The Hedera Agent Kit
> (`hedera-agent-kit`) drives proof-of-completion — I instantiate `HederaLangchainToolkit`
> with `coreConsensusPlugin` in autonomous mode and invoke its `create_topic_tool` and
> `submit_topic_message_tool` to provision a topic and publish each receipt to HCS
> (`src/hedera/agentKit.ts`). x402 payments use `@x402/hedera`'s `exact` HBAR scheme: the
> server builds a frozen transfer the wallet signs, and the blocky402 facilitator handles
> `/verify` + `/settle` (`src/hedera/paymentBuild.ts`, `src/hedera/paymentGate.ts`).
> Execution is gated strictly behind successful settlement in the `/api/agents/:id/run`
> handler. Agents are Claude-backed (Anthropic), including a multi-agent due-diligence
> workflow. Frontend: React + Vite + Tailwind with HashPack via
> `@hashgraph/hedera-wallet-connect`. Single-service deploy (Docker + Render/Railway),
> CI on GitHub Actions, Vitest unit tests, rate limiting, retries, structured logging.

**Feedback link:** [URL of the issue you file — see FEEDBACK below]

---

## FEEDBACK — file this as a GitHub issue, then paste its URL above

Open a new issue at **https://github.com/hashgraph/hedera-agent-kit-js/issues** with:

**Title:** Autonomous-mode tool results serialize entity ids (e.g. `topicId`) as SDK
objects, making them hard to consume; plus duplicate `@hashgraph/sdk` instance causes
type conflicts

**Body:**
> **Context:** I built an x402 pay-to-run agent (CapScribe) that uses
> `HederaLangchainToolkit` + `coreConsensusPlugin` in `AgentMode.AUTONOMOUS` to create an
> HCS topic and submit proof messages. Two papercuts made integration harder than it
> needed to be:
>
> **1. Created-entity ids are awkward to extract from tool output.**
> In autonomous mode, `create_topic_tool` returns `JSON.stringify({ raw, humanMessage })`
> where `raw.topicId` is the SDK `TopicId` receipt field. Once stringified it isn't a
> clean `"0.0.x"` string, so callers can't reliably read the new topic id from the tool
> result and have to write defensive extraction (string/object coercion + regex
> fallback). Likewise `submit_topic_message_tool` doesn't surface the message
> **sequence number** in `raw`, so there's no way to link directly to the specific HCS
> message from the tool response. Suggestion: normalise `raw` entity ids to canonical
> `0.0.x` strings and include `topicSequenceNumber` for consensus submits.
>
> **2. Duplicate `@hashgraph/sdk` causes nominal type conflicts.**
> `hedera-agent-kit` bundles its own `@hashgraph/sdk`, so passing a `Client` created with
> the host app's `@hashgraph/sdk` into `new HederaLangchainToolkit({ client })` fails
> typechecking ("separate declarations of a private property `_setNetworkFromName`"),
> forcing an `as unknown as` cast. Could the SDK be a peer dependency instead of bundled,
> or could the toolkit accept a structurally-typed client?
>
> Both are minor but would meaningfully smooth the DX for x402/MCP agents that need to
> both build transactions with the SDK and drive Agent Kit tools. Happy to PR the
> entity-id normalisation if helpful.

> Note: also acceptable per the rules is any GitHub issue / feature request / feedback on
> a Hedera AI tool. The above is real feedback from building this project.
