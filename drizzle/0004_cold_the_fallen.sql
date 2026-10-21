CREATE TABLE "account_reconciliations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"statement_balance" numeric(20, 4) NOT NULL,
	"computed_balance" numeric(20, 4) NOT NULL,
	"difference" numeric(20, 4) NOT NULL,
	"status" text NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "backups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"filename" text NOT NULL,
	"size_bytes" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recurring_detections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"label" text NOT NULL,
	"cadence" text NOT NULL,
	"average_amount" numeric(20, 4) NOT NULL,
	"currency" text NOT NULL,
	"last_date" date NOT NULL,
	"next_expected" date NOT NULL,
	"confidence" numeric(20, 6) DEFAULT '0' NOT NULL,
	"status" text DEFAULT 'detected' NOT NULL,
	"recurring_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "recurring_detections_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transaction_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"priority" integer DEFAULT 100 NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"conditions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"actions" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "opening_balance_captured" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "statement_close_day" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "due_day" integer;--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "credit_limit" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "opening_balance" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "import_batches" ADD COLUMN "current_balance" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "detection_id" uuid;--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD COLUMN "source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "applied_rule_id" uuid;--> statement-breakpoint
ALTER TABLE "account_reconciliations" ADD CONSTRAINT "account_reconciliations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_reconciliations_account_idx" ON "account_reconciliations" USING btree ("account_id","date");--> statement-breakpoint
ALTER TABLE "recurring_transactions" ADD CONSTRAINT "recurring_transactions_detection_id_recurring_detections_id_fk" FOREIGN KEY ("detection_id") REFERENCES "public"."recurring_detections"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_applied_rule_id_transaction_rules_id_fk" FOREIGN KEY ("applied_rule_id") REFERENCES "public"."transaction_rules"("id") ON DELETE set null ON UPDATE no action;