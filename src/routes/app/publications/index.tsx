import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { getMyPublications } from '#/lib/workspace-functions.ts'

const publicationViewValues = ['all', 'drafts', 'published', 'archived'] as const
const publicationSortValues = ['newest', 'oldest', 'title'] as const
const recordStatusOptions = [
  'draft',
  'submitted',
  'department_review',
  'faculty_review',
  'changes_requested',
  'approved',
  'published',
  'rejected',
  'archived',
] as const
const publicationTypeOptions = [
  'journal_article',
  'conference_paper',
  'book_chapter',
  'book',
  'dataset',
  'technical_report',
  'thesis',
  'other',
] as const
const pageSizeOptions = [10, 20, 50] as const

type PublicationSearch = ReturnType<typeof validatePublicationSearch>
type PublicationListResult = Awaited<ReturnType<typeof getMyPublications>>
type PublicationRecord = PublicationListResult['records'][number]

export const Route = createFileRoute('/app/publications/')({
  validateSearch: validatePublicationSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    publicationList: await getMyPublications({ data: deps }),
  }),
  component: MyPublicationsPage,
})

function MyPublicationsPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { publicationList } = Route.useLoaderData()
  const canCreateRecords = workspace.currentUser.isAuthor

  async function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    await navigate({
      to: '/app/publications',
      search: {
        view: readFormOption(
          formData,
          'view',
          publicationViewValues,
          'all',
        ),
        sort: readFormOption(
          formData,
          'sort',
          publicationSortValues,
          'newest',
        ),
        page: 1,
        pageSize: readFormNumber(formData, 'pageSize') ?? search.pageSize,
        query: readFormText(formData, 'query'),
        status: readFormOption(formData, 'status', recordStatusOptions),
        publicationType: readFormOption(
          formData,
          'publicationType',
          publicationTypeOptions,
        ),
        publicationYear: readFormNumber(formData, 'publicationYear'),
        yearFrom: readFormNumber(formData, 'yearFrom'),
        yearTo: readFormNumber(formData, 'yearTo'),
        venueName: readFormText(formData, 'venueName'),
        researchCategory: readFormText(formData, 'researchCategory'),
        doi: readFormText(formData, 'doi'),
      },
    })
  }

  async function updateView(view: PublicationSearch['view']) {
    await navigate({
      to: '/app/publications',
      search: { ...search, view, page: 1 },
    })
  }

  async function updatePage(page: number) {
    await navigate({
      to: '/app/publications',
      search: { ...search, page },
    })
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Your publications"
        title="Publication records"
        description="View, filter, publish, archive, and edit publication records created from your account."
      />

      <section className="mt-10 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your publications
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Browse drafts, archived work, and publicly published publications.
            </p>
          </div>
          {canCreateRecords ? (
            <Link to="/app/publications/create" className="button-primary">
              Create publication
            </Link>
          ) : null}
        </div>

        <ViewTabs currentView={search.view} onChange={updateView} />

        <PublicationFilters search={search} onSubmit={handleFiltersSubmit} />

        <div className="mt-6 grid gap-3">
          {publicationList.records.length > 0 ? (
            publicationList.records.map((publication) => (
              <PublicationListItem
                key={publication.id}
                publication={publication}
              />
            ))
          ) : (
            <EmptyPublicationState canCreateRecords={canCreateRecords} />
          )}
        </div>

        <PaginationControls
          pagination={publicationList.pagination}
          onPageChange={updatePage}
        />
      </section>
    </>
  )
}

