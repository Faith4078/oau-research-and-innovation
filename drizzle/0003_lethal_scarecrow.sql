CREATE TYPE "public"."candidate_decision" AS ENUM('pending', 'kept', 'edited', 'discarded', 'promoted');--> statement-breakpoint
CREATE TYPE "public"."import_job_status" AS ENUM('queued', 'running', 'succeeded', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."import_source" AS ENUM('openalex', 'semantic_scholar', 'orcid', 'crossref', 'csv', 'bibtex', 'manual');--> statement-breakpoint
CREATE TYPE "public"."import_status" AS ENUM('not_started', 'pending', 'running', 'review_ready', 'partial', 'failed', 'succeeded');--> statement-breakpoint
CREATE TABLE "fetched_publication_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"import_job_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"source" "import_source" NOT NULL,
	"external_work_id" text NOT NULL,
	"title" text NOT NULL,
	"normalized_title" text NOT NULL,
	"authors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"abstract" text,
	"venue_name" text,
	"publication_year" integer,
	"publication_type" "publication_type" DEFAULT 'other' NOT NULL,
	"doi" text,
	"normalized_doi" text,
	"source_url" text,
	"citation_count" integer,
	"match_confidence" real,
	"quality_flags" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"raw_payload" jsonb NOT NULL,
	"decision" "candidate_decision" DEFAULT 'pending' NOT NULL,
	"decided_by_user_id" uuid,
	"decided_at" timestamp with time zone,
	"matched_publication_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fetched_candidates_job_external_work_unique" UNIQUE("import_job_id","external_work_id")
);
--> statement-breakpoint
CREATE TABLE "publication_import_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"created_by_user_id" uuid,
	"source" "import_source" NOT NULL,
	"external_author_id" text NOT NULL,
	"status" "import_job_status" DEFAULT 'queued' NOT NULL,
	"cursor" text,
	"expected_count" integer,
	"processed_count" integer DEFAULT 0 NOT NULL,
	"candidate_count" integer DEFAULT 0 NOT NULL,
	"duplicate_count" integer DEFAULT 0 NOT NULL,
	"attempt_count" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "import_status" "import_status" DEFAULT 'not_started' NOT NULL;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "last_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "publications" ADD COLUMN "origin_source" "import_source";--> statement-breakpoint
ALTER TABLE "fetched_publication_candidates" ADD CONSTRAINT "fetched_publication_candidates_import_job_id_publication_import_jobs_id_fk" FOREIGN KEY ("import_job_id") REFERENCES "public"."publication_import_jobs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetched_publication_candidates" ADD CONSTRAINT "fetched_publication_candidates_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetched_publication_candidates" ADD CONSTRAINT "fetched_publication_candidates_decided_by_user_id_auth_users_id_fk" FOREIGN KEY ("decided_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fetched_publication_candidates" ADD CONSTRAINT "fetched_publication_candidates_matched_publication_id_publications_id_fk" FOREIGN KEY ("matched_publication_id") REFERENCES "public"."publications"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_import_jobs" ADD CONSTRAINT "publication_import_jobs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_import_jobs" ADD CONSTRAINT "publication_import_jobs_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fetched_candidates_job_decision_idx" ON "fetched_publication_candidates" USING btree ("import_job_id","decision");--> statement-breakpoint
CREATE INDEX "fetched_candidates_profile_doi_idx" ON "fetched_publication_candidates" USING btree ("profile_id","normalized_doi");--> statement-breakpoint
CREATE INDEX "fetched_candidates_profile_title_year_idx" ON "fetched_publication_candidates" USING btree ("profile_id","normalized_title","publication_year");--> statement-breakpoint
CREATE INDEX "publication_import_jobs_profile_id_idx" ON "publication_import_jobs" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "publication_import_jobs_status_idx" ON "publication_import_jobs" USING btree ("status");