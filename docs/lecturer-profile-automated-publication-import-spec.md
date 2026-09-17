# OAU IPTTO Research & Innovation Repository

## Feature Spec: Lecturer Profiles with Automated Publication Import

**Status:** Draft for engineering\
**Supersedes/extends:** Existing repository system (roles,
submission/review workflow, public search)\
**Author context:** Supervisor feedback --- the system needs a
lecturer-centric profile that auto-populates from external sources (not
manual one-by-one entry), and must scale to lecturers with 200+
publications.

## 1. Why this exists

The system currently supports lecturers manually submitting individual
research records one at a time. That doesn't work for a lecturer with
200+ papers --- nobody will type 200 records by hand, so the repository
stays empty. The fix: the system fetches what already exists for a
lecturer from external academic databases, links every item to its
DOI/URL, and lets the lecturer curate (confirm, edit, remove, add)
rather than transcribe. Manual entry becomes the fallback for the
handful of items no database indexes --- not the default path.

## 2. Source strategy --- where the data actually comes from

Google Scholar alone doesn't scale to this: it has no official API,
paginates hard, and blocks bulk/automated pulls. At 200+ papers per
lecturer, scraping it directly is not viable as the primary source.
Instead:

  -----------------------------------------------------------------------
  Source                  Role                    Why
  ----------------------- ----------------------- -----------------------
  OpenAlex                Primary                 Free, no API key
                                                  required, very large
                                                  coverage, returns DOI +
                                                  URL + abstract + year +
                                                  citation count per
                                                  work, supports pulling
                                                  an author's entire
                                                  catalogue in one
                                                  paginated call once you
                                                  have their author ID.

  Semantic Scholar        Secondary               Also free and
  Academic Graph API                              DOI-linked; fills gaps
                                                  OpenAlex misses; good
                                                  cross-check.

  ORCID                   Preferred when          The lecturer's own
                          available               persistent researcher
                                                  ID --- if they have
                                                  one, this is the least
                                                  ambiguous source, since
                                                  it's tied to them
                                                  specifically rather
                                                  than matched by name.

  Crossref                Enrichment              Not used for bulk
                                                  discovery, but useful
                                                  to fill in/verify
                                                  metadata once a DOI is
                                                  already known.

  Google Scholar (via a   Optional /              Kept as one more
  paid scraping API,      supplementary           adapter for anything
  e.g. SerpApi)                                   the above miss. No
                                                  longer load-bearing,
                                                  which removes most of
                                                  the reliability risk of
                                                  depending on it.

  CSV / BibTeX upload     Guaranteed fallback     For local journals,
                                                  unindexed conference
                                                  proceedings, book
                                                  chapters --- anything
                                                  no external database
                                                  has. Google Scholar
                                                  natively supports
                                                  exporting a profile's
                                                  citations to
                                                  BibTeX/CSV, so this
                                                  doubles as a
                                                  Scholar-adjacent path
                                                  without scraping
                                                  Scholar directly.
  -----------------------------------------------------------------------

All of these are implemented behind one shared interface (§6.1) so
adding/removing a source is a config change, not a rewrite.

## 3. System flow by user

### 3.1 Lecturer

#### A. First-time onboarding

1.  Lecturer signs up / logs in (existing auth).
2.  System detects no linked profile source yet → shows: **"Import your
    publications."**
3.  Lecturer enters identifying info to search by: full name (pre-filled
    from account), department/institution (pre-filled), and optionally
    an ORCID iD if they have one.
4.  System searches OpenAlex (and Semantic Scholar) for matching author
    records and shows candidate author matches --- e.g. **"We found 3
    possible matches for this name. Which one is you?"** --- each with
    institution, publication count, and a sample of recent titles, so
    the lecturer can pick the right one out of any name collisions.
    -   If the lecturer has an ORCID iD, this step is skipped --- ORCID
        is unambiguous and used directly.
5.  Lecturer confirms the correct author match. This author ID is saved
    permanently to their profile --- all future syncs use it directly
    instead of re-searching by name.
