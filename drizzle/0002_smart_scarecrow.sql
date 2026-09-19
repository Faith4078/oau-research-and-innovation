CREATE TABLE "auth_password_reset_tokens" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "auth_password_reset_tokens" ADD CONSTRAINT "auth_password_reset_tokens_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_password_reset_tokens_token_hash_unique" ON "auth_password_reset_tokens" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_password_reset_tokens_user_id_idx" ON "auth_password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_password_reset_tokens_expires_at_idx" ON "auth_password_reset_tokens" USING btree ("expires_at");