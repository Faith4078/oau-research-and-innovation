import { useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
  useWorkspace,
} from '#/components/workspace-shell.tsx'
import { changePassword } from '#/lib/auth-functions.ts'
import { updateAuthorshipSettings } from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/settings')({
  component: SettingsPage,
})

function SettingsPage() {
  const workspace = useWorkspace()
  const router = useRouter()
  const [isAuthorshipSubmitting, setIsAuthorshipSubmitting] = useState(false)
  const [authorshipSuccessMessage, setAuthorshipSuccessMessage] = useState<
    string | null
  >(null)
  const [authorshipErrorMessage, setAuthorshipErrorMessage] = useState<
    string | null
  >(null)
  const [isPasswordSubmitting, setIsPasswordSubmitting] = useState(false)
  const [passwordSuccessMessage, setPasswordSuccessMessage] = useState<
    string | null
  >(null)
  const [passwordErrorMessage, setPasswordErrorMessage] = useState<
    string | null
  >(null)

  async function handleAuthorshipSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsAuthorshipSubmitting(true)
    setAuthorshipSuccessMessage(null)
    setAuthorshipErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      await updateAuthorshipSettings({
        data: { isAuthor: formString(formData, 'isAuthor') === 'true' },
      })
      setAuthorshipSuccessMessage('Settings saved.')
      await router.invalidate()
    } catch (error) {
      setAuthorshipErrorMessage(
        error instanceof Error ? error.message : 'Unable to save settings',
      )
    } finally {
      setIsAuthorshipSubmitting(false)
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setPasswordSuccessMessage(null)
    setPasswordErrorMessage(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const currentPassword = formString(formData, 'currentPassword')
    const newPassword = formString(formData, 'newPassword')
    const confirmPassword = formString(formData, 'confirmPassword')

    if (newPassword !== confirmPassword) {
      setPasswordErrorMessage('Passwords do not match')
      return
    }

    setIsPasswordSubmitting(true)

    try {
      await changePassword({ data: { currentPassword, newPassword } })
      setPasswordSuccessMessage('Password changed successfully.')
      form.reset()
    } catch (error) {
      setPasswordErrorMessage(
        error instanceof Error ? error.message : 'Unable to change password',
      )
    } finally {
      setIsPasswordSubmitting(false)
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
          successMessage={authorshipSuccessMessage}
          errorMessage={authorshipErrorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handleAuthorshipSubmit}>
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
            disabled={isAuthorshipSubmitting}
          >
            {isAuthorshipSubmitting ? 'Saving…' : 'Save settings'}
          </button>
        </form>
      </section>

      <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">
            Change password
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Update your account password. Other active sessions for this account
            will be signed out.
          </p>
        </div>

        <FormStatus
          successMessage={passwordSuccessMessage}
          errorMessage={passwordErrorMessage}
        />

        <form className="mt-6 grid gap-4" onSubmit={handlePasswordSubmit}>
          <label className="field-label" htmlFor="currentPassword">
            Current password
          </label>
          <input
            className="input-field"
            id="currentPassword"
            name="currentPassword"
            type="password"
            autoComplete="current-password"
            required
          />

          <label className="field-label" htmlFor="newPassword">
            New password
          </label>
          <input
            className="input-field"
            id="newPassword"
            name="newPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <label className="field-label" htmlFor="confirmPassword">
            Confirm new password
          </label>
          <input
            className="input-field"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            minLength={8}
            required
          />

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isPasswordSubmitting}
          >
            {isPasswordSubmitting ? 'Changing password…' : 'Change password'}
          </button>
        </form>
      </section>
    </>
  )
}
