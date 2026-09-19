import { Buffer } from 'node:buffer'
import { createHash, randomBytes } from 'node:crypto'

import { and, eq, gt, isNull, ne } from 'drizzle-orm'
import {
  getRequestHeader,
  setResponseHeader,
} from '@tanstack/react-start/server'

import { db } from '#/db/index.ts'
import { authSessions, authUsers, userRoles } from '#/db/schema.ts'

import type { UserRole } from '#/db/schema.ts'

export const SESSION_COOKIE_NAME = '__Host-oau-ri-session'
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30
const SESSION_COOKIE_PREFIX = 'v2.'
const MAX_BROWSER_SESSIONS = 5

export type SessionUser = {
  id: string
  email: string
  universityEmail: string | null
  staffIdentifier: string | null
  isAuthor: boolean
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

export type SessionAccount = CurrentSession & {
  isCurrent: boolean
}

type SessionCookieJar = {
  activeToken: string
  tokens: string[]
}

type ResolvedSession = CurrentSession & {
  token: string
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

function decodeCookieValue(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function readRawSessionCookie() {
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
      return decodeCookieValue(cookiePart.slice(separatorIndex + 1))
    }
  }

  return null
}

function normalizeSessionJar(jar: SessionCookieJar) {
  const tokens: string[] = []

  for (const token of jar.tokens) {
    if (token && !tokens.includes(token)) {
      tokens.push(token)
    }
  }

  if (jar.activeToken && !tokens.includes(jar.activeToken)) {
    tokens.push(jar.activeToken)
  }

  const limitedTokens = tokens.slice(-MAX_BROWSER_SESSIONS)
  const activeToken = limitedTokens.includes(jar.activeToken)
    ? jar.activeToken
    : (limitedTokens.at(-1) ?? null)

  if (!activeToken) {
    return null
  }

  return { activeToken, tokens: limitedTokens }
}

function decodeSessionJar(value: string | null) {
  if (!value) {
    return null
  }

  if (!value.startsWith(SESSION_COOKIE_PREFIX)) {
    return normalizeSessionJar({ activeToken: value, tokens: [value] })
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(
        value.slice(SESSION_COOKIE_PREFIX.length),
        'base64url',
      ).toString('utf8'),
    ) as unknown

    if (typeof parsed !== 'object' || parsed === null) {
      return null
    }

    const activeToken =
      'activeToken' in parsed && typeof parsed.activeToken === 'string'
        ? parsed.activeToken
        : ''
    const tokens =
      'tokens' in parsed && Array.isArray(parsed.tokens)
        ? parsed.tokens.filter(
            (token): token is string => typeof token === 'string',
          )
        : []

    return normalizeSessionJar({ activeToken, tokens })
  } catch {
    return null
  }
}

function encodeSessionJar(jar: SessionCookieJar) {
  return `${SESSION_COOKIE_PREFIX}${Buffer.from(JSON.stringify(jar)).toString(
    'base64url',
  )}`
}

function readSessionJar() {
  return decodeSessionJar(readRawSessionCookie())
}

export function readSessionToken() {
  return readSessionJar()?.activeToken ?? null
}

function setSessionJarCookie(jar: SessionCookieJar) {
  const normalizedJar = normalizeSessionJar(jar)

  if (!normalizedJar) {
    clearSessionCookie()
    return
  }

  setResponseHeader(
    'Set-Cookie',
    [
      `${SESSION_COOKIE_NAME}=${encodeSessionJar(normalizedJar)}`,
      'HttpOnly',
      'Secure',
      'SameSite=Lax',
      'Path=/',
      `Max-Age=${SESSION_TTL_SECONDS}`,
    ].join('; '),
  )
}

export function setSessionCookie(token: string) {
  setSessionJarCookie({ activeToken: token, tokens: [token] })
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

  await addSessionTokenToBrowser(token, userId)

  return token
}

async function addSessionTokenToBrowser(token: string, userId: string) {
  const existingJar = readSessionJar()
  const existingSessions = existingJar
    ? await resolveSessionTokens(existingJar.tokens)
    : []
  const existingTokens = existingSessions
    .filter((session) => session.user.id !== userId)
    .map((session) => session.token)

  setSessionJarCookie({
    activeToken: token,
    tokens: [...existingTokens, token],
  })
}

export async function revokeCurrentSession() {
  const sessionJar = readSessionJar()
  const token = sessionJar?.activeToken ?? null

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

  const remainingTokens =
    sessionJar?.tokens.filter((item) => item !== token) ?? []
  const remainingSessions = await resolveSessionTokens(remainingTokens)
  const nextSession = remainingSessions.at(-1)

  if (!nextSession) {
    clearSessionCookie()
    return
  }

  setSessionJarCookie({
    activeToken: nextSession.token,
    tokens: remainingSessions.map((session) => session.token),
  })
}

