# OAU Research & Innovation Repository Implementation Plan

**Status:** Updated implementation plan after core repository build-out  
**Current baseline:** TanStack Start application with custom auth, profile management, publication and patent workflows, public search, and password/account settings already implemented  
**Primary goal:** Continue evolving the repository into a lecturer-centric research platform where published outputs and patents are publicly searchable, authenticated users can manage their own records, and lecturers/admins can bulk-import publication data from external academic sources instead of manually entering hundreds of records.

## 1. Guiding Decisions

### 1.1 Product direction

This project is a university research publication repository. The direction in `Group 4.md` is useful as a broad product brief, but it should not be treated as a fixed specification. The product should stay focused on these durable goals:

- Give the university a trusted place to store, review, publish, and discover research publications.
- Let lecturers and authorized staff create publication records without friction.
- Let department, faculty, and super-admin users review and manage publication records according to scope.
- Let public visitors search a polished catalogue of published publications, patents, and lecturer profiles.
- Treat automated publication import as a major next-stage capability, not a distant nice-to-have, because manual one-by-one entry does not scale for lecturers with 200+ publications.
- Keep patents and IPTTO-specific concerns separate from publications at the data-model level, but implement the patent tables and `iptto_officer` role as first-class core pieces.

### 1.2 Design direction

The visual direction in `docs/design.md.md` is a hard constraint. The interface should closely follow the Webflow-modern system described there:

- Clean, high-contrast, enterprise SaaS feel.
- Primary blue `#146ef5` for key actions, badges, links, and emphasis.
- Near-black `#080808` for main text and strong navigation.
- White canvas, light gray surfaces, thin borders, minimal shadows.
- Bold sans-serif typography with tight, premium hierarchy.
- Buttons with small radius, strong sizing, and restrained interaction states.
- No decorative gradients, glass effects, tropical/green theme, oversized radii, or heavy shadows.

Keep future UI work aligned with this direction; avoid reintroducing starter-style placeholder pages or visual patterns that conflict with the current polished public/app surfaces.

### 1.3 Engineering principles

- Build the boring core first: auth, sessions, roles, organization data, staff, profiles, publications, patents, direct publishing, and review/audit history.
- Build the first-party password/session system directly; do not introduce an external auth framework.
- Keep `profiles` independent from login accounts so publications and patents can be attributed to known users, staff-only people, and unknown external contributors.
- Keep lecturers in a general `staff` table; lecturer capability comes from a role assignment and related profile, not from a separate lecturer-only table.
- Use `publications` for research works and `patents` for patent records.
- Let lecturers publish their own records directly; review/audit tooling still exists for oversight, corrections, and admin-managed workflows.
- Use Drizzle migrations as the source of database evolution.
- Keep all authorization checks on the server; client checks are only for UX.
- Avoid direct Google Scholar scraping.
- Avoid over-engineered queues, microservices, analytics engines, or AI features in the first implementation pass.
- Public-facing queries must only return published records.
- Automated imports must write into staging/review tables first; imported candidates must never appear publicly until accepted into the normal publication workflow and published.

## 2. Current Implementation State

The project has moved beyond the starter baseline. The current implementation includes:

- TanStack Start / TanStack Router file-based routing under `src/routes`.
- React 19 and TanStack Query configured.
- Vite with Tailwind CSS v4.
- Drizzle ORM using `drizzle-orm/node-postgres`.
- Drizzle Kit configured against `src/db/schema.ts`.
- Custom first-party auth with sign-up, sign-in, sign-out, password reset, change password, secure sessions, multi-account browser session support, and a one-time admin creation script.
- Core schema for `auth_users`, `auth_sessions`, password-reset tokens, roles, faculties, departments, staff, profiles, publications, patents, contributors, and review events.
- Authorship mode on accounts/profiles so non-authors can hide authoring tools.
- Protected `/app` shell and dashboard.
- Profile view/edit flows.
- Publication and patent draft creation, detail pages, owner edit pages, owner publish/archive actions, filtered/paginated owner list pages, and redirect-to-detail after creation.
- Public root homepage focused on searching public publications and patents.
- Public routes for published publications, published patents, and author profiles.
- Public queries that filter publications/patents to `status = 'published'`.
- Migrations generated and applied through Drizzle.

The starter domain code and placeholder schema have been replaced. The next large product step is no longer basic auth or manual record CRUD; it is automated lecturer publication import and curation, followed by role/admin review expansion.

## 3. Recommended Stack Choices

### 3.1 Keep

- **TanStack Start:** App framework, server functions, API routes where needed, SSR-friendly routing.
- **TanStack Router:** File-based routes, protected layouts, public route groups.
- **TanStack Query:** Client cache for dashboards, review queues, search pages, and import status polling later.
- **Drizzle ORM:** Type-safe PostgreSQL schema, migrations, queries.
- **PostgreSQL:** Primary relational database.
- **Tailwind CSS v4:** Styling system, design tokens, utility-first layout.
- **shadcn-style component primitives:** Useful for accessible base components, but customized to match `docs/design.md.md`.

### 3.2 Already added