function ViewTabs({
  currentView,
  onChange,
}: {
  currentView: PublicationSearch['view']
  onChange: (view: PublicationSearch['view']) => Promise<void>
}) {
  const tabs = [
    ['all', 'All'],
    ['drafts', 'Drafts'],
    ['published', 'Published'],
    ['archived', 'Archived'],
  ] as const

  return (
    <div className="mt-6 flex flex-wrap gap-2">
      {tabs.map(([value, label]) => (
        <button
          key={value}
          className={value === currentView ? 'button-primary' : 'button-secondary'}
          type="button"
          onClick={() => void onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PublicationFilters({
  search,
  onSubmit,
}: {
  search: PublicationSearch
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
}) {
  return (
    <form
      key={JSON.stringify(search)}
      className="mt-6 rounded-md border border-border bg-surface p-4"
      onSubmit={onSubmit}
    >
      <div className="grid gap-3 md:grid-cols-3">
        <input
          className="input-field"
          name="query"
          defaultValue={search.query ?? ''}
          placeholder="Search title, abstract, venue, DOI"
        />
        <select className="input-field" name="view" defaultValue={search.view}>
          <option value="all">All work</option>
          <option value="drafts">Drafts</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select className="input-field" name="status" defaultValue={search.status ?? ''}>
          <option value="">Any status</option>
          {recordStatusOptions.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          name="publicationType"
          defaultValue={search.publicationType ?? ''}
        >
          <option value="">Any publication type</option>
          {publicationTypeOptions.map((type) => (
            <option key={type} value={type}>
              {formatLabel(type)}
            </option>
          ))}
        </select>
        <input
          className="input-field"
          name="venueName"
          defaultValue={search.venueName ?? ''}
          placeholder="Venue or journal"
        />
        <input
          className="input-field"
          name="researchCategory"
          defaultValue={search.researchCategory ?? ''}
          placeholder="Research category"
        />
        <input
          className="input-field"
          name="doi"
          defaultValue={search.doi ?? ''}
          placeholder="DOI"
        />
        <input
          className="input-field"
          name="publicationYear"
          defaultValue={search.publicationYear ?? ''}
          inputMode="numeric"
          placeholder="Exact year"
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            className="input-field"
            name="yearFrom"
            defaultValue={search.yearFrom ?? ''}
            inputMode="numeric"
            placeholder="Year from"
          />
          <input
            className="input-field"
            name="yearTo"
            defaultValue={search.yearTo ?? ''}
            inputMode="numeric"
            placeholder="Year to"
          />
        </div>
        <select className="input-field" name="sort" defaultValue={search.sort}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">Title A-Z</option>
        </select>
        <select
          className="input-field"
          name="pageSize"
          defaultValue={search.pageSize}
        >
          {pageSizeOptions.map((pageSize) => (
            <option key={pageSize} value={pageSize}>
              {pageSize} per page
            </option>
          ))}
        </select>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button className="button-primary" type="submit">
          Apply filters
        </button>
        <Link to="/app/publications" className="button-secondary">
          Reset
        </Link>
      </div>
    </form>
  )
}

function PublicationListItem({
  publication,
}: {
  publication: PublicationRecord
}) {
  const description = publication.summary ?? publication.abstract

  return (
    <Link
      to="/app/publications/$publicationId"
      params={{ publicationId: publication.id }}
      className="rounded-md border border-border bg-surface p-4 transition hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{publication.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatLabel(publication.publicationType)}
          </p>
        </div>
        <span className="chip">{formatLabel(publication.status)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>Venue: {publication.venueName ?? 'Not provided'}</span>
        <span>Year: {publication.publicationYear ?? 'Not provided'}</span>
        <span>Category: {publication.researchCategory ?? 'Not provided'}</span>
      </div>
      {description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </Link>
  )
}

function EmptyPublicationState({ canCreateRecords }: { canCreateRecords: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <p className="text-sm leading-6 text-muted">
        No publication records match these filters.
      </p>
    </div>
  )
}

function PaginationControls({
  pagination,
  onPageChange,
}: {
  pagination: PublicationListResult['pagination']
  onPageChange: (page: number) => Promise<void>
}) {
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
      <p>
        Showing page {pagination.page} of {pagination.totalPages} ·{' '}
        {pagination.total} records
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

function validatePublicationSearch(search: Record<string, unknown>) {
  return {
    view: readSearchOption(search.view, publicationViewValues, 'all'),
    sort: readSearchOption(search.sort, publicationSortValues, 'newest'),
    page: readSearchNumber(search.page, 1),
    pageSize: readSearchPageSize(search.pageSize),
    query: readSearchText(search.query),
    status: readSearchOption(search.status, recordStatusOptions),
    publicationType: readSearchOption(
      search.publicationType,
      publicationTypeOptions,
    ),
    publicationYear: readSearchOptionalNumber(search.publicationYear),
    yearFrom: readSearchOptionalNumber(search.yearFrom),
    yearTo: readSearchOptionalNumber(search.yearTo),
    venueName: readSearchText(search.venueName),
    researchCategory: readSearchText(search.researchCategory),
    doi: readSearchText(search.doi),
  }
}

function readSearchText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readSearchNumber(value: unknown, fallback: number) {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  return typeof parsedValue === 'number' && Number.isInteger(parsedValue) && parsedValue > 0
    ? parsedValue
    : fallback
}

function readSearchOptionalNumber(value: unknown) {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  return typeof parsedValue === 'number' && Number.isInteger(parsedValue)
    ? parsedValue
    : undefined
}

function readSearchPageSize(value: unknown) {
  const parsedValue = readSearchNumber(value, 10)

  return pageSizeOptions.includes(parsedValue as (typeof pageSizeOptions)[number])
    ? parsedValue
    : 10
}

function readSearchOption<T extends readonly string[]>(
  value: unknown,
  options: T,
  fallback?: T[number],
) {
  return typeof value === 'string' && options.includes(value)
    ? (value as T[number])
    : fallback
}

function readFormText(formData: FormData, name: string) {
  const value = formString(formData, name).trim()

  return value ? value : undefined
}

function readFormNumber(formData: FormData, name: string) {
  const value = formString(formData, name).trim()

  if (!value) {
    return undefined
  }

  const parsedValue = Number(value)

  return Number.isInteger(parsedValue) ? parsedValue : undefined
}

function readFormOption<T extends readonly string[]>(
  formData: FormData,
  name: string,
  options: T,
  fallback?: T[number],
) {
  return readSearchOption(formString(formData, name), options, fallback)
}

function formatLabel(value: string) {
  return value.replaceAll('_', ' ')
}