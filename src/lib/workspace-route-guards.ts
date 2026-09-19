import { redirect } from '@tanstack/react-router'

import { getWorkspaceSnapshot } from '#/lib/workspace-functions.ts'

export async function getWorkspaceOrRedirect() {
  try {
    return await getWorkspaceSnapshot()
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      throw redirect({ to: '/auth/sign-in' })
    }

    throw error
  }
}

export async function requireOrganizationManagerPage() {
  const workspace = await getWorkspaceOrRedirect()

  if (!workspace.canManageOrganization) {
    throw redirect({ to: '/app' })
  }

  return workspace
}

export async function requireRecordCreatePage() {
  const workspace = await getWorkspaceOrRedirect()

  if (!workspace.currentUser.isAuthor) {
    throw redirect({ to: '/app/settings' })
  }

  if (workspace.myProfiles.length === 0) {
    throw redirect({
      to: '/app/profile/edit',
      search: { reason: 'missing-profile' },
    })
  }

  return workspace
}
