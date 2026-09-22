import { useEffect, useState } from 'react'
import { createFileRoute, useRouter } from '@tanstack/react-router'

import { FormStatus, WorkspacePageHeader, useWorkspace } from '#/components/workspace-shell.tsx'
import {
  getImportDashboard,
  promoteImportCandidates,
  runOpenAlexImport,
  searchImportAuthors,
  setImportCandidateDecision,
  startOpenAlexImport,
  updateImportCandidate,
} from '#/features/imports/import-functions.ts'
import type { OpenAlexAuthorCandidate } from '#/features/imports/openalex.ts'

export const Route = createFileRoute('/app/imports/')({
  loader: async () => ({ dashboard: null }),
  component: ImportPublicationsPage,
})

function ImportPublicationsPage() {
  const workspace = useWorkspace()
  const router = useRouter()
  const profile = workspace.myProfiles[0] as (typeof workspace.myProfiles)[number] | undefined
  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof getImportDashboard>> | null>(null)
  const [authors, setAuthors] = useState<OpenAlexAuthorCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function loadDashboard() {
    if (!profile) return
    setDashboard(await getImportDashboard({ data: { profileId: profile.id } }))
  }

  useEffect(() => {
    if (profile && !dashboard && !busy) void loadDashboard()
  }, [profile?.id])

  async function handleAuthorSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!profile) return
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(null); setSuccess(null)
    try {
      const results = await searchImportAuthors({ data: {
        profileId: profile.id,
        name: String(form.get('name') ?? ''),
        institution: String(form.get('institution') ?? '') || undefined,
      } })
      setAuthors(results)
      if (results.length === 0) setError('No matching OpenAlex authors were found. Try a fuller name or different affiliation.')
    } catch (caught) { setError(messageOf(caught)) } finally { setBusy(false) }
  }

  async function confirmAndImport(authorId: string) {
    if (!profile) return
    setBusy(true); setError(null); setSuccess(null)
    try {
      const started = await startOpenAlexImport({ data: { profileId: profile.id, externalAuthorId: authorId } })
      setSuccess('Author confirmed. Fetching the complete publication catalogue…')
      await runOpenAlexImport({ data: { jobId: started.jobId } })
      await loadDashboard()
      setAuthors([])
      setSuccess('Import complete. Review the new candidates below.')
    } catch (caught) {
      setError(messageOf(caught))
      await loadDashboard()
    } finally { setBusy(false) }
  }

  async function applyDecision(decision: 'pending' | 'kept' | 'edited' | 'discarded') {
    if (selected.length === 0) return
    setBusy(true); setError(null)
    try {
      await setImportCandidateDecision({ data: { candidateIds: selected, decision } })
      setSelected([])
      await loadDashboard()
    } catch (caught) { setError(messageOf(caught)) } finally { setBusy(false) }
  }

  async function promote() {
    if (!dashboard?.latestJob) return
    setBusy(true); setError(null)
    try {
      const result = await promoteImportCandidates({ data: { jobId: dashboard.latestJob.id } })
      setSuccess(`${result.created} draft${result.created === 1 ? '' : 's'} created${result.linked ? ` · ${result.linked} existing co-authored publication${result.linked === 1 ? '' : 's'} linked` : ''}.`)
      await loadDashboard()
      await router.invalidate()
    } catch (caught) { setError(messageOf(caught)) } finally { setBusy(false) }
  }

  async function saveCandidate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setBusy(true); setError(null)
    try {
      await updateImportCandidate({ data: {
        candidateId: String(form.get('candidateId')),
        title: String(form.get('title')),
        venueName: String(form.get('venueName') ?? '') || undefined,
        publicationYear: form.get('publicationYear') ? Number(form.get('publicationYear')) : null,
        doi: String(form.get('doi') ?? '') || undefined,
        sourceUrl: String(form.get('sourceUrl') ?? ''),
      } })
      setEditingId(null)
      await loadDashboard()
    } catch (caught) { setError(messageOf(caught)) } finally { setBusy(false) }
  }

  const visibleCandidates = (dashboard?.candidates ?? []).filter((candidate) =>
    !query || candidate.title.toLocaleLowerCase().includes(query.toLocaleLowerCase()) || candidate.venueName?.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  const reviewable = visibleCandidates.filter((candidate) => !candidate.matchedPublicationId)
  const keptCount = (dashboard?.candidates ?? []).filter((candidate) => candidate.decision === 'kept' || candidate.decision === 'edited').length

  if (!profile) {
    return <><WorkspacePageHeader eyebrow="Publication import" title="Create your lecturer profile first" description="Publication imports must be linked to a lecturer profile." /></>
  }

  return (
    <>
      <WorkspacePageHeader eyebrow="Publication import" title="Import your publications" description="Find your OpenAlex author record, fetch your catalogue, and choose which works to add. Nothing is made public automatically." />
      <div className="mt-8"><FormStatus successMessage={success} errorMessage={error} /></div>

      <section className="mt-8 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="text-2xl font-semibold">OpenAlex identity</h2><p className="mt-2 text-sm text-muted">Profile: {profile.displayName}</p></div>
          {dashboard?.profile.openalexAuthorId ? <span className="chip">Connected: {dashboard.profile.openalexAuthorId}</span> : null}
        </div>
        <form className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={handleAuthorSearch}>
          <input className="input-field" name="name" defaultValue={profile.displayName} placeholder="Full name" required />
          <input className="input-field" name="institution" defaultValue={profile.affiliation ?? 'Obafemi Awolowo University'} placeholder="Institution" />
          <button className="button-primary" disabled={busy}>{busy ? 'Working…' : 'Find author'}</button>
        </form>
        {authors.length > 0 ? <div className="mt-6 grid gap-3">{authors.map((author) => (
          <article className="rounded-md border border-border p-5" key={author.id}>
            <div className="flex flex-wrap items-start justify-between gap-4"><div><h3 className="font-semibold">{author.displayName}</h3><p className="mt-1 text-sm text-muted">{author.institution ?? 'Institution unavailable'} · {author.worksCount} works</p><p className="mt-2 text-sm">{author.topics.join(' · ')}</p>{author.sampleWorks.length ? <ul className="mt-3 list-disc pl-5 text-sm text-muted">{author.sampleWorks.map((title) => <li key={title}>{title}</li>)}</ul> : null}</div><button className="button-primary" type="button" disabled={busy} onClick={() => void confirmAndImport(author.id)}>This is me</button></div>
          </article>
        ))}</div> : null}
      </section>

      {dashboard?.latestJob ? <section className="mt-8 card-panel bg-white! p-6!">
        <div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-2xl font-semibold">Latest import</h2><p className="mt-2 text-sm text-muted">{dashboard.latestJob.processedCount} processed · {dashboard.latestJob.candidateCount} candidates · {dashboard.latestJob.duplicateCount} duplicates</p></div><span className="chip">{dashboard.latestJob.status}</span></div>
        {dashboard.latestJob.errorMessage ? <p className="error-copy mt-4">{dashboard.latestJob.errorMessage}</p> : null}
      </section> : null}

      {dashboard?.candidates.length ? <section className="mt-8 min-w-0 overflow-hidden card-panel bg-white! p-4! sm:p-6!">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-4"><div className="min-w-0"><h2 className="text-2xl font-semibold">Review import</h2><p className="mt-2 break-words text-sm text-muted">{keptCount} kept · {dashboard.candidates.filter((item) => item.decision === 'discarded').length} discarded · {dashboard.candidates.filter((item) => item.matchedPublicationId).length} already in repository</p></div><button className="button-primary max-w-full" type="button" disabled={busy || keptCount === 0} onClick={() => void promote()}>Create {keptCount} draft{keptCount === 1 ? '' : 's'}</button></div>
        <div className="mt-6 grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(12rem,1fr)_auto_auto_auto_auto]"><input className="input-field min-w-0 w-full sm:col-span-2 lg:col-span-1" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by title or venue" /><button className="button-secondary min-w-0 px-4!" type="button" onClick={() => setSelected(reviewable.map((item) => item.id))}>Select visible</button><button className="button-secondary min-w-0 px-4!" type="button" onClick={() => setSelected([])}>Clear</button><button className="button-primary min-w-0 px-4!" type="button" disabled={!selected.length || busy} onClick={() => void applyDecision('kept')}>Keep selected</button><button className="button-secondary min-w-0 px-4!" type="button" disabled={!selected.length || busy} onClick={() => void applyDecision('discarded')}>Discard selected</button></div>
        <div className="mt-6 grid min-w-0 gap-3">{visibleCandidates.map((candidate) => (
          <article className={`min-w-0 max-w-full overflow-hidden rounded-md border p-4 ${candidate.matchedPublicationId ? 'border-border bg-surface opacity-70' : 'border-border bg-white'}`} key={candidate.id}>
            <div className="flex min-w-0 items-start gap-3"><input className="mt-1 size-4 shrink-0" type="checkbox" disabled={Boolean(candidate.matchedPublicationId)} checked={selected.includes(candidate.id)} onChange={(event) => setSelected((current) => event.target.checked ? [...current, candidate.id] : current.filter((id) => id !== candidate.id))} /><div className="min-w-0 flex-1"><div className="flex min-w-0 flex-wrap items-center gap-2"><h3 className="min-w-0 max-w-full break-words font-semibold [overflow-wrap:anywhere]">{candidate.title}</h3><span className="chip shrink-0">{candidate.matchedPublicationId ? 'existing' : candidate.decision}</span>{candidate.qualityFlags.map((flag) => <span className="chip shrink-0" key={flag}>{flag.replaceAll('_', ' ')}</span>)}</div><p className="mt-2 break-words text-sm text-muted [overflow-wrap:anywhere]">{candidate.publicationYear ?? 'Year unknown'} · {candidate.venueName ?? 'Venue unknown'} · {candidate.citationCount ?? 0} citations</p><p className="mt-2 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-muted">{candidate.authors.map((author) => author.name).join(', ')}</p><div className="mt-2 flex min-w-0 flex-wrap gap-3">{candidate.doi ? <a className="min-w-0 break-all text-sm text-primary" href={candidate.doi.startsWith('http') ? candidate.doi : `https://doi.org/${candidate.doi}`} target="_blank" rel="noreferrer">{candidate.doi}</a> : null}{!candidate.matchedPublicationId ? <button className="shrink-0 text-sm font-medium text-primary" type="button" onClick={() => setEditingId(editingId === candidate.id ? null : candidate.id)}>Edit metadata</button> : null}</div></div></div>
            {editingId === candidate.id ? <form className="mt-4 grid min-w-0 gap-3 overflow-hidden rounded-md bg-surface p-4 md:grid-cols-2" onSubmit={saveCandidate}><input type="hidden" name="candidateId" value={candidate.id} /><label className="grid min-w-0 gap-1 text-sm md:col-span-2">Title<input className="input-field min-w-0 w-full" name="title" defaultValue={candidate.title} required /></label><label className="grid min-w-0 gap-1 text-sm">Venue<input className="input-field min-w-0 w-full" name="venueName" defaultValue={candidate.venueName ?? ''} /></label><label className="grid min-w-0 gap-1 text-sm">Year<input className="input-field min-w-0 w-full" name="publicationYear" type="number" min="1800" max={new Date().getFullYear() + 1} defaultValue={candidate.publicationYear ?? ''} /></label><label className="grid min-w-0 gap-1 text-sm">DOI<input className="input-field min-w-0 w-full" name="doi" defaultValue={candidate.doi ?? ''} /></label><label className="grid min-w-0 gap-1 text-sm">Source URL<input className="input-field min-w-0 w-full" name="sourceUrl" type="url" defaultValue={candidate.sourceUrl ?? ''} /></label><div className="flex min-w-0 flex-wrap gap-3 md:col-span-2"><button className="button-primary max-w-full" disabled={busy}>Save changes</button><button className="button-secondary max-w-full" type="button" onClick={() => setEditingId(null)}>Cancel</button></div></form> : null}
          </article>
        ))}</div>
      </section> : null}
    </>
  )
}

function messageOf(error: unknown) { return error instanceof Error ? error.message : 'Something went wrong' }
