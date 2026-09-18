import { getCurrentSession } from '#/lib/session.server.ts'

import type { CurrentSession, SessionUser } from '#/lib/session.server.ts'
import type { UserRole } from '#/db/schema.ts'

export function hasRole(user: SessionUser, roles: UserRole[]) {
  return user.roles.some((roleRecord) => roles.includes(roleRecord.role))
}

export async function requireCurrentSession(): Promise<CurrentSession> {
  const currentSession = await getCurrentSession()

  if (!currentSession) {
    throw new Error('Unauthorized')
  }

  return currentSession
}

export async function requireAnyRole(roles: UserRole[]) {
  const currentSession = await requireCurrentSession()

  if (!hasRole(currentSession.user, roles)) {
    throw new Error('You do not have permission to perform this action')
  }

  return currentSession
}