- **Zod:** Runtime validation for forms and server functions.
- **React Hook Form:** Form state for auth, profile editing, publication submission, and review actions.
- **Argon2id password hashing:** Implemented with `@node-rs/argon2`; store only password hashes.
- **Built-in Node crypto:** Generate session tokens with strong randomness and store only token hashes.

### 3.3 Avoid for now

- External auth frameworks or hosted auth services.
- A separate API server.
- A separate background worker service until import volume requires it; start with a controlled in-app worker/server-task approach.
- Elasticsearch/Meilisearch before the public catalogue exists.
- AI-generated summaries as an MVP dependency.
- Direct Google Scholar scraping.
- Mixing patent-specific fields into `publications` instead of using dedicated patent tables.

## 4. Target Application Structure

Use a feature-oriented structure while keeping shared infrastructure obvious.

```text
src/
  components/
    ui/
    layout/
    empty-state.tsx
    status-badge.tsx
  db/
    index.ts
    schema.ts
  features/
    auth/
    users/
    organization/
    staff/
    profiles/
    publications/
    review/
    patents/
    public-catalogue/
    imports/
  lib/
    auth.ts
    cookies.ts
    env.ts
    permissions.ts
    session.server.ts
    slug.ts
    validators.ts
  routes/
    __root.tsx
    index.tsx
    auth/
      sign-in.tsx
      sign-up.tsx
      forgot-password.tsx
      reset-password.tsx
    app/
      index.tsx
      settings.tsx
      profile.tsx
      profile.edit.tsx
      publications.index.tsx
      publications.create.tsx
      publications.$publicationId.tsx
      publications.$publicationId.edit.tsx
      patents.index.tsx
      patents.create.tsx
      patents.$patentId.tsx
      patents.$patentId.edit.tsx
      imports.index.tsx
    publications/
      index.tsx
      $publicationId.tsx
    patents/
      index.tsx
      $patentId.tsx
    authors/
      index.tsx
      $profileId.tsx
```

Do not split `src/db/schema.ts` immediately unless it becomes hard to navigate. A single schema file is acceptable for the first few migrations. If it grows too large, split into `src/db/schema/*.ts` and export from `src/db/schema/index.ts`, then update `drizzle.config.ts`.

## 5. Design System Implementation Plan

### 5.1 First design pass

Replace the current theme variables with tokens matching the design document:

| Token | Value | Usage |
| --- | --- | --- |
| `primary` | `#146ef5` | Main CTAs, links, active nav, important badges |
| `secondary` | `#080808` | Headlines, text, dark sections |
| `tertiary` / `border` | `#d8d8d8` | Dividers, card borders, inputs |
| `neutral` | `#ffffff` | Page and card canvas |
| `surface` | `#f0f0f0` | Muted cards, panels, table headers |
| `error` | `#d92d20` | Destructive and validation states |
| `muted` | `#6b7280` | Supporting copy |
| `tint` | `#eef4ff` | Subtle blue badges and highlights |

Typography should use the closest legally available equivalent to the design's `WF Visual Sans Variable`. If that exact font is unavailable, use a clean sans-serif fallback and keep the sizing, weight, and spacing close to the spec.

### 5.2 UI primitives

Create or customize these components before building feature screens:

- `Button`: primary, secondary, ghost/link, destructive.
- `Input`, `Textarea`, `Select`, `Checkbox`.
- `Card`, `Panel`, `SectionHeader`.
- `Badge` / `StatusBadge`.
- `Table` primitives for review queues and admin lists.
- `EmptyState` for zero records, zero results, and failed states.
- `PageShell` and `AppShell` for consistent spacing.

### 5.3 Layout rules

- Public pages should feel spacious, centered, and polished.
- App pages should be clearer and denser than marketing pages, but still use generous whitespace.
- Cards should use light surfaces, thin borders, compact padding, and minimal shadow.
- Tables should be readable, not visually heavy.
- The primary action on each page should be visually obvious and blue.
- Avoid complex animation until the core experience is stable.

## 6. Authentication and Authorization Plan

Auth should be implemented before domain workflows.

### 6.1 Auth goals

MVP auth must support:

- Sign up.
- Sign in.
- Sign out.
- Password hashing with Argon2id.
- Session persistence via secure cookies.
- Server-side session lookup.
- Protected app routes.
- Role-based access control.
- One-time super-admin creation script.
- Default `user` role assignment for every successful sign-up.
- Account records that can hold staff ID and university email relationships, even though format/domain enforcement is not active yet.

Post-MVP auth can add:

- Email verification.
- Email delivery for password reset links. The reset-token flow itself already exists; production email delivery still needs to be connected.
- Invite-only staff onboarding.
- OAuth if the university requires it.
- Two-factor authentication for admins.
- Enforced university email domains and staff ID formats once the institution confirms them.

### 6.2 First-party auth model

Build a small first-party password and session system directly on Drizzle/Postgres. Keep it deliberately simple, well-tested, and security-conscious.

Expected split:

- `auth_users` owns login identity, password hash, account status, and later email-verification state.
- `auth_sessions` owns browser sessions using random tokens stored in secure HTTP-only cookies, with only token hashes persisted in the database.
- `staff` owns staff-specific university information such as staff ID, university email, title/rank, department, and faculty.
- `profiles` owns public/attribution identity for publication and patent ownership; a profile may represent a known user, a staff member, or an unknown external contributor.
- `user_roles` owns roles and scopes.

