import { and, desc, eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/db/index.ts'
import {
  authUsers,
  departments,
  faculties,
  patentStatusValues,
  patents,
  profiles,
  publicationTypeValues,
  publications,
} from '#/db/schema.ts'
import { requireServerEnv } from '#/lib/env.server.ts'
import {
  hasRole,
  requireAnyRole,
  requireCurrentSession,
} from '#/lib/permissions.server.ts'
import { getSessionAccounts } from '#/lib/session.server.ts'
import { slugify, splitKeywords } from '#/lib/slug.ts'

import type { SessionUser } from '#/lib/session.server.ts'

const optionalTextSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(5000).optional(),
)

const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().email().optional(),
)

const optionalYearSchema = z.preprocess(
  (value) => {
    if (typeof value !== 'string' || value.trim() === '') {
      return undefined
    }

    return Number(value)
  },
  z
    .number()
    .int()
    .min(1800)
    .max(new Date().getFullYear() + 1)
    .optional(),
)

const createFacultySchema = z.object({
  name: z.string().trim().min(2).max(160),
  description: optionalTextSchema,
})

const createDepartmentSchema = z.object({
  facultyId: z.string().uuid(),
  name: z.string().trim().min(2).max(160),
  description: optionalTextSchema,
})

const upsertProfileSchema = z.object({
  displayName: z.string().trim().min(2).max(180),
  primaryEmail: optionalEmailSchema,
  affiliation: optionalTextSchema,
  bio: optionalTextSchema,
  researchInterests: z.string().max(2000).optional().default(''),
})

const createPublicationDraftSchema = z.object({
  title: z.string().trim().min(4).max(500),
  abstract: optionalTextSchema,
  summary: optionalTextSchema,
  publicationType: z.enum(publicationTypeValues),
  researchCategory: optionalTextSchema,
  keywords: z.string().max(1000).optional().default(''),
  publicationYear: optionalYearSchema,
  venueName: optionalTextSchema,
  doi: optionalTextSchema,
  sourceUrl: optionalTextSchema,
})

const createPatentDraftSchema = z.object({
  title: z.string().trim().min(4).max(500),
  abstract: optionalTextSchema,
  summary: optionalTextSchema,
  patentStatus: z.enum(patentStatusValues),
  patentNumber: optionalTextSchema,
  applicationNumber: optionalTextSchema,
  jurisdiction: optionalTextSchema,
  commercializationStatus: optionalTextSchema,
  industryPartner: optionalTextSchema,
})

const updateAuthorshipSettingsSchema = z.object({
  isAuthor: z.boolean(),
})

const publicationDetailSchema = z.object({
  publicationId: z.string().uuid(),
})

const patentDetailSchema = z.object({
  patentId: z.string().uuid(),
})

