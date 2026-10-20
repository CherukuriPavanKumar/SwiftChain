DROP TABLE "db_test";--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "user_id" varchar(255);--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "token_address" varchar(42);--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "inr_source_amount" varchar;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "reference_rate" varchar;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "estimated_destination_usd" varchar;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "network_fee_eth" varchar;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "platform_fee_inr" varchar;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "is_simulated_payout" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "payout_status" varchar(30) DEFAULT 'none';--> statement-breakpoint
ALTER TABLE "transfers" ADD COLUMN "payout_completed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "transfers" ALTER COLUMN "transaction" DROP NOT NULL;