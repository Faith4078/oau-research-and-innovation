import { Link, createFileRoute, redirect } from '@tanstack/react-router'

import { getPublicAuthorDetail } from '#/lib/public-functions.ts'

export const Route = createFileRoute('/authors/$profileId')({
  loader: async ({ params }) => {
    try {
      return getPublicAuthorDetail({ data: { profileId: params.profileId } })
    } catch (error) {
      if (error instanceof Error && error.message === 'Author not found') {
        throw redirect({ to: '/authors' })
      }

      throw error
    }
  },
  component: AuthorDetailPage,
})

function AuthorDetailPage() {
  const { author, publications, patents } = Route.useLoaderData()
  const interests = author.researchInterests ?? []

  return (
    <main>
      <section className="page-shell pt-16 pb-20">
        <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
          <Link to="/" className="brand-mark">
            OAU R&I
          </Link>
          <Link to="/authors" className="button-secondary">
            Back to authors
          </Link>
        </nav>

        <span className="chip">Author profile</span>
        <h1 className="headline-lg mt-5">{author.displayName}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {author.affiliation ?? author.departmentName ?? 'Affiliation not set'}
        </p>

        <section className="mt-8 card-panel bg-white! p-6!">
          <div className="grid gap-4 md:grid-cols-2">
            <DetailField label="Public email" value={author.primaryEmail} />
            <DetailField label="Profile type" value={author.profileType} />
            <DetailField label="Faculty" value={author.facultyName} />
            <DetailField label="Department" value={author.departmentName} />
            <DetailLink label="ORCID" value={author.orcidId} />
            <DetailLink
              label="Scholar profile"
              value={author.scholarProfileUrl}
            />
          </div>

          <TextBlock title="Biography" value={author.bio} />

          <section className="mt-8">
            <h2 className="text-xl font-semibold tracking-tight">
              Research interests
            </h2>
            {interests.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span key={interest} className="chip">
                    {interest}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">No interests listed.</p>
            )}
          </section>
        </section>

        <section className="mt-10 grid gap-6 lg:grid-cols-2">
          <RelatedRecords title="Published publications">
            {publications.length > 0 ? (
              publications.map((publication) => (
                <Link
                  key={publication.id}
                  to="/publications/$publicationId"
                  params={{ publicationId: publication.id }}
                  className="rounded-md border border-border bg-white p-4 hover:border-primary/30"
                >
                  <h3 className="font-semibold tracking-tight">
                    {publication.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {publication.venueName ?? publication.publicationType}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">No published publications.</p>
            )}
          </RelatedRecords>

          <RelatedRecords title="Published patents">
            {patents.length > 0 ? (
              patents.map((patent) => (
                <Link
                  key={patent.id}
                  to="/patents/$patentId"
                  params={{ patentId: patent.id }}
                  className="rounded-md border border-border bg-white p-4 hover:border-primary/30"
                >
                  <h3 className="font-semibold tracking-tight">
                    {patent.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted">
                    {patent.patentNumber ?? patent.patentStatus}
                  </p>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted">No published patents.</p>
            )}
          </RelatedRecords>
        </section>
      </section>
    </main>
  )
}

function RelatedRecords({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="card-panel bg-surface! p-5!">
      <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-4 grid gap-3">{children}</div>
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
  return value ? (
    <a
      className="rounded-sm bg-surface p-4 text-primary hover:underline"
      href={value.startsWith('http') ? value : `https://orcid.org/${value}`}
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

function formatValue(value: unknown) {
  if (value === null || value === undefined || value === '') {
    return 'Not provided'
  }

  return String(value)
}
