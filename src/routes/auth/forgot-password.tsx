import { useState } from 'react'
import { Link, createFileRoute } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { requestPasswordReset } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/auth/forgot-password')({
  component: ForgotPassword,
})

function ForgotPassword() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [resetPath, setResetPath] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setSuccessMessage(null)
    setResetPath(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      const result = await requestPasswordReset({
        data: { email: String(formData.get('email') ?? '') },
      })

      setSuccessMessage(
        'If an active account exists for that email, a reset link has been created.',
      )
      setResetPath(result.resetPath)
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to request a reset link right now',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetUrl = resetPath
    ? typeof window === 'undefined'
      ? resetPath
      : new URL(resetPath, window.location.origin).toString()
    : null

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link to="/" className="brand-mark mb-10 inline-flex">
          OAU R&I
        </Link>
        <span className="chip">Password reset</span>
        <h1 className="headline-lg mt-5">Reset your password.</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Enter your account email to generate a one-time reset link. Links
          expire after 30 minutes.
        </p>

        <form className="mt-8 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="email">
            Email address
          </label>
          <input
            className="input-field"
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
          />

          {successMessage ? (
            <p className="success-copy">{successMessage}</p>
          ) : null}
          {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

          {resetUrl ? (
            <div className="rounded-md border border-border bg-surface p-4 text-sm">
              <p className="font-medium text-foreground">Reset link</p>
              <p className="mt-2 break-all text-muted">{resetUrl}</p>
              <a className="button-secondary mt-4" href={resetPath}>
                Continue to reset password
              </a>
            </div>
          ) : null}

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating link…' : 'Create reset link'}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          Remember your password?{' '}
          <Link
            to="/auth/sign-in"
            className="text-primary underline-offset-4 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </section>
    </main>
  )
}