Sign-up rules:

- Anyone may sign up with an email and password during the early build.
- The sign-up/account model should include staff ID and university email fields from the start, but absence or unverified format should not block basic registration yet.
- The new account receives only the plain `user` role.
- Staff ID and university email fields should exist early, but domain/format enforcement waits until the university provides reliable rules.
- Lecturer and admin capabilities are granted only by role assignment, not merely because someone typed a staff ID.
- A lecturer account should eventually be linked to a `staff` row and a `profile` row.

Sign-in rules:

- Initial sign-in can use email and password.
- Staff ID and university email should be treated as identity anchors for later matching and may become alternate sign-in identifiers once validation rules are confirmed.
- A staff ID or university email alone must never grant lecturer/admin permissions.

Password/session rules:

- Hash passwords with Argon2id.
- Never store plaintext passwords or raw session tokens.
- Generate session tokens with strong randomness.
- Store a hash of the session token in `auth_sessions`.
- Use secure, HTTP-only, same-site cookies.
- Add session expiration and server-side revocation from the beginning.
- Add rate limiting before production.

### 6.3 Route protection

Create route groups:

- Public routes: homepage, public publication search, public publication detail, public lecturer profiles.
- Auth routes: sign in, sign up, password reset later.
- App routes: dashboard, publication management, review queues, admin pages.

Every app route should load the session server-side. If no valid session exists, redirect to sign in. If the user lacks a required role, show a restrained access-denied page.

### 6.4 Role model

Use scoped role assignments rather than a single flat `role` column. This keeps the model flexible without becoming complex.

Initial roles:

- `user`: Default role for every registered account; can access basic account/profile flows only.
- `lecturer`: Can manage and publish publications/patents attributed to their linked profile.
- `iptto_officer`: Can manage patent/IPTTO metadata, patent records, and IPTTO-scoped review/audit work.
- `department_admin`: Department-scoped management and review.
- `faculty_admin`: Faculty-scoped management and review.
- `super_admin`: Full platform administration.

Avoid adding more roles until a real workflow needs them.

### 6.5 Permission rules

Create a single permission helper in `src/lib/permissions.ts`.

Examples:

- A plain user can manage only their account and allowed onboarding/profile fields.
- A lecturer can create, edit, and publish records attributed to their linked profile directly.
- A lecturer's direct publish action must still create an audit/review event.
- A department admin can review submitted publications in their department.
- A faculty admin can review submitted publications in their faculty.
- An IPTTO officer can manage patent/IPTTO metadata and patent-facing queues.
- A super admin can manage organization records, staff, profiles, users, and roles.
- Public visitors can only read published publications and public profiles.

Patent/IPTTO permissions should remain separate from publication permissions even though both are part of the core build.

Do not rely on hidden buttons for security. Server functions and API routes must enforce these checks.

### 6.6 Admin creation script

Add a safe one-time admin creation script:

- Add a script that connects directly to the database and creates the first admin account from the provided input.
- The script should create the `auth_users` row, hash the supplied password, add a valid `auth_sessions`-independent account record, and assign `super_admin` in `user_roles`.
- The script is intended to be run once by the developer/operator during setup; it should be idempotent enough to fail safely if an account already exists for the supplied email.
- After the first admin exists, user management should happen inside the app.

## 7. Core Data Model Plan

The first real schema migration should replace the `todos` table with custom auth, sessions, roles, organization, staff, and profile tables. Publications can follow immediately after that foundation is stable.

### 7.1 Custom auth tables

#### `auth_users`

Owns login identity and password credentials.

Important fields:

- `id`
- `email`
- `password_hash`
- `university_email`
- `staff_identifier`
- `status`
- `email_verified_at`
- `last_signed_in_at`
- `created_at`
- `updated_at`

Notes:

- `email` is required for sign-up and sign-in.
- `university_email` and `staff_identifier` should exist early because they will matter later, but their domain/format should not be enforced yet.
- New accounts receive only the `user` role.
- Lecturer/admin capabilities must come from role assignment and staff/profile linkage, not from unverified sign-up fields.

#### `auth_sessions`

Owns server-side session state.

Important fields:

- `id`
- `user_id`
- `token_hash`
- `expires_at`
- `last_seen_at`
- `ip_address`
- `user_agent`
- `revoked_at`
- `created_at`

Rules:

- Store only the hash of the session token.
- Send the raw token only in a secure, HTTP-only, same-site cookie.
- Delete or ignore expired/revoked sessions.

#### `user_roles`

Stores scoped roles.

Important fields:

- `id`
- `user_id`
- `role`
- `faculty_id`
- `department_id`
- `created_by_user_id`
- `created_at`

Rules:

- Every registered account gets `user`.
- `super_admin` should not need a faculty or department scope.
- `faculty_admin` should have a `faculty_id`.
- `department_admin` should have a `department_id`.
- `lecturer` should normally be linked to a `staff` row and a `profile` row.
- `iptto_officer` can be global initially, then scoped later if faculty/department/IPTTO structure requires it.

