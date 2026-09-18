import { Link, createFileRoute } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import {
  MetricCard,
  WorkspacePageHeader,
  useWorkspace,
} from '#/components/workspace-shell.tsx'

type Workspace = ReturnType<typeof useWorkspace>
type WorkspaceRole = Workspace['currentUser']['roles'][number]
type WorkspaceRecord =
  Workspace['recentPublications'][number] | Workspace['recentPatents'][number]
type RecordCreatePath = '/app/publications/create' | '/app/patents/create'

export const Route = createFileRoute('/app/')({ component: AppDashboard })

function AppDashboard() {
  const workspace = useWorkspace()
  const hasProfile = workspace.myProfiles.length > 0

  return (
    <>
      <div>
        <WorkspacePageHeader
          eyebrow="Protected workspace"
          title="Research operations dashboard"
          description="Track your research profile, publication drafts, patent drafts, and scoped administrative setup from one workspace."
        />
      </div>

      <RoleBannerList workspace={workspace} />

      <div className="mt-10 grid gap-4 md:grid-cols-4">
        <MetricCard label="Faculties" value={workspace.faculties.length} />
        <MetricCard label="Departments" value={workspace.departments.length} />
        <MetricCard label="My profiles" value={workspace.myProfiles.length} />
        <MetricCard
          label="My draft records"
          value={
            workspace.recentPublications.length + workspace.recentPatents.length
          }
        />
      </div>

      {!hasProfile ? (
        <section className="mt-10 card-panel bg-white! p-6!">
          <span className="chip">Profile required</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Create your attribution profile
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Publications and patents are attached to your profile. Create one to
            add research records.
          </p>
          <Link
            to="/app/profile/edit"
            search={{ reason: 'missing-profile' }}
            className="button-primary mt-6"
          >
            Create profile
          </Link>
        </section>
      ) : null}

      <section className="mt-10 grid gap-5 lg:grid-cols-2">
        <RecordDashboardCard
          title="Your publications"
          description="Drafts and submitted publication records linked to your account."
          records={workspace.recentPublications}
          createPath="/app/publications/create"
          createLabel="Create publication"
          emptyMessage="You do not have any publication records yet."
          missingProfileHint="You will be redirected to create a profile first."
        />
        <RecordDashboardCard
          title="Your patents"
          description="Patent and invention disclosure drafts linked to your account."
          records={workspace.recentPatents}
          createPath="/app/patents/create"
          createLabel="Create patent"
          emptyMessage="You do not have any patent records yet."
          missingProfileHint="You will be redirected to create a profile first."
        />
      </section>

      {workspace.canManageOrganization ? (
        <section className="mt-10 card-panel bg-white! p-6!">
          <span className="chip">Organization setup</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Admin create pages
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
            Create faculty and department records that scope staff, profiles,
            publications, patents, and admin roles.
          </p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <ActionPanel
              title="Faculty"
              description="Create faculty records for the repository hierarchy."
            >
              <Link to="/app/faculties/create" className="button-primary">
                Create faculty
              </Link>
            </ActionPanel>
            <ActionPanel
              title="Department"
              description="Create department records under existing faculties."
            >
              <Link to="/app/departments/create" className="button-primary">
                Create department
              </Link>
            </ActionPanel>
          </div>
        </section>
      ) : null}
    </>
  )
}

function RoleBannerList({ workspace }: { workspace: Workspace }) {
  const banners = workspace.currentUser.roles
    .filter((roleRecord) => roleRecord.role !== 'user')
    .map((roleRecord) => getRoleBannerText(roleRecord, workspace))

  if (banners.length === 0) {
    return null
  }

  return (
    <div className="mt-8 grid gap-3">
      {banners.map((banner) => (
        <p
          key={banner}
          className="rounded-sm border border-primary/20 bg-primary/5 px-4 py-3 text-sm font-medium text-primary"
        >
          {banner}
        </p>
      ))}
    </div>
  )
}

function getRoleBannerText(roleRecord: WorkspaceRole, workspace: Workspace) {
  const faculty = workspace.faculties.find(
    (facultyRecord) => facultyRecord.id === roleRecord.facultyId,
  )
  const department = workspace.departments.find(
    (departmentRecord) => departmentRecord.id === roleRecord.departmentId,
  )

  switch (roleRecord.role) {
    case 'faculty_admin':
      return `you are a faculty admin of ${faculty?.name ?? 'OAU'}`
    case 'department_admin':
      return `you are a department admin of ${department?.name ?? 'a department'}`
    case 'iptto_officer':
      return faculty
        ? `you are an IPTTO officer of ${faculty.name}`
        : 'you are an IPTTO officer'
    case 'lecturer':
      if (department) {
        return `you are a lecturer in ${department.name}`
      }

      if (faculty) {
        return `you are a lecturer in ${faculty.name}`
      }

      return 'you are a lecturer'
    case 'super_admin':
      return 'you are a super admin'
    case 'user':
      return ''
  }
}

function RecordDashboardCard({
  title,
  description,
  records,
  createPath,
  createLabel,
  emptyMessage,
  missingProfileHint,
}: {
  title: string
  description: string
  records: WorkspaceRecord[]
  createPath: RecordCreatePath
  createLabel: string
  emptyMessage: string
  missingProfileHint: string
}) {
  const workspace = useWorkspace()
  const hasProfile = workspace.myProfiles.length > 0

  return (
    <article className="card-panel bg-white! p-6!">
      <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 text-sm leading-6 text-muted">{description}</p>

      <div className="mt-5 grid gap-3">
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
          <div className="rounded-sm border border-border bg-surface p-4">
            <p className="text-sm leading-6 text-muted">{emptyMessage}</p>
            {!hasProfile ? (
              <p className="mt-2 text-xs font-medium text-muted">
                {missingProfileHint}
              </p>
            ) : null}
            <Link to={createPath} className="button-primary mt-4">
              {createLabel}
            </Link>
          </div>
        )}
      </div>
    </article>
  )
}

function ActionPanel({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <article className="flex flex-col justify-between gap-5 rounded-md border border-border bg-surface p-5">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      </div>
      <div>{children}</div>
    </article>
  )
}
