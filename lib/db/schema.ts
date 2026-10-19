import { boolean, integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core';

export const transfers = pgTable("transfers", {
  id: integer().primaryKey().generatedAlwaysAsIdentity(),

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

  status: varchar("status", { length: 30 }).notNull(),
  transactionHash: varchar("transaction", { length: 66 }),

  // Simulated destination payout fields (Milestone F)
  isSimulatedPayout: boolean("is_simulated_payout").default(false),
  payoutStatus: varchar("payout_status", { length: 30 }).default("none"),
  payoutCompletedAt: timestamp("payout_completed_at", { withTimezone: true }),

  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
});