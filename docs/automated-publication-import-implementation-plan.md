# Automated Lecturer Publication Import — Implementation Plan

**Status:** Draft for implementation  
**Feature specification:** `docs/lecturer-profile-automated-publication-import-spec.md`  
**Application baseline:** TanStack Start, React 19, PostgreSQL, Drizzle ORM, custom sessions/RBAC  
**Initial source:** OpenAlex  
**Later sources:** Semantic Scholar, ORCID, Crossref enrichment, CSV/BibTeX  
**Explicitly deferred:** Google Scholar scraping/SerpApi

## 1. Objective

Allow a lecturer or an authorized administrator to identify the lecturer in an external scholarly database, fetch a catalogue containing hundreds of works, deduplicate it, review it in bulk, and promote selected records into the existing publication workflow.

The implementation must preserve these invariants:

- Fetched data is staging data and is never returned by public catalogue queries.
- A human confirms an external author identity before its works are imported.
- No candidate becomes a publication until the lecturer or an authorized administrator keeps it.
- Imported publications use the same status and visibility rules as manually created publications.
- Re-sync never asks the lecturer to reconsider an accepted or discarded work unless they explicitly restore it.
- Import failures are recoverable and do not discard candidates already fetched.

## 2. Scope and release cut

### 2.1 MVP

The MVP includes:

- Import entry point on the lecturer dashboard/profile.
- OpenAlex author search using name and institutional context.
- Human confirmation of the correct OpenAlex author.
- Persisted OpenAlex author ID on the existing `profiles` row.
- Database-backed asynchronous import jobs.
- Full OpenAlex works pagination.
- Incremental candidate persistence and progress reporting.
- DOI and normalized-title/year deduplication.
- Review screen supporting 200+ candidates, filters, pagination, selection, and bulk decisions.
- Editing a candidate before promotion.
- Promotion of kept candidates into draft publications.
- Retry, partial-success, zero-result, and failure states.
- Lecturer self-import and scoped admin-on-behalf-of import.
- Audit/provenance data and focused automated tests.

### 2.2 Follow-up releases

- Semantic Scholar author search and works import.
- ORCID OAuth connection and works import.
- Crossref DOI metadata enrichment.
- CSV and BibTeX uploads.
- Re-sync and scheduled discovery of new works.
- Import-health dashboards and operational reporting.
- Optional IP/commercialization flag routing.

### 2.3 Out of scope for MVP

- Direct Google Scholar scraping.
- Paid SerpApi integration.
- Automatically publishing imported records.
- Automatically choosing an author when multiple plausible matches exist.
- Creating public profiles from arbitrary external author results.
- Downloading or storing copyrighted full-text articles.
- Citation analytics beyond storing the source-provided count and observation time.

## 3. Decisions required before coding

These decisions affect architecture or acceptance criteria and should be confirmed at kickoff:

1. **Post-import status:** Recommended: every promoted candidate starts as `draft`. The current application permits owners to publish their own records directly, while the feature spec describes a formal review pipeline. Import implementation should not silently change that existing policy; it should create drafts and then use whichever publish/review transitions the application adopts.
2. **Deployment/runtime:** Confirm where the web app and worker will run. Long imports must not depend on an HTTP request remaining alive or on unawaited work in a serverless function.
3. **Admin scope:** Confirm whether department and faculty admins may merely initiate/review imports or may also promote candidates on a lecturer's behalf.
4. **Institution matching:** Agree on canonical OAU/OpenAlex institution identifiers and acceptable affiliation aliases.
5. **Retention:** Recommended: retain raw payloads and discarded candidates for one year, then archive or delete under an approved retention policy.

None of these blocks local adapter and schema development, but they must be settled before production rollout.

## 4. Target user journey

### 4.1 First import

1. Lecturer opens `/app/imports` and sees their existing profile details.
2. The form is prefilled with display name, department, faculty, and affiliation. The lecturer may add an ORCID iD.
3. The server searches enabled sources. In MVP this is OpenAlex only.
4. The lecturer sees author candidates with institution, field/topics, works count, IDs, and sample works.
5. The lecturer selects and confirms the correct author.
6. The server saves the confirmed external author identity and creates an import batch and source job.
7. A worker fetches every works page, normalizes records, deduplicates them, and persists candidates incrementally.
8. The progress page polls job state and displays processed/found/created/duplicate counts.
9. When data is available, the lecturer reviews candidates using filters and bulk actions.
10. The lecturer keeps, edits, or discards candidates.
11. Confirming kept candidates creates draft `publications` and links each publication back to its candidate/source records.
12. The lecturer continues through the existing publication edit/publish or review flow.

