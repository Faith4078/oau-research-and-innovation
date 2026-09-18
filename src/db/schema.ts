import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'

export const accountStatusValues = [
  'active',
  'disabled',
  'pending_verification',
] as const

export const userRoleValues = [
  'user',
  'lecturer',
  'department_admin',
  'faculty_admin',
  'iptto_officer',
  'super_admin',
] as const

export const profileTypeValues = ['staff', 'external', 'organization'] as const

export const publicationTypeValues = [
  'journal_article',
  'conference_paper',
  'book_chapter',
  'book',
  'dataset',
  'technical_report',
  'thesis',
  'other',
] as const

export const recordStatusValues = [
  'draft',
  'submitted',
  'department_review',
  'faculty_review',
  'changes_requested',
  'approved',
  'published',
  'rejected',
  'archived',
] as const

export const patentStatusValues = [
  'potential',
  'disclosed',
  'filed',
  'granted',
  'licensed',
  'abandoned',
] as const

export const reviewDecisionValues = [
  'submitted',
  'approved',
  'changes_requested',
  'rejected',
  'published',
  'archived',
] as const

export const accountStatusEnum = pgEnum('account_status', accountStatusValues)
export const userRoleEnum = pgEnum('user_role', userRoleValues)
export const profileTypeEnum = pgEnum('profile_type', profileTypeValues)
export const publicationTypeEnum = pgEnum(
  'publication_type',
  publicationTypeValues,
)
export const recordStatusEnum = pgEnum('record_status', recordStatusValues)
export const patentStatusEnum = pgEnum('patent_status', patentStatusValues)
export const reviewDecisionEnum = pgEnum(
  'review_decision',
  reviewDecisionValues,
)

export type UserRole = (typeof userRoleValues)[number]

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
}

export const authUsers = pgTable(
  'auth_users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    universityEmail: text('university_email'),
    staffIdentifier: text('staff_identifier'),
    status: accountStatusEnum('status').notNull().default('active'),
    emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
    lastSignedInAt: timestamp('last_signed_in_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('auth_users_email_unique').on(table.email),
    uniqueIndex('auth_users_university_email_unique')
      .on(table.universityEmail)
      .where(sql`${table.universityEmail} is not null`),
    index('auth_users_status_idx').on(table.status),
  ],
)

export const authSessions = pgTable(
  'auth_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('auth_sessions_token_hash_unique').on(table.tokenHash),
    index('auth_sessions_user_id_idx').on(table.userId),
    index('auth_sessions_expires_at_idx').on(table.expiresAt),
  ],
)

export const faculties = pgTable(
  'faculties',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('faculties_slug_unique').on(table.slug),
    uniqueIndex('faculties_name_unique').on(table.name),
  ],
)

export const departments = pgTable(
  'departments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    facultyId: uuid('faculty_id')
      .notNull()
      .references(() => faculties.id, { onDelete: 'restrict' }),
    name: text('name').notNull(),
    slug: text('slug').notNull(),
    description: text('description'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('departments_slug_unique').on(table.slug),
    unique('departments_faculty_name_unique').on(table.facultyId, table.name),
    index('departments_faculty_id_idx').on(table.facultyId),
  ],
)

export const userRoles = pgTable(
  'user_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => authUsers.id, { onDelete: 'cascade' }),
    role: userRoleEnum('role').notNull(),
    facultyId: uuid('faculty_id').references(() => faculties.id, {
      onDelete: 'set null',
    }),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    createdByUserId: uuid('created_by_user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('user_roles_user_id_idx').on(table.userId),
    index('user_roles_role_idx').on(table.role),
    index('user_roles_faculty_id_idx').on(table.facultyId),
    index('user_roles_department_id_idx').on(table.departmentId),
    check(
      'user_roles_faculty_admin_scope_check',
      sql`${table.role} != 'faculty_admin' or ${table.facultyId} is not null`,
    ),
    check(
      'user_roles_department_admin_scope_check',
      sql`${table.role} != 'department_admin' or ${table.departmentId} is not null`,
    ),
  ],
)