### 7.2 Organization tables

#### `faculties`

Stores high-level academic units.

Important fields:

- `id`
- `name`
- `slug`
- `description`
- `created_at`
- `updated_at`

#### `departments`

Stores departments under faculties.

Important fields:

- `id`
- `faculty_id`
- `name`
- `slug`
- `description`
- `created_at`
- `updated_at`

Constraints:

- Unique department slug.
- Unique department name per faculty.

### 7.3 Staff and attribution profile tables

#### `staff`

Stores university staff-specific information. This is where lecturers are tracked.

Important fields:

- `id`
- `user_id`
- `staff_id`
- `university_email`
- `full_name`
- `title`
- `rank`
- `department_id`
- `faculty_id`
- `office_location`
- `phone`
- `employment_status`
- `profile_photo_url`
- `created_at`
- `updated_at`

Notes:

- `user_id` references `auth_users.id` and should be nullable so staff rows can be created before account signup.
- `staff_id` and `university_email` are important identity anchors, but strict validation waits until the university confirms the real format/domain.
- Lecturers are staff members with a `lecturer` role assignment and a linked attribution profile.
- Admins can also be staff members; admin ability still comes from roles, not the staff row alone.

#### `profiles`

Stores public and attribution identity independently from login accounts. Publications and patents are attributed to profiles, not directly to auth users.

Important fields:

- `id`
- `user_id`
- `staff_id`
- `display_name`
- `slug`
- `profile_type`
- `primary_email`
- `affiliation`
- `faculty_id`
- `department_id`
- `bio`
- `research_interests`
- `profile_photo_url`
- `orcid_id`
- `openalex_author_id`
- `semantic_scholar_author_id`
- `scholar_profile_url`
- `created_at`
- `updated_at`

Rules:

- `profile_type` should support values such as `staff`, `external`, and `organization` if needed later.
- A known lecturer profile links to both `staff.id` and `auth_users.id` when the user account exists.
- An unknown external contributor has a profile row without `user_id` or `staff_id`.
- This table is the owner/contributor layer for publications and patents.
- Public lecturer pages should be built from `profiles` joined to `staff` where relevant.

### 7.4 Publication tables

#### `publications`

Stores research works, journal articles, conference papers, book chapters, datasets, and similar publication outputs.

Important fields:

- `id`
- `created_by_user_id`
- `owning_profile_id`
- `department_id`
- `faculty_id`
- `title`
- `slug`
- `abstract`
- `summary`
- `publication_type`
- `research_category`
- `keywords`
- `publication_year`
- `venue_name`
- `doi`
- `source_url`
- `document_url`
- `funding_information`
- `collaboration_details`
- `status`
- `published_at`
- `created_at`
- `updated_at`

Recommended `status` values:

- `draft`
- `submitted`
- `department_review`
- `faculty_review`
- `changes_requested`
- `approved`
- `published`
- `rejected`
- `archived`

Notes:

- `owning_profile_id` points to the profile that owns or primarily represents the publication.
- Auth users create and edit records, but attribution stays on profiles.
- Publications stay separate from patents, but both can share ownership, status, audit, and public-visibility patterns.
- Lecturers can publish their own publication records directly; optional review remains available for administrative oversight.

#### `publication_contributors`

Connects publications to profiles.

Important fields:

- `id`
- `publication_id`
- `profile_id`
- `contributor_role`
- `author_order`
- `is_primary`
- `created_at`

Rules:

- Every publication should have at least one contributor profile.
- External co-authors are represented as `profiles` rows instead of free-text-only fields.
- Preserve author order.

#### `publication_files`

Optional in early MVP if only links are used. Add when document uploads are implemented.

Important fields:

- `id`
- `publication_id`
- `uploaded_by_user_id`
- `file_url`
- `file_name`
- `file_type`
- `file_size`
- `visibility`
- `created_at`

### 7.5 Patent tables

Patents should be implemented alongside publications but stored separately. This keeps the core publication workflow clean while still making patents and IPTTO work first-class in the system.

#### `patents`

Important fields:

- `id`
- `created_by_user_id`
- `owning_profile_id`
- `department_id`
- `faculty_id`
- `title`
- `slug`
- `abstract`
- `summary`
- `patent_number`
- `application_number`
- `filing_date`
- `grant_date`
- `jurisdiction`
- `patent_status`
- `source_url`
- `document_url`
- `commercialization_status`
- `industry_partner`
- `status`
- `published_at`
- `created_at`
- `updated_at`

Recommended `patent_status` values:

- `potential`
- `disclosed`
- `filed`
- `granted`
- `licensed`
- `abandoned`

#### `patent_contributors`

Connects patents to owner/inventor profiles.

Important fields:

- `id`
- `patent_id`
- `profile_id`
- `contributor_role`
- `inventor_order`
- `is_primary`
- `created_at`

Patent creation, management, and publishing should follow the same broad ownership and status patterns as publications while keeping patent-specific metadata in the patent tables.

### 7.6 Review workflow tables

#### `review_events`

Immutable audit trail of review actions.

Important fields:

- `id`
- `publication_id`
- `patent_id`
- `actor_user_id`
- `from_status`
- `to_status`
- `decision`
- `comment`
- `created_at`

