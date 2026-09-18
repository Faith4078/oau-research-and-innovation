import { createContext, useContext, useState } from 'react'
import { Link, useNavigate, useRouter } from '@tanstack/react-router'

import { signOut, switchAccount } from '#/lib/auth-functions.ts'

import type { ReactNode } from 'react'
import type { getWorkspaceSnapshot } from '#/lib/workspace-functions.ts'

type WorkspaceSnapshot = Awaited<ReturnType<typeof getWorkspaceSnapshot>>

const WorkspaceContext = createContext<WorkspaceSnapshot | null>(null)

export function WorkspaceProvider({
  workspace,
  children,
}: {
  workspace: WorkspaceSnapshot
  children: ReactNode
}) {
  return (
    <WorkspaceContext.Provider value={workspace}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const workspace = useContext(WorkspaceContext)

  if (!workspace) {
    throw new Error('Workspace data is unavailable')
  }

  return workspace
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const router = useRouter()
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false)
  const [switchingSessionId, setSwitchingSessionId] = useState<string | null>(
    null,
  )
  const canCreateRecords = workspace.myProfiles.length > 0

  async function handleSignOut() {
    await signOut()
    await navigate({ to: '/' })
  }

  async function handleSwitchAccount(sessionId: string) {
    setSwitchingSessionId(sessionId)

    try {
      await switchAccount({ data: { sessionId } })
      setIsAccountMenuOpen(false)
      await router.invalidate()
      await navigate({ to: '/app' })
    } finally {
      setSwitchingSessionId(null)
    }
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-border bg-white">
        <div className="page-shell flex flex-wrap items-center justify-between gap-4 py-5">
          <div className="flex items-center gap-4">
            <Link to="/" className="brand-mark">
              OAU R&I
            </Link>
            <nav className="hidden items-center gap-3 text-sm font-medium text-muted md:flex">
              <Link to="/app" className="hover:text-primary">
                Home
              </Link>
              <Link
                to="/app/profile/create"
                search={{ reason: undefined }}
                className="hover:text-primary"
              >
                Profile
              </Link>
              <Link to="/app/publications" className="hover:text-primary">
                My publications
              </Link>
              <Link to="/app/patents" className="hover:text-primary">
                My patents
              </Link>
              {canCreateRecords ? (
                <Link
                  to="/app/publications/create"
                  className="hover:text-primary"
                >
                  New publication
                </Link>
              ) : null}
              {workspace.canManageOrganization ? (
                <Link to="/app/faculties/create" className="hover:text-primary">
                  Organization
                </Link>
              ) : null}
            </nav>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="relative">
              <button
                className="button-secondary h-11! px-4! text-left!"
                type="button"
                aria-expanded={isAccountMenuOpen}
                onClick={() => setIsAccountMenuOpen((isOpen) => !isOpen)}
              >
                <span className="block max-w-48 truncate text-sm text-foreground">
                  {workspace.currentUser.email}
                </span>
              </button>

              {isAccountMenuOpen ? (
                <div className="absolute right-0 z-30 mt-2 w-80 rounded-md border border-border bg-white p-2 shadow-[0_18px_60px_rgba(8,8,8,0.12)]">
                  <p className="px-3 py-2 text-xs font-medium uppercase tracking-[0.12em] text-muted">
                    Switch account
                  </p>
                  <div className="grid gap-1">
                    {workspace.accounts.map((account) => (
                      <button
                        key={account.sessionId}
                        className="rounded-sm px-3 py-3 text-left text-sm hover:bg-surface disabled:cursor-default disabled:bg-surface"
                        type="button"
                        disabled={
                          account.isCurrent ||
                          switchingSessionId === account.sessionId
                        }
                        onClick={() => handleSwitchAccount(account.sessionId)}
                      >
                        <span className="block font-medium text-foreground">
                          {account.user.email}
                        </span>
                        <span className="mt-1 block text-xs text-muted">
                          {account.isCurrent
                            ? 'Current account'
                            : switchingSessionId === account.sessionId
                              ? 'Switching…'
                              : 'Switch to this account'}
                        </span>
                      </button>
                    ))}
                  </div>
                  <Link
                    to="/auth/sign-in"
                    className="mt-2 flex rounded-sm border border-border px-3 py-3 text-sm font-medium text-primary hover:bg-surface"
                    onClick={() => setIsAccountMenuOpen(false)}
                  >
                    Add another account
                  </Link>
                </div>
              ) : null}
            </div>
            <button
              className="button-secondary h-11! px-4!"
              type="button"
              onClick={handleSignOut}
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <section className="page-shell py-12">{children}</section>
    </main>
  )
}

export function WorkspacePageHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div>
      <span className="chip">{eyebrow}</span>
      <h1 className="headline-lg mt-5">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        {description}
      </p>
    </div>
  )
}

export function RoleChips() {
  const workspace = useWorkspace()

  return (
    <aside className="card-panel bg-white! p-5!">
      <p className="label-sm text-muted">Assigned roles</p>
      <div className="mt-4 flex flex-wrap gap-2">
        {workspace.currentUser.roles.map((roleRecord) => (
          <span
            key={`${roleRecord.role}-${roleRecord.facultyId ?? 'global'}-${roleRecord.departmentId ?? 'global'}`}
            className="chip"
          >
            {roleRecord.role.replaceAll('_', ' ')}
          </span>
        ))}
      </div>
    </aside>
  )
}

export function FormStatus({
  successMessage,
  errorMessage,
}: {
  successMessage: string | null
  errorMessage: string | null
}) {
  return (
    <>
      {successMessage ? <p className="success-copy">{successMessage}</p> : null}
      {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}
    </>
  )
}

export function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <article className="metric-card">
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  )
}

export function ProfileSelect({
  profiles,
}: {
  profiles: Array<{ id: string; displayName: string }>
}) {
  return (
    <select className="input-field" name="owningProfileId" required>
      <option value="">Select attribution profile</option>
      {profiles.map((profile) => (
        <option key={profile.id} value={profile.id}>
          {profile.displayName}
        </option>
      ))}
    </select>
  )
}

export function RecentList({
  title,
  records,
}: {
  title: string
  records: Array<{ id: string; title: string; status: string }>
}) {
  return (
    <div className="rounded-md border border-border p-4">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 grid gap-3">
        {records.length > 0 ? (
          records.map((record) => (
            <div
              key={record.id}
              className="flex items-center justify-between gap-4 rounded-sm bg-surface p-3 text-sm"
            >
              <span className="font-medium">{record.title}</span>
              <span className="chip">{record.status.replaceAll('_', ' ')}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted">No records yet.</p>
        )}
      </div>
    </div>
  )
}

export function formString(formData: FormData, name: string) {
  return String(formData.get(name) ?? '')
}
