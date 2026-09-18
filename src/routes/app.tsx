import { Outlet, createFileRoute } from '@tanstack/react-router'

import {
  WorkspaceProvider,
  WorkspaceShell,
} from '#/components/workspace-shell.tsx'
import { getWorkspaceOrRedirect } from '#/lib/workspace-route-guards.ts'

export const Route = createFileRoute('/app')({
  loader: async () => ({ workspace: await getWorkspaceOrRedirect() }),
  component: AppLayout,
})

function AppLayout() {
  const { workspace } = Route.useLoaderData()

  return (
    <WorkspaceProvider workspace={workspace}>
      <WorkspaceShell>
        <Outlet />
      </WorkspaceShell>
    </WorkspaceProvider>
  )
}