Recommended `decision` values:

- `submitted`
- `approved`
- `changes_requested`
- `rejected`
- `published`
- `archived`

Rules:

- Review events can be attached to either publications or patents from the start.
- Exactly one review subject should be present: `publication_id` or `patent_id`.
- Direct lecturer publishing should still create a review/audit event with a `published` decision.
- This is preferable to storing review comments directly on `publications` or `patents`, because it preserves the institutional trail.

### 7.7 Public search support

For MVP, do not create a separate search service. Use PostgreSQL queries filtered by `status = 'published'`.

Indexes to add early:

- `publications.status`
- `publications.publication_year`
- `publications.department_id`
- `publications.faculty_id`
- `publications.publication_type`
- Unique or partial unique index on `publications.doi` where not null.
- Unique index on `publications.slug`.
- Unique index on `profiles.slug`.
- Unique index on `staff.staff_id` where not null.
- Unique index on `staff.university_email` where not null.
- `patents.status`
- `patents.department_id`
- `patents.faculty_id`
- `patents.patent_status`
- Unique index on `patents.slug`.
- Unique or partial unique index on `patents.patent_number` where not null.

If search becomes slow or inaccurate, add PostgreSQL full-text search later.

## 8. Core User Journeys

### 8.1 Public visitor

Can:

- View homepage.
- Search published publications.
- Search published patents.
- Filter by lecturer/profile, department, year, keyword, publication type, and patent status.
- View published publication detail.
- View published patent detail.
- View public lecturer/profile pages.
- View public department/faculty summary pages later.

Cannot:

- See drafts, submitted records, import candidates, rejected records, unpublished patents, or internal review comments.

### 8.2 Registered user

Can:

- Sign up with email and password.
- Sign in and sign out.
- Hold the default `user` role.
- Manage basic account details.
- Provide staff ID and university email information for later matching.

Cannot:

- Create lecturer-owned publications unless granted `lecturer`.
- Review or publish records.
- Self-promote to lecturer or admin.

### 8.3 Lecturer

Can:

- Sign in with a verified account that has the `lecturer` role.
- Be linked to a `staff` row and a `profiles` row.
- Complete their public attribution profile.
- Create draft publications attributed to their profile.
- Create draft patent records attributed to their profile.
- Add publication metadata, abstract, summary, keywords, DOI/source URL, and contributors.
- Add patent metadata such as patent number, filing/grant dates, jurisdiction, inventors, and commercialization details.
- Publish their own publication and patent records directly.
- Optionally send records through review when department/faculty/IPTTO oversight is needed.
- See review status and change requests.
- Edit drafts and records returned for changes.

Later:

- Link ORCID/OpenAlex/Semantic Scholar IDs to their profile.
- Import publication candidates in bulk.
- Re-sync for new publications.

### 8.4 Department admin

Can:

- View publications submitted within their department.
- View patents submitted or published within their department.
- Approve, reject, or request changes depending on workflow stage.
- Manage department-scoped staff/profile metadata if permitted.
- View department-level counts.

### 8.5 Faculty admin

Can:

- Review publications across departments in their faculty.
- Review patents across departments in their faculty.
- View faculty-level publication output.
- Manage faculty-scoped department metadata if permitted.

### 8.6 Super admin

Can:

- Manage users and role assignments.
- Manage staff records.
- Manage profiles, including external contributor profiles.
- Manage faculties and departments.
- View platform-wide dashboard.
- Override or archive records when necessary.
- Configure import sources later.
- Manage patent/IPTTO permissions and configuration.

### 8.7 IPTTO officer

IPTTO officers are part of the initial role model. They can:

- Manage patent records in the `patents` table.
- Attribute patents to profiles.
- Track patent status, filing details, inventors, commercialization status, and partners.
- Review and publish patent records without changing the publication workflow.
- Curate IPTTO-specific metadata and dashboard views.

## 9. Route Plan

### 9.1 Public routes

- `/`: Public search entry focused on publications and patents.
- `/publications`: Public catalogue of published publications.
- `/publications/$publicationId`: Public publication detail.
- `/authors`: Public author/profile directory.
- `/authors/$profileId`: Public author/profile page.
- `/departments`: Public department listing later.
- `/departments/$slug`: Public department profile later.
- `/patents`: Public patent catalogue.
- `/patents/$patentId`: Public patent detail.

### 9.2 Auth routes

- `/auth/sign-in`: Sign in form.
- `/auth/sign-up`: Sign up form.
- `/auth/forgot-password`: Password reset request form. Currently generates a reset link in-app; production email delivery is still pending.
- `/auth/reset-password`: Password reset completion form.

### 9.3 App routes

