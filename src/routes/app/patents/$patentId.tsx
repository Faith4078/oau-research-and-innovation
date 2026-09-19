import {
  Link,
  createFileRoute,
  redirect,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import type { ReactNode } from 'react'

import { WorkspacePageHeader } from '#/components/workspace-shell.tsx'
import {
  getPatentDetail,
  updatePatentOwnerStatus,
} from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/patents/$patentId')({
  loader: async ({ params }) => {
    try {
      return {
        patent: await getPatentDetail({
          data: { patentId: params.patentId },
        }),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Patent not found') {
        throw redirect({ to: '/app/patents' })
      }

      throw error
    }
  },
  component: PatentDetailPage,
})

function PatentDetailPage() {
  const { patent } = Route.useLoaderData()
  const router = useRouter()
  const [statusAction, setStatusAction] = useState<
    'published' | 'archived' | null
  >(null)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleStatusChange(status: 'published' | 'archived') {
    setStatusAction(status)
    setActionError(null)

    try {
      await updatePatentOwnerStatus({ data: { patentId: patent.id, status } })
      await router.invalidate()
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : 'Unable to update patent',
      )
    } finally {
      setStatusAction(null)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Patent detail"
        title={patent.title}
        description="Review the full patent or invention disclosure details attached to your account."
      />

      <section className="mt-8 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            <span className="chip">{patent.status.replaceAll('_', ' ')}</span>
            <span className="chip">
              {patent.patentStatus.replaceAll('_', ' ')}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/app/patents/$patentId/edit"
              params={{ patentId: patent.id }}
              className="button-primary"
            >
              Edit patent
            </Link>
            {patent.status !== 'published' ? (
              <button
                className="button-secondary"
                type="button"
                disabled={statusAction !== null}
                onClick={() => void handleStatusChange('published')}
              >
                {statusAction === 'published' ? 'Publishing…' : 'Publish'}
              </button>
            ) : null}
            {patent.status !== 'archived' ? (
              <button
                className="button-secondary"
                type="button"
                disabled={statusAction !== null}
                onClick={() => void handleStatusChange('archived')}
              >
                {statusAction === 'archived' ? 'Archiving…' : 'Archive'}
              </button>
            ) : null}
            <Link to="/app/patents" className="button-secondary">
              Back to patents
            </Link>
          </div>
        </div>

        {actionError ? <p className="error-copy mt-4">{actionError}</p> : null}

        <DetailSection title="Patent information">
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
            label="Commercialization status"
            value={patent.commercializationStatus}
          />
          <DetailField
            label="Industry partner"
            value={patent.industryPartner}
          />
        </DetailSection>

        <DetailSection title="Attribution">
          <DetailField label="Profile" value={patent.owningProfileName} />
          <DetailField label="Faculty" value={patent.facultyName} />
          <DetailField label="Department" value={patent.departmentName} />
        </DetailSection>

        <TextBlock title="Summary" value={patent.summary} />
        <TextBlock title="Abstract" value={patent.abstract} />

        <DetailSection title="Links and metadata">
          <DetailLink label="Source URL" value={patent.sourceUrl} />
          <DetailLink label="Document URL" value={patent.documentUrl} />
          <DetailField
            label="Published at"
            value={formatDate(patent.publishedAt)}
          />
          <DetailField label="Created" value={formatDate(patent.createdAt)} />
          <DetailField label="Updated" value={formatDate(patent.updatedAt)} />
        </DetailSection>
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
