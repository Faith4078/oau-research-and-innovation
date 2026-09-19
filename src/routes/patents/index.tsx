import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { getPublicPatents } from '#/lib/public-functions.ts'

type PatentListResult = Awaited<ReturnType<typeof getPublicPatents>>
type PatentRecord = PatentListResult['records'][number]

export const Route = createFileRoute('/patents/')({
  validateSearch: validatePublicSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    patentList: await getPublicPatents({
      data: { query: deps.q, page: deps.page, pageSize: 12 },
    }),
  }),
  component: PatentsPage,
})

function PatentsPage() {
  const search = Route.useSearch()
  const { patentList } = Route.useLoaderData()
  const navigate = useNavigate()

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') ?? '').trim()

    await navigate({
      to: '/patents',
      search: { q: query || undefined, page: 1 },
    })
  }

  async function updatePage(page: number) {
    await navigate({ to: '/patents', search: { ...search, page } })
  }

  return (
    <main>
      <PublicHeader
        eyebrow="Patents"
        title="Browse published patents and inventions"
        description="Search public patent and invention disclosures by title, jurisdiction, patent number, industry partner, and commercialization status."
      />

      <section className="page-shell pb-20">
        <SearchForm
          defaultValue={search.q ?? ''}
          placeholder="Search title, abstract, patent number, jurisdiction, or partner"
          onSubmit={handleSearch}
        />

        <div className="mt-8 grid gap-4">
          {patentList.records.length > 0 ? (
            patentList.records.map((patent) => (
              <PatentCard key={patent.id} patent={patent} />
            ))
          ) : (
            <EmptyState label="No published patents match this search." />
          )}
        </div>

        <PaginationControls
          pagination={patentList.pagination}
          onPageChange={updatePage}
        />
      </section>
    </main>
  )
}

function PatentCard({ patent }: { patent: PatentRecord }) {
  const description = patent.summary ?? patent.abstract

  return (
    <Link
      to="/patents/$patentId"
      params={{ patentId: patent.id }}
      className="card-panel bg-white! p-5! transition hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">
            {patent.title}
          </h2>
          <p className="mt-2 text-sm text-muted">
            {patent.owningProfileName ?? 'Unknown author'} ·{' '}
            {patent.jurisdiction ?? patent.patentStatus}
          </p>
        </div>
        <span className="chip">{patent.patentStatus.replaceAll('_', ' ')}</span>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>Patent #: {patent.patentNumber ?? 'Not set'}</span>
        <span>Application #: {patent.applicationNumber ?? 'Not set'}</span>
        <span>Partner: {patent.industryPartner ?? 'Not set'}</span>
      </div>
      {description ? (
        <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </Link>
  )
}

function PublicHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
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
          <Link to="/publications" className="button-secondary">
            Publications
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

function SearchForm({
  defaultValue,
  placeholder,
  onSubmit,
}: {
  defaultValue: string
  placeholder: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      className="card-panel grid gap-3 bg-white! p-4! sm:grid-cols-[1fr_auto]"
      onSubmit={onSubmit}
    >
      <input
        className="input-field"
        name="q"
        defaultValue={defaultValue}
        placeholder={placeholder}
      />
      <button className="button-primary" type="submit">
        Search
      </button>
    </form>
  )
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PatentListResult['pagination']
  onPageChange: (page: number) => Promise<void>
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
        patents
      </p>
      <div className="flex gap-2">
        <button
          className="button-secondary"
          type="button"
          disabled={pagination.page <= 1}
          onClick={() => void onPageChange(pagination.page - 1)}
        >
          Previous
        </button>
        <button
          className="button-secondary"
          type="button"
          disabled={pagination.page >= pagination.totalPages}
          onClick={() => void onPageChange(pagination.page + 1)}
        >
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
    q:
      typeof search.q === 'string' && search.q.trim()
        ? search.q.trim()
        : undefined,
    page: readPositiveInteger(search.page, 1),
  }
}

function readPositiveInteger(value: unknown, fallback: number) {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  return typeof parsedValue === 'number' &&
    Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallback
}