### 4.2 Re-sync

1. Lecturer clicks **Check for new publications**.
2. The server uses confirmed external IDs; it does not repeat fuzzy author search.
3. A new import batch fetches current works.
4. Deduplication checks publications plus all previously decided candidates.
5. Only new or materially changed candidates are shown.
6. Previously discarded records stay suppressed but remain restorable from import history.

### 4.3 Admin-on-behalf-of flow

1. Admin selects a lecturer profile within their authorized department/faculty scope.
2. Admin starts or resumes the same import workflow.
3. Every action records the acting user and target profile.
4. Server-side scope checks run on author search, identity confirmation, job creation, candidate decisions, and promotion.

## 5. Architecture

```text
TanStack routes/components
        |
TanStack server functions / HTTP endpoints
        |
Import service layer ---------------- Permission service
        |
PostgreSQL (batches, jobs, candidates, source records, publications)
        ^
Database-backed worker
        |
Source adapters (OpenAlex, later Semantic Scholar/ORCID/Crossref/files)
```

### 5.1 Module layout

Add a feature-oriented import module:

```text
src/features/imports/
  adapters/
    types.ts
    openalex.server.ts
    semantic-scholar.server.ts       # later
    orcid.server.ts                  # later
    crossref.server.ts               # later
  services/
    author-search.server.ts
    jobs.server.ts
    normalize.server.ts
    deduplicate.server.ts
    candidates.server.ts
    promote.server.ts
  schemas.ts
  types.ts
  components/
    author-search-form.tsx
    author-candidate-card.tsx
    import-progress.tsx
    candidate-filters.tsx
    candidate-table.tsx
    bulk-action-bar.tsx
    candidate-editor.tsx

src/routes/app/imports/
  index.tsx
  author.tsx
  $batchId.tsx
  $batchId.review.tsx
  history.tsx

scripts/
  import-worker.ts
```

Keep credentials, adapters, normalization, deduplication, permissions, and database mutations in server-only modules.

### 5.2 Adapter contract

```ts
type ImportSource = 'openalex' | 'semantic_scholar' | 'orcid' | 'csv' | 'bibtex'

interface PublicationImportAdapter {
  source: ImportSource
  searchAuthors(input: AuthorSearchInput): Promise<AuthorCandidate[]>
  fetchWorks(input: FetchWorksInput): AsyncIterable<FetchWorksPage>
}
```

`FetchWorksPage` must expose records plus pagination/progress information. Upload adapters may implement a separate file-parsing entry point, but their output must use the same normalized candidate contract.

Adapters return source data; they do not write to the database and do not make permission decisions.

## 6. Database plan

### 6.1 Extend existing enums and `profiles`

Add:

- `import_source`: `openalex`, `semantic_scholar`, `orcid`, `crossref`, `csv`, `bibtex`, `manual`.
- `import_batch_status`: `draft`, `queued`, `running`, `review_ready`, `partial`, `failed`, `completed`, `cancelled`.
- `import_job_status`: `queued`, `running`, `succeeded`, `failed`, `cancelled`.
- `candidate_decision`: `pending`, `kept`, `edited`, `discarded`, `promoted`.
- `author_identity_status`: `suggested`, `confirmed`, `rejected`, `revoked`.

Extend `profiles` with:

- `importStatus` for profile-level display state.
- `lastSyncedAt`.
- `lastSuccessfulImportAt`.

The existing `orcidId`, `openalexAuthorId`, `semanticScholarAuthorId`, and `scholarProfileUrl` fields remain useful for fast access. The normalized identity table below becomes the source of truth for confirmation, provenance, and additional sources.

### 6.2 `profile_external_identities`

Fields:

- `id` UUID primary key.
- `profile_id` FK to `profiles`.
- `source` enum.
- `external_author_id` text.
- `canonical_url` nullable text.
- `status` author identity status.
- `match_context` JSONB containing candidate institution, topics, sample works, and source score.
- `confirmed_by_user_id` nullable FK.
- `confirmed_at`, `revoked_at`, timestamps.