export const getWorkspaceSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    requireServerEnv()

    const currentSession = await requireCurrentSession()
    const { user } = currentSession

    const [
      facultyRows,
      departmentRows,
      profileRows,
      publicationRows,
      patentRows,
    ] = await Promise.all([
      db
        .select({
          id: faculties.id,
          name: faculties.name,
          slug: faculties.slug,
          description: faculties.description,
        })
        .from(faculties)
        .orderBy(faculties.name),
      db
        .select({
          id: departments.id,
          name: departments.name,
          slug: departments.slug,
          description: departments.description,
          facultyId: departments.facultyId,
          facultyName: faculties.name,
        })
        .from(departments)
        .innerJoin(faculties, eq(departments.facultyId, faculties.id))
        .orderBy(faculties.name, departments.name),
      db
        .select({
          id: profiles.id,
          displayName: profiles.displayName,
          slug: profiles.slug,
          profileType: profiles.profileType,
          primaryEmail: profiles.primaryEmail,
          affiliation: profiles.affiliation,
          isAuthor: profiles.isAuthor,
          bio: profiles.bio,
          researchInterests: profiles.researchInterests,
        })
        .from(profiles)
        .where(eq(profiles.userId, user.id))
        .orderBy(profiles.displayName),
      db
        .select({
          id: publications.id,
          title: publications.title,
          slug: publications.slug,
          status: publications.status,
          publicationType: publications.publicationType,
          abstract: publications.abstract,
          summary: publications.summary,
          researchCategory: publications.researchCategory,
          keywords: publications.keywords,
          publicationYear: publications.publicationYear,
          venueName: publications.venueName,
          doi: publications.doi,
          sourceUrl: publications.sourceUrl,
          createdAt: publications.createdAt,
        })
        .from(publications)
        .where(eq(publications.createdByUserId, user.id))
        .orderBy(desc(publications.createdAt))
        .limit(8),
      db
        .select({
          id: patents.id,
          title: patents.title,
          slug: patents.slug,
          status: patents.status,
          patentStatus: patents.patentStatus,
          abstract: patents.abstract,
          summary: patents.summary,
          patentNumber: patents.patentNumber,
          applicationNumber: patents.applicationNumber,
          jurisdiction: patents.jurisdiction,
          commercializationStatus: patents.commercializationStatus,
          industryPartner: patents.industryPartner,
          createdAt: patents.createdAt,
        })
        .from(patents)
        .where(eq(patents.createdByUserId, user.id))
        .orderBy(desc(patents.createdAt))
        .limit(8),
    ])

    return {
      currentUser: user,
      accounts: await getSessionAccounts(currentSession.sessionId),
      canManageOrganization: hasRole(user, ['super_admin']),
      faculties: facultyRows,
      departments: departmentRows,
      myProfiles: profileRows,
      recentPublications: publicationRows,
      recentPatents: patentRows,
    }
  },
)

export const createFaculty = createServerFn({ method: 'POST' })
  .validator(createFacultySchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    await requireAnyRole(['super_admin'])

    const [faculty] = await db
      .insert(faculties)
      .values({
        name: data.name,
        slug: await createUniqueFacultySlug(data.name),
        description: data.description,
      })
      .returning({ id: faculties.id, name: faculties.name })

    return { ok: true, faculty }
  })

export const createDepartment = createServerFn({ method: 'POST' })
  .validator(createDepartmentSchema)
  .handler(async ({ data }) => {
    requireServerEnv()
    await requireAnyRole(['super_admin'])

    const [department] = await db
      .insert(departments)
      .values({
        facultyId: data.facultyId,
        name: data.name,
        slug: await createUniqueDepartmentSlug(data.name),
        description: data.description,
      })
      .returning({ id: departments.id, name: departments.name })

    return { ok: true, department }
  })

export const upsertMyProfile = createServerFn({ method: 'POST' })
  .validator(upsertProfileSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()
    const researchInterests = splitKeywords(data.researchInterests)

    const existingProfileRows = await db
      .select({ id: profiles.id, slug: profiles.slug })
      .from(profiles)
      .where(eq(profiles.userId, user.id))
      .limit(1)
    const existingProfile = existingProfileRows[0] as
      (typeof existingProfileRows)[number] | undefined

    if (existingProfile) {
      const [profile] = await db
        .update(profiles)
        .set({
          displayName: data.displayName,
          primaryEmail: data.primaryEmail,
          affiliation: data.affiliation,
          isAuthor: user.isAuthor,
          bio: data.bio,
          researchInterests,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, existingProfile.id))
        .returning({ id: profiles.id, displayName: profiles.displayName })

      return { ok: true, profile }
    }

    const [profile] = await db
      .insert(profiles)
      .values({
        userId: user.id,
        displayName: data.displayName,
        slug: await createUniqueProfileSlug(data.displayName),
        profileType: 'staff',
        primaryEmail: data.primaryEmail,
        affiliation: data.affiliation,
        isAuthor: user.isAuthor,
        bio: data.bio,
        researchInterests,
      })
      .returning({ id: profiles.id, displayName: profiles.displayName })

    return { ok: true, profile }
  })

