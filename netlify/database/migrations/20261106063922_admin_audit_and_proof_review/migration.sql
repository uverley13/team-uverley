CREATE TABLE "admin_audit_log" (
	"id" serial PRIMARY KEY,
	"actor_id" text NOT NULL,
	"actor_email" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text,
	"target_id" text,
	"summary" text NOT NULL,
	"details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_notifications" (
	"id" serial PRIMARY KEY,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"key" text PRIMARY KEY,
	"failures" integer DEFAULT 0 NOT NULL,
	"window_start" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_until" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "balance_before" integer;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "balance_after" integer;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "admin_id" text;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "admin_email" text;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "reason" text;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "suspended" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "admin_notes" text;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "proof_hash" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "reference" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "reviewed_by" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "reviewed_by_email" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "review_note" text;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
CREATE INDEX "admin_audit_log_created_at_idx" ON "admin_audit_log" ("created_at");--> statement-breakpoint
CREATE INDEX "admin_audit_log_target_idx" ON "admin_audit_log" ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_created_at_idx" ON "admin_notifications" ("created_at");--> statement-breakpoint
CREATE INDEX "balance_transactions_created_at_idx" ON "balance_transactions" ("created_at");--> statement-breakpoint
CREATE INDEX "orders_created_at_idx" ON "orders" ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "topups_active_proof_hash_uq" ON "topups" ("proof_hash") WHERE "status" in ('pending', 'approved');--> statement-breakpoint
CREATE UNIQUE INDEX "topups_active_reference_uq" ON "topups" ("reference") WHERE "status" in ('pending', 'approved');--> statement-breakpoint
CREATE INDEX "topups_reference_idx" ON "topups" ("reference");--> statement-breakpoint
CREATE INDEX "topups_created_at_idx" ON "topups" ("created_at");