Constraints/indexes:

- Unique `(profile_id, source)` for an active confirmed identity.
- Unique `(source, external_author_id, profile_id)`.
- Index source and external author ID.

### 6.3 `publication_import_batches`

One user-visible import/re-sync operation, possibly containing several source jobs.

Fields:

- `id`, `profile_id`, `created_by_user_id`.
- `kind`: `initial`, `resync`, `file_upload`, `repair`.
- `status`.
- `total_source_count`, `completed_source_count`, `failed_source_count`.
- `raw_result_count`, `candidate_count`, `new_candidate_count`, `duplicate_count`, `promoted_count`.
- `started_at`, `finished_at`, `created_at`, `updated_at`.

Indexes: profile/date, status/date, creator/date.

### 6.4 `publication_import_jobs`

One executable source task inside a batch.

Fields:

- `id`, `batch_id`, `profile_id`, `source`.
- `status`, `attempt_count`, `max_attempts`.
- `external_author_id`.
- `cursor` nullable text/JSONB for resumable pagination.
- `expected_count`, `processed_count`, `created_count`, `duplicate_count`, `error_count`.
- `locked_by`, `locked_at`, `heartbeat_at` for worker leasing.
- `next_attempt_at` for retry backoff.
- `error_code`, `error_message` with sanitized operational errors.
- timestamps.

Indexes must support claiming the next queued job and viewing jobs by batch.

### 6.5 `fetched_publication_candidates`

The canonical staged work shown to the user.

Fields:

- `id`, `batch_id`, `profile_id`.
- Canonical bibliographic fields: `title`, `normalized_title`, `abstract`, `authors` JSONB, `venue_name`, `publication_year`, `publication_type`, `doi`, `normalized_doi`, `source_url`, `keywords` JSONB.
- `citation_count`, `citation_count_observed_at`.
- `match_confidence`, `quality_flags` JSONB.
- `dedup_key`, `decision`.
- `decision_by_user_id`, `decided_at`.
- `edited_fields` JSONB or canonical values updated in place plus an edit audit record.
- `matched_publication_id` nullable FK.
- timestamps.

Constraints/indexes:

- Index batch/decision and profile/decision.
- Index normalized DOI.
- Index normalized title and year.
- Unique `(batch_id, dedup_key)` where practical.

Do not make normalized DOI globally unique on candidates: the same work may occur in historical batches. Deduplication across batches is handled against source records, candidates, and publications.

### 6.6 `candidate_source_records`

Preserves source-level evidence when several sources merge into one candidate.

Fields:

- `id`, `candidate_id`, `job_id`, `source`.
- `external_work_id`, `source_url`, `doi`.
- `raw_payload` JSONB.
- `payload_hash`.
- `fetched_at`.

Unique `(source, external_work_id, profile_id)` can instead be implemented on a separate durable seen-work table if the source record does not carry `profile_id`. The chosen constraint must allow re-sync to recognize previously handled works efficiently.

### 6.7 Publication provenance

Extend `publications` with:

- `importCandidateId` nullable FK.
- `originSource` nullable import-source enum.
- `metadataProvenance` nullable JSONB.

Alternatively, introduce `publication_source_links` if multiple external IDs per publication must be queryable. The recommended long-term design is a link table:

- `publication_id`, `source`, `external_work_id`, `source_url`, `first_imported_at`, `last_verified_at`.
- Unique `(source, external_work_id)` and `(publication_id, source, external_work_id)`.

Use this link table from the MVP if re-sync is in the next release; it avoids another publication-table migration.

### 6.8 Migration sequence

1. Add enums and nullable profile fields.
2. Add identity, batch, job, candidate, source-record, and publication-source-link tables.
3. Add nullable publication provenance reference.
4. Backfill normalized DOI/title for existing publications where needed.
5. Add indexes/constraints after validating backfilled data.
6. Generate and review the Drizzle migration; apply it to a disposable database before development data.

## 7. API and server-function plan

All mutations require an authenticated session, CSRF-safe same-origin handling, Zod validation, and server-side authorization.

### 7.1 Author discovery

