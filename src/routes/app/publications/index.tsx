import { Link, createFileRoute } from '@tanstack/react-router'

import {
  WorkspacePageHeader,
  useWorkspace,
} from '#/components/workspace-shell.tsx'

export const Route = createFileRoute('/app/publications/')({
  component: MyPublicationsPage,
})

function MyPublicationsPage() {
  const workspace = useWorkspace()

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Your publications"
        title="Publication records"
        description="View publication drafts and submitted records created from your account."
      />

      <section className="mt-10 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your publications
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              These are the publication records currently attached to your
              workspace activity.
            </p>
          </div>
          <Link to="/app/publications/create" className="button-primary">
            Create publication
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
          {workspace.recentPublications.length > 0 ? (
            workspace.recentPublications.map((publication) => (
              <Link
                key={publication.id}
                to="/app/publications/$publicationId"
                params={{ publicationId: publication.id }}
                className="rounded-md border border-border bg-surface p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold tracking-tight">
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
                <div className="mt-4 grid gap-2 text-sm text-muted">
                  <p>Venue: {publication.venueName ?? 'Not provided'}</p>
                  <p>Year: {publication.publicationYear ?? 'Not provided'}</p>
                  <p>
                    Category: {publication.researchCategory ?? 'Not provided'}
                  </p>
                </div>
                {(publication.summary ?? publication.abstract) ? (
                  <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
                    {publication.summary ?? publication.abstract}
                  </p>
                ) : null}
              </Link>
            ))
          ) : (
            <div className="rounded-sm border border-border bg-surface p-4">
              <p className="text-sm leading-6 text-muted">
                You do not have any publication records yet.
              </p>
              <Link
                to="/app/publications/create"
                className="button-primary mt-4"
              >
                Create publication
              </Link>
            </div>
          )}
        </div>
      </section>
    </>
  )
}