- `/app`: Authenticated app shell.
- `/app`: Role-aware dashboard/home.
- `/app/settings`: Authorship settings and change-password form.
- `/app/profile`: Current user's linked attribution profile, when one exists.
- `/app/profile/edit`: Create/update current user's attribution profile.
- `/app/publications`: User's publications or scoped publications for admins.
- `/app/publications/create`: Create publication.
- `/app/publications/$publicationId`: View internal publication record.
- `/app/publications/$publicationId/edit`: Edit owner publication record.
- `/app/review`: Publication review queue.
- `/app/review/$publicationId`: Publication review detail.
- `/app/admin/users`: User and role management.
- `/app/admin/staff`: Staff management.
- `/app/admin/profiles`: Profile and contributor management.
- `/app/admin/organization`: Faculties and departments.
- `/app/admin/imports`: Later import health dashboard.
- `/app/patents`: Patent management.
- `/app/patents/create`: Create patent.
- `/app/patents/$patentId`: View internal patent record.
- `/app/patents/$patentId/edit`: Edit owner patent record.
- `/app/iptto`: IPTTO officer workspace.
- `/app/imports`: Lecturer/admin initiated publication import workspace to add in the automated import phase.

## 10. Implementation Phases

### Phase 0: Completed foundation and product shell

Status: substantially complete.

Completed outcomes:

- Custom auth, sessions, sign-up, sign-in, sign-out, password reset, and change password.
- Account authorship mode and settings.
- Faculties, departments, staff/profile foundations, publications, patents, contributors, and review event schema.
- Protected app shell and dashboard.
- Profile creation/editing and profile view.
- Publication and patent creation, owner list pages, detail pages, edit pages, self-publish, and archive actions.
- Public search entry on the root homepage.
- Public published publication and patent list/detail pages.
- Public author profile list/detail pages.
- Drizzle migrations and route generation integrated into the workflow.

Remaining cleanup:

- Update README/setup docs to reflect the current product and migrations.
- Add `.env.example` if missing.
- Add production email delivery for password reset links.
- Add rate limiting for auth and password reset endpoints before production.

### Phase 1: Stabilize existing publication and patent workflows

Goal: Make the implemented owner/public workflows production-ready before adding more complexity.

Tasks:

- Add review/audit event writes for self-publish/archive actions.
- Ensure owner edit/publish/archive permissions are enforced consistently on every server function.
- Add admin review queues for department/faculty/IPTTO roles.
- Add reviewer actions: submit, approve, request changes, reject, publish, archive.
- Add status transition helpers shared by publications and patents.
- Add tests for status transitions and permission helpers.
- Add SEO metadata and polished empty states for public pages.

Done when:

- Owner and reviewer transitions are fully server-enforced.
- Self-publish/archive actions leave an audit trail.
- Public pages still expose only published records.
- Admins have a clear review queue for scoped records.

### Phase 2: Automated publication import foundation — high priority

Goal: Implement the lecturer-centric automated import flow described in `docs/lecturer-profile-automated-publication-import-spec.md`, so lecturers with 200+ publications can import and curate records instead of typing them one by one.

This phase is important because manual entry cannot populate the repository at institutional scale. Imports may be initiated by:

- Lecturers importing their own records from their profile/dashboard.
- Department/faculty admins importing on behalf of lecturers in their scope.
- Super admins importing or repairing records for any lecturer.

Core tasks:

- Extend `profiles` with import state if needed: `import_status`, `last_synced_at`, and confirmed source IDs already partially represented by `orcid_id`, `openalex_author_id`, `semantic_scholar_author_id`, and `scholar_profile_url`.
- Add import tracking tables: `import_jobs`, `fetched_publication_candidates`, and optional source/raw-response cache tables.
- Add shared import-source interface:
  - `searchAuthor(input): Promise<AuthorCandidate[]>`
  - `fetchWorks(authorId): Promise<FetchedPublicationCandidate[]>`
- Build the OpenAlex adapter first as the primary free source.
- Build ORCID support for unambiguous author resolution when an ORCID iD exists.
- Add Semantic Scholar as a secondary source to fill OpenAlex gaps.
- Add Crossref only as DOI metadata enrichment, not as primary discovery.
- Add CSV/BibTeX upload as the guaranteed fallback for local journals, unindexed proceedings, book chapters, and Scholar-exported citation files.
- Add Google Scholar only through a legitimate paid API such as SerpApi, and only as an optional supplementary source after OpenAlex/ORCID/Semantic Scholar/CSV are stable. Do not scrape Google Scholar directly.

Author matching tasks:

- Let lecturers/admins search candidates by name + institution/department, never name alone.
- Show candidate author matches with institution, publication count, field/context, and sample titles.
- Allow ORCID to skip ambiguous matching when present.
- Store confirmed external author IDs on the profile so future syncs use direct ID lookup.

Async/job tasks:

- Create queued import jobs and return immediately to the UI.
- Process imports asynchronously or through a controlled worker/server task that can paginate through 200+ works.
- Persist candidates incrementally so partial progress is visible.
- Track `queued`, `running`, `succeeded`, `failed`, and `partial` statuses.
- Poll job status from the frontend until the Review Import screen is ready.

Review Import tasks:

- Build a large-list review UI with select-all/select-none, source/year/venue filters, confidence flags, and running counters.
- Support bulk Keep, bulk Discard, and per-item Edit before acceptance.
- Keep low-confidence or no-DOI records visually flagged.
- Retain discarded candidates so they do not reappear on re-sync.
- Promote kept candidates into draft `publications` with provenance fields or back-reference to the source candidate.
- Ensure accepted records enter the existing Draft → Review/Publish workflow and are not public until published.