- `searchImportAuthors({ profileId, source, name, affiliation, orcidId? })`
- `confirmImportAuthor({ profileId, source, externalAuthorId, candidateSnapshot })`
- `revokeImportIdentity({ profileId, source })`

Rules:

- The target must be the caller's own linked profile or fall within admin scope.
- Search uses name plus institution/department when available.
- Search responses are mapped to an internal DTO; raw API responses never go directly to the browser.
- Confirming an identity is an auditable mutation.

### 7.2 Job lifecycle

- `startPublicationImport({ profileId, sources })` returns `batchId` immediately.
- `getImportBatch({ batchId })` returns aggregate status and per-source progress.
- `retryImportJob({ jobId })` only retries failed/cancelled jobs and resets safe execution fields.
- `cancelImportBatch({ batchId })` prevents future page fetches; already stored candidates remain available.

Starting a job must be idempotent. Prevent two active jobs for the same profile/source/import kind unless an explicit repair action is used.

### 7.3 Candidate queries and decisions

- `listImportCandidates({ batchId, page, pageSize, query, year, venue, source, confidence, decision, sort })`.
- `updateImportCandidate({ candidateId, patch })`.
- `setCandidateDecision({ candidateId, decision })`.
- `bulkSetCandidateDecision({ batchId, candidateIds | filterSnapshot, decision })`.
- `restoreDiscardedCandidate({ candidateId })`.
- `promoteCandidates({ batchId, candidateIds | allKept })`.

Bulk operations should execute as set-based SQL updates in bounded chunks, not hundreds of client requests. Promotion must run transactionally per chunk and be idempotent.

### 7.4 Progress transport

Use TanStack Query polling for MVP:

- Poll every 2 seconds while a batch is queued/running.
- Slow to 5–10 seconds after several minutes.
- Stop when the batch reaches a terminal/review-ready state.
- Refetch candidates when processed counts change.

SSE/websockets add deployment complexity and are unnecessary for the first release.

## 8. OpenAlex integration

### 8.1 Configuration

Add server environment variables:

```env
OPENALEX_API_KEY=
OPENALEX_CONTACT_EMAIL=
IMPORT_WORKER_ID=
IMPORT_JOB_MAX_ATTEMPTS=4
IMPORT_JOB_LEASE_SECONDS=120
```

Update `src/lib/env.server.ts` so feature credentials are validated only when the related source is enabled. Never expose keys to client bundles or logs.

### 8.2 Author search

- Search by lecturer name.
- Use OAU institution ID/affiliation data to rank or filter candidates.
- Fetch enough context to show display name, works count, last-known institutions, topics, ORCID, and several sample works.
- Do not use OpenAlex's rank alone as proof of identity.
- If an ORCID is supplied, prefer an exact ORCID-linked result but still show confirmation before saving the identity.

### 8.3 Work retrieval

- Filter works by confirmed OpenAlex author ID.
- Use cursor pagination rather than page-number pagination.
- Request only required fields.
- Persist each page in a transaction, then update the cursor and progress count.
- Resume from the stored cursor after a transient failure.
- Apply request timeouts, exponential backoff with jitter, and `429`/`5xx` retry handling.
- Treat invalid author IDs and persistent `4xx` responses as non-retryable.

### 8.4 Mapping

Map OpenAlex work types to existing `publicationTypeValues`. Unknown values map to `other` and receive a quality flag. Preserve the original type in the source record.

Normalize:

- DOI to lowercase canonical `10.x/...` form without resolver prefixes.
- Title with Unicode normalization, lowercase, punctuation removal, and whitespace collapse for matching only; preserve display title.
- Publication year to a validated integer.
- URLs to HTTPS where appropriate.
- Authorship to ordered structured JSON.

OpenAlex abstracts may require reconstructing text from an inverted index. Put this logic in the adapter mapper and test it independently.

## 9. Deduplication and merge rules

Run deduplication in this order:

1. Exact normalized DOI against existing publications.
2. Exact `(source, external_work_id)` against source links and historical source records.
3. Exact normalized title plus publication year against publications and candidates.
4. High-confidence fuzzy title match constrained by year and preferably venue/author overlap.

Outcomes:

