CREATE TYPE "public"."account_status" AS ENUM('active', 'disabled', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."patent_status" AS ENUM('potential', 'disclosed', 'filed', 'granted', 'licensed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."profile_type" AS ENUM('staff', 'external', 'organization');--> statement-breakpoint
CREATE TYPE "public"."publication_type" AS ENUM('journal_article', 'conference_paper', 'book_chapter', 'book', 'dataset', 'technical_report', 'thesis', 'other');--> statement-breakpoint
CREATE TYPE "public"."record_status" AS ENUM('draft', 'submitted', 'department_review', 'faculty_review', 'changes_requested', 'approved', 'published', 'rejected', 'archived');--> statement-breakpoint
CREATE TYPE "public"."review_decision" AS ENUM('submitted', 'approved', 'changes_requested', 'rejected', 'published', 'archived');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'lecturer', 'department_admin', 'faculty_admin', 'iptto_officer', 'super_admin');--> statement-breakpoint
CREATE TABLE "auth_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"token_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"university_email" text,
	"staff_identifier" text,
	"status" "account_status" DEFAULT 'active' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"last_signed_in_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"faculty_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "departments_faculty_name_unique" UNIQUE("faculty_id","name")
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "patent_contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"patent_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"contributor_role" text DEFAULT 'inventor' NOT NULL,
	"inventor_order" integer DEFAULT 1 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "patent_contributors_patent_profile_role_unique" UNIQUE("patent_id","profile_id","contributor_role")
);
--> statement-breakpoint
CREATE TABLE "patents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"owning_profile_id" uuid,
	"department_id" uuid,
	"faculty_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"abstract" text,
	"summary" text,
	"patent_number" text,
	"application_number" text,
	"filing_date" date,
	"grant_date" date,
	"jurisdiction" text,
	"patent_status" "patent_status" DEFAULT 'potential' NOT NULL,
	"source_url" text,
	"document_url" text,
	"commercialization_status" text,
	"industry_partner" text,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"staff_id" uuid,
	"display_name" text NOT NULL,
	"slug" text NOT NULL,
	"profile_type" "profile_type" DEFAULT 'external' NOT NULL,
	"primary_email" text,
	"affiliation" text,
	"faculty_id" uuid,
	"department_id" uuid,
	"bio" text,
	"research_interests" jsonb,
	"profile_photo_url" text,
	"orcid_id" text,
	"openalex_author_id" text,
	"semantic_scholar_author_id" text,
	"scholar_profile_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "publication_contributors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"contributor_role" text DEFAULT 'author' NOT NULL,
	"author_order" integer DEFAULT 1 NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "publication_contributors_publication_profile_role_unique" UNIQUE("publication_id","profile_id","contributor_role")
);
--> statement-breakpoint
CREATE TABLE "publications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_by_user_id" uuid,
	"owning_profile_id" uuid,
	"department_id" uuid,
	"faculty_id" uuid,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"abstract" text,
	"summary" text,
	"publication_type" "publication_type" DEFAULT 'other' NOT NULL,
	"research_category" text,
	"keywords" jsonb,
	"publication_year" integer,
	"venue_name" text,
	"doi" text,
	"source_url" text,
	"document_url" text,
	"funding_information" text,
	"collaboration_details" text,
	"status" "record_status" DEFAULT 'draft' NOT NULL,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "review_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"publication_id" uuid,
	"patent_id" uuid,
	"actor_user_id" uuid,
	"from_status" "record_status",
	"to_status" "record_status",
	"decision" "review_decision" NOT NULL,
	"comment" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "review_events_single_subject_check" CHECK (((case when "review_events"."publication_id" is null then 0 else 1 end) + (case when "review_events"."patent_id" is null then 0 else 1 end)) = 1)
);
--> statement-breakpoint
CREATE TABLE "staff" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"staff_id" text,
	"university_email" text,
	"full_name" text NOT NULL,
	"title" text,
	"rank" text,
	"department_id" uuid,
	"faculty_id" uuid,
	"office_location" text,
	"phone" text,
	"employment_status" text,
	"profile_photo_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "user_role" NOT NULL,
	"faculty_id" uuid,
	"department_id" uuid,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_roles_faculty_admin_scope_check" CHECK ("user_roles"."role" != 'faculty_admin' or "user_roles"."faculty_id" is not null),
	CONSTRAINT "user_roles_department_admin_scope_check" CHECK ("user_roles"."role" != 'department_admin' or "user_roles"."department_id" is not null)
);
--> statement-breakpoint
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "departments" ADD CONSTRAINT "departments_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patent_contributors" ADD CONSTRAINT "patent_contributors_patent_id_patents_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patent_contributors" ADD CONSTRAINT "patent_contributors_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patents" ADD CONSTRAINT "patents_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patents" ADD CONSTRAINT "patents_owning_profile_id_profiles_id_fk" FOREIGN KEY ("owning_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patents" ADD CONSTRAINT "patents_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "patents" ADD CONSTRAINT "patents_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_contributors" ADD CONSTRAINT "publication_contributors_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publication_contributors" ADD CONSTRAINT "publication_contributors_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_owning_profile_id_profiles_id_fk" FOREIGN KEY ("owning_profile_id") REFERENCES "public"."profiles"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "publications" ADD CONSTRAINT "publications_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_publication_id_publications_id_fk" FOREIGN KEY ("publication_id") REFERENCES "public"."publications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_patent_id_patents_id_fk" FOREIGN KEY ("patent_id") REFERENCES "public"."patents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_events" ADD CONSTRAINT "review_events_actor_user_id_auth_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff" ADD CONSTRAINT "staff_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_auth_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."auth_users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_faculty_id_faculties_id_fk" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_department_id_departments_id_fk" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_created_by_user_id_auth_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."auth_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "auth_sessions_token_hash_unique" ON "auth_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "auth_sessions_user_id_idx" ON "auth_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "auth_sessions_expires_at_idx" ON "auth_sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_email_unique" ON "auth_users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "auth_users_university_email_unique" ON "auth_users" USING btree ("university_email") WHERE "auth_users"."university_email" is not null;--> statement-breakpoint
CREATE INDEX "auth_users_status_idx" ON "auth_users" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "departments_slug_unique" ON "departments" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "departments_faculty_id_idx" ON "departments" USING btree ("faculty_id");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_slug_unique" ON "faculties" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "faculties_name_unique" ON "faculties" USING btree ("name");--> statement-breakpoint
CREATE INDEX "patent_contributors_patent_id_idx" ON "patent_contributors" USING btree ("patent_id");--> statement-breakpoint
CREATE INDEX "patent_contributors_profile_id_idx" ON "patent_contributors" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "patents_slug_unique" ON "patents" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "patents_patent_number_unique" ON "patents" USING btree ("patent_number") WHERE "patents"."patent_number" is not null;--> statement-breakpoint
CREATE INDEX "patents_status_idx" ON "patents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "patents_department_id_idx" ON "patents" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "patents_faculty_id_idx" ON "patents" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "patents_patent_status_idx" ON "patents" USING btree ("patent_status");--> statement-breakpoint
CREATE INDEX "patents_owning_profile_id_idx" ON "patents" USING btree ("owning_profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "profiles_slug_unique" ON "profiles" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "profiles_user_id_idx" ON "profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "profiles_staff_id_idx" ON "profiles" USING btree ("staff_id");--> statement-breakpoint
CREATE INDEX "profiles_profile_type_idx" ON "profiles" USING btree ("profile_type");--> statement-breakpoint
CREATE INDEX "profiles_department_id_idx" ON "profiles" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "profiles_faculty_id_idx" ON "profiles" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "publication_contributors_publication_id_idx" ON "publication_contributors" USING btree ("publication_id");--> statement-breakpoint
CREATE INDEX "publication_contributors_profile_id_idx" ON "publication_contributors" USING btree ("profile_id");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_slug_unique" ON "publications" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "publications_doi_unique" ON "publications" USING btree ("doi") WHERE "publications"."doi" is not null;--> statement-breakpoint
CREATE INDEX "publications_status_idx" ON "publications" USING btree ("status");--> statement-breakpoint
CREATE INDEX "publications_publication_year_idx" ON "publications" USING btree ("publication_year");--> statement-breakpoint
CREATE INDEX "publications_department_id_idx" ON "publications" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "publications_faculty_id_idx" ON "publications" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "publications_publication_type_idx" ON "publications" USING btree ("publication_type");--> statement-breakpoint
CREATE INDEX "publications_owning_profile_id_idx" ON "publications" USING btree ("owning_profile_id");--> statement-breakpoint
CREATE INDEX "review_events_publication_id_idx" ON "review_events" USING btree ("publication_id");--> statement-breakpoint
CREATE INDEX "review_events_patent_id_idx" ON "review_events" USING btree ("patent_id");--> statement-breakpoint
CREATE INDEX "review_events_actor_user_id_idx" ON "review_events" USING btree ("actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "staff_user_id_unique" ON "staff" USING btree ("user_id") WHERE "staff"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_staff_id_unique" ON "staff" USING btree ("staff_id") WHERE "staff"."staff_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "staff_university_email_unique" ON "staff" USING btree ("university_email") WHERE "staff"."university_email" is not null;--> statement-breakpoint
CREATE INDEX "staff_department_id_idx" ON "staff" USING btree ("department_id");--> statement-breakpoint
CREATE INDEX "staff_faculty_id_idx" ON "staff" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "user_roles_user_id_idx" ON "user_roles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "user_roles_role_idx" ON "user_roles" USING btree ("role");--> statement-breakpoint
CREATE INDEX "user_roles_faculty_id_idx" ON "user_roles" USING btree ("faculty_id");--> statement-breakpoint
CREATE INDEX "user_roles_department_id_idx" ON "user_roles" USING btree ("department_id");