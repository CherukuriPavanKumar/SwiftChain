# SwiftChain V2 — On-Chain Cross-Border Remittance Engine

> **A consumer-fintech cross-border remittance prototype** demonstrating Indian Rupee (INR) remittances via on-chain stablecoin (Circle USDC) and native Ethereum settlement on the Sepolia testnet.

---

## 🚀 Key Features

- **Live Market Rate Engine:** 60-second cached spot price calculations for ETH and Circle USDC in INR and USD via CoinGecko.
- **Multi-Asset Remittance Quotes:** Real-time quote engine computing recipient amounts, 6-decimal USDC quantization with `viem.parseUnits`, platform fees (₹0.00), and estimated network gas.
- **State Machine–Driven Transfer Lifecycle:** Explicit status transitions (`draft` → `awaiting signature` → `pending` → `confirmed` / `failed` / `rejected`) guarded server-side.
- **Per-User Isolated History & Auth:** Integrated with Neon Managed Better Auth (`@neondatabase/auth`) ensuring each user only accesses their own transaction records.
- **Idempotency & Replay Protection:** Partial unique index on on-chain transaction hash (`transfers.transaction`) prevents duplicate database entries.
- **Interactive Settlement Tracker:** Real-time modal tracking quote generation, wallet signature, block mining, and simulated destination payout.
- **Remittance Cost Comparison:** Mathematical comparison across SwiftChain, Bank Wire, and Legacy MTO rails for US, GB, EU, and AE corridors with configurable fee assumptions.

---

## 🛠️ Architecture & Tech Stack

| Layer | Technology | Details |
|---|---|---|
| **Framework** | Next.js 16 (App Router) | React Server Components, TypeScript, API Routes |
| **Styling** | Tailwind CSS v4 | Dark mode, glassmorphic UI, responsive layout |
| **Web3 Client** | Wagmi v3 + Viem | EIP-1193 connectors (MetaMask, WalletConnect v2, Safe) |
| **Network** | Ethereum Sepolia | Testnet chain ID `11155111`; native ETH + Circle USDC |
| **Database** | Neon Serverless Postgres | Drizzle ORM (`drizzle-orm/neon-http`), connection pooling |
| **Authentication** | Neon Managed Better Auth | Session cookies, Next.js server helper (`auth.getSession()`) |
| **Testing** | Vitest + tsx | Automated unit testing suites covering quote, comparison, state machine, and tokens |

For detailed architectural decisions, review [ARCHITECTURE.md](ARCHITECTURE.md).

---

## 📋 Prerequisites

- **Node.js**: v20 or higher
- **Package Manager**: `npm`
- **Browser Extension**: MetaMask (or compatible EVM wallet) connected to Ethereum Sepolia
- **Testnet Funds**:
  - Sepolia ETH: [Sepolia Faucet](https://sepoliafaucet.com/) or [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
  - Sepolia USDC (Circle official contract `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`): [Circle Faucet](https://faucet.circle.com/)

---

## ⚙️ Environment Configuration

Copy `.env.example` to `.env.local` and populate the required keys:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `DATABASE_URL` | Neon PostgreSQL pooled connection string (used by Next.js API routes) |
| `DATABASE_URL_UNPOOLED` | Neon PostgreSQL direct unpooled connection string (used by Drizzle migrations) |
| `NEON_BRANCH` | Active Neon branch name (e.g. `main`) |
| `NEON_AUTH_BASE_URL` | Neon Auth endpoint URL |
| `NEON_AUTH_COOKIE_SECRET` | 32+ byte string for cookie encryption |
| `CG_API_KEY` | CoinGecko Demo or Pro API Key for exchange rates |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | Optional WalletConnect Cloud Project ID (default fallback included) |

---

## 💻 Getting Started

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
```

### 2. Apply Database Schema

```bash
npx drizzle-kit push
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Automated Testing

SwiftChain uses **Vitest** for automated unit and domain testing:

```bash
# Run all automated tests once
npm test

# Run tests in watch mode
npm run test:watch
```

Included test suites:
- `tests/quote.test.ts`: Validates 6-decimal USDC and 18-decimal ETH quote precision, TTL expiry, and boundary conditions.
- `tests/comparison.test.ts`: Verifies cross-corridor mathematics, bank wire/MTO assumptions, and floor/ceiling boundaries.
- `tests/transfer-state.test.ts`: Enforces legal and illegal state transitions in the transfer state machine.
- `tests/tokens.test.ts`: Verifies supported token configurations, contract addresses, and minimal ERC-20 ABI definitions.

---

## 🔒 API Security & Validation

- **Authentication Guard**: Unauthenticated requests to `/api/transfers` (POST, PATCH) receive HTTP 401.
- **In-Memory Rate Limiting**: Max 20 POST requests and 20 PATCH requests per user per 60-second sliding window. Returns HTTP 429 when exceeded.
- **Strict Input Validation**: Zod schemas validate EVM addresses (`0x[a-fA-F0-9]{40}`), transaction hashes (`0x[a-fA-F0-9]{64}`), positive numbers, and valid state enums.
- **State Machine Enforcement**: Terminal states (`confirmed`, `failed`, `rejected`) cannot be updated. Illegal transitions return HTTP 422 with the list of allowed targets.
- **Data Isolation**: Transfer history queries filter strictly by `userId`, preventing cross-account data leakage.

---

## 🚢 Operational Runbook & Production Checklist

Before promoting to production:
1. **Network Configuration**: Update `config.ts` chains and replace Sepolia USDC address with mainnet Circle USDC (`0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`).
2. **Distributed Rate Limiting**: Replace the in-memory sliding window map with Upstash Redis or Vercel KV for multi-instance serverless deployments.
3. **Transaction Indexer / Webhook**: Set up an on-chain event listener (Alchemy/Infura webhook or dedicated indexer) for automated reconciliation of unconfirmed transactions.
4. **Fiat On/Off-Ramp Integration**: Transition simulated INR payout to regulated fiat providers (Circle Mint, Transak, or MoonPay) with KYC/AML compliance.
