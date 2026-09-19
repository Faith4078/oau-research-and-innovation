import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { getPublicAuthors } from '#/lib/public-functions.ts'

type AuthorListResult = Awaited<ReturnType<typeof getPublicAuthors>>
type AuthorRecord = AuthorListResult['records'][number]

export const Route = createFileRoute('/authors/')({
  validateSearch: validatePublicSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    authorList: await getPublicAuthors({
      data: { query: deps.q, page: deps.page, pageSize: 12 },
    }),
  }),
  component: AuthorsPage,
})

function AuthorsPage() {
  const search = Route.useSearch()
  const { authorList } = Route.useLoaderData()
  const navigate = useNavigate()

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const query = String(formData.get('q') ?? '').trim()

    await navigate({
      to: '/authors',
      search: { q: query || undefined, page: 1 },
    })
  }

  async function updatePage(page: number) {
    await navigate({ to: '/authors', search: { ...search, page } })
  }

  return (
    <main>
      <PublicHeader
        eyebrow="Author profiles"
        title="Browse OAU authors"
        description="Search public author profiles, research interests, affiliations, and contact details shared by contributors."
      />

      <section className="page-shell pb-20">
        <SearchForm
          defaultValue={search.q ?? ''}
          placeholder="Search author name, affiliation, email, or biography"
          onSubmit={handleSearch}
        />

        <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {authorList.records.length > 0 ? (
            authorList.records.map((author) => (
              <AuthorCard key={author.id} author={author} />
            ))
          ) : (
            <EmptyState label="No author profiles match this search." />
          )}
        </div>

        <PaginationControls
          pagination={authorList.pagination}
          onPageChange={updatePage}
        />
      </section>
    </main>
  )
}

function AuthorCard({ author }: { author: AuthorRecord }) {
  const interests = author.researchInterests ?? []

  return (
    <Link
      to="/authors/$profileId"
      params={{ profileId: author.id }}
      className="card-panel flex h-full flex-col bg-white! p-5! transition hover:border-primary/30 hover:bg-primary/5"
    >
      <span className="chip self-start">{author.profileType}</span>
      <h2 className="mt-4 text-xl font-semibold tracking-tight">
        {author.displayName}
      </h2>
      <p className="mt-2 text-sm leading-6 text-muted">
        {author.affiliation ?? author.departmentName ?? 'Affiliation not set'}
      </p>
      {author.bio ? (
        <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted">
          {author.bio}
        </p>
      ) : null}
      {interests.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {interests.slice(0, 4).map((interest) => (
            <span key={interest} className="chip">
              {interest}
            </span>
          ))}
        </div>
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
          <Link to="/publications" className="button-secondary">
            Publications
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
  pagination: AuthorListResult['pagination']
  onPageChange: (page: number) => Promise<void>
}) {
  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Page {pagination.page} of {pagination.totalPages} · {pagination.total}{' '}
        profiles
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
    <div className="card-panel bg-white! p-5! md:col-span-2 xl:col-span-3">
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