export const createPublicationDraft = createServerFn({ method: 'POST' })
  .validator(createPublicationDraftSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()
    const owningProfile = await requireOwnedPrimaryProfile(user)

    const [publication] = await db
      .insert(publications)
      .values({
        createdByUserId: user.id,
        owningProfileId: owningProfile.id,
        facultyId: owningProfile.facultyId,
        departmentId: owningProfile.departmentId,
        title: data.title,
        slug: await createUniquePublicationSlug(data.title),
        abstract: data.abstract,
        summary: data.summary,
        publicationType: data.publicationType,
        researchCategory: data.researchCategory,
        keywords: splitKeywords(data.keywords),
        publicationYear: data.publicationYear,
        venueName: data.venueName,
        doi: data.doi,
        sourceUrl: data.sourceUrl,
      })
      .returning({ id: publications.id, title: publications.title })

    return { ok: true, publication }
  })

export const createPatentDraft = createServerFn({ method: 'POST' })
  .validator(createPatentDraftSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()
    const owningProfile = await requireOwnedPrimaryProfile(user)

    const [patent] = await db
      .insert(patents)
      .values({
        createdByUserId: user.id,
        owningProfileId: owningProfile.id,
        facultyId: owningProfile.facultyId,
        departmentId: owningProfile.departmentId,
        title: data.title,
        slug: await createUniquePatentSlug(data.title),
        abstract: data.abstract,
        summary: data.summary,
        patentStatus: data.patentStatus,
        patentNumber: data.patentNumber,
        applicationNumber: data.applicationNumber,
        jurisdiction: data.jurisdiction,
        commercializationStatus: data.commercializationStatus,
        industryPartner: data.industryPartner,
      })
      .returning({ id: patents.id, title: patents.title })

    return { ok: true, patent }
  })

export const updateAuthorshipSettings = createServerFn({ method: 'POST' })
  .validator(updateAuthorshipSettingsSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()

    await db.transaction(async (transaction) => {
      await transaction
        .update(authUsers)
        .set({ isAuthor: data.isAuthor, updatedAt: new Date() })
        .where(eq(authUsers.id, user.id))

      await transaction
        .update(profiles)
        .set({ isAuthor: data.isAuthor, updatedAt: new Date() })
        .where(eq(profiles.userId, user.id))
    })

    return { ok: true, isAuthor: data.isAuthor }
  })

export const getPublicationDetail = createServerFn({ method: 'GET' })
  .validator(publicationDetailSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()
    const publicationRows = await db
      .select({
        id: publications.id,
        title: publications.title,
        slug: publications.slug,
        abstract: publications.abstract,
        summary: publications.summary,
        publicationType: publications.publicationType,
        researchCategory: publications.researchCategory,
        keywords: publications.keywords,
        publicationYear: publications.publicationYear,
        venueName: publications.venueName,
        doi: publications.doi,
        sourceUrl: publications.sourceUrl,
        documentUrl: publications.documentUrl,
        fundingInformation: publications.fundingInformation,
        collaborationDetails: publications.collaborationDetails,
        status: publications.status,
        publishedAt: publications.publishedAt,
        createdAt: publications.createdAt,
        updatedAt: publications.updatedAt,
        owningProfileName: profiles.displayName,
        facultyName: faculties.name,
        departmentName: departments.name,
      })
      .from(publications)
      .leftJoin(profiles, eq(publications.owningProfileId, profiles.id))
      .leftJoin(faculties, eq(publications.facultyId, faculties.id))
      .leftJoin(departments, eq(publications.departmentId, departments.id))
      .where(
        and(
          eq(publications.id, data.publicationId),
          eq(publications.createdByUserId, user.id),
        ),
      )
      .limit(1)
    const publication = publicationRows[0] as
      (typeof publicationRows)[number] | undefined

    if (!publication) {
      throw new Error('Publication not found')
    }

    return publication
  })

