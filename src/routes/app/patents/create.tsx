import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  ProfileSelect,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { requireRecordCreatePage } from '#/lib/workspace-route-guards.ts'
import { createPatentDraft } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/patents/create')({
  loader: async () => requireRecordCreatePage(),
  component: CreatePatentPage,
})

const patentStatusOptions = [
  ['potential', 'Potential'],
  ['disclosed', 'Disclosed'],
  ['filed', 'Filed'],
  ['granted', 'Granted'],
  ['licensed', 'Licensed'],
  ['abandoned', 'Abandoned'],
] as const

function CreatePatentPage() {
  const workspace = useWorkspace()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await createPatentDraft({
        data: {
          owningProfileId: formString(formData, 'owningProfileId'),
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
          jurisdiction: formString(formData, 'jurisdiction'),
          commercializationStatus: formString(
            formData,
            'commercializationStatus',
          ),
          industryPartner: formString(formData, 'industryPartner'),
        },
      })
      form.reset()
      setSuccessMessage('Patent draft created.')
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create patent draft',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Patent draft"
        title="Create patent"
        description="Create a draft patent or invention disclosure from one of your attribution profiles. IPTTO review and commercialization tracking will build on this record."
      />

      <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="owningProfileId">
            Attribution profile
          </label>
          <ProfileSelect profiles={workspace.myProfiles} />

          <label className="field-label" htmlFor="title">
            Patent title
          </label>
          <input className="input-field" id="title" name="title" required />

          <label className="field-label" htmlFor="patentStatus">
            Patent status
          </label>
          <select
            className="input-field"
            id="patentStatus"
            name="patentStatus"
            defaultValue="potential"
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
              placeholder="Patent number"
            />
            <input
              className="input-field"
              name="applicationNumber"
              placeholder="Application number"
            />
            <input
              className="input-field"
              name="jurisdiction"
              placeholder="Jurisdiction"
            />
            <input
              className="input-field"
              name="commercializationStatus"
              placeholder="Commercialization status"
            />
            <input
              className="input-field"
              name="industryPartner"
              placeholder="Industry partner"
            />
          </div>

          <textarea
            className="textarea-field"
            name="abstract"
            placeholder="Abstract"
          />
          <textarea
            className="textarea-field"
            name="summary"
            placeholder="Short public summary"
          />

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create patent draft'}
          </button>
        </form>
      </section>
    </>
  )
}
