CREATE TABLE "site_settings" (
	"key" text PRIMARY KEY,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "site_settings_revisions" (
	"id" serial PRIMARY KEY,
	"value" jsonb NOT NULL,
	"source" text NOT NULL,
	"summary" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
