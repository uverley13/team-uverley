CREATE TABLE "site_domains" (
	"domain" text PRIMARY KEY,
	"site_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sites" (
	"id" serial PRIMARY KEY,
	"slug" text NOT NULL UNIQUE,
	"name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- The existing store becomes store #1; every current record belongs to it.
INSERT INTO "sites" ("id", "slug", "name") VALUES (1, 'servidor-uverley', 'Servidor Uverley');--> statement-breakpoint
SELECT setval(pg_get_serial_sequence('sites', 'id'), (SELECT max("id") FROM "sites"));--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD COLUMN "site_id" integer;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD COLUMN "site_id" integer;--> statement-breakpoint
UPDATE "admin_audit_log" SET "site_id" = 1;--> statement-breakpoint
UPDATE "admin_notifications" SET "site_id" = 1;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "balance_transactions" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "orders" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "orders" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "user_id" text;--> statement-breakpoint
UPDATE "profiles" SET "user_id" = "id";--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "site_settings_revisions" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings_revisions" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "topups" ADD COLUMN "site_id" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "topups" ALTER COLUMN "site_id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "site_settings" DROP CONSTRAINT "site_settings_pkey";--> statement-breakpoint
ALTER TABLE "site_settings" ADD PRIMARY KEY ("site_id","key");--> statement-breakpoint
CREATE INDEX "admin_audit_log_site_id_idx" ON "admin_audit_log" ("site_id");--> statement-breakpoint
CREATE INDEX "admin_notifications_site_id_idx" ON "admin_notifications" ("site_id");--> statement-breakpoint
CREATE INDEX "balance_transactions_site_id_idx" ON "balance_transactions" ("site_id");--> statement-breakpoint
CREATE INDEX "orders_site_id_idx" ON "orders" ("site_id");--> statement-breakpoint
CREATE INDEX "products_site_id_idx" ON "products" ("site_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_site_user_uq" ON "profiles" ("site_id","user_id");--> statement-breakpoint
CREATE INDEX "site_domains_site_id_idx" ON "site_domains" ("site_id");--> statement-breakpoint
CREATE INDEX "site_settings_revisions_site_id_idx" ON "site_settings_revisions" ("site_id");--> statement-breakpoint
CREATE INDEX "topups_site_id_idx" ON "topups" ("site_id");--> statement-breakpoint
ALTER TABLE "admin_audit_log" ADD CONSTRAINT "admin_audit_log_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "admin_notifications" ADD CONSTRAINT "admin_notifications_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "balance_transactions" ADD CONSTRAINT "balance_transactions_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "site_domains" ADD CONSTRAINT "site_domains_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "site_settings_revisions" ADD CONSTRAINT "site_settings_revisions_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");--> statement-breakpoint
ALTER TABLE "topups" ADD CONSTRAINT "topups_site_id_sites_id_fkey" FOREIGN KEY ("site_id") REFERENCES "sites"("id");