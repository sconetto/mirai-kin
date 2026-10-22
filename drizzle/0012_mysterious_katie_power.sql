CREATE TABLE "entities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"name" text NOT NULL,
	"currency" text NOT NULL,
	"account_id" uuid,
	"value" numeric(20, 4),
	"balance" numeric(20, 4),
	"amount" numeric(20, 4),
	"interest_rate" numeric(30, 10),
	"term_months" integer,
	"monthly_payment" numeric(20, 4),
	"start_date" date,
	"due_day" integer,
	"frequency" text,
	"next_due_date" date,
	"appreciation_rate" numeric(30, 10),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entities" ADD CONSTRAINT "entities_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "entities_kind_idx" ON "entities" USING btree ("kind");