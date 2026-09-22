import { and, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/db/index.ts'
import {
  candidateDecisionValues,
  fetchedPublicationCandidates,
  profiles,
  publicationContributors,
  publicationImportJobs,
  publications,
} from '#/db/schema.ts'
import { requireServerEnv } from '#/lib/env.server.ts'
import { requireCurrentSession } from '#/lib/permissions.server.ts'
import { slugify } from '#/lib/slug.ts'
import {
  fetchOpenAlexWorksPage,
  normalizeDoi,
  normalizeTitle,
  searchOpenAlexAuthors,
} from './openalex.ts'

const profileIdSchema = z.object({ profileId: z.string().uuid() })
const searchAuthorsSchema = profileIdSchema.extend({
  name: z.string().trim().min(2).max(180),
  institution: z.string().trim().max(240).optional(),
})
const startImportSchema = profileIdSchema.extend({
  externalAuthorId: z.string().trim().regex(/^A\d+$/),
})
const jobIdSchema = z.object({ jobId: z.string().uuid() })
const decisionSchema = z.object({
  candidateIds: z.array(z.string().uuid()).min(1).max(500),
  decision: z.enum(candidateDecisionValues).refine((value) => value !== 'promoted'),
})
const updateCandidateSchema = z.object({
  candidateId: z.string().uuid(),
  title: z.string().trim().min(1).max(500),
  venueName: z.string().trim().max(500).optional(),
  publicationYear: z.number().int().min(1800).max(new Date().getFullYear() + 1).nullable(),
  doi: z.string().trim().max(500).optional(),
  sourceUrl: z.string().url().max(2000).optional().or(z.literal('')),
})

export const getImportDashboard = createServerFn({ method: 'GET' })
  .validator(profileIdSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    const profile = await requireOwnedProfile(data.profileId, user.id)
    const jobs = await db
      .select()
      .from(publicationImportJobs)
      .where(eq(publicationImportJobs.profileId, profile.id))
      .orderBy(desc(publicationImportJobs.createdAt))
      .limit(10)
    const latestJob = jobs[0] as (typeof jobs)[number] | undefined
    const candidates = latestJob
      ? await db
          .select({
            id: fetchedPublicationCandidates.id,
            title: fetchedPublicationCandidates.title,
            authors: fetchedPublicationCandidates.authors,
            venueName: fetchedPublicationCandidates.venueName,
            publicationYear: fetchedPublicationCandidates.publicationYear,
            publicationType: fetchedPublicationCandidates.publicationType,
            doi: fetchedPublicationCandidates.doi,
            sourceUrl: fetchedPublicationCandidates.sourceUrl,
            citationCount: fetchedPublicationCandidates.citationCount,
            qualityFlags: fetchedPublicationCandidates.qualityFlags,
            decision: fetchedPublicationCandidates.decision,
            matchedPublicationId: fetchedPublicationCandidates.matchedPublicationId,
          })
          .from(fetchedPublicationCandidates)
          .where(eq(fetchedPublicationCandidates.importJobId, latestJob.id))
          .orderBy(desc(fetchedPublicationCandidates.publicationYear), fetchedPublicationCandidates.title)
      : []

    return { profile, jobs, latestJob: latestJob ?? null, candidates }
  })

export const searchImportAuthors = createServerFn({ method: 'GET' })
  .validator(searchAuthorsSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    await requireOwnedProfile(data.profileId, user.id)
    return searchOpenAlexAuthors({ name: data.name, institution: data.institution })
  })

export const startOpenAlexImport = createServerFn({ method: 'POST' })
  .validator(startImportSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    await requireOwnedProfile(data.profileId, user.id)

    const active = await db
      .select({ id: publicationImportJobs.id })
      .from(publicationImportJobs)
      .where(and(
        eq(publicationImportJobs.profileId, data.profileId),
        or(eq(publicationImportJobs.status, 'queued'), eq(publicationImportJobs.status, 'running')),
      ))
      .limit(1)
    if (active[0]) return { ok: true, jobId: active[0].id }

    const [job] = await db.transaction(async (transaction) => {
      await transaction.update(profiles).set({
        openalexAuthorId: data.externalAuthorId,
        importStatus: 'pending',
        updatedAt: new Date(),
      }).where(eq(profiles.id, data.profileId))

      return transaction.insert(publicationImportJobs).values({
        profileId: data.profileId,
        createdByUserId: user.id,
        source: 'openalex',
        externalAuthorId: data.externalAuthorId,
      }).returning({ id: publicationImportJobs.id })
    })

    return { ok: true, jobId: job.id }
  })

export const runOpenAlexImport = createServerFn({ method: 'POST' })
  .validator(jobIdSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    const job = await requireOwnedJob(data.jobId, user.id)
    await processOpenAlexImportJob(job.id)
    return { ok: true }
  })

