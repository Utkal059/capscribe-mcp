# CapScribe — Architecture

## System overview

```mermaid
flowchart TB
    subgraph Browser["Browser — React / Vite SPA"]
        UI[Marketplace UI]
        WC["Wallet<br/>(HashPack via WalletConnect)"]
        X[x402 header builder]
    end

    subgraph Server["Node service — Express + TypeScript"]
        API[REST API]
        PB[payment build]
        PG[payment gate]
        ENG[agent engine]
        AK[Agent Kit / HCS proof]
        ST[(JSON receipt store)]
    end

    subgraph Hedera["Hedera testnet"]
        HCS[(Consensus Service)]
        LEDGER[(Ledger)]
    end

    FAC[blocky402 x402 facilitator]
    LLM[Anthropic Claude]

    UI -->|prepare payment| PB
    PB -->|frozen transfer bytes| X
    WC -->|sign transfer| X
    X -->|X-PAYMENT header| API
    API --> PG
    PG -->|verify + settle| FAC
    FAC -->|fee-payer sig + submit| LEDGER
    PG -->|settled| ENG
    ENG --> LLM
    ENG --> AK
    AK -->|create topic / submit message| HCS
    API --> ST
    API -->|result + proof links| UI
```

## Pay-to-run sequence

```mermaid
sequenceDiagram
    autonumber
    participant U as User
    participant W as Wallet (HashPack)
    participant FE as SPA
    participant BE as Express API
    participant F as blocky402
    participant H as Hedera
    participant AI as Claude
    participant AK as Agent Kit (HCS)

    U->>FE: Choose agent + input
    FE->>BE: POST /payment/prepare {agentId, account}
    BE-->>FE: x402 requirements + frozen transfer bytes
    FE->>W: signTransaction(transfer)
    W-->>FE: payer-signed transfer
    FE->>BE: POST /agents/:id/run (X-PAYMENT)
    BE->>BE: re-check amount + payTo
    BE->>F: /verify then /settle
    F->>H: add fee-payer sig, submit transfer
    H-->>F: SUCCESS (payment tx id)
    F-->>BE: settled
    BE->>AI: analyse DRHP
    AI-->>BE: structured findings
    BE->>AK: submit_topic_message_tool(proof)
    AK->>H: HCS message (proof tx)
    H-->>AK: receipt
    BE-->>FE: {result, paymentTx, proofTx, resultHash, shareUrl}
    FE-->>U: Report + HashScan proof links
```

## Proof-of-completion data model

```mermaid
classDiagram
    class Receipt {
        string id
        string agentId
        string agentName
        string company
        string payer
        string paymentTxId
        string priceTinybars
        string resultHash  "SHA-256 of result"
        string proofTopicId
        string proofTxId
        AnalysisResult result
        number durationMs
        boolean demo
        string createdAt
    }
    class AnalysisResult {
        string agentId
        string company
        string summary
        Finding[] findings
        string processedAt
    }
    class Finding {
        string category
        string title
        string detail
        string date
        string amount
    }
    Receipt --> AnalysisResult
    AnalysisResult --> Finding
```

The proof message published to HCS is:

```json
{
  "type": "capscribe.proof.v1",
  "agent": "risk-scan",
  "company": "Acme Industries Ltd",
  "payer": "0.0.xxxx",
  "paymentTxId": "0.0.7162784@...",
  "resultHash": "5c0179...917e",
  "findings": 4,
  "at": "2026-06-06T22:00:00.000Z"
}
```

Anyone can independently recompute `resultHash` from a shared receipt (`/r/:id`) and
match it against the on-chain HCS message — a verifiable audit trail with no trust in
CapScribe required.

## Repository layout

```
src/
  server.ts            Express app, static SPA, SPA fallback, shutdown
  config.ts            Zod-validated env
  logger.ts            pino
  store.ts             JSON receipt store + analytics
  types.ts             shared domain types
  agents/
    registry.ts        marketplace catalog (prices, reputation source)
    engine.ts          Claude-backed agents + multi-agent workflow
  hedera/
    client.ts          SDK client + key parsing
    paymentBuild.ts    x402 requirements + frozen transfer
    paymentGate.ts     facilitator verify + settle
    agentKit.ts        Hedera Agent Kit → HCS proof
  routes/api.ts        REST API
  middleware/          error handling + rate limiting
  util/                retry, hashing, HashScan links
  scripts/setupTopic.ts
web/                   React + Vite + Tailwind SPA → built into web/dist
tests/                 vitest unit tests
```
