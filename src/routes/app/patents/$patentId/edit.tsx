import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
} from '#/components/workspace-shell.tsx'
import { getPatentDetail, updatePatent } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/patents/$patentId/edit')({
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
  component: EditPatentPage,
})

const patentStatusOptions = [
  ['potential', 'Potential'],
  ['disclosed', 'Disclosed'],
  ['filed', 'Filed'],
  ['granted', 'Granted'],
  ['licensed', 'Licensed'],
  ['abandoned', 'Abandoned'],
] as const

function EditPatentPage() {
  const { patent } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      await updatePatent({
        data: {
          patentId: patent.id,
          title: formString(formData, 'title'),
          abstract: formString(formData, 'abstract'),
          summary: formString(formData, 'summary'),
          patentStatus: formString(formData, 'patentStatus') as
            | 'potential'
            | 'disclosed'
            | 'filed'
            | 'granted'
            | 'licensed'
            | 'abandoned',
          patentNumber: formString(formData, 'patentNumber'),
          applicationNumber: formString(formData, 'applicationNumber'),
          filingDate: formString(formData, 'filingDate'),
          grantDate: formString(formData, 'grantDate'),
          jurisdiction: formString(formData, 'jurisdiction'),
          sourceUrl: formString(formData, 'sourceUrl'),
          documentUrl: formString(formData, 'documentUrl'),
          commercializationStatus: formString(
            formData,
            'commercializationStatus',
          ),
          industryPartner: formString(formData, 'industryPartner'),
        },
      })
      await router.invalidate()
      await navigate({
        to: '/app/patents/$patentId',
        params: { patentId: patent.id },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update patent',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Edit patent"
        title={patent.title}
        description="Update the patent or invention disclosure attached to your account."
      />

      <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
        <FormStatus successMessage={null} errorMessage={errorMessage} />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="title">
            Patent title
          </label>
          <input
            className="input-field"
            id="title"
            name="title"
            defaultValue={patent.title}
            required
          />

          <label className="field-label" htmlFor="patentStatus">
            Patent status
          </label>
          <select
            className="input-field"
            id="patentStatus"
            name="patentStatus"
            defaultValue={patent.patentStatus}
          >
            {patentStatusOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="input-field"
              name="patentNumber"
              defaultValue={patent.patentNumber ?? ''}
              placeholder="Patent number"
            />
            <input
              className="input-field"
              name="applicationNumber"
              defaultValue={patent.applicationNumber ?? ''}
              placeholder="Application number"
            />
            <input
              className="input-field"
              name="filingDate"
              type="date"
              defaultValue={formatDateInput(patent.filingDate)}
            />
            <input
              className="input-field"
              name="grantDate"
              type="date"
              defaultValue={formatDateInput(patent.grantDate)}
            />
            <input
              className="input-field"
              name="jurisdiction"
              defaultValue={patent.jurisdiction ?? ''}
              placeholder="Jurisdiction"
            />
            <input
              className="input-field"
              name="sourceUrl"
              defaultValue={patent.sourceUrl ?? ''}
              placeholder="Source URL"
            />
            <input
              className="input-field"
              name="documentUrl"
              defaultValue={patent.documentUrl ?? ''}
              placeholder="Document URL"
            />
            <input
              className="input-field"
              name="commercializationStatus"
              defaultValue={patent.commercializationStatus ?? ''}
              placeholder="Commercialization status"
            />
            <input
              className="input-field"
              name="industryPartner"
              defaultValue={patent.industryPartner ?? ''}
              placeholder="Industry partner"
            />
          </div>

          <textarea
            className="textarea-field"
            name="abstract"
            defaultValue={patent.abstract ?? ''}
            placeholder="Abstract"
          />
          <textarea
            className="textarea-field"
            name="summary"
            defaultValue={patent.summary ?? ''}
            placeholder="Short public summary"
          />

          <div className="mt-2 flex flex-wrap gap-3">
            <button className="button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save patent'}
            </button>
            <Link
              to="/app/patents/$patentId"
              params={{ patentId: patent.id }}
              className="button-secondary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </>
  )
}

function formatDateInput(value: Date | string | null) {
  if (!value) {
    return ''
  }

  return typeof value === 'string'
    ? value.slice(0, 10)
    : value.toISOString().slice(0, 10)
}