import { Link, createFileRoute } from '@tanstack/react-router'

import {
  WorkspacePageHeader,
  useWorkspace,
} from '#/components/workspace-shell.tsx'

type Profile = ReturnType<typeof useWorkspace>['myProfiles'][number]

export const Route = createFileRoute('/app/profile/')({
  component: ProfilePage,
})

function ProfilePage() {
  const workspace = useWorkspace()
  const profile = workspace.myProfiles.at(0)
  const isAuthor = workspace.currentUser.isAuthor

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Attribution profile"
        title="Your profile"
        description="View the profile used to attribute your publications and patents."
      />

      {profile ? (
        <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <ProfileDetails profile={profile} />
            <Link
              to="/app/profile/edit"
              search={{ reason: undefined }}
              className="button-primary"
            >
              Edit profile
            </Link>
          </div>
        </section>
      ) : isAuthor ? (
        <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
          <span className="chip">Profile required</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            Create your attribution profile
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            Publications and patents are attributed to profiles. Create one
            before adding research records.
          </p>
          <Link
            to="/app/profile/edit"
            search={{ reason: 'missing-profile' }}
            className="button-primary mt-6"
          >
            Create profile
          </Link>
        </section>
      ) : (
        <section className="mt-8 max-w-3xl card-panel bg-white! p-6!">
          <span className="chip">Authorship off</span>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight">
            No author profile required
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            This account is marked as not an author, so publication and patent
            attribution prompts are hidden.
          </p>
          <Link to="/app/settings" className="button-secondary mt-6">
            Update settings
          </Link>
        </section>
      )}
    </>
  )
}

function ProfileDetails({ profile }: { profile: Profile }) {
  return (
    <div className="min-w-0 flex-1">
      <h2 className="text-2xl font-semibold tracking-tight">
        {profile.displayName}
      </h2>
      <div className="mt-4 grid gap-3 text-sm text-muted sm:grid-cols-2">
        <ProfileField label="Public email" value={profile.primaryEmail} />
        <ProfileField label="Affiliation" value={profile.affiliation} />
        <ProfileField label="Profile type" value={profile.profileType} />
        <ProfileField
          label="Authorship"
          value={profile.isAuthor ? 'Author' : 'Not an author'}
        />
      </div>

      {profile.researchInterests.length > 0 ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {profile.researchInterests.map((interest) => (
            <span key={interest} className="chip">
              {interest}
            </span>
          ))}
        </div>
      ) : null}

      {profile.bio ? (
        <p className="mt-5 max-w-3xl text-sm leading-6 text-muted">
          {profile.bio}
        </p>
      ) : null}
    </div>
  )
}

function ProfileField({
  label,
  value,
}: {
  label: string
  value: string | null
}) {
  return (
    <div className="rounded-sm border border-border bg-surface p-3">
      <p className="label-sm text-muted">{label}</p>
      <p className="mt-1 font-medium text-foreground">{value || 'Not set'}</p>
    </div>
  )
}
