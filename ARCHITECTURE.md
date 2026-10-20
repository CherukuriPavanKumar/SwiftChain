# SwiftChain V2 — Architecture Decision Record

> **Type:** Architecture documentation (Milestone 15)  
> **Status:** Accepted  
> **Author:** SwiftChain engineering team  
> **Last updated:** October 2026

---

## Overview

SwiftChain is a consumer-fintech prototype demonstrating a remittance corridor from Indian Rupees (INR) to destination currencies via on-chain stablecoin settlement on Ethereum. It is a **Sepolia testnet application** — no real money is moved.

---

## Stack

| Layer | Technology | Rationale |
|---|---|---|
| Frontend / Server | Next.js 16 (App Router) | Unified SSR + client rendering; native streaming; built-in API routes |
| Styling | Tailwind CSS | Utility-first; consistent with design system |
| Blockchain client | Wagmi v3 + Viem | Type-safe React hooks for EVM wallets; auto-adapts to wagmi-style transaction lifecycle |
| Wallet connectors | MetaMask (injected), WalletConnect v2, Safe | Broadest Sepolia wallet coverage at prototype stage |
| Database | Neon Postgres (serverless) via Drizzle ORM | Branching-native Postgres; zero cold-start on serverless; type-safe ORM |
| Auth | Neon Managed Better Auth (`@neondatabase/auth`) | No auth infra to run; session cookies; Next.js App Router–native API methods |
| Market data | CoinGecko Simple Price API | Free demo tier sufficient for ETH + USDC INR/USD prices with 60-second caching |
| Testing | vitest (unit) + manual `npx tsx` scripts | Fast ESM-native test runner; existing test scripts converted to specs |

---

## Deliberate Architectural Decisions

### 1. Sepolia Testnet Only

**Decision:** All on-chain activity runs on Ethereum Sepolia exclusively.

**Rationale:**
- No real economic risk during prototype development.
- Circle operates an official Sepolia USDC faucet (`faucet.circle.com`) making USDC transfers testable without mainnet funds.
- Sepolia blocks confirm in ~12 seconds, enabling realistic transfer-lifecycle UX testing.

**What this excludes:** Mainnet, L2s (Arbitrum, Base, Polygon), other testnets.  
**Production path:** Swap `sepolia` to `mainnet` (or target L2) in `config.ts` and update `SUPPORTED_TOKENS.USDC.contractAddress` to the production Circle USDC contract.

---

### 2. Supported Assets: Native ETH + Circle USDC (ERC-20)

**Decision:** Two assets supported — native Sepolia ETH (18 decimals) and Circle USDC (6 decimals, contract `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`).

**Rationale:**
- ETH validates the native-transfer path (no token approval required).
- USDC validates the ERC-20 transfer path (`approve` is unnecessary for direct `transfer()` calls) and is the most realistic remittance stablecoin.
- USDC's fixed USD peg eliminates FX volatility from the quote engine for the remittance corridor.

**Decimal precision:** `parseUnits(amount, 6)` for USDC, `parseUnits(amount, 18)` for ETH. Handled uniformly in `lib/tokens.ts`.

**What this excludes:** USDT, DAI, bridged assets, wrapped tokens.

---

### 3. Gas is Always Paid in Native ETH

**Decision:** Even for ERC-20 USDC transfers, gas is paid in native Sepolia ETH, not abstracted away.

**Rationale:**
- This is how EVM gas works — it is not a design limitation.
- The quote engine (`lib/quote.ts`) makes this explicit: it calculates `estimatedNetworkFeeEth` separately from the token transfer amount.
- The review modal surfaced two distinct balance requirements: ETH (for gas) and USDC (for the transfer).

**Production consideration:** Account Abstraction (ERC-4337) could sponsor gas or allow USDC-denominated gas on some L2s. This is out of scope for the prototype.

---

### 4. Transfer State Machine

**Decision:** Transfers follow a strict, enforced state machine — not a free-form status string.

**Valid states:**

```
draft ──► awaiting signature ──► pending ──► confirmed
           │                        │
           └──► rejected             └──► failed
```

**Enforcement:** The PATCH endpoint in `/api/transfers/route.ts` calls `canTransition(currentStatus, newStatus)` from `lib/transfer-state.ts`. Invalid transitions return HTTP 422. Writes to terminal states (`confirmed`, `failed`, `rejected`) are permanently blocked.

**Stored in:** `transfers.status` varchar(30) in Neon Postgres.

---

### 5. Idempotency on Transaction Hash

**Decision:** `transactionHash` has a partial `UNIQUE` index (non-NULL rows only). The POST endpoint performs an existence check before INSERT and returns the existing row if a duplicate tx hash is submitted.

**Rationale:** The wallet may fire the submit button twice; the component may re-render mid-flight. Without idempotency, the transfer history accumulates duplicates.

---

### 6. Simulated Destination Payout (Not Real Fiat Rails)

**Decision:** After on-chain confirmation, the UI shows a "Simulated Payout Completed" message after a 3-second delay. No real fiat transfer occurs.