- **Existing publication:** Candidate is marked matched and suppressed from the default new-items view; attach missing source linkage only after a safe confirmation rule.
- **Previously promoted candidate:** Suppress it.
- **Previously discarded candidate:** Suppress it from re-sync but keep it restorable.
- **Duplicate within the current batch:** Merge source records into one candidate.
- **Uncertain fuzzy match:** Keep as a candidate with a `possible_duplicate` flag; never auto-merge it.

Merge precedence:

- User-edited values always win.
- Canonical DOI metadata, once Crossref is enabled, wins for DOI-owned bibliographic fields unless the user has edited them.
- Prefer non-empty and more specific values.
- Preserve every source value in source records/provenance.
- Citation counts are observations, not stable publication metadata; store value and timestamp.

Implement normalization and matching as pure functions with fixture-based tests before connecting them to the worker.

## 10. Worker and job reliability

### 10.1 Execution model

Use a separate worker command in production. The worker repeatedly:

1. Claims one eligible job using a transaction and `FOR UPDATE SKIP LOCKED` semantics.
2. Sets a lease owner, lease expiry/heartbeat, and `running` state.
3. Fetches one page, persists records, updates cursor and counters, then heartbeats.
4. Continues until the source is exhausted or cancellation is requested.
5. Marks success or records a classified failure and next retry time.
6. Recomputes the parent batch status.

Do not launch detached promises from a web request. For local development, `pnpm import:worker` can run beside `pnpm dev`.

### 10.2 Idempotency and recovery

- Page processing must be safe to repeat after a crash.
- Use source external IDs/payload hashes and batch dedup keys to prevent duplicate inserts.
- Expired leases may be reclaimed by another worker.
- Retry transient network, timeout, `429`, and source `5xx` errors.
- Do not retry schema/validation errors indefinitely; record samples and mark partial/failed.
- Redact API keys and avoid saving response headers containing credentials.
- A batch is `partial` when at least one source succeeds and at least one fails.

## 11. Frontend plan

### 11.1 Import landing page

- Explain what will be imported and that nothing becomes public automatically.
- Show connected sources, last sync, current import state, and previous batch summary.
- Primary CTA: **Import publications** or **Check for new publications**.
- Fallback CTAs for manual entry and, later, file upload.

### 11.2 Author confirmation

- Display cards with identity evidence, not just names.
- Require an explicit selection and confirmation.
- Provide **None of these are me** and search-again actions.
- Warn users that choosing the wrong author will import unrelated works.

### 11.3 Progress page

- Show batch state and each source separately.
- Display counts such as “134 works processed”. Avoid invented totals when the API does not provide one.
- Let users leave the page; the import continues.
- Show partial results as soon as candidates exist.
- Provide retry for failed sources and manual-entry fallback.

### 11.4 Review screen

Use a virtualized or server-paginated table/list suitable for 200+ rows. Include:

- Search, year, venue, source, decision, confidence, and warning filters.
- Sort by year, title, confidence, and recently fetched.
- Page-level selection and an explicit “select all matching filters” workflow.
- Sticky bulk-action bar with Keep, Discard, and Reset to pending.
- Running counts for pending, kept, edited, discarded, possible duplicates, and promoted.
- Inline or drawer-based editing.
- Visible DOI/source links and provenance badges.
- Warnings for missing DOI, missing year, unexpected author match, and possible duplicate.
- Confirmation before promotion, followed by a result summary.

Selection must be modeled independently of rendered rows so pagination does not lose it.

### 11.5 Accessibility and responsive behavior

- All actions must be keyboard accessible and have visible focus states.
- Status cannot be conveyed by color alone.
- Announce progress and bulk-action results through appropriate live regions without excessive updates.
- On narrow screens, switch candidate rows to compact cards while retaining filters and bulk selection.

## 12. Permissions and security

Permission matrix:

| Action | Lecturer | Department admin | Faculty admin | Super admin |
| --- | --- | --- | --- | --- |
| Import own linked profile | Yes | Yes | Yes | Yes |
| Import another profile | No | Same department | Same faculty | Any |
| Confirm external identity | Own profile | In scope | In scope | Any |
| Decide/promote candidates | Own profile | Policy-dependent, in scope | Policy-dependent, in scope | Any |
| View raw payload | No by default | No by default | No by default | Support-only view |

Security requirements:

