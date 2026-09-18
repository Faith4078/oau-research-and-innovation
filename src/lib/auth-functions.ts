import { eq } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { z } from 'zod'

import { db } from '#/db/index.ts'
import { authUsers, userRoles } from '#/db/schema.ts'
import { requireServerEnv } from '#/lib/env.server.ts'
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  verifyPasswordHash,
} from '#/lib/password.server.ts'
import {
  getCurrentSession,
  issueSession,
  revokeCurrentSession,
  revokeUserSessions,
} from '#/lib/session.server.ts'

const optionalEmailSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().email().transform(normalizeEmail).optional(),
)

const optionalTextSchema = z.preprocess(
  (value) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(120).optional(),
)

const signUpSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  universityEmail: optionalEmailSchema,
  staffIdentifier: optionalTextSchema,
})

const signInSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1, 'Password is required'),
})

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function isUniqueConstraintError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === '23505'
  )
}

export const signUp = createServerFn({ method: 'POST' })
  .validator(signUpSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const existingUser = await db
      .select({ id: authUsers.id })
      .from(authUsers)
      .where(eq(authUsers.email, data.email))
      .limit(1)

    if (existingUser.length > 0) {
      throw new Error('An account with this email already exists')
    }

    try {
      const user = await db.transaction(async (transaction) => {
        const [createdUser] = await transaction
          .insert(authUsers)
          .values({
            email: data.email,
            passwordHash: await hashPassword(data.password),
            universityEmail: data.universityEmail,
            staffIdentifier: data.staffIdentifier,
          })
          .returning({ id: authUsers.id, email: authUsers.email })

        await transaction.insert(userRoles).values({
          userId: createdUser.id,
          role: 'user',
          createdByUserId: createdUser.id,
        })

        return createdUser
      })

      await issueSession(user.id)

      return { ok: true, user }
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw new Error('An account with this email already exists')
      }

      throw error
    }
  })

export const signIn = createServerFn({ method: 'POST' })
  .validator(signInSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const userRows = await db
      .select({
        id: authUsers.id,
        email: authUsers.email,
        passwordHash: authUsers.passwordHash,
        status: authUsers.status,
      })
      .from(authUsers)
      .where(eq(authUsers.email, data.email))
      .limit(1)
    const user = userRows[0] as (typeof userRows)[number] | undefined

    const passwordHash = user ? user.passwordHash : DUMMY_PASSWORD_HASH
    const passwordMatches = await verifyPasswordHash(
      passwordHash,
      data.password,
    )

    if (!user || !passwordMatches || user.status !== 'active') {
      throw new Error('Invalid email or password')
    }

    await revokeUserSessions(user.id)
    await issueSession(user.id)

    await db
      .update(authUsers)
      .set({ lastSignedInAt: new Date(), updatedAt: new Date() })
      .where(eq(authUsers.id, user.id))

    return { ok: true, user: { id: user.id, email: user.email } }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  requireServerEnv()
  await revokeCurrentSession()

  return { ok: true }
})

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    requireServerEnv()

    const currentSession = await getCurrentSession()

    return currentSession?.user ?? null
  },
)