Dedup tasks:

- Use DOI as the primary dedup key.
- Fall back to normalized title + year when DOI is missing.
- Add fuzzy title similarity later for formatting differences between sources.
- Merge duplicate candidates across OpenAlex, ORCID, Semantic Scholar, CSV/BibTeX, and optional Scholar rather than showing repeated cards.
- Run the same dedup logic against existing accepted publications on re-sync.

Done when:

- A lecturer can confirm an OpenAlex or ORCID identity and fetch a large publication list.
- An admin can start the same import flow for a lecturer/profile within their scope.
- Fetched records appear as non-public candidates with source tags and confidence metadata.
- Bulk review can keep/discard/edit hundreds of candidates efficiently.
- Kept candidates become draft publications with DOI/source/provenance attached.
- No imported candidate can leak into public search before publication.

### Phase 3: Import expansion and re-sync

Goal: Increase source coverage and make imports operationally reliable.

Tasks:

- Add Semantic Scholar adapter.
- Add ORCID works import if ORCID profile data is available beyond author identity.
- Add Crossref DOI enrichment.
- Add CSV/BibTeX upload parsing and review.
- Add re-sync that surfaces only genuinely new candidates.
- Add source-level rate limiting and cache reuse.
- Add retry failed source/job flow.
- Add import provenance badges on internal detail pages and reviewer views.

Done when:

- Lecturers/admins can combine multiple sources without duplicates.
- Re-sync does not re-surface accepted or discarded records.
- Source errors produce partial imports rather than dead ends.

### Phase 4: Admin-managed lecturer rollout

Goal: Let departments/faculties bootstrap profiles for lecturers before every lecturer signs up.

Tasks:

- Allow department/faculty admins and super admins to create skeleton lecturer profiles with name, department, faculty, staff email, and staff ID.
- Match new login accounts to skeleton profiles by verified email/staff identifier when possible.
- Add admin import action for skeleton or claimed profiles.
- Add import status per lecturer: not started, queued, running, review needed, succeeded, failed, partial.
- Add department/faculty rollout views showing which lecturers have imported and how many records are published/draft/pending.

Done when:

- Admins can prepare lecturer profiles ahead of self-service onboarding.
- Lecturers who later log in can claim or continue from the prepared profile.
- Departments can track import rollout progress.

### Phase 5: IPTTO and innovation workflow expansion

Goal: Strengthen patent/IPTTO workflows without contaminating publication metadata.

Tasks:

- Build IPTTO officer workspace.
- Add patent/IP/commercialization queues.
- Add flags on imported or manual records that may need IPTTO review.
- Add patent/prototype/commercialization metadata screens as needed.
- Add scoped IPTTO reports.

Done when:

- IPTTO officers can manage patent-facing workflows separately from publications.
- Publication imports can flag IP-relevant records without making every publication a patent.

### Phase 6: Reporting, quality, and production readiness

Goal: Prepare the platform for institutional use.

Tasks:

- Add role-aware dashboard/reporting metrics for lecturers, admins, IPTTO officers, and super admins.
- Add export/report views for publication counts, patent counts, import health, source counts, and department/faculty summaries.
- Add tests for auth, sessions, imports, deduplication, permissions, and status transitions.
- Add logging for auth failures, import jobs, review actions, and publish/archive actions.
- Add production database backup plan and deployment runbook.

Done when:

- The app can support a pilot rollout with real lecturers, imports, review, public discovery, and operational visibility.

## 11. MVP Cutline

### MVP should include

- First-party auth and sessions.
- Default `user` role on sign-up.
- Role assignments.
- Faculties and departments.
- Staff records.
- Independent profiles for attribution.
- Manual publication creation.
- Manual patent creation.
- Direct lecturer publishing.
- Publication and patent review/audit workflow.
- IPTTO officer role.
- Public published publication catalogue.
- Public published patent catalogue.
- Basic public lecturer/profile pages.
- Basic dashboards.
- Automated publication import foundation for lecturer profiles:
  - OpenAlex author matching/fetch as the first source.
  - ORCID ID support for unambiguous lecturer identity when available.
  - Non-public import candidates with bulk review.
  - Candidate promotion into draft publications.
  - Admin-initiated and lecturer-initiated import starts.

### MVP should not depend on

- AI summaries.
- Direct Google Scholar scraping.
- Paid Google Scholar/SerpApi integration.
- Full-text search service.
- Complex notification system.
- Fine-grained report builder.
- Multi-tenant institution support.

## 12. Data and Workflow Rules

### 12.1 Auth account rules

- New sign-ups require only email and password for now.
- New sign-ups receive only `user`.
- Staff ID and university email are stored for future matching but not strictly validated yet.
- Users cannot self-assign `lecturer` or admin roles.
- Role elevation requires super-admin action or a controlled future staff-matching flow.

### 12.2 Publication status rules

- New publications start as `draft`.
- Only allowed owners/editors can edit drafts.
- Lecturers can publish their own publications directly when the publication is attributed to their linked profile.
- Submitted publications cannot be edited freely unless returned for changes.
- Reviewers act only within their scope.
- Publishing must be an explicit transition and must write an audit/review event.
- Public publication queries must always filter for `published`.

