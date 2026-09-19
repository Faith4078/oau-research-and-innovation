import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { signIn } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/auth/sign-in')({ component: SignIn })

function SignIn() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      await signIn({
        data: {
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
        },
      })
      await navigate({ to: '/app' })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to sign in right now',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <Link to="/" className="brand-mark mb-10 inline-flex">
          OAU R&I
        </Link>
        <span className="chip">Secure access</span>
        <h1 className="headline-lg mt-5">Sign in to your dashboard.</h1>
        <p className="mt-4 text-base leading-7 text-muted">
          Access publication, patent, review, and profile management workflows.
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

          <label className="field-label" htmlFor="password">
            Password
          </label>
          <input
            className="input-field"
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
          />

          <Link
            to="/auth/forgot-password"
            className="justify-self-start text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>

          {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          Need an account?{' '}
          <Link
            to="/auth/sign-up"
            className="text-primary underline-offset-4 hover:underline"
          >
            Create one
          </Link>
        </p>
      </section>
    </main>
  )
}