export const setImportCandidateDecision = createServerFn({ method: 'POST' })
  .validator(decisionSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    const accessible = await db
      .select({ id: fetchedPublicationCandidates.id })
      .from(fetchedPublicationCandidates)
      .innerJoin(profiles, eq(fetchedPublicationCandidates.profileId, profiles.id))
      .where(and(
        eq(profiles.userId, user.id),
        inArray(fetchedPublicationCandidates.id, data.candidateIds),
      ))
    if (accessible.length !== data.candidateIds.length) throw new Error('Candidate not found')

    await db.update(fetchedPublicationCandidates).set({
      decision: data.decision,
      decidedByUserId: user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    }).where(inArray(fetchedPublicationCandidates.id, data.candidateIds))
    return { ok: true, updated: accessible.length }
  })

export const updateImportCandidate = createServerFn({ method: 'POST' })
  .validator(updateCandidateSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    const rows = await db.update(fetchedPublicationCandidates).set({
      title: data.title,
      normalizedTitle: normalizeTitle(data.title),
      venueName: data.venueName || null,
      publicationYear: data.publicationYear,
      doi: data.doi || null,
      normalizedDoi: normalizeDoi(data.doi),
      sourceUrl: data.sourceUrl || null,
      decision: 'edited',
      decidedByUserId: user.id,
      decidedAt: new Date(),
      updatedAt: new Date(),
    }).where(and(
      eq(fetchedPublicationCandidates.id, data.candidateId),
      sql`exists (select 1 from ${profiles} where ${profiles.id} = ${fetchedPublicationCandidates.profileId} and ${profiles.userId} = ${user.id})`,
    )).returning({ id: fetchedPublicationCandidates.id })
    if (!rows[0]) throw new Error('Candidate not found')
    return { ok: true }
  })

export const promoteImportCandidates = createServerFn({ method: 'POST' })
  .validator(jobIdSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    const { user } = await requireCurrentSession()
    const job = await requireOwnedJob(data.jobId, user.id)
    const profile = await requireOwnedProfile(job.profileId, user.id)
    const candidates = await db.select().from(fetchedPublicationCandidates).where(and(
      eq(fetchedPublicationCandidates.importJobId, job.id),
      or(eq(fetchedPublicationCandidates.decision, 'kept'), eq(fetchedPublicationCandidates.decision, 'edited')),
    ))

    let promoted = 0
    let created = 0
    let linked = 0
    for (const candidate of candidates) {
      if (candidate.matchedPublicationId) continue
      await db.transaction(async (transaction) => {
        const existingRows = candidate.normalizedDoi
          ? await transaction
              .select({ id: publications.id })
              .from(publications)
              .where(
                or(
                  eq(publications.doi, candidate.normalizedDoi),
                  eq(publications.doi, `https://doi.org/${candidate.normalizedDoi}`),
                  eq(publications.doi, `http://doi.org/${candidate.normalizedDoi}`),
                ),
              )
              .limit(1)
          : []
        const existingPublication = existingRows[0] as
          | (typeof existingRows)[number]
          | undefined
        const publication = (existingPublication ?? (
          await transaction.insert(publications).values({
            createdByUserId: user.id,
            owningProfileId: profile.id,
            facultyId: profile.facultyId,
            departmentId: profile.departmentId,
            title: candidate.title,
            slug: `${slugify(candidate.title)}-${candidate.id.slice(0, 8)}`,
            abstract: candidate.abstract,
            publicationType: candidate.publicationType,
            publicationYear: candidate.publicationYear,
            venueName: candidate.venueName,
            doi: candidate.normalizedDoi,
            sourceUrl: candidate.sourceUrl,
            originSource: candidate.source,
            status: 'draft',
          }).returning({ id: publications.id })
        )[0]) as { id: string } | undefined

        if (!publication) throw new Error('Could not create publication')

        await transaction.insert(publicationContributors).values({
          publicationId: publication.id,
          profileId: profile.id,
          contributorRole: 'author',
          authorOrder: 1,
          isPrimary: !existingPublication,
        }).onConflictDoNothing()
        await transaction.update(fetchedPublicationCandidates).set({
          decision: 'promoted',
          matchedPublicationId: publication.id,
          decidedByUserId: user.id,
          decidedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(fetchedPublicationCandidates.id, candidate.id))

        if (existingPublication) linked += 1
        else created += 1
      })
      promoted += 1
    }

    return { ok: true, promoted, created, linked }
  })

