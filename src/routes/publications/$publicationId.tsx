import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import { getPublicPublicationDetail } from '#/lib/public-functions.ts'

export const Route = createFileRoute('/publications/$publicationId')({
  loader: async ({ params }) => {
    try {
      return {
        publication: await getPublicPublicationDetail({
          data: { publicationId: params.publicationId },
        }),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Publication not found') {
        throw redirect({ to: '/publications' })
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
    <main>
      <section className="page-shell pt-16 pb-20">
        <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="brand-mark">
            OAU R&I
          </Link>
          <Link to="/publications" className="button-secondary">
            Back to publications
          </Link>
        </nav>

        <span className="chip">Published publication</span>
        <h1 className="headline-lg mt-5">{publication.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {publication.owningProfileName ?? 'Unknown author'} ·{' '}
          {publication.venueName ?? publication.publicationType}
        </p>

        <section className="mt-8 card-panel bg-white! p-6!">
          <DetailSection title="Publication information">
            <DetailField
              label="Publication year"
              value={publication.publicationYear}
            />
            <DetailField
              label="Type"
              value={publication.publicationType.replaceAll('_', ' ')}
            />
            <DetailField label="Venue" value={publication.venueName} />
            <DetailField
              label="Research category"
              value={publication.researchCategory}
            />
            <DetailField label="DOI" value={publication.doi} />
            <DetailField
              label="Published"
              value={formatDate(publication.publishedAt)}
            />
          </DetailSection>

          <DetailSection title="Attribution">
            <DetailLink
              label="Author profile"
              value={publication.owningProfileName}
              to={
                publication.owningProfileId ? '/authors/$profileId' : undefined
              }
              params={
                publication.owningProfileId
                  ? { profileId: publication.owningProfileId }
                  : undefined
              }
            />
            <DetailField label="Faculty" value={publication.facultyName} />
            <DetailField
              label="Department"
              value={publication.departmentName}
            />
          </DetailSection>

          <TextBlock title="Summary" value={publication.summary} />
          <TextBlock title="Abstract" value={publication.abstract} />

          <DetailSection title="Links and metadata">
            <ExternalLink label="Source URL" value={publication.sourceUrl} />
            <ExternalLink
              label="Document URL"
              value={publication.documentUrl}
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
      </section>
    </main>
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
    <section className="mt-8 first:mt-0">
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

function DetailLink({
  label,
  value,
  to,
  params,
}: {
  label: string
  value: string | null
  to?: '/authors/$profileId'
  params?: { profileId: string }
}) {
  return to && params ? (
    <Link
      to={to}
      params={params}
      className="rounded-sm bg-surface p-4 text-primary hover:underline"
    >
      <span className="label-sm block text-muted">{label}</span>
      <span className="mt-2 block text-sm font-medium">
        {value ?? 'Not provided'}
      </span>
    </Link>
  ) : (
    <DetailField label={label} value={value} />
  )
}

function ExternalLink({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return value ? (
    <a
      className="rounded-sm bg-surface p-4 text-primary hover:underline"
      href={value}
      rel="noreferrer"
      target="_blank"
    >
      <span className="label-sm block text-muted">{label}</span>
      <span className="mt-2 block break-all text-sm font-medium">{value}</span>
    </a>
  ) : (
    <DetailField label={label} value={null} />
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