### 12.3 Patent status rules

- New patents start as `draft`.
- Patents are stored in `patents`, not `publications`.
- Patent contributors should also be profiles.
- Lecturers can publish their own patent records directly when permitted by the product policy and ownership rules.
- IPTTO officers can manage patent/IPTTO metadata and patent-facing queues.
- Public patent queries must always filter for `published`.

### 12.4 IPTTO rules

- `iptto_officer` is an initial role.
- IPTTO metadata belongs with patent-specific tables/workflows, not in `publications`.
- IPTTO officers should be able to curate patent status, commercialization details, partner details, and dashboard views.
- IPTTO work should not complicate normal publication fields.

### 12.5 Profile attribution rules

- Publications and patents are attributed to profiles, not directly to auth users.
- A profile can represent a known auth user, a staff member without an account, or an external contributor.
- Known lecturer profiles should link to both `staff` and `auth_users` where available.
- Do not require every contributor to create an account.
- Preserve contributor order.

### 12.6 Slug rules

- Generate slugs from publication titles and profile names.
- Keep slugs stable after publication unless an admin changes them.
- Add a suffix for duplicates.

### 12.7 DOI rules

- Store DOI in normalized form where possible.
- Make DOI unique where not null if the university expects one record per DOI.
- Allow publications without DOI because local proceedings and some outputs may not have one.

## 13. Validation and Testing Strategy

### 13.1 During development

- Run TypeScript/build checks after significant changes.
- Run Drizzle migration generation after schema changes.
- Use focused manual QA for auth and role flows.
- Keep form validation schemas close to server actions.

### 13.2 Tests to add when logic stabilizes

- Password hashing and verification tests.
- Session creation, lookup, expiration, and revocation tests.
- Permission helper unit tests.
- Publication status transition unit tests.
- Patent status transition unit tests.
- Direct publishing audit-event tests.
- Slug generation tests.
- DOI normalization tests.
- Import deduplication tests when imports are added.

Do not introduce a large test framework before there is enough domain logic to justify it.

## 14. Security Notes

- Never trust client-submitted role or user IDs without server-side verification.
- Store only password hashes, never plaintext passwords.
- Store only session token hashes, never raw session tokens.
- Use secure, HTTP-only, same-site cookies for session tokens.
- Keep auth/session secrets out of source control.
- Rate-limit auth endpoints before production.
- Validate all write operations with Zod or equivalent runtime validation.
- Check ownership and role scope on every write.
- Keep public queries narrow and explicit.
- Avoid exposing raw import payloads to public users.

## 15. Deployment Considerations

The project can deploy as a Node-compatible TanStack Start/Nitro app.

Before production:

- Confirm hosting target.
- Confirm database provider.
- Configure `DATABASE_URL` securely.
- Configure auth/session secrets and app URL.
- Run migrations in deployment pipeline.
- Decide file storage provider if document uploads are enabled.
- Add backups for PostgreSQL.
- Add logging for auth failures, review actions, and import jobs later.

## 16. Next Implementation Sprint

The next coding sprint should focus on automated publication import foundation and productionizing the account workflows that already exist.

Recommended task order:

1. Add import schema changes for `import_jobs`, fetched publication candidates, source/provenance metadata, candidate status, and dedup keys.
2. Extend lecturer profiles with import status, last-sync timestamp, and confirmed external source IDs where needed.
3. Build the shared import-source adapter interface from `docs/lecturer-profile-automated-publication-import-spec.md`.
4. Implement OpenAlex author search and works fetch as the first adapter.
5. Add ORCID ID lookup/support so lecturers with ORCID records can skip ambiguous author matching.
6. Create server functions for lecturers to start imports for their own profile and admins to start imports for profiles in scope.
7. Add queued/running/succeeded/failed/partial import job tracking with incremental candidate persistence.
8. Build the Review Import UI with filtering, confidence flags, select-all/select-none, bulk keep, bulk discard, and per-item edit.
9. Promote kept candidates into draft publications that continue through the existing draft/publish workflow.
10. Add deduplication against DOI first, then normalized title + year, and retain discarded candidates for future re-sync suppression.
11. Connect password reset to production email delivery instead of relying on in-app generated reset links.
12. Add focused tests for import deduplication, permission boundaries, and publication promotion.

Success criteria for the sprint:

- A lecturer can start an OpenAlex/ORCID-backed import for their own profile.
- An authorized admin can start the same import for a lecturer/profile within scope.
- Imported records remain non-public candidates until explicitly kept and later published.
- Bulk review works for hundreds of candidate records without duplicating accepted or discarded publications.
- Password reset is ready for production email delivery.

## 17. Open Questions

- What exact staff ID format should be validated later?
- What university email domain or domains should be enforced later?
- Which faculties and departments should be seeded first?
- What post-publish oversight should admins have after lecturer direct publishing?
- Should document uploads be part of MVP, or should MVP use DOI/source URLs only?
- Is there an email provider available for verification and password reset later?
- What hosting target should be used for the first deployment?
- Which IPTTO metadata fields are required for the first patent workflow?

These questions do not block auth and core model setup, but they should be answered before the publication review workflow is finalized.