async function processOpenAlexImportJob(jobId: string) {
  const rows = await db.select().from(publicationImportJobs).where(eq(publicationImportJobs.id, jobId)).limit(1)
  const job = rows[0] as (typeof rows)[number] | undefined
  if (!job) throw new Error('Import job not found')
  if (job.status === 'succeeded') return

  await db.update(publicationImportJobs).set({ status: 'running', startedAt: job.startedAt ?? new Date(), attemptCount: job.attemptCount + 1, errorMessage: null, updatedAt: new Date() }).where(eq(publicationImportJobs.id, job.id))
  await db.update(profiles).set({ importStatus: 'running', updatedAt: new Date() }).where(eq(profiles.id, job.profileId))

  try {
    let cursor = job.cursor ?? '*'
    let hasNextPage = true
    while (hasNextPage) {
      const page = await fetchOpenAlexWorksPage(job.externalAuthorId, cursor)
      for (const work of page.works) {
        const existingPublication = await findExistingPublication(job.profileId, work.normalizedDoi, work.normalizedTitle, work.publicationYear)
        const inserted = await db.insert(fetchedPublicationCandidates).values({
          importJobId: job.id,
          profileId: job.profileId,
          source: 'openalex',
          externalWorkId: work.externalWorkId,
          title: work.title,
          normalizedTitle: work.normalizedTitle,
          authors: work.authors,
          abstract: work.abstract,
          venueName: work.venueName,
          publicationYear: work.publicationYear,
          publicationType: work.publicationType,
          doi: work.doi,
          normalizedDoi: work.normalizedDoi,
          sourceUrl: work.sourceUrl,
          citationCount: work.citationCount,
          matchConfidence: existingPublication ? 1 : work.normalizedDoi ? 0.98 : 0.75,
          qualityFlags: existingPublication ? [...work.qualityFlags, 'existing_publication'] : work.qualityFlags,
          rawPayload: work.rawPayload,
          decision: existingPublication ? 'promoted' : 'pending',
          matchedPublicationId: existingPublication?.id,
        }).onConflictDoNothing().returning({ id: fetchedPublicationCandidates.id })
        const wasInserted = (inserted as Array<{ id: string }>).length > 0
        await db.update(publicationImportJobs).set({
          processedCount: sql`${publicationImportJobs.processedCount} + 1`,
          candidateCount: wasInserted ? sql`${publicationImportJobs.candidateCount} + 1` : publicationImportJobs.candidateCount,
          duplicateCount: !wasInserted || existingPublication !== undefined ? sql`${publicationImportJobs.duplicateCount} + 1` : publicationImportJobs.duplicateCount,
          expectedCount: page.expectedCount,
          updatedAt: new Date(),
        }).where(eq(publicationImportJobs.id, job.id))
      }
      cursor = page.nextCursor ?? ''
      hasNextPage = Boolean(page.nextCursor)
      await db.update(publicationImportJobs).set({ cursor: cursor || null, expectedCount: page.expectedCount, updatedAt: new Date() }).where(eq(publicationImportJobs.id, job.id))
    }
    const finishedAt = new Date()
    await db.update(publicationImportJobs).set({ status: 'succeeded', finishedAt, updatedAt: finishedAt }).where(eq(publicationImportJobs.id, job.id))
    await db.update(profiles).set({ importStatus: 'review_ready', lastSyncedAt: finishedAt, updatedAt: finishedAt }).where(eq(profiles.id, job.profileId))
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Import failed'
    await db.update(publicationImportJobs).set({ status: 'failed', errorMessage: message.slice(0, 1000), finishedAt: new Date(), updatedAt: new Date() }).where(eq(publicationImportJobs.id, job.id))
    await db.update(profiles).set({ importStatus: 'failed', updatedAt: new Date() }).where(eq(profiles.id, job.profileId))
    throw error
  }
}

async function findExistingPublication(profileId: string, doi: string | null, title: string, year: number | null) {
  const conditions = [eq(publications.owningProfileId, profileId)]
  const match = doi
    ? eq(sql`lower(${publications.doi})`, doi)
    : and(eq(sql`regexp_replace(lower(${publications.title}), '[^a-z0-9]+', ' ', 'g')`, title), year ? eq(publications.publicationYear, year) : sql`true`)
  const rows = await db.select({ id: publications.id }).from(publications).where(and(...conditions, match)).limit(1)
  return rows[0] as (typeof rows)[number] | undefined
}

async function requireOwnedProfile(profileId: string, userId: string) {
  const rows = await db.select({
    id: profiles.id,
    displayName: profiles.displayName,
    affiliation: profiles.affiliation,
    openalexAuthorId: profiles.openalexAuthorId,
    importStatus: profiles.importStatus,
    lastSyncedAt: profiles.lastSyncedAt,
    facultyId: profiles.facultyId,
    departmentId: profiles.departmentId,
  }).from(profiles).where(and(eq(profiles.id, profileId), eq(profiles.userId, userId))).limit(1)
  if (!rows[0]) throw new Error('Profile not found')
  return rows[0]
}

async function requireOwnedJob(jobId: string, userId: string) {
  const rows = await db.select({
    id: publicationImportJobs.id,
    profileId: publicationImportJobs.profileId,
  }).from(publicationImportJobs).innerJoin(profiles, eq(publicationImportJobs.profileId, profiles.id)).where(and(eq(publicationImportJobs.id, jobId), eq(profiles.userId, userId))).limit(1)
  if (!rows[0]) throw new Error('Import job not found')
  return rows[0]
}
