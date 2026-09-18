import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
} from '@tanstack/react-router'

import { getCurrentUser, signOut } from '#/lib/auth-functions.ts'

export const Route = createFileRoute('/app')({
  loader: async () => {
    const currentUser = await getCurrentUser()

    if (!currentUser) {
      throw redirect({ to: '/auth/sign-in' })
    }

    return { currentUser }
  },
  component: AppDashboard,
})

const workstreams = [
  {
    title: 'Publication records',
    description:
      'Draft, publish, and audit research outputs attributed to profiles.',
  },
  {
    title: 'Patent records',
    description:
      'Track disclosures, filing metadata, grants, and commercialization status.',
  },
  {
    title: 'Profiles and staff',
    description:
      'Separate account access from public attribution and staff identity.',
  },
  {
    title: 'Review events',
    description:
      'Capture decision history for publications and patents from the start.',
  },
]

function AppDashboard() {
  const { currentUser } = Route.useLoaderData()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    await navigate({ to: '/' })
  }

  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-border bg-white">
        <div className="page-shell flex items-center justify-between gap-6 py-5">
          <Link to="/" className="brand-mark">
            OAU R&I
          </Link>
          <button
            className="button-secondary h-11! px-4!"
            type="button"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </header>

      <section className="page-shell py-12">
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <span className="chip">Protected workspace</span>
            <h1 className="headline-lg mt-5">Dashboard foundation</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
              You are signed in as {currentUser.email}. This protected area is
              ready for publication, patent, profile, and role-management
              modules.
            </p>
          </div>

          <aside className="card-panel">
            <p className="label-sm text-muted">Assigned roles</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {currentUser.roles.map((roleRecord) => (
                <span
                  key={`${roleRecord.role}-${roleRecord.facultyId ?? 'global'}-${roleRecord.departmentId ?? 'global'}`}
                  className="chip"
                >
                  {roleRecord.role.replaceAll('_', ' ')}
                </span>
              ))}
            </div>
          </aside>
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {workstreams.map((workstream) => (
            <article key={workstream.title} className="card-panel">
              <h2 className="text-xl font-semibold tracking-tight">
                {workstream.title}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {workstream.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