export const staff = pgTable(
  'staff',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    staffId: text('staff_id'),
    universityEmail: text('university_email'),
    fullName: text('full_name').notNull(),
    title: text('title'),
    rank: text('rank'),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    facultyId: uuid('faculty_id').references(() => faculties.id, {
      onDelete: 'set null',
    }),
    officeLocation: text('office_location'),
    phone: text('phone'),
    employmentStatus: text('employment_status'),
    profilePhotoUrl: text('profile_photo_url'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('staff_user_id_unique')
      .on(table.userId)
      .where(sql`${table.userId} is not null`),
    uniqueIndex('staff_staff_id_unique')
      .on(table.staffId)
      .where(sql`${table.staffId} is not null`),
    uniqueIndex('staff_university_email_unique')
      .on(table.universityEmail)
      .where(sql`${table.universityEmail} is not null`),
    index('staff_department_id_idx').on(table.departmentId),
    index('staff_faculty_id_idx').on(table.facultyId),
  ],
)

export const profiles = pgTable(
  'profiles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    staffId: uuid('staff_id').references(() => staff.id, {
      onDelete: 'set null',
    }),
    displayName: text('display_name').notNull(),
    slug: text('slug').notNull(),
    profileType: profileTypeEnum('profile_type').notNull().default('external'),
    primaryEmail: text('primary_email'),
    affiliation: text('affiliation'),
    facultyId: uuid('faculty_id').references(() => faculties.id, {
      onDelete: 'set null',
    }),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    bio: text('bio'),
    researchInterests: jsonb('research_interests').$type<string[]>(),
    profilePhotoUrl: text('profile_photo_url'),
    orcidId: text('orcid_id'),
    openalexAuthorId: text('openalex_author_id'),
    semanticScholarAuthorId: text('semantic_scholar_author_id'),
    scholarProfileUrl: text('scholar_profile_url'),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('profiles_slug_unique').on(table.slug),
    index('profiles_user_id_idx').on(table.userId),
    index('profiles_staff_id_idx').on(table.staffId),
    index('profiles_profile_type_idx').on(table.profileType),
    index('profiles_department_id_idx').on(table.departmentId),
    index('profiles_faculty_id_idx').on(table.facultyId),
  ],
)

export const publications = pgTable(
  'publications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByUserId: uuid('created_by_user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    owningProfileId: uuid('owning_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    facultyId: uuid('faculty_id').references(() => faculties.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    abstract: text('abstract'),
    summary: text('summary'),
    publicationType: publicationTypeEnum('publication_type')
      .notNull()
      .default('other'),
    researchCategory: text('research_category'),
    keywords: jsonb('keywords').$type<string[]>(),
    publicationYear: integer('publication_year'),
    venueName: text('venue_name'),
    doi: text('doi'),
    sourceUrl: text('source_url'),
    documentUrl: text('document_url'),
    fundingInformation: text('funding_information'),
    collaborationDetails: text('collaboration_details'),
    status: recordStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('publications_slug_unique').on(table.slug),
    uniqueIndex('publications_doi_unique')
      .on(table.doi)
      .where(sql`${table.doi} is not null`),
    index('publications_status_idx').on(table.status),
    index('publications_publication_year_idx').on(table.publicationYear),
    index('publications_department_id_idx').on(table.departmentId),
    index('publications_faculty_id_idx').on(table.facultyId),
    index('publications_publication_type_idx').on(table.publicationType),
    index('publications_owning_profile_id_idx').on(table.owningProfileId),
  ],
)

export const publicationContributors = pgTable(
  'publication_contributors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicationId: uuid('publication_id')
      .notNull()
      .references(() => publications.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    contributorRole: text('contributor_role').notNull().default('author'),
    authorOrder: integer('author_order').notNull().default(1),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('publication_contributors_publication_id_idx').on(
      table.publicationId,
    ),
    index('publication_contributors_profile_id_idx').on(table.profileId),
    unique('publication_contributors_publication_profile_role_unique').on(
      table.publicationId,
      table.profileId,
      table.contributorRole,
    ),
  ],
)