- Re-check scope on every server operation; route guards alone are insufficient.
- Reject profile IDs supplied by the client when the user lacks access.
- Validate all external URLs and never fetch lecturer-supplied arbitrary URLs from the server.
- Set request timeouts and response-size limits for external APIs.
- Sanitize error messages returned to browsers.
- Treat external metadata and uploaded files as untrusted input.
- Limit upload type, size, record count, and parser complexity when CSV/BibTeX is added.
- Rate-limit author searches and import starts per user/profile.
- Log actor, target profile, action, outcome, and correlation/batch ID without logging secrets.

## 13. Testing strategy

### 13.1 Unit tests

- DOI normalization variants.
- Title normalization including Unicode and punctuation.
- OpenAlex type mapping.
- OpenAlex abstract reconstruction.
- Adapter response parsing using saved fixtures.
- Exact and fuzzy dedup decisions.
- Merge precedence and quality flags.
- Batch/job status aggregation.
- Permission matrix helpers.

### 13.2 Database/integration tests

- Job claiming prevents two workers from processing the same lease.
- Retrying a page does not duplicate candidates or source records.
- Candidate decisions are scoped to the correct profile/batch.
- Promotion creates one publication and source links exactly once.
- DOI conflicts produce a matched/flagged result instead of a failed partial insert.
- Discarded and promoted works remain suppressed on re-sync.
- Public queries never expose candidates or non-published publications.
- Department/faculty scope boundaries cannot be bypassed with crafted IDs.

Use a real disposable PostgreSQL database for constraints, transactions, and worker-claim tests.

### 13.3 UI/end-to-end tests

- First import happy path.
- Ambiguous author selection.
- Zero author results.
- Import continues after navigation/reload.
- Partial import and retry.
- Filtering and bulk selection across pages.
- Candidate edit and promotion.
- Restore a discarded candidate.
- Unauthorized admin scope attempt.
- 250-candidate usability/performance fixture.

### 13.4 Contract tests

Run adapter tests against fixtures in normal CI. Run a small optional live-source smoke test on a schedule, not on every pull request, to detect upstream response changes without making CI depend on external availability.

## 14. Observability and operations

Capture structured events for:

- Author searches and confirmations.
- Batch/job creation, claim, heartbeat, completion, retry, and failure.
- Source latency, request count, rate-limit response count, and records processed.
- Candidate created/merged/matched/flagged counts.
- Decision and promotion counts.

Operational dashboard minimums:

- Queued/running jobs and oldest job age.
- Jobs with expired leases.
- Failure rate by source and error class.
- Average import duration and candidate count.
- API usage against free-tier budgets.
- Profiles awaiting review.

Alerts should cover a stuck queue, repeated source authentication failure, elevated `429` rates, and worker heartbeat loss.

## 15. Implementation phases and deliverables

### Phase 0 — Decisions and development setup (1–2 days)

- Confirm the five decisions in section 3.
- Obtain and configure the OpenAlex key/contact email.
- Register/request Semantic Scholar and ORCID credentials for later phases without blocking MVP.
- Select canonical OAU institution identifiers.
- Add test framework and disposable PostgreSQL test setup if not already present.

**Exit:** Environment and policy decisions are documented; tests can run locally and in CI.

### Phase 1 — Schema and domain contracts (2–4 days)

- Add enums/tables/relations and profile/publication extensions.
- Generate and review migration.
- Add internal types, Zod schemas, and adapter contract.
- Implement normalizers and dedup keys with unit tests.

**Exit:** Migration applies cleanly; domain tests pass; no user-visible behavior yet.

### Phase 2 — OpenAlex identity matching (2–4 days)

- Implement server-only OpenAlex client with timeout/retry handling.
- Implement author search mapping and institutional ranking.
- Add author search and confirmation server functions with permissions.
- Build `/app/imports` landing and author-confirmation screens.

**Exit:** A lecturer and scoped admin can safely confirm an OpenAlex author ID.

### Phase 3 — Job runner and ingestion (4–7 days)

- Implement batch/job creation and idempotency.
- Build worker claim/lease/heartbeat/retry logic.
- Implement cursor-paginated OpenAlex works retrieval.
- Normalize and persist source records/candidates page by page.
- Implement exact DOI/source-ID/title-year dedup against current data.
- Add progress endpoint and UI polling.

**Exit:** A 200+ work profile imports without holding an HTTP request open and can resume after a worker restart.

