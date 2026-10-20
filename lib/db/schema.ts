import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/pg-core';

export const transfers = pgTable(
  "transfers",
  {
    id: integer().primaryKey().generatedAlwaysAsIdentity(),

    // Owner of this transfer record (Neon Auth user ID). Nullable so
    // pre-auth rows are preserved without breaking the schema.
    userId: varchar("user_id", { length: 255 }),

    senderAddress: varchar("sender_address", { length: 42 }).notNull(),
    recipientAddress: varchar("recipient_address", { length: 42 }).notNull(),

    amount: varchar("amount").notNull(),
    chainId: integer("chain_id").notNull(),
    assetSymbol: varchar("asset_symbol", { length: 20 }).notNull(),

    // Optional token contract address (for ERC-20 tokens like USDC)
    tokenAddress: varchar("token_address", { length: 42 }),

    // Financial remittance & quote details
    inrSourceAmount: varchar("inr_source_amount"),
    referenceRate: varchar("reference_rate"),
    estimatedDestinationUsd: varchar("estimated_destination_usd"),
    networkFeeEth: varchar("network_fee_eth"),
    platformFeeInr: varchar("platform_fee_inr"),

    // Transfer state machine (Milestone 3)
    // Valid values: draft | awaiting signature | pending | confirmed | failed | rejected
    status: varchar("status", { length: 30 }).notNull(),

    // Unique on-chain identifier — enforces idempotency (Milestone 13)
    transactionHash: varchar("transaction", { length: 66 }),

    // Simulated destination payout fields (Milestone 10)
    isSimulatedPayout: boolean("is_simulated_payout").default(false),
    payoutStatus: varchar("payout_status", { length: 30 }).default("none"),
    payoutCompletedAt: timestamp("payout_completed_at", { withTimezone: true }),

    // Audit timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    // UNIQUE index on transaction hash — prevents duplicate rows for the
    // same on-chain transaction (Milestone 13 — idempotency).
    // Partial: only enforces uniqueness when the column is NOT NULL.
    uniqueTxHash: uniqueIndex("transfers_transaction_hash_unique")
      .on(table.transactionHash)
      .where(sql`"transaction" IS NOT NULL`),
  })
);