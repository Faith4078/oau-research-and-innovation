import { and, asc, count, desc, eq, ilike, or } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/db/index.ts'
import {
  departments,
  faculties,
  patents,
  profiles,
  publications,
} from '#/db/schema.ts'
import { requireServerEnv } from '#/lib/env.server.ts'

import type { SQL } from 'drizzle-orm'

const optionalSearchSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(200).optional(),
)

const optionalPageNumberSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value)
  }

  return value
}, z.number().int().min(1).optional().default(1))

const optionalPageSizeSchema = z.preprocess((value) => {
  if (typeof value === 'string' && value.trim() !== '') {
    return Number(value)
  }

  return value
}, z.number().int().min(3).max(50).optional().default(12))

const publicDiscoverySchema = z.object({
  query: optionalSearchSchema,
})

const publicListSchema = z.object({
  query: optionalSearchSchema,
  page: optionalPageNumberSchema,
  pageSize: optionalPageSizeSchema,
})

const publicProfileDetailSchema = z.object({
  profileId: z.string().uuid(),
})

const publicPublicationDetailSchema = z.object({
  publicationId: z.string().uuid(),
})

const publicPatentDetailSchema = z.object({
  patentId: z.string().uuid(),
})

export const getPublicDiscovery = createServerFn({ method: 'GET' })
  .validator(publicDiscoverySchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const [publicationRecords, patentRecords] = await Promise.all([
      getPublicationRecords(data.query, 4),
      getPatentRecords(data.query, 4),
    ])

    return { publications: publicationRecords, patents: patentRecords }
  })

export const getPublicAuthors = createServerFn({ method: 'GET' })
  .validator(publicListSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const whereCondition = createAuthorWhereCondition(data.query)
    const offset = (data.page - 1) * data.pageSize
    const [totalRows, records] = await Promise.all([
      db.select({ value: count() }).from(profiles).where(whereCondition),
      getAuthorRecords(data.query, data.pageSize, offset),
    ])

    return createPaginatedResult(
      records,
      totalRows[0]?.value ?? 0,
      data.page,
      data.pageSize,
    )
  })

export const getPublicPublications = createServerFn({ method: 'GET' })
  .validator(publicListSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const whereCondition = createPublicationWhereCondition(data.query)
    const offset = (data.page - 1) * data.pageSize
    const [totalRows, records] = await Promise.all([
      db.select({ value: count() }).from(publications).where(whereCondition),
      getPublicationRecords(data.query, data.pageSize, offset),
    ])

    return createPaginatedResult(
      records,
      totalRows[0]?.value ?? 0,
      data.page,
      data.pageSize,
    )
  })

export const getPublicPatents = createServerFn({ method: 'GET' })
  .validator(publicListSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const whereCondition = createPatentWhereCondition(data.query)
    const offset = (data.page - 1) * data.pageSize
    const [totalRows, records] = await Promise.all([
      db.select({ value: count() }).from(patents).where(whereCondition),
      getPatentRecords(data.query, data.pageSize, offset),
    ])

    return createPaginatedResult(
      records,
      totalRows[0]?.value ?? 0,
      data.page,
      data.pageSize,
    )
  })

