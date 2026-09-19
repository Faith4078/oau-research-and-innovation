import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import type { ReactNode } from 'react'

import { getPublicPatentDetail } from '#/lib/public-functions.ts'

export const Route = createFileRoute('/patents/$patentId')({
  loader: async ({ params }) => {
    try {
      return {
        patent: await getPublicPatentDetail({
          data: { patentId: params.patentId },
        }),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Patent not found') {
        throw redirect({ to: '/patents' })
      }

      throw error
    }
  },
  component: PatentDetailPage,
})

function PatentDetailPage() {
  const { patent } = Route.useLoaderData()

  return (
    <main>
      <section className="page-shell pt-16 pb-20">
        <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="brand-mark">
            OAU R&I
          </Link>
          <Link to="/patents" className="button-secondary">
            Back to patents
          </Link>
        </nav>

        <span className="chip">Published patent</span>
        <h1 className="headline-lg mt-5">{patent.title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {patent.owningProfileName ?? 'Unknown author'} ·{' '}
          {patent.jurisdiction ?? patent.patentStatus}
        </p>

        <section className="mt-8 card-panel bg-white! p-6!">
          <DetailSection title="Patent information">
            <DetailField
              label="Patent status"
              value={patent.patentStatus.replaceAll('_', ' ')}
            />
            <DetailField label="Patent number" value={patent.patentNumber} />
            <DetailField
              label="Application number"
              value={patent.applicationNumber}
            />
            <DetailField label="Jurisdiction" value={patent.jurisdiction} />
            <DetailField
              label="Filing date"
              value={formatDate(patent.filingDate)}
            />
            <DetailField
              label="Grant date"
              value={formatDate(patent.grantDate)}
            />
            <DetailField
              label="Commercialization"
              value={patent.commercializationStatus}
            />
            <DetailField
              label="Industry partner"
              value={patent.industryPartner}
            />
          </DetailSection>

          <DetailSection title="Attribution">
            <DetailLink
              label="Author profile"
              value={patent.owningProfileName}
              to={patent.owningProfileId ? '/authors/$profileId' : undefined}
              params={
                patent.owningProfileId
                  ? { profileId: patent.owningProfileId }
                  : undefined
              }
            />
            <DetailField label="Faculty" value={patent.facultyName} />
            <DetailField label="Department" value={patent.departmentName} />
          </DetailSection>

          <TextBlock title="Summary" value={patent.summary} />
          <TextBlock title="Abstract" value={patent.abstract} />

          <DetailSection title="Links and metadata">
            <ExternalLink label="Source URL" value={patent.sourceUrl} />
            <ExternalLink label="Document URL" value={patent.documentUrl} />
            <DetailField
              label="Published"
              value={formatDate(patent.publishedAt)}
            />
            <DetailField label="Updated" value={formatDate(patent.updatedAt)} />
          </DetailSection>
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
