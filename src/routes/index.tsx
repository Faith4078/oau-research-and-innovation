import { Link, createFileRoute } from '@tanstack/react-router'

import { getCurrentUser } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/')({
  loader: async () => ({ currentUser: await getCurrentUser() }),
  component: Home,
})

const platformStats = [
  { label: 'Publication workflows', value: 'Core' },
  { label: 'Patent tracking', value: 'Ready' },
  { label: 'IPTTO role support', value: 'Day one' },
]

const focusAreas = [
  'Curated lecturer and contributor profiles',
  'Publication and patent ownership through attribution profiles',
  'Department, faculty, IPTTO, and super-admin role foundations',
  'Audit-ready review events for institutional publishing decisions',
]

function Home() {
  const { currentUser } = Route.useLoaderData()
  const isSignedIn = Boolean(currentUser)

  return (
    <main>
      <section className="page-shell section-padding">
        <nav className="mb-24 flex items-center justify-between gap-6">
          <Link to="/" className="brand-mark" aria-label="OAU Research home">
            OAU R&I
          </Link>
          <div className="flex items-center gap-3">
            {isSignedIn ? (
              <Link to="/app" className="button-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link
                  to="/auth/sign-in"
                  className="button-link hidden sm:inline-flex"
                >
                  Sign in
                </Link>
                <Link to="/auth/sign-up" className="button-primary">
                  Create account
                </Link>
              </>
            )}
          </div>
        </nav>

        <div className="grid gap-12 lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div>
            <span className="chip mb-5">Research visibility platform</span>
            <h1 className="headline-display max-w-4xl">
              A modern institutional home for OAU research outputs and patents.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-muted">
              Manage lecturer profiles, publication records, patent disclosures,
              review actions, and innovation office workflows from one clear,
              role-aware system.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              {isSignedIn ? (
                <Link to="/app" className="button-primary">
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link to="/auth/sign-up" className="button-primary">
                    Start setup
                  </Link>
                  <Link to="/auth/sign-in" className="button-secondary">
                    Sign in to dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="card-panel grid gap-4 p-4">
            <div className="rounded-lg border border-border bg-white p-5">
              <p className="label-sm text-primary">Foundation status</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">
                Built for verified institutional data.
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                Accounts, roles, staff records, public attribution profiles,
                publications, patents, and review events are separated so each
                workflow can mature without blurring ownership.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {platformStats.map((stat) => (
                <div key={stat.label} className="metric-card">
                  <strong>{stat.value}</strong>
                  <span>{stat.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface">
        <div className="page-shell py-20">
          <div className="grid gap-8 lg:grid-cols-[0.85fr_1fr] lg:items-start">
            <div>
              <span className="chip">Implementation priorities</span>
              <h2 className="headline-lg mt-5">
                Structured for research operations.
              </h2>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {focusAreas.map((area) => (
                <article key={area} className="card-panel min-h-32">
                  <p className="text-base font-medium leading-7">{area}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
