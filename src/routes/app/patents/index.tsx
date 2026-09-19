import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { getMyPatents } from '#/lib/workspace-functions.ts'

const patentViewValues = ['all', 'drafts', 'published', 'archived'] as const
const patentSortValues = ['newest', 'oldest', 'title'] as const
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
const patentStatusOptions = [
  'potential',
  'disclosed',
  'filed',
  'granted',
  'licensed',
  'abandoned',
] as const
const pageSizeOptions = [10, 20, 50] as const

type PatentSearch = ReturnType<typeof validatePatentSearch>
type PatentListResult = Awaited<ReturnType<typeof getMyPatents>>
type PatentRecord = PatentListResult['records'][number]

export const Route = createFileRoute('/app/patents/')({
  validateSearch: validatePatentSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => ({
    patentList: await getMyPatents({ data: deps }),
  }),
  component: MyPatentsPage,
})

function MyPatentsPage() {
  const workspace = useWorkspace()
  const navigate = useNavigate()
  const search = Route.useSearch()
  const { patentList } = Route.useLoaderData()
  const canCreateRecords = workspace.currentUser.isAuthor

  async function handleFiltersSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)

    await navigate({
      to: '/app/patents',
      search: {
        view: readFormOption(formData, 'view', patentViewValues, 'all'),
        sort: readFormOption(formData, 'sort', patentSortValues, 'newest'),
        page: 1,
        pageSize: readFormNumber(formData, 'pageSize') ?? search.pageSize,
        query: readFormText(formData, 'query'),
        status: readFormOption(formData, 'status', recordStatusOptions),
        patentStatus: readFormOption(
          formData,
          'patentStatus',
          patentStatusOptions,
        ),
        patentNumber: readFormText(formData, 'patentNumber'),
        applicationNumber: readFormText(formData, 'applicationNumber'),
        jurisdiction: readFormText(formData, 'jurisdiction'),
        commercializationStatus: readFormText(
          formData,
          'commercializationStatus',
        ),
        industryPartner: readFormText(formData, 'industryPartner'),
      },
    })
  }

  async function updateView(view: PatentSearch['view']) {
    await navigate({
      to: '/app/patents',
      search: { ...search, view, page: 1 },
    })
  }

  async function updatePage(page: number) {
    await navigate({
      to: '/app/patents',
      search: { ...search, page },
    })
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Your patents"
        title="Patent records"
        description="View, filter, publish, archive, and edit patent or invention disclosure records created from your account."
      />

      <section className="mt-10 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Your patents
            </h2>
            <p className="mt-3 text-sm leading-6 text-muted">
              Browse drafts, archived work, and publicly published patent
              records.
            </p>
          </div>
          {canCreateRecords ? (
            <Link to="/app/patents/create" className="button-primary">
              Create patent
            </Link>
          ) : null}
        </div>

        <ViewTabs currentView={search.view} onChange={updateView} />

        <PatentFilters search={search} onSubmit={handleFiltersSubmit} />

        <div className="mt-6 grid gap-3">
          {patentList.records.length > 0 ? (
            patentList.records.map((patent) => (
              <PatentListItem key={patent.id} patent={patent} />
            ))
          ) : (
            <EmptyPatentState canCreateRecords={canCreateRecords} />
          )}
        </div>

        <PaginationControls
          pagination={patentList.pagination}
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
  currentView: PatentSearch['view']
  onChange: (view: PatentSearch['view']) => Promise<void>
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
          className={
            value === currentView ? 'button-primary' : 'button-secondary'
          }
          type="button"
          onClick={() => void onChange(value)}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function PatentFilters({
  search,
  onSubmit,
}: {
  search: PatentSearch
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
          placeholder="Search title, abstract, number, partner"
        />
        <select className="input-field" name="view" defaultValue={search.view}>
          <option value="all">All work</option>
          <option value="drafts">Drafts</option>
          <option value="published">Published</option>
          <option value="archived">Archived</option>
        </select>
        <select
          className="input-field"
          name="status"
          defaultValue={search.status ?? ''}
        >
          <option value="">Any record status</option>
          {recordStatusOptions.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
        <select
          className="input-field"
          name="patentStatus"
          defaultValue={search.patentStatus ?? ''}
        >
          <option value="">Any patent status</option>
          {patentStatusOptions.map((status) => (
            <option key={status} value={status}>
              {formatLabel(status)}
            </option>
          ))}
        </select>
        <input
          className="input-field"
          name="patentNumber"
          defaultValue={search.patentNumber ?? ''}
          placeholder="Patent number"
        />
        <input
          className="input-field"
          name="applicationNumber"
          defaultValue={search.applicationNumber ?? ''}
          placeholder="Application number"
        />
        <input
          className="input-field"
          name="jurisdiction"
          defaultValue={search.jurisdiction ?? ''}
          placeholder="Jurisdiction"
        />
        <input
          className="input-field"
          name="commercializationStatus"
          defaultValue={search.commercializationStatus ?? ''}
          placeholder="Commercialization status"
        />
        <input
          className="input-field"
          name="industryPartner"
          defaultValue={search.industryPartner ?? ''}
          placeholder="Industry partner"
        />
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
        <Link to="/app/patents" className="button-secondary">
          Reset
        </Link>
      </div>
    </form>
  )
}

function PatentListItem({ patent }: { patent: PatentRecord }) {
  const description = patent.summary ?? patent.abstract

  return (
    <Link
      to="/app/patents/$patentId"
      params={{ patentId: patent.id }}
      className="rounded-md border border-border bg-surface p-4 transition hover:border-primary/30 hover:bg-primary/5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold tracking-tight">{patent.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {formatLabel(patent.patentStatus)}
          </p>
        </div>
        <span className="chip">{formatLabel(patent.status)}</span>
      </div>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted">
        <span>Patent #: {patent.patentNumber ?? 'Not provided'}</span>
        <span>Application #: {patent.applicationNumber ?? 'Not provided'}</span>
        <span>Jurisdiction: {patent.jurisdiction ?? 'Not provided'}</span>
        <span>Partner: {patent.industryPartner ?? 'Not provided'}</span>
      </div>
      {description ? (
        <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted">
          {description}
        </p>
      ) : null}
    </Link>
  )
}

function EmptyPatentState({ canCreateRecords }: { canCreateRecords: boolean }) {
  return (
    <div className="rounded-sm border border-border bg-surface p-4">
      <p className="text-sm leading-6 text-muted">
        No patent records match these filters.
      </p>
    </div>
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

function validatePatentSearch(search: Record<string, unknown>) {
  return {
    view: readSearchOption(search.view, patentViewValues, 'all'),
    sort: readSearchOption(search.sort, patentSortValues, 'newest'),
    page: readSearchNumber(search.page, 1),
    pageSize: readSearchPageSize(search.pageSize),
    query: readSearchText(search.query),
    status: readSearchOption(search.status, recordStatusOptions),
    patentStatus: readSearchOption(search.patentStatus, patentStatusOptions),
    patentNumber: readSearchText(search.patentNumber),
    applicationNumber: readSearchText(search.applicationNumber),
    jurisdiction: readSearchText(search.jurisdiction),
    commercializationStatus: readSearchText(search.commercializationStatus),
    industryPartner: readSearchText(search.industryPartner),
  }
}

function readSearchText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function readSearchNumber(value: unknown, fallback: number) {
  const parsedValue = typeof value === 'string' ? Number(value) : value

  return typeof parsedValue === 'number' &&
    Number.isInteger(parsedValue) &&
    parsedValue > 0
    ? parsedValue
    : fallback
}

function readSearchPageSize(value: unknown) {
  const parsedValue = readSearchNumber(value, 10)

  return pageSizeOptions.includes(
    parsedValue as (typeof pageSizeOptions)[number],
  )
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
