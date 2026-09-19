import { useState } from 'react'
import { createFileRoute, useNavigate, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
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

const DETAIL_REDIRECT_DELAY_MS = 900

function CreatePatentPage() {
  const workspace = useWorkspace()
  const profile = workspace.myProfiles[0]
  const navigate = useNavigate()
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
      const result = await createPatentDraft({
        data: {
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
      setSuccessMessage('Patent draft created. Opening details…')
      await router.invalidate()
      await waitForDetailRedirect()
      await navigate({
        to: '/app/patents/$patentId',
        params: { patentId: result.patent.id },
      })
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
        description="Create a draft patent or invention disclosure from your attribution profile. IPTTO review and commercialization tracking will build on this record."
      />

      <ProfileSummaryCard profile={profile} />

      <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
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

function waitForDetailRedirect() {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, DETAIL_REDIRECT_DELAY_MS)
  })
}

function ProfileSummaryCard({
  profile,
}: {
  profile: ReturnType<typeof useWorkspace>['myProfiles'][number]
}) {
  const researchInterests = profile.researchInterests ?? []

  return (
    <section className="mt-8 max-w-4xl rounded-md border border-border bg-surface p-4">
      <p className="label-sm text-muted">Attribution profile</p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight">
        {profile.displayName}
      </h2>
      <div className="mt-3 flex flex-wrap gap-2 text-sm text-muted">
        {profile.primaryEmail ? <span>{profile.primaryEmail}</span> : null}
        {profile.affiliation ? <span>{profile.affiliation}</span> : null}
      </div>
      {researchInterests.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {researchInterests.map((interest) => (
            <span key={interest} className="chip">
              {interest}
            </span>
          ))}
        </div>
      ) : null}
    </section>
  )
}
