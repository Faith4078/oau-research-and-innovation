import { createHash, randomBytes } from 'node:crypto'

import { and, eq, gt, isNull } from 'drizzle-orm'
import { createServerFn } from '@tanstack/react-start'
import { getRequestHeader } from '@tanstack/react-start/server'
import { z } from 'zod'

import { db } from '#/db/index.ts'
import { authPasswordResetTokens, authUsers, userRoles } from '#/db/schema.ts'
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
  switchCurrentSession,
} from '#/lib/session.server.ts'

const PASSWORD_RESET_TTL_MINUTES = 30

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

const optionalBooleanSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return true
  }

  return value === true || value === 'true'
}, z.boolean())

const signUpSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  universityEmail: optionalEmailSchema,
  staffIdentifier: optionalTextSchema,
  isAuthor: optionalBooleanSchema.default(true),
})

const signInSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
  password: z.string().min(1, 'Password is required'),
})

const requestPasswordResetSchema = z.object({
  email: z.string().email().transform(normalizeEmail),
})

const resetPasswordSchema = z.object({
  token: z.string().trim().min(32, 'Reset token is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

const switchAccountSchema = z.object({
  sessionId: z.string().uuid(),
})

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

function createPasswordResetToken() {
  return randomBytes(32).toString('base64url')
}

function hashPasswordResetToken(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}

function getPasswordResetExpiry() {
  return new Date(Date.now() + PASSWORD_RESET_TTL_MINUTES * 60 * 1000)
}

function getRequestIpAddress() {
  const forwardedFor = getRequestHeader('x-forwarded-for')

  if (!forwardedFor) {
    return null
  }

  return forwardedFor.split(',')[0]?.trim() || null
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
            isAuthor: data.isAuthor,
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

    await issueSession(user.id)

    await db
      .update(authUsers)
      .set({ lastSignedInAt: new Date(), updatedAt: new Date() })
      .where(eq(authUsers.id, user.id))

    return { ok: true, user: { id: user.id, email: user.email } }
  })

export const requestPasswordReset = createServerFn({ method: 'POST' })
  .validator(requestPasswordResetSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const userRows = await db
      .select({ id: authUsers.id, status: authUsers.status })
      .from(authUsers)
      .where(eq(authUsers.email, data.email))
      .limit(1)
    const user = userRows[0] as (typeof userRows)[number] | undefined

    if (!user || user.status !== 'active') {
      return { ok: true, resetPath: null }
    }

    const token = createPasswordResetToken()
    const expiresAt = getPasswordResetExpiry()

    await db.transaction(async (transaction) => {
      await transaction
        .update(authPasswordResetTokens)
        .set({ usedAt: new Date() })
        .where(
          and(
            eq(authPasswordResetTokens.userId, user.id),
            isNull(authPasswordResetTokens.usedAt),
          ),
        )

      await transaction.insert(authPasswordResetTokens).values({
        userId: user.id,
        tokenHash: hashPasswordResetToken(token),
        expiresAt,
        ipAddress: getRequestIpAddress(),
        userAgent: getRequestHeader('user-agent') ?? null,
      })
    })

    return {
      ok: true,
      resetPath: `/auth/reset-password?token=${encodeURIComponent(token)}`,
    }
  })

export const resetPassword = createServerFn({ method: 'POST' })
  .validator(resetPasswordSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const tokenHash = hashPasswordResetToken(data.token)
    const resetRows = await db
      .select({
        id: authPasswordResetTokens.id,
        userId: authPasswordResetTokens.userId,
      })
      .from(authPasswordResetTokens)
      .innerJoin(authUsers, eq(authPasswordResetTokens.userId, authUsers.id))
      .where(
        and(
          eq(authPasswordResetTokens.tokenHash, tokenHash),
          isNull(authPasswordResetTokens.usedAt),
          gt(authPasswordResetTokens.expiresAt, new Date()),
          eq(authUsers.status, 'active'),
        ),
      )
      .limit(1)
    const resetToken = resetRows[0] as (typeof resetRows)[number] | undefined

    if (!resetToken) {
      throw new Error('This reset link is invalid or expired')
    }

    await db.transaction(async (transaction) => {
      await transaction
        .update(authUsers)
        .set({
          passwordHash: await hashPassword(data.password),
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, resetToken.userId))

      await transaction
        .update(authPasswordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(authPasswordResetTokens.id, resetToken.id))
    })

    await revokeUserSessions(resetToken.userId)

    return { ok: true }
  })

export const signOut = createServerFn({ method: 'POST' }).handler(async () => {
  requireServerEnv()
  await revokeCurrentSession()

  return { ok: true }
})

export const switchAccount = createServerFn({ method: 'POST' })
  .validator(switchAccountSchema)
  .handler(async ({ data }) => {
    requireServerEnv()

    const session = await switchCurrentSession(data.sessionId)

    return {
      ok: true,
      user: { id: session.user.id, email: session.user.email },
    }
  })

export const getCurrentUser = createServerFn({ method: 'GET' }).handler(
  async () => {
    requireServerEnv()

    const currentSession = await getCurrentSession()

    return currentSession?.user ?? null
  },
)
