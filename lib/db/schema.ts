import { integer, pgTable, timestamp, varchar } from 'drizzle-orm/pg-core'

export const transfers = pgTable("transfers" , {
    id : integer().primaryKey().generatedAlwaysAsIdentity(),

    senderAddress: varchar("sender_address", {length: 42}).notNull(),
    recipientAddress: varchar("recipient_address", {length: 42}).notNull(),

    amount: varchar("amount").notNull(),
    chainId: integer("chain_id").notNull(),
    assetSymbol: varchar("asset_symbol", {length: 20}).notNull(),

    status: varchar("status", {length: 30}).notNull(),

    transactionHash: varchar("transaction", { length: 66 }),

    createdAt: timestamp("created_at" , {withTimezone: true}).defaultNow().notNull(),
    confirmedAt: timestamp("confirmed_at", {withTimezone: true}),
});