**What it simulates:** A SWIFT/ACH/SEPA settlement where the USDC is redeemed and fiat is deposited to a recipient's bank account.

**Disclaimer:** The application explicitly labels this as a simulation at every point in the UI. The `payoutStatus` field captures the lifecycle in DB.

**Production path:** Integrate Circle Mint, MoonPay, or Transak for real USDC → fiat conversion with KYC/AML compliance.

---

### 7. Database — Neon Postgres with Drizzle ORM

**Decision:** All transfer records are stored in a single `transfers` table in Neon Postgres.

**Schema highlights:**
- `user_id` (nullable, varchar 255) — scopes rows to authenticated Neon Auth users.
- `transaction` (varchar 66) — Ethereum tx hash; partial UNIQUE index.
- `status` (varchar 30) — state machine status; enforced by API.
- `updated_at` (timestamptz) — stamped on every PATCH.
- Drizzle ORM provides type-safe queries with no runtime codegen.

**Connection:** `drizzle-orm/neon-http` (HTTP/1.1 serverless driver, no persistent TCP connection required).

---

### 8. Authentication — Neon Managed Better Auth

**Decision:** Email/password authentication via Neon Managed Auth (`@neondatabase/auth`).

**Session model:** Cookie-based session; middleware in `proxy.ts` protects `/account/**`. Transfer routes read `auth.getSession()` to extract `userId`.

**What this excludes:** Web3-native auth (SIWE), OAuth social login, magic links.

---

### 9. API Security Model

**Implemented:**
- Rate limiting: 20 POST/PATCH requests per authenticated user per 60-second in-process window.
- Zod schema validation on all POST and PATCH bodies (address regex, status enum, positive amounts).
- Auth guard: POST/PATCH return 401 for unauthenticated requests.
- Ownership guard: PATCH checks `userId` match before updating.
- State machine guard: PATCH rejects invalid transitions with 409/422.

**Not implemented (production gaps):**
- Redis-backed rate limiting (current is in-process; resets on server restart).
- CORS policy (Next.js default; `localhost:3000` only in dev).
- JWT or API key for non-browser clients.

---

### 10. Quote Engine

**Decision:** Quotes are computed deterministically on the client using live CoinGecko market data fetched server-side with 60-second caching.

**Quote validity:** 60 seconds (`QUOTE_TTL_MS = 60_000`). The review modal displays a countdown and disables submission after expiry.

**Guaranteed Rate label (known issue):** The UI currently says "Guaranteed Rate" — this will be renamed to "Live Spot Rate (60s)" as it is not a contractual commitment.

---

## Module Map

```
app/
  api/
    exchange-rate/route.ts    — CoinGecko market data proxy (1-minute cache)
    transfers/route.ts        — Transfer CRUD with rate limit + state machine
    neon/health/route.ts      — DB health check
  auth/
    sign-in/                  — Sign-in form + server action
    sign-up/                  — Sign-up form + server action
  components/
    eth-price-ticker.tsx      — Market data ticker + useEthPrice() hook
    inr-eth-calculator.tsx    — Remittance quote panel
    savings-comparison.tsx    — 3-rail comparison calculator
    settlement-tracker-modal.tsx — Transfer lifecycle timeline
    transfer-review-modal.tsx — Quote confirmation + wallet invoke
  page.tsx                    — Dashboard (server component)
  transfer-history.tsx        — Per-user history list

lib/
  quote.ts                    — Deterministic multi-asset quote engine
  comparison.ts               — 3-rail savings comparison engine
  tokens.ts                   — Supported token config (ETH + USDC)
  transfer-state.ts           — State machine definition + canTransition()
  transfer-client.ts          — Typed HTTP client for /api/transfers
  db/
    client.ts                 — Drizzle DB connection
    schema.ts                 — transfers table definition
  auth/
    server.ts                 — Neon Auth server instance

wagmi/
  send-transaction.tsx        — Wallet connect + direct ETH/USDC send card
  connection.tsx              — Wallet connection button

hooks/
  use-token-balances.ts       — ETH + USDC balance queries

types/
  transfer.ts                 — Transfer interface + TransferStatus type
  quote.ts                    — RemittanceQuote + FeeBreakdown types

scripts/
  test-quote.ts               — Quote engine validation script
  test-comparison.ts          — Comparison engine validation script
```

---

## Known Limitations (Prototype Scope)

| # | Limitation | Production requirement |
|---|---|---|
| 1 | Sepolia testnet only | Mainnet / production L2 deployment |
| 2 | Simulated fiat payout | Real fiat ramp (Circle Mint, MoonPay, Transak) |
| 3 | In-memory rate limiter | Redis-backed rate limiting (Upstash, Vercel KV) |
| 4 | No real KYC/AML | Compliance layer required for money transfer licensing |
| 5 | No real SWIFT/ACH | Banking partner integration |
| 6 | "Guaranteed Rate" label | Rename to "Live Spot Rate" + regulatory disclaimer |
| 7 | Single Postgres table | Full financial ledger with double-entry accounting |
| 8 | No event sourcing | Immutable audit log for regulatory reporting |