export const getPatentDetail = createServerFn({ method: 'GET' })
  .validator(patentDetailSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const { user } = await requireCurrentSession()
    const patentRows = await db
      .select({
        id: patents.id,
        title: patents.title,
        slug: patents.slug,
        abstract: patents.abstract,
        summary: patents.summary,
        patentNumber: patents.patentNumber,
        applicationNumber: patents.applicationNumber,
        filingDate: patents.filingDate,
        grantDate: patents.grantDate,
        jurisdiction: patents.jurisdiction,
        patentStatus: patents.patentStatus,
        sourceUrl: patents.sourceUrl,
        documentUrl: patents.documentUrl,
        commercializationStatus: patents.commercializationStatus,
        industryPartner: patents.industryPartner,
        status: patents.status,
        publishedAt: patents.publishedAt,
        createdAt: patents.createdAt,
        updatedAt: patents.updatedAt,
        owningProfileName: profiles.displayName,
        facultyName: faculties.name,
        departmentName: departments.name,
      })
      .from(patents)
      .leftJoin(profiles, eq(patents.owningProfileId, profiles.id))
      .leftJoin(faculties, eq(patents.facultyId, faculties.id))
      .leftJoin(departments, eq(patents.departmentId, departments.id))
      .where(
        and(
          eq(patents.id, data.patentId),
          eq(patents.createdByUserId, user.id),
        ),
      )
      .limit(1)
    const patent = patentRows[0] as (typeof patentRows)[number] | undefined

    if (!patent) {
      throw new Error('Patent not found')
    }

    return patent
  })

async function requireOwnedPrimaryProfile(user: SessionUser) {
  if (!user.isAuthor) {
    throw new Error('Enable authorship in settings before creating records')
  }

  const profileRows = await db
    .select({
      id: profiles.id,
      facultyId: profiles.facultyId,
      departmentId: profiles.departmentId,
    })
    .from(profiles)
    .where(eq(profiles.userId, user.id))
    .orderBy(profiles.displayName)
    .limit(1)
  const profile = profileRows[0] as (typeof profileRows)[number] | undefined

  if (!profile) {
    throw new Error('Create a profile before creating records')
  }

  return profile
}

async function createUniqueFacultySlug(value: string) {
  return createUniqueSlug(value, async (candidate) => {
    const existingRows = await db
      .select({ id: faculties.id })
      .from(faculties)
      .where(eq(faculties.slug, candidate))
      .limit(1)

    return existingRows.length > 0
  })
}

async function createUniqueDepartmentSlug(value: string) {
  return createUniqueSlug(value, async (candidate) => {
    const existingRows = await db
      .select({ id: departments.id })
      .from(departments)
      .where(eq(departments.slug, candidate))
      .limit(1)

    return existingRows.length > 0
  })
}

async function createUniqueProfileSlug(value: string) {
  return createUniqueSlug(value, async (candidate) => {
    const existingRows = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.slug, candidate))
      .limit(1)

    return existingRows.length > 0
  })
}

async function createUniquePublicationSlug(value: string) {
  return createUniqueSlug(value, async (candidate) => {
    const existingRows = await db
      .select({ id: publications.id })
      .from(publications)
      .where(eq(publications.slug, candidate))
      .limit(1)

    return existingRows.length > 0
  })
}

async function createUniquePatentSlug(value: string) {
  return createUniqueSlug(value, async (candidate) => {
    const existingRows = await db
      .select({ id: patents.id })
      .from(patents)
      .where(eq(patents.slug, candidate))
      .limit(1)

    return existingRows.length > 0
  })
}

async function createUniqueSlug(
  value: string,
  exists: (candidate: string) => Promise<boolean>,
) {
  const baseSlug = slugify(value)
  let candidate = baseSlug
  let suffix = 2

  while (await exists(candidate)) {
    candidate = `${baseSlug}-${suffix}`
    suffix += 1
  }

  return candidate
}
