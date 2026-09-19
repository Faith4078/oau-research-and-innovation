ALTER TABLE "auth_users" ADD COLUMN "is_author" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "is_author" boolean DEFAULT true NOT NULL;