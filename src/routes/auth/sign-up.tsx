import { useState } from 'react'
import { Link, createFileRoute, useNavigate } from '@tanstack/react-router'

import type { FormEvent } from 'react'

import { signUp } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/auth/sign-up')({ component: SignUp })

function SignUp() {
  const navigate = useNavigate()
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setErrorMessage(null)
    setIsSubmitting(true)

    const formData = new FormData(event.currentTarget)

    try {
      await signUp({
        data: {
          email: String(formData.get('email') ?? ''),
          password: String(formData.get('password') ?? ''),
          universityEmail: String(formData.get('universityEmail') ?? ''),
          staffIdentifier: String(formData.get('staffIdentifier') ?? ''),
        },
      })
      await navigate({ to: '/app' })
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to create account right now',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card auth-card-wide">
        <Link to="/" className="brand-mark mb-10 inline-flex">
          OAU R&I
        </Link>
        <span className="chip">Account foundation</span>
        <h1 className="headline-lg mt-5">Create an account.</h1>

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
            autoComplete="new-password"
            minLength={8}
            required
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <label className="field-label" htmlFor="universityEmail">
                University email
              </label>
              <input
                className="input-field"
                id="universityEmail"
                name="universityEmail"
                type="email"
                autoComplete="email"
                placeholder="Optional for now"
              />
            </div>
            <div className="grid gap-2">
              <label className="field-label" htmlFor="staffIdentifier">
                Staff ID
              </label>
              <input
                className="input-field"
                id="staffIdentifier"
                name="staffIdentifier"
                type="text"
                placeholder="Optional for now"
              />
            </div>
          </div>

          {errorMessage ? <p className="error-copy">{errorMessage}</p> : null}

          <button
            className="button-primary mt-2"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="mt-8 text-sm text-muted">
          Already have an account?{' '}
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