export const patents = pgTable(
  'patents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    createdByUserId: uuid('created_by_user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    owningProfileId: uuid('owning_profile_id').references(() => profiles.id, {
      onDelete: 'set null',
    }),
    departmentId: uuid('department_id').references(() => departments.id, {
      onDelete: 'set null',
    }),
    facultyId: uuid('faculty_id').references(() => faculties.id, {
      onDelete: 'set null',
    }),
    title: text('title').notNull(),
    slug: text('slug').notNull(),
    abstract: text('abstract'),
    summary: text('summary'),
    patentNumber: text('patent_number'),
    applicationNumber: text('application_number'),
    filingDate: date('filing_date'),
    grantDate: date('grant_date'),
    jurisdiction: text('jurisdiction'),
    patentStatus: patentStatusEnum('patent_status')
      .notNull()
      .default('potential'),
    sourceUrl: text('source_url'),
    documentUrl: text('document_url'),
    commercializationStatus: text('commercialization_status'),
    industryPartner: text('industry_partner'),
    status: recordStatusEnum('status').notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex('patents_slug_unique').on(table.slug),
    uniqueIndex('patents_patent_number_unique')
      .on(table.patentNumber)
      .where(sql`${table.patentNumber} is not null`),
    index('patents_status_idx').on(table.status),
    index('patents_department_id_idx').on(table.departmentId),
    index('patents_faculty_id_idx').on(table.facultyId),
    index('patents_patent_status_idx').on(table.patentStatus),
    index('patents_owning_profile_id_idx').on(table.owningProfileId),
  ],
)

export const patentContributors = pgTable(
  'patent_contributors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    patentId: uuid('patent_id')
      .notNull()
      .references(() => patents.id, { onDelete: 'cascade' }),
    profileId: uuid('profile_id')
      .notNull()
      .references(() => profiles.id, { onDelete: 'restrict' }),
    contributorRole: text('contributor_role').notNull().default('inventor'),
    inventorOrder: integer('inventor_order').notNull().default(1),
    isPrimary: boolean('is_primary').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('patent_contributors_patent_id_idx').on(table.patentId),
    index('patent_contributors_profile_id_idx').on(table.profileId),
    unique('patent_contributors_patent_profile_role_unique').on(
      table.patentId,
      table.profileId,
      table.contributorRole,
    ),
  ],
)

export const reviewEvents = pgTable(
  'review_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    publicationId: uuid('publication_id').references(() => publications.id, {
      onDelete: 'cascade',
    }),
    patentId: uuid('patent_id').references(() => patents.id, {
      onDelete: 'cascade',
    }),
    actorUserId: uuid('actor_user_id').references(() => authUsers.id, {
      onDelete: 'set null',
    }),
    fromStatus: recordStatusEnum('from_status'),
    toStatus: recordStatusEnum('to_status'),
    decision: reviewDecisionEnum('decision').notNull(),
    comment: text('comment'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index('review_events_publication_id_idx').on(table.publicationId),
    index('review_events_patent_id_idx').on(table.patentId),
    index('review_events_actor_user_id_idx').on(table.actorUserId),
    check(
      'review_events_single_subject_check',
      sql`((case when ${table.publicationId} is null then 0 else 1 end) + (case when ${table.patentId} is null then 0 else 1 end)) = 1`,
    ),
  ],
)

export const authUsersRelations = relations(authUsers, ({ many, one }) => ({
  roles: many(userRoles),
  sessions: many(authSessions),
  staff: one(staff),
  profiles: many(profiles),
}))

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.id],
  }),
}))

export const userRolesRelations = relations(userRoles, ({ one }) => ({
  user: one(authUsers, {
    fields: [userRoles.userId],
    references: [authUsers.id],
  }),
  faculty: one(faculties, {
    fields: [userRoles.facultyId],
    references: [faculties.id],
  }),
  department: one(departments, {
    fields: [userRoles.departmentId],
    references: [departments.id],
  }),
}))