export async function revokeUserSessions(userId: string) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(authSessions.userId, userId), isNull(authSessions.revokedAt)))
}

export async function revokeOtherUserSessions(
  userId: string,
  currentSessionId: string,
) {
  await db
    .update(authSessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(authSessions.userId, userId),
        ne(authSessions.id, currentSessionId),
        isNull(authSessions.revokedAt),
      ),
    )
}

async function getSessionFromToken(
  token: string,
  updateLastSeen = false,
): Promise<ResolvedSession | null> {
  const tokenHash = hashSessionToken(token)

  const sessionRows = await db
    .select({
      sessionId: authSessions.id,
      expiresAt: authSessions.expiresAt,
      userId: authUsers.id,
      email: authUsers.email,
      universityEmail: authUsers.universityEmail,
      staffIdentifier: authUsers.staffIdentifier,
      isAuthor: authUsers.isAuthor,
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
    return null
  }

  if (updateLastSeen) {
    await db
      .update(authSessions)
      .set({ lastSeenAt: new Date() })
      .where(eq(authSessions.id, sessionRecord.sessionId))
  }

  const roles = await db
    .select({
      role: userRoles.role,
      facultyId: userRoles.facultyId,
      departmentId: userRoles.departmentId,
    })
    .from(userRoles)
    .where(eq(userRoles.userId, sessionRecord.userId))

  return {
    token,
    sessionId: sessionRecord.sessionId,
    expiresAt: sessionRecord.expiresAt,
    user: {
      id: sessionRecord.userId,
      email: sessionRecord.email,
      universityEmail: sessionRecord.universityEmail,
      staffIdentifier: sessionRecord.staffIdentifier,
      isAuthor: sessionRecord.isAuthor,
      roles,
    },
  }
}

async function resolveSessionTokens(tokens: string[]) {
  const resolvedSessions = await Promise.all(
    tokens.map((token) => getSessionFromToken(token)),
  )

  return resolvedSessions.filter(
    (session): session is ResolvedSession => session !== null,
  )
}

export async function getCurrentSession(): Promise<CurrentSession | null> {
  const sessionJar = readSessionJar()
  const token = sessionJar?.activeToken ?? null

  if (!token) {
    return null
  }

  const currentSession = await getSessionFromToken(token, true)

  if (currentSession) {
    return currentSession
  }

  const fallbackSessions = await resolveSessionTokens(
    sessionJar?.tokens.filter((item) => item !== token) ?? [],
  )
  const fallbackSession = fallbackSessions.at(-1)

  if (!fallbackSession) {
    clearSessionCookie()
    return null
  }

  setSessionJarCookie({
    activeToken: fallbackSession.token,
    tokens: fallbackSessions.map((session) => session.token),
  })

  return fallbackSession
}

export async function getSessionAccounts(activeSessionId?: string) {
  const sessionJar = readSessionJar()

  if (!sessionJar) {
    return [] satisfies SessionAccount[]
  }

  const sessions = await resolveSessionTokens(sessionJar.tokens)

  if (sessions.length === 0) {
    clearSessionCookie()
    return [] satisfies SessionAccount[]
  }

  const activeSession =
    sessions.find((session) => session.sessionId === activeSessionId) ??
    sessions.find((session) => session.token === sessionJar.activeToken) ??
    sessions.at(-1)

  if (!activeSession) {
    clearSessionCookie()
    return [] satisfies SessionAccount[]
  }

  setSessionJarCookie({
    activeToken: activeSession.token,
    tokens: sessions.map((session) => session.token),
  })

  return sessions.map(({ token: _token, ...session }) => ({
    ...session,
    isCurrent: session.sessionId === activeSession.sessionId,
  }))
}

export async function switchCurrentSession(sessionId: string) {
  const sessionJar = readSessionJar()

  if (!sessionJar) {
    throw new Error('Unauthorized')
  }

  const sessions = await resolveSessionTokens(sessionJar.tokens)
  const targetSession = sessions.find(
    (session) => session.sessionId === sessionId,
  )

  if (!targetSession) {
    throw new Error('Account session not found')
  }

  await db
    .update(authSessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(authSessions.id, targetSession.sessionId))

  setSessionJarCookie({
    activeToken: targetSession.token,
    tokens: sessions.map((session) => session.token),
  })

  return targetSession
}
