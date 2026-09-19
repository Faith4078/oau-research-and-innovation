import { Link, createFileRoute } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import {
  MetricCard,
  WorkspacePageHeader,
  useWorkspace,
} from '#/components/workspace-shell.tsx'

type Workspace = ReturnType<typeof useWorkspace>
type WorkspaceProfile = Workspace['myProfiles'][number]
type WorkspacePatent = Workspace['recentPatents'][number]
type WorkspacePublication = Workspace['recentPublications'][number]
type WorkspaceRole = Workspace['currentUser']['roles'][number]

export const Route = createFileRoute('/app/')({ component: AppDashboard })

function AppDashboard() {
  const workspace = useWorkspace()
  const isAuthor = workspace.currentUser.isAuthor
  const profile =
    workspace.myProfiles.length > 0 ? workspace.myProfiles[0] : null

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

      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <MetricCard label="Faculties" value={workspace.faculties.length} />
        <MetricCard label="Departments" value={workspace.departments.length} />
        {isAuthor ? (
          <MetricCard
            label="My draft records"
            value={
              workspace.recentPublications.length +
              workspace.recentPatents.length
            }
          />
        ) : null}
      </div>

      {profile ? (
        <ProfileDashboardCard profile={profile} />
      ) : isAuthor ? (
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
      ) : (
        <NonAuthorDashboardCard />
      )}

      {isAuthor ? (
        <section className="mt-10 grid gap-5">
          <PublicationDashboardCard records={workspace.recentPublications} />
          <PatentDashboardCard records={workspace.recentPatents} />
        </section>
      ) : null}

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

function ProfileDashboardCard({ profile }: { profile: WorkspaceProfile }) {
  const researchInterests = profile.researchInterests ?? []

  return (
    <section className="mt-10 card-panel bg-white! p-6!">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="chip">Your profile</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            {profile.displayName}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            {profile.affiliation ?? 'No affiliation provided yet.'}
          </p>
        </div>
        <Link to="/app/profile" className="button-secondary">
          View profile
        </Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <ProfileSummaryField
          label="Profile type"
          value={profile.profileType.replaceAll('_', ' ')}
        />
        <ProfileSummaryField
          label="Authorship"
          value={profile.isAuthor ? 'Author' : 'Not an author'}
        />
        <ProfileSummaryField
          label="Primary email"
          value={profile.primaryEmail ?? 'Not provided'}
        />
        <ProfileSummaryField
          label="Research interests"
          value={
            researchInterests.length > 0
              ? researchInterests.slice(0, 3).join(', ')
              : 'Not provided'
          }
        />
      </div>
    </section>
  )
}

function NonAuthorDashboardCard() {
  return (
    <section className="mt-10 card-panel bg-white! p-6!">
      <span className="chip">Authorship off</span>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight">
        Publication and patent tools are hidden
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
        This account is currently marked as not an author. You can enable
        authorship in settings if you need to create publication or patent
        records later.
      </p>
      <Link to="/app/settings" className="button-secondary mt-6">
        Update settings
      </Link>
    </section>
  )
}

function ProfileSummaryField({
  label,
  value,
}: {
  label: string
  value: string
}) {
  return (
    <div className="rounded-sm bg-surface p-4">
      <p className="label-sm text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium capitalize text-foreground">
        {value}
      </p>
    </div>
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
      return `You are a faculty admin of ${faculty?.name ?? 'OAU'}`
    case 'department_admin':
      return `You are a department admin of ${department?.name ?? 'a department'}`
    case 'iptto_officer':
      return faculty
        ? `You are an IPTTO officer of ${faculty.name}`
        : 'You are an IPTTO officer'
    case 'lecturer':
      if (department) {
        return `You are a lecturer in ${department.name}`
      }

      if (faculty) {
        return `You are a lecturer in ${faculty.name}`
      }

      return 'You are a lecturer'
    case 'super_admin':
      return 'You are a super admin'
    case 'user':
      return ''
  }
}

function PublicationDashboardCard({
  records,
}: {
  records: WorkspacePublication[]
}) {
  const workspace = useWorkspace()
  const hasProfile = workspace.myProfiles.length > 0

  return (
    <article className="card-panel bg-white! p-6!">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your publications
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Drafts and submitted publication records linked to your account.
          </p>
        </div>
        <Link to="/app/publications" className="button-secondary">
          View all publications
        </Link>
      </div>

      <div className="mt-5 grid gap-4">
        {records.length > 0 ? (
          records.map((publication) => {
            const keywords = publication.keywords ?? []
            const description = publication.summary ?? publication.abstract

            return (
              <Link
                key={publication.id}
                to="/app/publications/$publicationId"
                params={{ publicationId: publication.id }}
                className="block rounded-md border border-border bg-surface p-5 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {publication.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {publication.publicationType.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className="chip">
                    {publication.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  <RecordFact
                    label="Venue"
                    value={publication.venueName ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Publication year"
                    value={publication.publicationYear ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Research category"
                    value={publication.researchCategory ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Created"
                    value={formatDate(publication.createdAt)}
                  />
                </div>

                {description ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                    {description}
                  </p>
                ) : null}

                {keywords.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {keywords.slice(0, 5).map((keyword) => (
                      <span key={keyword} className="chip">
                        {keyword}
                      </span>
                    ))}
                  </div>
                ) : null}
              </Link>
            )
          })
        ) : (
          <EmptyRecordState
            createPath="/app/publications/create"
            createLabel="Create publication"
            emptyMessage="You do not have any publication records yet."
            missingProfileHint="You will be redirected to create a profile first."
            showMissingProfileHint={!hasProfile}
          />
        )}
      </div>
    </article>
  )
}

function PatentDashboardCard({ records }: { records: WorkspacePatent[] }) {
  const workspace = useWorkspace()
  const hasProfile = workspace.myProfiles.length > 0

  return (
    <article className="card-panel bg-white! p-6!">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Your patents
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Patent and invention disclosure drafts linked to your account.
          </p>
        </div>
        <Link to="/app/patents" className="button-secondary">
          View all patents
        </Link>
      </div>

      <div className="mt-5 grid gap-4">
        {records.length > 0 ? (
          records.map((patent) => {
            const description = patent.summary ?? patent.abstract

            return (
              <Link
                key={patent.id}
                to="/app/patents/$patentId"
                params={{ patentId: patent.id }}
                className="block rounded-md border border-border bg-surface p-5 transition hover:border-primary/30 hover:bg-primary/5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold tracking-tight">
                      {patent.title}
                    </h3>
                    <p className="mt-2 text-sm text-muted">
                      {patent.patentStatus.replaceAll('_', ' ')}
                    </p>
                  </div>
                  <span className="chip">
                    {patent.status.replaceAll('_', ' ')}
                  </span>
                </div>

                <div className="mt-4 grid gap-3">
                  <RecordFact
                    label="Patent number"
                    value={patent.patentNumber ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Application number"
                    value={patent.applicationNumber ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Jurisdiction"
                    value={patent.jurisdiction ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Commercialization"
                    value={patent.commercializationStatus ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Industry partner"
                    value={patent.industryPartner ?? 'Not provided'}
                  />
                  <RecordFact
                    label="Created"
                    value={formatDate(patent.createdAt)}
                  />
                </div>

                {description ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                    {description}
                  </p>
                ) : null}

                <span className="mt-4 inline-flex text-sm font-semibold text-primary">
                  View patent details
                </span>
              </Link>
            )
          })
        ) : (
          <EmptyRecordState
            createPath="/app/patents/create"
            createLabel="Create patent"
            emptyMessage="You do not have any patent records yet."
            missingProfileHint="You will be redirected to create a profile first."
            showMissingProfileHint={!hasProfile}
          />
        )}
      </div>
    </article>
  )
}

function EmptyRecordState({
  createPath,
  createLabel,
  emptyMessage,
  missingProfileHint,
  showMissingProfileHint,
}: {
  createPath: '/app/publications/create' | '/app/patents/create'
  createLabel: string
  emptyMessage: string
  missingProfileHint: string
  showMissingProfileHint: boolean
}) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <p className="text-sm leading-6 text-muted">{emptyMessage}</p>
      {showMissingProfileHint ? (
        <p className="mt-2 text-xs font-medium text-muted">
          {missingProfileHint}
        </p>
      ) : null}
      <Link to={createPath} className="button-primary mt-4">
        {createLabel}
      </Link>
    </div>
  )
}

function RecordFact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-sm bg-white px-3 py-2 text-sm">
      <span className="label-sm text-muted">{label}</span>
      <span className="mt-1 block font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
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
