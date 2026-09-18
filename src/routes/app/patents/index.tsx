import { Link, createFileRoute } from '@tanstack/react-router'

import {
  WorkspacePageHeader,
  useWorkspace,
} from '#/components/workspace-shell.tsx'

export const Route = createFileRoute('/app/patents/')({
  component: MyPatentsPage,
})

function MyPatentsPage() {
  const workspace = useWorkspace()

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Your patents"
        title="Patent records"
        description="View patent and invention disclosure drafts created from your account."
      />

      <section className="mt-10 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your patents
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              These are the patent and invention records currently attached to
              your workspace activity.
            </p>
          </div>
          <Link to="/app/patents/create" className="button-primary">
            Create patent
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          {workspace.recentPatents.length > 0 ? (
            workspace.recentPatents.map((patent) => (
              <Link
                key={patent.id}
                to="/app/patents/$patentId"
                params={{ patentId: patent.id }}
                className="rounded-md border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold tracking-tight">
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
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <p>Patent number: {patent.patentNumber ?? 'Not provided'}</p>
                  <p>
                    Application number:{' '}
                    {patent.applicationNumber ?? 'Not provided'}
                  </p>
                  <p>Jurisdiction: {patent.jurisdiction ?? 'Not provided'}</p>
                  <p>
                    Commercialization:{' '}
                    {patent.commercializationStatus ?? 'Not provided'}
                  </p>
                </div>
                {(patent.summary ?? patent.abstract) ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                    {patent.summary ?? patent.abstract}
                  </p>
                ) : null}
              </Link>
            ))
          ) : (
            <div className="rounded-sm border border-border bg-surface p-4">
              <p className="text-sm leading-6 text-muted">
                You do not have any patent records yet.
              </p>
              <Link to="/app/patents/create" className="button-primary mt-4">
                Create patent
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
