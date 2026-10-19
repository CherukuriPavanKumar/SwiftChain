CREATE TABLE "transfers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "transfers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sender_address" varchar(42) NOT NULL,
	"recipient_address" varchar(42) NOT NULL,
	"amount" varchar NOT NULL,
	"chain_id" integer NOT NULL,
	"asset_symbol" varchar(20) NOT NULL,
	"status" varchar(30) NOT NULL,
	"transaction" varchar(66) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone
);
