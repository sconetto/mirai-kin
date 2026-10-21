CREATE TABLE "goal_allocations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid NOT NULL,
	"share_pct" numeric(20, 6) DEFAULT '100' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "funding_mode" text DEFAULT 'accounts' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "manual_current_amount" numeric(20, 4);--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "monthly_contribution" numeric(20, 4) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "expected_return" numeric(30, 10) DEFAULT '0' NOT NULL;--> statement-breakpoint
ALTER TABLE "goals" ADD COLUMN "inflation_rate" numeric(30, 10);--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_allocations" ADD CONSTRAINT "goal_allocations_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_allocations_goal_account_idx" ON "goal_allocations" USING btree ("goal_id","account_id");