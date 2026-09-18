import { createHash, randomBytes } from 'node:crypto'

import { and, eq, gt, isNull } from 'drizzle-orm'
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server'

import { db } from '#/db/index.ts'
import { authSessions, authUsers, userRoles } from '#/db/schema.ts'

import type { UserRole } from '#/db/schema.ts'

export const SESSION_COOKIE_NAME = '__Host-oau-ri-session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30

export type SessionUser = {
  id: string
  email: string
  universityEmail: string | null
  staffIdentifier: string | null
  roles: Array<{
    role: UserRole
    facultyId: string | null
    departmentId: string | null
  }>
}

export type CurrentSession = {
  sessionId: string
  expiresAt: Date
  user: SessionUser
}

function getSessionExpiry() {
  return new Date(Date.now() + SESSION_TTL_SECONDS * 1000)
}

function getRequestIpAddress() {
  const forwardedFor = getRequestHeader('x-forwarded-for')

  if (!forwardedFor) {
    return null
  }

  return forwardedFor.split(',')[0]?.trim() || null
}

export function createSessionToken() {
  return randomBytes(32).toString('base64url')
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('base64url')
}

export function readSessionToken() {
  const cookieHeader = getRequestHeader('cookie')

  if (!cookieHeader) {
    return null
  }

  for (const cookiePart of cookieHeader.split(/;\s*/)) {
    const separatorIndex = cookiePart.indexOf('=')

    if (separatorIndex === -1) {
      continue
    }

    const cookieName = cookiePart.slice(0, separatorIndex)

    if (cookieName === SESSION_COOKIE_NAME) {
      return cookiePart.slice(separatorIndex + 1)
    }
  }

  return null
}

export function setSessionCookie(token: string) {
  setResponseHeader(
    'Set-Cookie',
    [
      `${SESSION_COOKIE_NAME}=${token}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ].join('; '),
  )
}

export function clearSessionCookie() {
  setResponseHeader(
    'Set-Cookie',
    `${SESSION_COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`,
  )
}

export async function issueSession(userId: string) {
  const token = createSessionToken()
  const tokenHash = hashSessionToken(token)
  const expiresAt = getSessionExpiry()

  await db.insert(authSessions).values({
    userId,
    tokenHash,
    expiresAt,
    ipAddress: getRequestIpAddress(),
    userAgent: getRequestHeader('user-agent') ?? null,
  })

  setSessionCookie(token)

  return token
}

export async function revokeCurrentSession() {
  const token = readSessionToken()

  if (!token) {
    clearSessionCookie()
    return
  }

  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.tokenHash, hashSessionToken(token)),
        isNull(authSessions.revokedAt),
      ),
    )

  clearSessionCookie()
}

export async function revokeUserSessions(userId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const token = readSessionToken()

  if (!token) {
    return null
  }

  const tokenHash = hashSessionToken(token)

  const sessionRows = await db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      userId: authUsers.id,
      email: authUsers.email,
      universityEmail: authUsers.universityEmail,
      staffIdentifier: authUsers.staffIdentifier,
    })
    .from(authSessions)
    .innerJoin(authUsers, eq(authSessions.userId, authUsers.id))
    .where(
      and(
        eq(authSessions.tokenHash, tokenHash),
        isNull(authSessions.revokedAt),
        gt(authSessions.expiresAt, new Date()),
        eq(authUsers.status, 'active'),
      ),
    )
    .limit(1)
  const sessionRecord = sessionRows[0] as
    (typeof sessionRows)[number] | undefined

  if (!sessionRecord) {
    clearSessionCookie()
    return null
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(authSessions.id, sessionRecord.sessionId))

  const roles = await db
    .select({
      role: userRoles.role,
      facultyId: userRoles.facultyId,
      departmentId: userRoles.departmentId,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionRecord.userId))

  return {
    sessionId: sessionRecord.sessionId,
    expiresAt: sessionRecord.expiresAt,
    user: {
      id: sessionRecord.userId,
      email: sessionRecord.email,
      universityEmail: sessionRecord.universityEmail,
      staffIdentifier: sessionRecord.staffIdentifier,
      roles,
    },
  }
}
