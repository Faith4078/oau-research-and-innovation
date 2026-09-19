import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { resetPassword } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/auth/reset-password')({
  validateSearch: (search: Record<string, unknown>) => ({
    token: typeof search.token === 'string' ? search.token : '',
  }),
  component: ResetPassword,
})

function ResetPassword() {
  const { token } = Route.useSearch()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)

    const form = event.currentTarget
    const formData = new FormData(form)
    const password = String(formData.get('password') ?? '')
    const confirmPassword = String(formData.get('confirmPassword') ?? '')

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match')
      return
    }

    setIsSubmitting(true)

    try {
      await resetPassword({ data: { token, password } })
      setSuccessMessage('Your password has been reset. You can sign in now.')
      form.reset()
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to reset your password right now',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasToken = token.length > 0

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link to="/" className="brand-mark mb-10 inline-flex">
          OAU R&I
        </Link>
        <span className="chip">Set new password</span>
        <h1 className="headline-lg mt-5">Choose a new password.</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Use at least 8 characters. Completing this reset signs out existing
          sessions for your account.
        </p>

        {!hasToken ? (
          <div className="mt-8 rounded-md border border-border bg-surface p-4">
            <p className="error-copy">This reset link is missing a token.</p>
            <Link to="/auth/forgot-password" className="button-primary mt-4">
              Request a new link
            </Link>
          </div>
        ) : (
          <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
            <label className="field-label" htmlFor="password">
              New password
            </label>
            <input
              className="input-field"
              id="password"
              name="password"
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

            {successMessage ? (
              <p className="success-copy">{successMessage}</p>
            ) : null}
            {errorMessage ? (
              <p className="error-copy">{errorMessage}</p>
            ) : null}

            <button
              className="button-primary mt-2"
              type="submit"
              disabled={isSubmitting || Boolean(successMessage)}
            >
              {isSubmitting ? 'Resetting password…' : 'Reset password'}
            </button>
          </form>
        )}

        <p className="mt-8 text-sm text-muted">
          Back to{' '}
          <Link
            to="/auth/sign-in"
            className="text-primary underline-offset-4 hover:underline"
          >
            sign in
          </Link>
        </p>
      </section>
    </main>
  )
}