### Phase 4 — Review and promotion (5–8 days)

- Implement candidate list query, filters, counts, pagination, and sorting.
- Build bulk-selection and decision UI.
- Add editing, discard restore, warnings, and possible-duplicate handling.
- Implement transactional/idempotent promotion into draft publications and contributors.
- Display provenance on internal publication details.

**Exit:** Users can curate hundreds of candidates and create valid draft publications without duplicates.

### Phase 5 — Hardening and pilot (3–5 days)

- Complete permission, integration, and E2E coverage.
- Add rate limits, structured logs, health metrics, and worker runbook.
- Test accessibility and mobile behavior.
- Run imports for several known lecturers and compare results manually.
- Fix mapping/dedup issues found during the pilot.

**Exit:** MVP acceptance criteria pass with real-world catalogues and production monitoring is ready.

### Phase 6 — Source expansion (separate release)

- Add Semantic Scholar through the same adapter contract.
- Add ORCID OAuth identity connection and works import.
- Add Crossref DOI enrichment with caching.
- Merge multi-source records and expose source-level provenance.
- Add per-source retry and partial status behavior.

### Phase 7 — Files, re-sync, and admin operations (separate release)

- Add safe CSV/BibTeX parsing and mapping preview.
- Add re-sync using confirmed source IDs.
- Add import history and restore tools.
- Add skeleton-profile import initiation and rollout dashboard.
- Add scheduled re-sync only after usage/cost policy approval.

## 16. MVP acceptance criteria

The feature is ready for pilot when all of the following are true:

- A lecturer can search and confirm the correct OpenAlex identity.
- An authorized admin can do the same only for profiles in scope.
- Import start returns immediately and work continues independently.
- A catalogue of at least 250 works imports with visible incremental progress.
- Worker restart resumes without duplicate candidates.
- Exact DOI and source-ID duplicates are suppressed reliably.
- Possible fuzzy duplicates are flagged rather than silently merged.
- The lecturer can filter, select, keep, edit, discard, and restore candidates in bulk.
- Promotion is idempotent and creates draft publications with provenance.
- Previously promoted/discarded works do not reappear as new on re-sync.
- Failed sources can be retried without losing successful results.
- No staged or draft data appears in public search.
- Keys and raw payloads are not exposed to unauthorized users.
- Unit, database, permission, and core E2E tests pass.
- Logs and an operator runbook make stalled/failed jobs diagnosable.

## 17. Suggested issue breakdown

Create implementation tickets in this order:

1. Import schema and migration.
2. Import domain types and validation.
3. DOI/title normalization utilities and tests.
4. Deduplication/merge engine and fixtures.
5. OpenAlex client and author-search adapter.
6. Author search/confirmation permissions and server functions.
7. Import landing and author-confirmation UI.
8. Batch/job service and idempotent start.
9. Worker lease/claim/retry infrastructure.
10. OpenAlex cursor ingestion and candidate persistence.
11. Import progress query and progress UI.
12. Candidate list/filter/count APIs.
13. Review table/cards and bulk-selection model.
14. Candidate decisions, editing, and restore.
15. Promotion transaction, contributor creation, and provenance.
16. Re-sync suppression and source links.
17. Admin-on-behalf-of flow and scope tests.
18. Observability, rate limits, and operations dashboard basics.
19. E2E/performance/accessibility test pass.
20. Pilot import and acceptance review.

Each ticket should include migration/API/UI impact, authorization rules, test cases, and rollback notes. Avoid combining schema, worker infrastructure, and the entire review UI into one ticket.

## 18. Rollout and rollback

- Gate the feature behind an `AUTOMATED_IMPORT_ENABLED` server-controlled flag.
- Start with internal developers, then 3–5 lecturers with known catalogues, then one department, then wider rollout.
- Enable only OpenAlex during the pilot.
- Keep manual publication creation available throughout rollout.
- If the source or worker becomes unstable, disable new imports while leaving existing review/promotion data accessible.
- Schema rollback should not delete candidates or provenance. Prefer forward fixes; destructive cleanup requires a separate reviewed migration and backup.

## 19. Definition of done

A phase is not complete when screens merely render. It is complete when its database rules, server-side permissions, failure handling, automated tests, logging, and user-facing empty/error states are implemented and verified against the acceptance criteria above.