export const facultiesRelations = relations(faculties, ({ many }) => ({
  departments: many(departments),
  staff: many(staff),
  profiles: many(profiles),
  publications: many(publications),
  patents: many(patents),
}))

export const departmentsRelations = relations(departments, ({ many, one }) => ({
  faculty: one(faculties, {
    fields: [departments.facultyId],
    references: [faculties.id],
  }),
  staff: many(staff),
  profiles: many(profiles),
  publications: many(publications),
  patents: many(patents),
}))

export const staffRelations = relations(staff, ({ many, one }) => ({
  user: one(authUsers, {
    fields: [staff.userId],
    references: [authUsers.id],
  }),
  faculty: one(faculties, {
    fields: [staff.facultyId],
    references: [faculties.id],
  }),
  department: one(departments, {
    fields: [staff.departmentId],
    references: [departments.id],
  }),
  profiles: many(profiles),
}))

export const profilesRelations = relations(profiles, ({ many, one }) => ({
  user: one(authUsers, {
    fields: [profiles.userId],
    references: [authUsers.id],
  }),
  staff: one(staff, {
    fields: [profiles.staffId],
    references: [staff.id],
  }),
  faculty: one(faculties, {
    fields: [profiles.facultyId],
    references: [faculties.id],
  }),
  department: one(departments, {
    fields: [profiles.departmentId],
    references: [departments.id],
  }),
  publicationContributions: many(publicationContributors),
  patentContributions: many(patentContributors),
}))

export const publicationsRelations = relations(
  publications,
  ({ many, one }) => ({
    createdByUser: one(authUsers, {
      fields: [publications.createdByUserId],
      references: [authUsers.id],
    }),
    owningProfile: one(profiles, {
      fields: [publications.owningProfileId],
      references: [profiles.id],
    }),
    faculty: one(faculties, {
      fields: [publications.facultyId],
      references: [faculties.id],
    }),
    department: one(departments, {
      fields: [publications.departmentId],
      references: [departments.id],
    }),
    contributors: many(publicationContributors),
    reviewEvents: many(reviewEvents),
  }),
)

export const publicationContributorsRelations = relations(
  publicationContributors,
  ({ one }) => ({
    publication: one(publications, {
      fields: [publicationContributors.publicationId],
      references: [publications.id],
    }),
    profile: one(profiles, {
      fields: [publicationContributors.profileId],
      references: [profiles.id],
    }),
  }),
)

export const patentsRelations = relations(patents, ({ many, one }) => ({
  createdByUser: one(authUsers, {
    fields: [patents.createdByUserId],
    references: [authUsers.id],
  }),
  owningProfile: one(profiles, {
    fields: [patents.owningProfileId],
    references: [profiles.id],
  }),
  faculty: one(faculties, {
    fields: [patents.facultyId],
    references: [faculties.id],
  }),
  department: one(departments, {
    fields: [patents.departmentId],
    references: [departments.id],
  }),
  contributors: many(patentContributors),
  reviewEvents: many(reviewEvents),
}))

export const patentContributorsRelations = relations(
  patentContributors,
  ({ one }) => ({
    patent: one(patents, {
      fields: [patentContributors.patentId],
      references: [patents.id],
    }),
    profile: one(profiles, {
      fields: [patentContributors.profileId],
      references: [profiles.id],
    }),
  }),
)

export const reviewEventsRelations = relations(reviewEvents, ({ one }) => ({
  publication: one(publications, {
    fields: [reviewEvents.publicationId],
    references: [publications.id],
  }),
  patent: one(patents, {
    fields: [reviewEvents.patentId],
    references: [patents.id],
  }),
  actorUser: one(authUsers, {
    fields: [reviewEvents.actorUserId],
    references: [authUsers.id],
  }),
}))

export type AuthUser = typeof authUsers.$inferSelect
export type NewAuthUser = typeof authUsers.$inferInsert
export type UserRoleRecord = typeof userRoles.$inferSelect
