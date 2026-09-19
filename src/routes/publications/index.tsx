import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { getPublicPublications } from '#/lib/public-functions.ts'

type PublicationListResult = Awaited<ReturnType<typeof getPublicPublications>>
type PublicationRecord = PublicationListResult['records'][number]

export const Route = createFileRoute('/publications/')({
  validateSearch: validatePublicSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    publicationList: await getPublicPublications({
      data: { query: deps.q, page: deps.page, pageSize: 12 },
    }),
  }),
  component: PublicationsPage,
})

function PublicationsPage() {
  const search = Route.useSearch()
  const { publicationList } = Route.useLoaderData()
  const navigate = useNavigate()

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') ?? '').trim()

    await navigate({
      to: '/publications',
      search: { q: query || undefined, page: 1 },
    })
  }

  async function updatePage(page: number) {
    await navigate({ to: '/publications', search: { ...search, page } })
  }

  return (
    <main>
      <PublicHeader
        eyebrow="Publications"
        title="Browse published research outputs"
        description="Search publicly published journal articles, conference papers, reports, datasets, theses, and other research outputs."
      />

      <section className="page-shell pb-20">
        <SearchForm
          defaultValue={search.q ?? ''}
          placeholder="Search title, abstract, venue, DOI, or research category"
          onSubmit={handleSearch}
        />

        <div className="mt-8 grid gap-4">
          {publicationList.records.length > 0 ? (
            publicationList.records.map((publication) => (
              <PublicationCard
                key={publication.id}
                publication={publication}
              />
            ))
          ) : (
            <EmptyState label="No published publications match this search." />
          )}
        </div>

        <PaginationControls
          pagination={publicationList.pagination}
          onPageChange={updatePage}
        />
      </section>
    </main>
  )
}

function PublicationCard({ publication }: { publication: PublicationRecord }) {
  const description = publication.summary ?? publication.abstract

  return (
    <Link
      to="/publications/$publicationId"
      params={{ publicationId: publication.id }}
      className="card-panel bg-white! p-5! transition hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {publication.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {publication.owningProfileName ?? 'Unknown author'} ·{' '}
            {publication.venueName ?? publication.publicationType}
          </p>
        </div>
        <span className="chip">{publication.publicationType.replaceAll('_', ' ')}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>Year: {publication.publicationYear ?? 'Not set'}</span>
        <span>Category: {publication.researchCategory ?? 'Not set'}</span>
        <span>DOI: {publication.doi ?? 'Not set'}</span>
      </div>
      {description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </Link>
  )
}

function PublicHeader({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="page-shell pt-16 pb-10">
      <nav className="mb-12 flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="brand-mark">
          OAU R&I
        </Link>
        <div className="flex flex-wrap gap-3">
          <Link to="/authors" className="button-secondary">
            Authors
          </Link>
          <Link to="/patents" className="button-secondary">
            Patents
          </Link>
        </div>
      </nav>
      <span className="chip">{eyebrow}</span>
      <h1 className="headline-lg mt-5">{title}</h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
        {description}
      </p>
    </section>
  )
}

function SearchForm({ defaultValue, placeholder, onSubmit }: { defaultValue: string; placeholder: string; onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return (
    <form className="card-panel grid gap-3 bg-white! p-4! sm:grid-cols-[1fr_auto]" onSubmit={onSubmit}>
      <input className="input-field" name="q" defaultValue={defaultValue} placeholder={placeholder} />
      <button className="button-primary" type="submit">
        Search
      </button>
    </form>
  )
}

function PaginationControls({ pagination, onPageChange }: { pagination: PublicationListResult['pagination']; onPageChange: (page: number) => Promise<void> }) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
        publications
      </p>
      <div className="flex gap-2">
        <button className="button-secondary" type="button" disabled={pagination.page <= 1} onClick={() => void onPageChange(pagination.page - 1)}>
          Previous
        </button>
        <button className="button-secondary" type="button" disabled={pagination.page >= pagination.totalPages} onClick={() => void onPageChange(pagination.page + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="card-panel bg-white! p-5!">
      <p className="text-sm leading-6 text-muted">{label}</p>
    </div>
  )
}

function validatePublicSearch(search: Record<string, unknown>) {
  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q.trim() : undefined,
    page: readPositiveInteger(search.page, 1),
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  return typeof parsedValue === 'number' && Number.isInteger(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}
