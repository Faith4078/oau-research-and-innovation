import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
} from '#/components/workspace-shell.tsx'
import { requireOrganizationManagerPage } from '#/lib/workspace-route-guards.ts'
import { createFaculty } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/faculties/create')({
  loader: async () => requireOrganizationManagerPage(),
  component: CreateFacultyPage,
})

function CreateFacultyPage() {
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
      await createFaculty({
        data: {
          name: formString(formData, 'name'),
          description: formString(formData, 'description'),
        },
      })
      form.reset()
      setSuccessMessage('Faculty created.')
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create faculty',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Super-admin setup"
        title="Create faculty"
        description="Create faculty records that scope departments, profiles, publications, patents, and admin permissions."
      />

      <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="name">
            Faculty name
          </label>
          <input className="input-field" id="name" name="name" required />

          <label className="field-label" htmlFor="description">
            Description
          </label>
          <textarea
            className="textarea-field"
            id="description"
            name="description"
            placeholder="Optional description"
          />

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating…' : 'Create faculty'}
          </button>
        </form>
      </section>
    </>
  )
}
