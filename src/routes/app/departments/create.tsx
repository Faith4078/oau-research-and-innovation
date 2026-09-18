import { useState } from 'react'
import { Link, createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { requireOrganizationManagerPage } from '#/lib/workspace-route-guards.ts'
import { createDepartment } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/departments/create')({
  loader: async () => requireOrganizationManagerPage(),
  component: CreateDepartmentPage,
})

function CreateDepartmentPage() {
  const workspace = useWorkspace()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const canCreateDepartment = workspace.faculties.length > 0

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setSuccessMessage(null)
    setErrorMessage(null)

    const form = event.currentTarget
    const formData = new FormData(form)

    try {
      await createDepartment({
        data: {
          facultyId: formString(formData, 'facultyId'),
          name: formString(formData, 'name'),
          description: formString(formData, 'description'),
        },
      })
      form.reset()
      setSuccessMessage('Department created.')
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to create department',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Super-admin setup"
        title="Create department"
        description="Create department records under existing faculties so profiles and records can be scoped correctly."
      />

      {!canCreateDepartment ? (
        <p className="success-copy mt-8">
          Create a faculty before adding departments.
        </p>
      ) : null}

      <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="facultyId">
            Faculty
          </label>
          <select
            className="input-field"
            id="facultyId"
            name="facultyId"
            required
            disabled={!canCreateDepartment}
          >
            <option value="">Select faculty</option>
            {workspace.faculties.map((faculty) => (
              <option key={faculty.id} value={faculty.id}>
                {faculty.name}
              </option>
            ))}
          </select>

          <label className="field-label" htmlFor="name">
            Department name
          </label>
          <input
            className="input-field"
            id="name"
            name="name"
            required
            disabled={!canCreateDepartment}
          />

          <label className="field-label" htmlFor="description">
            Description
          </label>
          <textarea
            className="textarea-field"
            id="description"
            name="description"
            placeholder="Optional description"
            disabled={!canCreateDepartment}
          />

          <div className="flex flex-wrap gap-3">
            <button
              className="button-primary mt-2"
              type="submit"
              disabled={isSubmitting || !canCreateDepartment}
            >
              {isSubmitting ? 'Creating…' : 'Create department'}
            </button>
            {!canCreateDepartment ? (
              <Link
                to="/app/faculties/create"
                className="button-secondary mt-2"
              >
                Create faculty
              </Link>
            ) : null}
          </div>
        </form>
      </section>
    </>
  )
}
