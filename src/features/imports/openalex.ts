export type OpenAlexAuthorCandidate = {
  id: string
  displayName: string
  orcid: string | null
  worksCount: number
  institution: string | null
  topics: string[]
  sampleWorks: string[]
}

export type NormalizedImportedWork = {
  externalWorkId: string
  title: string
  normalizedTitle: string
  authors: Array<{ name: string; id?: string }>
  abstract: string | null
  venueName: string | null
  publicationYear: number | null
  publicationType: 'journal_article' | 'conference_paper' | 'book_chapter' | 'book' | 'dataset' | 'technical_report' | 'thesis' | 'other'
  doi: string | null
  normalizedDoi: string | null
  sourceUrl: string | null
  citationCount: number | null
  qualityFlags: string[]
  rawPayload: unknown
}

const OPENALEX_API_URL = 'https://api.openalex.org'

function requestUrl(path: string, params: Record<string, string>) {
  const url = new URL(path, OPENALEX_API_URL)
  const apiKey = process.env.OPENALEX_API_KEY?.trim()
  const email = process.env.OPENALEX_CONTACT_EMAIL?.trim()

  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value))
  if (apiKey) url.searchParams.set('api_key', apiKey)
  if (email) url.searchParams.set('mailto', email)
  return url
}

async function openAlexFetch<T>(url: URL): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: 'application/json', 'User-Agent': 'OAU-Research-Repository/1.0' },
    signal: AbortSignal.timeout(20_000),
  })

  if (!response.ok) {
    throw new Error(`OpenAlex request failed (${response.status})`)
  }

  return response.json() as Promise<T>
}

export async function searchOpenAlexAuthors(input: {
  name: string
  institution?: string
}): Promise<OpenAlexAuthorCandidate[]> {
  const response = await openAlexFetch<{
    results: Array<Record<string, any>>
  }>(requestUrl('/authors', { search: input.name, 'per-page': '10' }))

  const candidates = await Promise.all(
    response.results.slice(0, 8).map(async (author) => {
      let sampleWorks: string[] = []
      try {
        const works = await openAlexFetch<{ results: Array<{ title?: string }> }>(
          requestUrl('/works', {
            filter: `authorships.author.id:${shortOpenAlexId(author.id)}`,
            sort: 'publication_date:desc',
            'per-page': '3',
            select: 'title',
          }),
        )
        sampleWorks = works.results.map((work) => work.title).filter(Boolean) as string[]
      } catch {
        // Sample titles improve confirmation but are not required for a result.
      }

      return {
        id: shortOpenAlexId(author.id),
        displayName: author.display_name ?? 'Unknown author',
        orcid: author.orcid?.replace('https://orcid.org/', '') ?? null,
        worksCount: author.works_count ?? 0,
        institution: author.last_known_institutions?.[0]?.display_name ?? null,
        topics: (author.topics ?? []).slice(0, 3).map((topic: any) => topic.display_name).filter(Boolean),
        sampleWorks,
      }
    }),
  )

  const affiliation = input.institution?.toLocaleLowerCase()
  return candidates.sort((a, b) => {
    const aMatch = affiliation && a.institution?.toLocaleLowerCase().includes(affiliation) ? 1 : 0
    const bMatch = affiliation && b.institution?.toLocaleLowerCase().includes(affiliation) ? 1 : 0
    return bMatch - aMatch || b.worksCount - a.worksCount
  })
}

export async function fetchOpenAlexWorksPage(authorId: string, cursor = '*') {
  const response = await openAlexFetch<{
    meta: { count: number; next_cursor: string | null }
    results: Array<Record<string, any>>
  }>(requestUrl('/works', {
    filter: `authorships.author.id:${shortOpenAlexId(authorId)}`,
    cursor,
    'per-page': '100',
  }))

  return {
    expectedCount: response.meta.count,
    nextCursor: response.meta.next_cursor,
    works: response.results.map(normalizeOpenAlexWork),
  }
}

export function normalizeDoi(value: string | null | undefined) {
  if (!value) return null
  const normalized = value.trim().toLocaleLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, '').replace(/^doi:\s*/, '')
  return normalized.startsWith('10.') ? normalized : null
}

export function normalizeTitle(value: string) {
  return value.normalize('NFKD').toLocaleLowerCase().replace(/[\p{P}\p{S}]+/gu, ' ').replace(/\s+/g, ' ').trim()
}

function normalizeOpenAlexWork(work: Record<string, any>): NormalizedImportedWork {
  const title = String(work.title ?? work.display_name ?? 'Untitled work').trim()
  const normalizedDoi = normalizeDoi(work.doi)
  const year = Number.isInteger(work.publication_year) ? work.publication_year : null
  const qualityFlags: string[] = []
  if (!normalizedDoi) qualityFlags.push('missing_doi')
  if (!year) qualityFlags.push('missing_year')

  return {
    externalWorkId: shortOpenAlexId(work.id),
    title,
    normalizedTitle: normalizeTitle(title),
    authors: (work.authorships ?? []).map((authorship: any) => ({
      name: authorship.author?.display_name ?? 'Unknown author',
      id: authorship.author?.id ? shortOpenAlexId(authorship.author.id) : undefined,
    })),
    abstract: reconstructAbstract(work.abstract_inverted_index),
    venueName: work.primary_location?.source?.display_name ?? null,
    publicationYear: year,
    publicationType: mapOpenAlexType(work.type),
    doi: normalizedDoi ? `https://doi.org/${normalizedDoi}` : null,
    normalizedDoi,
    sourceUrl: work.primary_location?.landing_page_url ?? work.id ?? null,
    citationCount: Number.isInteger(work.cited_by_count) ? work.cited_by_count : null,
    qualityFlags,
    rawPayload: work,
  }
}

function reconstructAbstract(index: Record<string, number[]> | null | undefined) {
  if (!index) return null
  const words: Array<[number, string]> = []
  for (const [word, positions] of Object.entries(index)) {
    for (const position of positions) words.push([position, word])
  }
  return words.sort((a, b) => a[0] - b[0]).map((entry) => entry[1]).join(' ') || null
}

function mapOpenAlexType(type: string | undefined): NormalizedImportedWork['publicationType'] {
  const mapping: Record<string, NormalizedImportedWork['publicationType']> = {
    article: 'journal_article',
    'review-article': 'journal_article',
    proceedings: 'conference_paper',
    'book-chapter': 'book_chapter',
    book: 'book',
    dataset: 'dataset',
    report: 'technical_report',
    dissertation: 'thesis',
  }
  return mapping[type ?? ''] ?? 'other'
}

function shortOpenAlexId(value: string) {
  return value.replace(/^https?:\/\/openalex\.org\//, '')
}
