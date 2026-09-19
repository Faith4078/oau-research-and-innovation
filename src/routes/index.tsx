import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { getCurrentUser } from '#/lib/auth-functions.ts'
import { getPublicDiscovery } from '#/lib/public-functions.ts'

export const Route = createFileRoute('/')({
  validateSearch: (search: Record<string, unknown>) => ({
    q:
      typeof search.q === 'string' && search.q.trim()
        ? search.q.trim()
        : undefined,
  }),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    currentUser: await getCurrentUser(),
    discovery: await getPublicDiscovery({ data: { query: deps.q } }),
  }),
  component: Home,
})

type PublicDiscovery = Awaited<ReturnType<typeof getPublicDiscovery>>
type PublicPublication = PublicDiscovery['publications'][number]
type PublicPatent = PublicDiscovery['patents'][number]

function Home() {
  const { currentUser, discovery } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const isSignedIn = Boolean(currentUser)

  async function handlePublicSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') ?? '').trim()

    await navigate({ to: '/', search: { q: query || undefined } })
  }

  return (
    <main>
      <section className="page-shell section-padding">
        <nav className="mb-16 flex items-center justify-between gap-6">
          <Link to="/" className="brand-mark" aria-label="OAU Research home">
            OAU R&I
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link to="/app" className="button-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/sign-in"
                  className="button-link hidden sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link to="/auth/sign-up" className="button-primary">
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>

        <div>
          <span className="chip mb-5">Public research search</span>
          <h1 className="headline-display max-w-4xl">
            Search OAU publications and patents.
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
            Browse publicly published research outputs and patent records from
            Obafemi Awolowo University.
          </p>

          <form
            className="mt-8 grid max-w-3xl gap-3 rounded-lg border border-border bg-white p-3 shadow-[0_18px_60px_rgba(8,8,8,0.08)] sm:grid-cols-[1fr_auto]"
            onSubmit={handlePublicSearch}
          >
            <input
              className="input-field"
              name="q"
              defaultValue={search.q ?? ''}
              placeholder="Search public publications and patents"
            />
            <button className="button-primary" type="submit">
              Search
            </button>
          </form>
          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            <Link to="/publications" className="text-primary hover:underline">
              Browse all publications
            </Link>
            <Link to="/patents" className="text-primary hover:underline">
              Browse all patents
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-surface">
        <div className="page-shell py-20">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="chip">Public records</span>
            </div>
            {search.q ? (
              <Link
                to="/"
                search={{ q: undefined }}
                className="button-secondary"
              >
                Clear search
              </Link>
            ) : null}
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-2">
            <DiscoverySection
              title="Publications"
              browseTo="/publications"
              browseLabel="View all publications"
              searchQuery={search.q}
            >
              {discovery.publications.length > 0 ? (
                discovery.publications.map((publication) => (
                  <PublicationPreview
                    key={publication.id}
                    publication={publication}
                  />
                ))
              ) : (
                <EmptyDiscovery label="No matching publications." />
              )}
            </DiscoverySection>

            <DiscoverySection
              title="Patents"
              browseTo="/patents"
              browseLabel="View all patents"
              searchQuery={search.q}
            >
              {discovery.patents.length > 0 ? (
                discovery.patents.map((patent) => (
                  <PatentPreview key={patent.id} patent={patent} />
                ))
              ) : (
                <EmptyDiscovery label="No matching patents." />
              )}
            </DiscoverySection>
          </div>
        </div>
      </section>
    </main>
  )
}

function DiscoverySection({
  title,
  browseTo,
  browseLabel,
  searchQuery,
  children,
}: {
  title: string
  browseTo: '/publications' | '/patents'
  browseLabel: string
  searchQuery: string | undefined
  children: React.ReactNode
}) {
  return (
    <section className="card-panel bg-white! p-5!">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <Link
          to={browseTo}
          search={{ q: searchQuery, page: undefined }}
          className="text-sm font-medium text-primary hover:underline"
        >
          {browseLabel}
        </Link>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  )
}

function PublicationPreview({
  publication,
}: {
  publication: PublicPublication
}) {
  return (
    <Link
      to="/publications/$publicationId"
      params={{ publicationId: publication.id }}
      className="rounded-md border border-border bg-surface p-4 hover:border-primary/30"
    >
      <h4 className="font-semibold tracking-tight">{publication.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        {publication.owningProfileName ?? 'Unknown author'} ·{' '}
        {publication.publicationYear ?? 'Year not set'}
      </p>
    </Link>
  )
}

function PatentPreview({ patent }: { patent: PublicPatent }) {
  return (
    <Link
      to="/patents/$patentId"
      params={{ patentId: patent.id }}
      className="rounded-md border border-border bg-surface p-4 hover:border-primary/30"
    >
      <h4 className="font-semibold tracking-tight">{patent.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        {patent.owningProfileName ?? 'Unknown author'} ·{' '}
        {patent.patentNumber ?? patent.patentStatus.replaceAll('_', ' ')}
      </p>
    </Link>
  )
}

function EmptyDiscovery({ label }: { label: string }) {
  return <p className="text-sm leading-6 text-muted">{label}</p>
}