6.  System shows a loading/processing state (**"Fetching your
    publications --- this can take a minute for a large catalogue"**)
    while it pulls the full works list for that author ID across all
    enabled sources, plus optionally a Google Scholar / BibTeX pull if
    the lecturer also provides one.
7.  Lecturer lands on the **Review Import** screen: every fetched work
    as a card --- title, authors, year, venue, DOI/URL, source tag
    (OpenAlex / Semantic Scholar / ORCID / Scholar / manual). Given the
    volume (200+), this screen needs bulk actions, not just per-item
    ones (see §3.1.C).
8.  Lecturer can, per item or in bulk: **Keep**, **Edit** (fix a wrong
    title/year/venue before accepting), or **Discard** (not theirs /
    duplicate / irrelevant).
9.  Lecturer manually adds anything the fetch missed, via the existing
    manual-entry form, or via a CSV/BibTeX upload for a batch of
    unindexed items.
10. Save profile → every accepted item becomes a draft record in the
    existing system (`draft` status), entering the normal **Submit →
    Review → Publish** pipeline, each carrying its DOI/URL and source
    tag for provenance.
11. Failure/zero-results states never dead-end: always offer retry, or
    drop straight into manual/CSV entry.

#### B. Author-match confirmation (detail)

Since author names collide across institutions, this step is the piece
that prevents the lecturer's profile from filling up with someone else's
papers:

-   Query is name + institution (and department where possible), not
    name alone.
-   Each candidate match shown to the lecturer includes enough context
    (institution, field, sample titles, work count) that a wrong match
    is obvious at a glance.
-   Once confirmed, the resolved author ID(s) per source are stored on
    the lecturer's profile (see §5.1) --- this turns every future sync
    into a direct ID lookup instead of a fuzzy name search.

#### C. Reviewing 200+ items --- bulk actions

A one-by-one review of 200 cards is a bad experience. The Review Import
screen needs:

-   Select all / select none, with the ability to bulk-Keep everything
    above a confidence/match-quality threshold in one action.
-   Sort/filter by year, venue, or source, so a lecturer can knock out a
    whole year or a whole journal at once.
-   A running counter (**"184 kept · 12 discarded · 4 flagged for
    edit"**) so progress is visible on a large set.
-   Items with low match confidence (e.g. fuzzy-matched, missing DOI)
    visually flagged so the lecturer's attention goes where it's
    actually needed, instead of re-checking 200 clean, high-confidence
    records.

#### D. Re-sync (returning lecturer)

-   Profile page has a **"Check for new publications"** action.
-   Because the author ID is already stored, this is a direct, fast
    lookup --- not a re-search.
-   Only genuinely new items (not already accepted or previously
    discarded) are surfaced, using the dedup logic in §6.4 --- a
    lecturer should never have to re-decide on something they already
    handled.

### 3.2 Department / Faculty Admin

-   Can create a skeleton profile for a lecturer who hasn't signed up
    yet (name, department, faculty, staff email) --- supports the
    supervisor's request to start with profiles for some lecturers ahead
    of full self-service adoption.
-   When that lecturer logs in and their account matches the skeleton
    profile (by email/staff ID), they land straight into the import flow
    (§3.1) with their basic info already filled in.
-   Reviews submitted records within their department/faculty scope
    (existing behavior, unchanged): approve, reject with a reason, or
    request edits.
-   Can see, per lecturer, import status at a glance (not started / in
    review / N records published) to track rollout progress across the
    department.

### 3.3 IPTTO Officer

-   Unchanged core responsibility: manages innovation, patent,
    prototype, and commercialization records layered on top of a
    lecturer's regular publications.
-   New: when a lecturer's imported record looks like it may have
    IP/commercialization relevance (e.g. matches a patent database
    entry, or the lecturer flags it during entry), it's routed into the
    IPTTO officer's queue for the additional patent/prototype metadata,
    in addition to the normal publication review.

### 3.4 Super Admin

-   Controls accounts, roles, and organizational records (existing,
    unchanged).
-   New: visibility into import health across the whole platform ---
    which lecturers have completed import, which imports failed and need
    attention, aggregate counts per source (e.g. **"1,240 records via
    OpenAlex, 310 via manual/CSV this term"**) --- useful both
    operationally and as the kind of reporting the supervisor is likely
    to want to see in the next presentation.

### 3.5 Public visitor

-   Unchanged: searches and discovers published (i.e. already-approved)
    research, researchers, and innovations.
-   The import/review machinery above is entirely invisible on this side
    --- nothing unreviewed ever reaches public search (enforced
    structurally, see §5.3).

## 4. Technical spec

### 4.1 Import source abstraction

One interface, one adapter per source, so sources can be
added/removed/reordered without touching the rest of the system:

``` ts
interface PublicationImportSource {
  searchAuthor(input: AuthorSearchInput): Promise<AuthorCandidate[]>
  fetchWorks(authorId: string): Promise<FetchedPublicationCandidate[]>
}
```

Adapters: `OpenAlexAdapter`, `SemanticScholarAdapter`, `OrcidAdapter`,
`GoogleScholarAdapter` (via SerpApi or similar, optional),
`BibtexUploadAdapter`, `CsvUploadAdapter`.

The upload-based adapters implement only `fetchWorks` (there's no
"search" step --- the file itself is the input).

### 4.2 Data model

#### `lecturer_profile`

New, or extends existing lecturer/user table.

  ------------------------------------------------------------------------------
  Field                          Type                    Notes
  ------------------------------ ----------------------- -----------------------
  `id`                           uuid                    PK

  `user_id`                      uuid FK                 link to auth user

  `department_id`, `faculty_id`  uuid FK                 existing

  `openalex_author_id`           text, nullable          resolved + confirmed
                                                         once

  `semantic_scholar_author_id`   text, nullable          resolved + confirmed
                                                         once

  `orcid_id`                     text, nullable          

  `scholar_profile_url`          text, nullable          if the optional Scholar
                                                         adapter is used

  `import_status`                enum                    `not_started` /
                                                         `pending` / `succeeded`
                                                         / `failed` / `partial`

  `last_synced_at`               timestamp, nullable     drives re-sync/dedup

  `bio`, `photo_url`             nullable                profile display fields
  ------------------------------------------------------------------------------

#### `import_job`

New --- tracks each async fetch so the loading state has something to
poll.

  Field                        Type             Notes
  ---------------------------- ---------------- -----------------------------------------------
  `id`                         uuid             PK
  `lecturer_profile_id`        uuid FK          
  `source`                     enum             one per adapter
  `status`                     enum             `queued` / `running` / `succeeded` / `failed`
  `error_message`              text, nullable   
  `raw_result_count`           int, nullable    
  `created_at`, `updated_at`   timestamp        

#### `fetched_publication_candidate`

New --- raw fetched results before curation; kept separate from the real
publication table so nothing unreviewed can leak into public search.

  --------------------------------------------------------------------------
  Field                      Type                    Notes
  -------------------------- ----------------------- -----------------------
  `id`                       uuid                    PK

  `import_job_id`            uuid FK                 

  `title`, `authors`,        text                    
  `venue`                                            

  `year`                     int, nullable           

  `doi`                      text, nullable          

  `source_url`               text, nullable          

  `citation_count`           int, nullable           

  `match_confidence`         float, nullable         drives the "flag for
                                                     review" UI in §3.1.C

  `raw_payload`              jsonb                   full raw record, for
                                                     debugging/re-parsing

  `decision`                 enum                    `pending` / `kept` /
                                                     `edited` / `discarded`

  `matched_publication_id`   uuid FK, nullable       set once promoted into
                                                     the real publication
                                                     table
  --------------------------------------------------------------------------

**Existing `publication` / `research_work` table:** no structural
change. Accepted candidates are inserted exactly as a manual record
would be, plus `source` and a back-reference to
`fetched_publication_candidate.id` for provenance/audit.

### 4.3 Async job execution

The fetch must never block the HTTP request, and at 200+ works it will
take real time:

1.  `POST /api/import-jobs` creates a queued job, returns the job ID
    immediately.
2.  A background worker picks it up per source, calls the matching
    adapter's `fetchWorks`, paginating through the author's full
    catalogue, writing `fetched_publication_candidate` rows as it goes
    (so partial progress is visible, not an all-or-nothing wait).
3.  Frontend polls `GET /api/import-jobs/:id` (or subscribes via
    SSE/websocket) for status + running count, driving the loading UI.
4.  On `succeeded` (or `partial`), frontend loads
    `GET /api/import-jobs/:id/candidates` for the Review Import screen.

### 4.4 Author matching

-   `searchAuthor` queries by name + institution/department, never name
    alone, to narrow name collisions before the lecturer ever sees a
    list.
-   Each `AuthorCandidate` returned includes institution, field, work
    count, and a few sample titles --- enough for a confident human pick
    in §3.1.B.
-   The confirmed author ID(s) are written once to `lecturer_profile`
    and reused on every subsequent sync --- no repeated fuzzy search.

### 4.5 Dedup / merge logic (matters more at 200+ items, and across multiple sources)

Since a lecturer may pull from OpenAlex, Semantic Scholar, and a CSV
upload at once, the same paper can arrive multiple times from different
sources:

-   **Primary key:** DOI, when present on both sides --- exact match,
    highest confidence.
-   **Fallback key (no DOI on one/both):** normalized title (lowercase,
    strip punctuation/whitespace) + year.
-   **Secondary fuzzy check:** title similarity (e.g. \>90% via
    Levenshtein/trigram) to catch formatting differences between
    sources.
-   When two sources return the same work, merge into a single candidate
    rather than showing duplicates, preferring the version with a DOI
    and filling in any fields (abstract, citation count) the other
    source is missing.
-   On re-sync (§3.1.D), the same matching logic runs against
    already-accepted publication rows so nothing already handled
    resurfaces.

### 4.6 Rate limiting & caching

-   Cache each source's raw response (`raw_payload`) so a downstream
    parsing fix doesn't require re-hitting the external API.
-   Respect each API's rate limits (OpenAlex and Semantic Scholar are
    generous for this scale but not unlimited); batch requests where
    their APIs support it.
-   If the optional Scholar/SerpApi adapter is enabled, cap re-syncs
    (e.g. once per 24h per lecturer) since that's the one source with
    real cost/reliability constraints.

### 4.7 Frontend states to design for

1.  **Not started** --- prompt to begin import.
2.  **Author confirmation** --- candidate list, pick-the-right-one UI
    (§3.1.B).
3.  **Loading** --- job running, with a progress indicator meaningful at
    200+ items (**"134 of \~210 fetched"**), not just a spinner.
4.  **Review --- bulk mode** --- the large-list UI in §3.1.C:
    select-all, filters, running counts, confidence flags.
5.  **Zero results** --- route straight to manual/CSV entry.
6.  **Failed** --- clear error, retry button, manual-entry escape hatch
    always available.
7.  **Partial** --- show what succeeded, flag what didn't, allow retry
    of just the failed portion.
8.  **Re-sync** --- shows only genuinely new items since
    `last_synced_at`.

### 4.8 Integration with the existing review pipeline

No change to **Draft → Submitted → Department/Faculty/IPTTO Review →
Approved → Published/Archived**.

Accepted candidates enter at `draft`, exactly like a manual record. Each
record's detail view (for reviewers) shows a provenance badge ---
**"Imported via OpenAlex," "Imported via ORCID," "Manually added"** ---
preserving the system's existing emphasis on a visible institutional
trail.

### 4.9 Build order (phased)

1.  **Phase 1** --- Core data model + OpenAlex adapter + author
    confirmation. This is the highest-coverage, lowest-cost, lowest-risk
    source --- get it working end to end first, including the bulk
    Review Import screen (needed regardless of source count).
2.  **Phase 2** --- Semantic Scholar + ORCID adapters, using the same
    interface, to fill coverage gaps and give lecturers with an ORCID iD
    the cleanest path.
3.  **Phase 3** --- CSV/BibTeX upload adapter, as the guaranteed
    fallback for unindexed work.
4.  **Phase 4** --- Skeleton profiles + admin import-health dashboard
    for Department/Faculty/Super Admin roles.
5.  **Phase 5 (stretch)** --- Google Scholar via SerpApi, only if budget
    allows, as one more supplementary adapter behind the existing
    interface.
6.  **Phase 6** --- Re-sync, once at least one adapter is stable in
    production.

### 4.10 Open questions for the team

-   Budget for a paid Scholar-scraping API (Phase 5) --- worth deferring
    until Phases 1--4 are solid, since it's now supplementary rather
    than load-bearing.
-   Does the existing auth system already support matching a logging-in
    lecturer to an admin-created skeleton profile by email/staff ID, or
    does that matching logic need to be built?
-   Discarded candidates: recommend soft-delete
    (`decision = 'discarded'`, row retained) rather than hard delete, so
    a lecturer who discards something by mistake --- easy to do at
    volume --- can restore it instead of re-importing.