export const getPublicAuthorDetail = createServerFn({ method: 'GET' })
  .validator(publicProfileDetailSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const authorRows = await db
      .select({
        id: profiles.id,
        displayName: profiles.displayName,
        slug: profiles.slug,
        profileType: profiles.profileType,
        primaryEmail: profiles.primaryEmail,
        affiliation: profiles.affiliation,
        bio: profiles.bio,
        researchInterests: profiles.researchInterests,
        profilePhotoUrl: profiles.profilePhotoUrl,
        orcidId: profiles.orcidId,
        scholarProfileUrl: profiles.scholarProfileUrl,
        facultyName: faculties.name,
        departmentName: departments.name,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .leftJoin(faculties, eq(profiles.facultyId, faculties.id))
      .leftJoin(departments, eq(profiles.departmentId, departments.id))
      .where(and(eq(profiles.id, data.profileId), eq(profiles.isAuthor, true)))
      .limit(1)
    const author = authorRows[0] as (typeof authorRows)[number] | undefined

    if (!author) {
      throw new Error('Author not found')
    }

    const [authorPublications, authorPatents] = await Promise.all([
      db
        .select({
          id: publications.id,
          title: publications.title,
          summary: publications.summary,
          abstract: publications.abstract,
          publicationType: publications.publicationType,
          publicationYear: publications.publicationYear,
          venueName: publications.venueName,
          publishedAt: publications.publishedAt,
        })
        .from(publications)
        .where(
          and(
            eq(publications.owningProfileId, author.id),
            eq(publications.status, 'published'),
          ),
        )
        .orderBy(desc(publications.publishedAt), desc(publications.createdAt))
        .limit(8),
      db
        .select({
          id: patents.id,
          title: patents.title,
          summary: patents.summary,
          abstract: patents.abstract,
          patentStatus: patents.patentStatus,
          patentNumber: patents.patentNumber,
          publishedAt: patents.publishedAt,
        })
        .from(patents)
        .where(
          and(
            eq(patents.owningProfileId, author.id),
            eq(patents.status, 'published'),
          ),
        )
        .orderBy(desc(patents.publishedAt), desc(patents.createdAt))
        .limit(8),
    ])

    return {
      author,
      publications: authorPublications,
      patents: authorPatents,
    }
  })

export const getPublicPublicationDetail = createServerFn({ method: 'GET' })
  .validator(publicPublicationDetailSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const publicationRows = await db
      .select({
        id: publications.id,
        title: publications.title,
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
        publishedAt: publications.publishedAt,
        updatedAt: publications.updatedAt,
        owningProfileId: profiles.id,
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
          eq(publications.status, 'published'),
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

export const getPublicPatentDetail = createServerFn({ method: 'GET' })
  .validator(publicPatentDetailSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const patentRows = await db
      .select({
        id: patents.id,
        title: patents.title,
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
        publishedAt: patents.publishedAt,
        updatedAt: patents.updatedAt,
        owningProfileId: profiles.id,
        owningProfileName: profiles.displayName,
        facultyName: faculties.name,
        departmentName: departments.name,
      })
      .from(patents)
      .leftJoin(profiles, eq(patents.owningProfileId, profiles.id))
      .leftJoin(faculties, eq(patents.facultyId, faculties.id))
      .leftJoin(departments, eq(patents.departmentId, departments.id))
      .where(
        and(eq(patents.id, data.patentId), eq(patents.status, 'published')),
      )
      .limit(1)
    const patent = patentRows[0] as (typeof patentRows)[number] | undefined

    if (!patent) {
      throw new Error('Patent not found')
    }

    return patent
  })

async function getAuthorRecords(
  query: string | undefined,
  limit: number,
  offset = 0,
) {
  return db
    .select({
      id: profiles.id,
      displayName: profiles.displayName,
      slug: profiles.slug,
      profileType: profiles.profileType,
      primaryEmail: profiles.primaryEmail,
      affiliation: profiles.affiliation,
      bio: profiles.bio,
      researchInterests: profiles.researchInterests,
      profilePhotoUrl: profiles.profilePhotoUrl,
      orcidId: profiles.orcidId,
      scholarProfileUrl: profiles.scholarProfileUrl,
      facultyName: faculties.name,
      departmentName: departments.name,
      updatedAt: profiles.updatedAt,
    })
    .from(profiles)
    .leftJoin(faculties, eq(profiles.facultyId, faculties.id))
    .leftJoin(departments, eq(profiles.departmentId, departments.id))
    .where(createAuthorWhereCondition(query))
    .orderBy(asc(profiles.displayName))
    .limit(limit)
    .offset(offset)
}

async function getPublicationRecords(
  query: string | undefined,
  limit: number,
  offset = 0,
) {
  return db
    .select({
      id: publications.id,
      title: publications.title,
      abstract: publications.abstract,
      summary: publications.summary,
      publicationType: publications.publicationType,
      researchCategory: publications.researchCategory,
      keywords: publications.keywords,
      publicationYear: publications.publicationYear,
      venueName: publications.venueName,
      doi: publications.doi,
      publishedAt: publications.publishedAt,
      owningProfileId: profiles.id,
      owningProfileName: profiles.displayName,
      facultyName: faculties.name,
      departmentName: departments.name,
    })
    .from(publications)
    .leftJoin(profiles, eq(publications.owningProfileId, profiles.id))
    .leftJoin(faculties, eq(publications.facultyId, faculties.id))
    .leftJoin(departments, eq(publications.departmentId, departments.id))
    .where(createPublicationWhereCondition(query))
    .orderBy(desc(publications.publishedAt), desc(publications.createdAt))
    .limit(limit)
    .offset(offset)
}

async function getPatentRecords(
  query: string | undefined,
  limit: number,
  offset = 0,
) {
  return db
    .select({
      id: patents.id,
      title: patents.title,
      abstract: patents.abstract,
      summary: patents.summary,
      patentNumber: patents.patentNumber,
      applicationNumber: patents.applicationNumber,
      jurisdiction: patents.jurisdiction,
      patentStatus: patents.patentStatus,
      commercializationStatus: patents.commercializationStatus,
      industryPartner: patents.industryPartner,
      publishedAt: patents.publishedAt,
      owningProfileId: profiles.id,
      owningProfileName: profiles.displayName,
      facultyName: faculties.name,
      departmentName: departments.name,
    })
    .from(patents)
    .leftJoin(profiles, eq(patents.owningProfileId, profiles.id))
    .leftJoin(faculties, eq(patents.facultyId, faculties.id))
    .leftJoin(departments, eq(patents.departmentId, departments.id))
    .where(createPatentWhereCondition(query))
    .orderBy(desc(patents.publishedAt), desc(patents.createdAt))
    .limit(limit)
    .offset(offset)
}

function createAuthorWhereCondition(query: string | undefined) {
  const conditions: SQL[] = [eq(profiles.isAuthor, true)]

  if (query) {
    const searchPattern = `%${query}%`

    conditions.push(
      or(
        ilike(profiles.displayName, searchPattern),
        ilike(profiles.affiliation, searchPattern),
        ilike(profiles.bio, searchPattern),
        ilike(profiles.primaryEmail, searchPattern),
      )!,
    )
  }

  return and(...conditions)!
}

function createPublicationWhereCondition(query: string | undefined) {
  const conditions: SQL[] = [eq(publications.status, 'published')]

  if (query) {
    const searchPattern = `%${query}%`

    conditions.push(
      or(
        ilike(publications.title, searchPattern),
        ilike(publications.abstract, searchPattern),
        ilike(publications.summary, searchPattern),
        ilike(publications.venueName, searchPattern),
        ilike(publications.doi, searchPattern),
        ilike(publications.researchCategory, searchPattern),
      )!,
    )
  }

  return and(...conditions)!
}

function createPatentWhereCondition(query: string | undefined) {
  const conditions: SQL[] = [eq(patents.status, 'published')]

  if (query) {
    const searchPattern = `%${query}%`

    conditions.push(
      or(
        ilike(patents.title, searchPattern),
        ilike(patents.abstract, searchPattern),
        ilike(patents.summary, searchPattern),
        ilike(patents.patentNumber, searchPattern),
        ilike(patents.applicationNumber, searchPattern),
        ilike(patents.jurisdiction, searchPattern),
        ilike(patents.commercializationStatus, searchPattern),
        ilike(patents.industryPartner, searchPattern),
      )!,
    )
  }

  return and(...conditions)!
}

function createPaginatedResult<T>(
  records: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    records,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
  }
}
