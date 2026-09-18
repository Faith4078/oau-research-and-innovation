import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { requireRecordCreatePage } from '#/lib/workspace-route-guards.ts'
import { createPublicationDraft } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/publications/create')({
  loader: async () => requireRecordCreatePage(),
  component: CreatePublicationPage,
})

const publicationTypeOptions = [
  ['journal_article', 'Journal article'],
  ['conference_paper', 'Conference paper'],
  ['book_chapter', 'Book chapter'],
  ['book', 'Book'],
  ['dataset', 'Dataset'],
  ['technical_report', 'Technical report'],
  ['thesis', 'Thesis'],
  ['other', 'Other'],
] as const

function CreatePublicationPage() {
  const workspace = useWorkspace()
  const profile = workspace.myProfiles[0]
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
      await createPublicationDraft({
        data: {
          title: formString(formData, 'title'),
          abstract: formString(formData, 'abstract'),
          summary: formString(formData, 'summary'),
          publicationType: formString(formData, 'publicationType') as
            | 'journal_article'
            | 'conference_paper'
            | 'book_chapter'
            | 'book'
            | 'dataset'
            | 'technical_report'
            | 'thesis'
            | 'other',
          researchCategory: formString(formData, 'researchCategory'),
          keywords: formString(formData, 'keywords'),
          publicationYear: formString(formData, 'publicationYear'),
          venueName: formString(formData, 'venueName'),
          doi: formString(formData, 'doi'),
          sourceUrl: formString(formData, 'sourceUrl'),
        },
      })
      form.reset()
      setSuccessMessage('Publication draft created.')
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create publication draft',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Publication draft"
        title="Create publication"
        description="Create a draft publication from your attribution profile. Publishing, contributors, and review events will build on this record."
      />

      <ProfileSummaryCard profile={profile} />

      <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="title">
            Publication title
          </label>
          <input className="input-field" id="title" name="title" required />

          <label className="field-label" htmlFor="publicationType">
            Publication type
          </label>
          <select
            className="input-field"
            id="publicationType"
            name="publicationType"
            defaultValue="journal_article"
          >
            {publicationTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="input-field"
              name="venueName"
              placeholder="Venue or journal"
            />
            <input
              className="input-field"
              name="publicationYear"
              placeholder="Publication year"
              inputMode="numeric"
            />
            <input className="input-field" name="doi" placeholder="DOI" />
            <input
              className="input-field"
              name="sourceUrl"
              placeholder="Source URL"
            />
            <input
              className="input-field"
              name="researchCategory"
              placeholder="Research category"
            />
          </div>

          <textarea
            className="textarea-field"
            name="keywords"
            placeholder="Keywords, separated by commas"
          />
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
            {isSubmitting ? 'Creating…' : 'Create publication draft'}
          </button>
        </form>
      </section>
    </>
  )
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
