import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { upsertMyProfile } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/profile/create')({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: search.reason === 'missing-profile' ? 'missing-profile' : undefined,
  }),
  component: CreateProfilePage,
})

function CreateProfilePage() {
  const workspace = useWorkspace()
  const { reason } = Route.useSearch()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const primaryProfile = workspace.myProfiles.at(0)
  const hasProfile = workspace.myProfiles.length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      await upsertMyProfile({
        data: {
          displayName: formString(formData, 'displayName'),
          primaryEmail: formString(formData, 'primaryEmail'),
          affiliation: formString(formData, 'affiliation'),
          bio: formString(formData, 'bio'),
          researchInterests: formString(formData, 'researchInterests'),
        },
      })
      setSuccessMessage(
        reason === 'missing-profile'
          ? 'Profile saved. You can now create publications and patents.'
          : 'Profile saved.',
      )
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save profile',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Attribution profile"
        title={primaryProfile ? 'Update your profile' : 'Create your profile'}
        description="Publications and patents are attributed to profiles, not directly to login accounts. Create one before adding records."
      />

      {reason === 'missing-profile' ? (
        <p className="success-copy mt-8">
          Create a profile first so your publication and patent records have a
          verified attribution owner.
        </p>
      ) : null}

      <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form
          key={primaryProfile?.id ?? 'new-profile'}
          className="mt-6 grid gap-4"
          onSubmit={handleSubmit}
        >
          <label className="field-label" htmlFor="displayName">
            Display name
          </label>
          <input
            className="input-field"
            id="displayName"
            name="displayName"
            defaultValue={primaryProfile?.displayName ?? ''}
            required
          />

          <label className="field-label" htmlFor="primaryEmail">
            Public email
          </label>
          <input
            className="input-field"
            id="primaryEmail"
            name="primaryEmail"
            type="email"
            defaultValue={primaryProfile?.primaryEmail ?? ''}
            placeholder="Optional"
          />

          <label className="field-label" htmlFor="affiliation">
            Affiliation
          </label>
          <input
            className="input-field"
            id="affiliation"
            name="affiliation"
            defaultValue={primaryProfile?.affiliation ?? ''}
            placeholder="Department, faculty, lab, or unit"
          />

          <label className="field-label" htmlFor="researchInterests">
            Research interests
          </label>
          <textarea
            className="textarea-field"
            id="researchInterests"
            name="researchInterests"
            defaultValue={primaryProfile?.researchInterests?.join(', ') ?? ''}
            placeholder="Separate with commas or new lines"
          />

          <label className="field-label" htmlFor="bio">
            Short bio
          </label>
          <textarea
            className="textarea-field min-h-32"
            id="bio"
            name="bio"
            defaultValue={primaryProfile?.bio ?? ''}
            placeholder="Optional public profile summary"
          />

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save profile'}
          </button>
        </form>

        {hasProfile ? (
          <div className="mt-6 flex flex-wrap gap-3">
            <Link to="/app/publications/create" className="button-secondary">
              Create publication
            </Link>
            <Link to="/app/patents/create" className="button-secondary">
              Create patent
            </Link>
          </div>
        ) : null}
      </section>
    </>
  )
}
