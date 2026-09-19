import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { updateAuthorshipSettings } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
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

    const formData = new FormData(event.currentTarget)

    try {
      await updateAuthorshipSettings({
        data: { isAuthor: formString(formData, 'isAuthor') === 'true' },
      })
      setSuccessMessage('Settings saved.')
      await router.invalidate()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to save settings',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Account settings"
        title="Settings"
        description="Choose whether this account should use author workflows for publication and patent records."
      />

      <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
        <FormStatus
          successMessage={successMessage}
          errorMessage={errorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <fieldset className="grid gap-3">
            <legend className="field-label">Authorship mode</legend>
            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-4 text-sm">
              <input
                className="mt-1"
                type="radio"
                name="isAuthor"
                value="true"
                defaultChecked={workspace.currentUser.isAuthor}
              />
              <span>
                <span className="block font-medium text-foreground">
                  I am an author
                </span>
                <span className="mt-1 block text-muted">
                  Show author profile prompts, publication tools, and patent
                  tools.
                </span>
              </span>
            </label>
            <label className="flex cursor-pointer items-start gap-3 rounded-sm border border-border bg-surface p-4 text-sm">
              <input
                className="mt-1"
                type="radio"
                name="isAuthor"
                value="false"
                defaultChecked={!workspace.currentUser.isAuthor}
              />
              <span>
                <span className="block font-medium text-foreground">
                  I am not an author
                </span>
                <span className="mt-1 block text-muted">
                  Hide publication and patent creation prompts on the dashboard.
                </span>
              </span>
            </label>
          </fieldset>

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>
    </>
  )
}
