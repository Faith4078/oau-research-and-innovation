import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import { WorkspacePageHeader } from '#/components/workspace-shell.tsx'
import { getPublicationDetail } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/publications/$publicationId')({
  loader: async ({ params }) => {
    try {
      return {
        publication: await getPublicationDetail({
          data: { publicationId: params.publicationId },
        }),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Publication not found') {
        throw redirect({ to: '/app/publications' })
      }

      throw error
    }
  },
  component: PublicationDetailPage,
})

function PublicationDetailPage() {
  const { publication } = Route.useLoaderData()
  const keywords = publication.keywords ?? []

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Publication detail"
        title={publication.title}
        description="Review the full publication draft details attached to your account."
      />

      <section className="mt-8 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip">
              {publication.status.replaceAll('_', ' ')}
            </span>
            <span className="chip">
              {publication.publicationType.replaceAll('_', ' ')}
            </span>
          </div>
          <Link to="/app/publications" className="button-secondary">
            Back to publications
          </Link>
        </div>

        <DetailSection title="Publication information">
          <DetailField
            label="Publication year"
            value={formatValue(publication.publicationYear)}
          />
          <DetailField label="Venue" value={publication.venueName} />
          <DetailField
            label="Research category"
            value={publication.researchCategory}
          />
          <DetailField label="DOI" value={publication.doi} />
        </DetailSection>

        <DetailSection title="Attribution">
          <DetailField label="Profile" value={publication.owningProfileName} />
          <DetailField label="Faculty" value={publication.facultyName} />
          <DetailField label="Department" value={publication.departmentName} />
        </DetailSection>

        <TextBlock title="Summary" value={publication.summary} />
        <TextBlock title="Abstract" value={publication.abstract} />

        <DetailSection title="Links and metadata">
          <DetailLink label="Source URL" value={publication.sourceUrl} />
          <DetailLink label="Document URL" value={publication.documentUrl} />
          <DetailField
            label="Published at"
            value={formatDate(publication.publishedAt)}
          />
          <DetailField
            label="Created"
            value={formatDate(publication.createdAt)}
          />
          <DetailField
            label="Updated"
            value={formatDate(publication.updatedAt)}
          />
        </DetailSection>

        <TextBlock
          title="Funding information"
          value={publication.fundingInformation}
        />
        <TextBlock
          title="Collaboration details"
          value={publication.collaborationDetails}
        />

        <section className="mt-8">
          <h2 className="text-xl font-semibold tracking-tight">Keywords</h2>
          {keywords.length > 0 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="chip">
                  {keyword}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted">No keywords provided.</p>
          )}
        </section>
      </section>
    </>
  )
}

function DetailSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 grid gap-4 md:grid-cols-2">{children}</div>
    </section>
  )
}

function DetailField({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-sm bg-surface p-4">
      <p className="label-sm text-muted">{label}</p>
      <p className="mt-2 text-sm font-medium text-foreground">
        {formatValue(value)}
      </p>
    </div>
  )
}

function DetailLink({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="rounded-sm bg-surface p-4">
      <p className="label-sm text-muted">{label}</p>
      {value ? (
        <a
          className="mt-2 block break-all text-sm font-medium text-primary"
          href={value}
          rel="noreferrer"
          target="_blank"
        >
          {value}
        </a>
      ) : (
        <p className="mt-2 text-sm font-medium text-foreground">Not provided</p>
      )}
    </div>
  )
}

function TextBlock({ title, value }: { title: string; value: string | null }) {
  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-3 whitespace-pre-line text-sm leading-6 text-muted">
        {value ?? 'Not provided'}
      </p>
    </section>
  )
}

function formatDate(value: Date | string | null) {
  if (!value) {
    return 'Not set'
  }

  return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(
    new Date(value),
  )
}

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  return String(value)
}
