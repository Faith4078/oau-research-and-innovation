import { Link, createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import { ArrowRight, BookOpen, Menu, ShieldCheck, Users, X } from 'lucide-react'

import { getCurrentUser } from '#/lib/auth-functions.ts'
import {
  getPublicDiscovery,
  getPublicPatents,
  getPublicPublications,
} from '#/lib/public-functions.ts'

export const Route = createFileRoute('/')({
  loader: async () => {
    const [currentUser, discovery, publicationStats, patentStats] =
      await Promise.all([
        getCurrentUser(),
        getPublicDiscovery({ data: { query: undefined } }),
        getPublicPublications({ data: { query: undefined, pageSize: 3 } }),
        getPublicPatents({ data: { query: undefined, pageSize: 3 } }),
      ])

    return {
      currentUser,
      discovery,
      stats: {
        publications: publicationStats.pagination.total,
        patents: patentStats.pagination.total,
      },
    }
  },
  component: Home,
})

type PublicDiscovery = Awaited<ReturnType<typeof getPublicDiscovery>>
type PublicPublication = PublicDiscovery['publications'][number]
type PublicPatent = PublicDiscovery['patents'][number]

function Home() {
  const { currentUser, discovery, stats } = Route.useLoaderData()
  const isSignedIn = Boolean(currentUser)

  return (
    <main>
      <SiteHeader isSignedIn={isSignedIn} />
      <HeroSection stats={stats} />
      <FeatureHighlights />
      <InnovationBanner />
      <DiscoveryShowcase discovery={discovery} />
      {isSignedIn ? null : <CallToAction />}
    </main>
  )
}

function SiteHeader({ isSignedIn }: { isSignedIn: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-background/95 backdrop-blur">
      <nav className="page-shell flex h-20 items-center justify-between gap-4 md:grid md:grid-cols-[1fr_auto_1fr]">
        <Link
          to="/"
          className="brand-mark md:justify-self-start"
          aria-label="OAU Research and Innovation home"
        >
          OAU R&I
        </Link>

        <div className="hidden items-center gap-8 md:flex md:justify-self-center">
          <Link
            to="/publications"
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            Research
          </Link>
          <Link
            to="/patents"
            className="text-sm font-medium text-foreground hover:text-primary"
          >
            Patents
          </Link>
        </div>

        <div className="hidden items-center gap-3 md:flex md:justify-self-end">
          {isSignedIn ? (
            <Link to="/app" className="button-primary">
              Go to dashboard
            </Link>
          ) : (
            <>
              <Link to="/auth/sign-in" className="button-link">
                Sign in
              </Link>
              <Link to="/auth/sign-up" className="button-primary">
                Sign up
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-sm border border-border md:hidden"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={isMenuOpen}
        >
          {isMenuOpen ? (
            <X className="h-5 w-5" />
          ) : (
            <Menu className="h-5 w-5" />
          )}
        </button>
      </nav>

      {isMenuOpen ? (
        <div className="border-t border-border md:hidden">
          <div className="page-shell flex flex-col gap-1 py-4">
            <Link
              to="/publications"
              className="rounded-sm px-3 py-3 text-sm font-medium hover:bg-surface"
              onClick={() => setIsMenuOpen(false)}
            >
              Research
            </Link>
            <Link
              to="/patents"
              className="rounded-sm px-3 py-3 text-sm font-medium hover:bg-surface"
              onClick={() => setIsMenuOpen(false)}
            >
              Patents
            </Link>
            <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
              {isSignedIn ? (
                <Link
                  to="/app"
                  className="button-primary justify-center"
                  onClick={() => setIsMenuOpen(false)}
                >
                  Go to dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/auth/sign-in"
                    className="button-secondary justify-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign in
                  </Link>
                  <Link
                    to="/auth/sign-up"
                    className="button-primary justify-center"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  )
}

function HeroSection({
  stats,
}: {
  stats: { publications: number; patents: number }
}) {
  return (
    <section className="page-shell section-padding">
      <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
        <div>
          <span className="chip mb-5">Obafemi Awolowo University</span>
          <h1 className="headline-display max-w-xl">
            Where OAU research becomes public knowledge.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-muted">
            A single home for the university&apos;s published research, patents,
            and innovators — built so discoveries reach the people who can build
            on them.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/publications" className="button-primary">
              Browse research
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
            <Link to="/patents" className="button-secondary">
              Browse patents
            </Link>
          </div>

          <dl className="mt-12 grid max-w-md grid-cols-2 gap-6">
            <div>
              <dt className="sr-only">Published research outputs</dt>
              <dd className="text-3xl font-bold tracking-tight">
                {stats.publications}
              </dd>
              <p className="mt-1 text-sm text-muted">
                Published research outputs
              </p>
            </div>
            <div>
              <dt className="sr-only">Registered patents</dt>
              <dd className="text-3xl font-bold tracking-tight">
                {stats.patents}
              </dd>
              <p className="mt-1 text-sm text-muted">Registered patents</p>
            </div>
          </dl>
        </div>

        <div className="relative">
          <img
            src="/images/landing/hero-research.jpg"
            alt="Researchers at Obafemi Awolowo University collaborating in a laboratory"
            className="aspect-[4/5] w-full rounded-lg object-cover shadow-[0_30px_80px_rgba(8,8,8,0.16)] sm:aspect-square lg:aspect-[4/5]"
          />
          <div className="absolute right-4 bottom-4 w-28 overflow-hidden rounded-md border-4 border-background shadow-[0_18px_60px_rgba(8,8,8,0.18)] sm:w-36">
            <img
              src="/images/landing/research-lab.jpg"
              alt="A researcher working in an OAU laboratory"
              className="aspect-square w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

const FEATURES = [
  {
    icon: BookOpen,
    title: 'Publish your research',
    description:
      'Share journal articles, conference papers, theses, and datasets with a citation-ready public record.',
  },
  {
    icon: ShieldCheck,
    title: 'Protect your innovations',
    description:
      'Track patents and invention disclosures from filing through commercialization, all in one place.',
  },
  {
    icon: Users,
    title: 'Connect with researchers',
    description:
      'Discover authors by department, research interest, and affiliation across the university.',
  },
] as const

function FeatureHighlights() {
  return (
    <section className="border-t border-border bg-surface">
      <div className="page-shell py-20">
        <div className="max-w-2xl">
          <span className="chip">Built for OAU</span>
          <h2 className="headline-lg mt-5">
            Everything your research output needs to be found.
          </h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description }) => (
            <div key={title} className="card-panel bg-white! p-6!">
              <div className="chip h-11 w-11 items-center justify-center rounded-md! p-0!">
                <Icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold tracking-tight">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function InnovationBanner() {
  return (
    <section className="page-shell py-16">
      <div className="relative overflow-hidden rounded-lg">
        <img
          src="/images/landing/innovation-collab.jpg"
          alt="OAU researchers and industry partners collaborating on an innovation project"
          className="h-[320px] w-full object-cover sm:h-[380px]"
        />
        <div className="absolute inset-0 bg-linear-to-t from-secondary/85 via-secondary/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10">
          <span className="chip bg-white/90!">From lab to industry</span>
          <h2 className="headline-lg mt-4 max-w-xl text-background">
            Turning university research into real-world innovation.
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-6 text-background/80 sm:text-base">
            OAU&apos;s Intellectual Property and Technology Transfer Office
            helps researchers move ideas from the lab to patents, licensing, and
            industry partnerships.
          </p>
        </div>
      </div>
    </section>
  )
}

function CallToAction() {
  return (
    <section className="border-t border-border bg-secondary">
      <div className="page-shell flex flex-col items-start gap-6 py-20 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-xl">
          <h2 className="headline-lg text-background">
            Ready to add your work to the record?
          </h2>
          <p className="mt-4 text-base leading-7 text-background/70">
            Create a free account to publish your research, register your
            patents, and build a public profile for your work at OAU.
          </p>
        </div>
        <Link to="/auth/sign-up" className="button-primary shrink-0">
          Create your account
        </Link>
      </div>
    </section>
  )
}

function DiscoveryShowcase({ discovery }: { discovery: PublicDiscovery }) {
  return (
    <section className="page-shell section-padding">
      <div>
        <span className="chip">Public records</span>
        <h2 className="headline-lg mt-5">Recently published</h2>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <DiscoverySection
          title="Publications"
          browseTo="/publications"
          browseLabel="View all publications"
        >
          {discovery.publications.length > 0 ? (
            discovery.publications.map((publication) => (
              <PublicationPreview
                key={publication.id}
                publication={publication}
              />
            ))
          ) : (
            <EmptyDiscovery label="No published publications yet." />
          )}
        </DiscoverySection>

        <DiscoverySection
          title="Patents"
          browseTo="/patents"
          browseLabel="View all patents"
        >
          {discovery.patents.length > 0 ? (
            discovery.patents.map((patent) => (
              <PatentPreview key={patent.id} patent={patent} />
            ))
          ) : (
            <EmptyDiscovery label="No published patents yet." />
          )}
        </DiscoverySection>
      </div>
    </section>
  )
}

function DiscoverySection({
  title,
  browseTo,
  browseLabel,
  children,
}: {
  title: string
  browseTo: '/publications' | '/patents'
  browseLabel: string
  children: React.ReactNode
}) {
  return (
    <section className="card-panel bg-white! p-5!">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xl font-semibold tracking-tight">{title}</h3>
        <Link
          to={browseTo}
          className="text-sm font-medium text-primary hover:underline"
        >
          {browseLabel}
        </Link>
      </div>
      <div className="mt-5 grid gap-3">{children}</div>
    </section>
  )
}

function PublicationPreview({
  publication,
}: {
  publication: PublicPublication
}) {
  return (
    <Link
      to="/publications/$publicationId"
      params={{ publicationId: publication.id }}
      className="rounded-md border border-border bg-surface p-4 hover:border-primary/30"
    >
      <h4 className="font-semibold tracking-tight">{publication.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        {publication.owningProfileName ?? 'Unknown author'} ·{' '}
        {publication.publicationYear ?? 'Year not set'}
      </p>
    </Link>
  )
}

function PatentPreview({ patent }: { patent: PublicPatent }) {
  return (
    <Link
      to="/patents/$patentId"
      params={{ patentId: patent.id }}
      className="rounded-md border border-border bg-surface p-4 hover:border-primary/30"
    >
      <h4 className="font-semibold tracking-tight">{patent.title}</h4>
      <p className="mt-2 text-sm leading-6 text-muted">
        {patent.owningProfileName ?? 'Unknown author'} ·{' '}
        {patent.patentNumber ?? patent.patentStatus.replaceAll('_', ' ')}
      </p>
    </Link>
  )
}

function EmptyDiscovery({ label }: { label: string }) {
  return <p className="text-sm leading-6 text-muted">{label}</p>
}
