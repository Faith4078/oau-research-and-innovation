import {
  Link,
  createFileRoute,
  redirect,
  useNavigate,
  useRouter,
} from '@tanstack/react-router'
import { useState } from 'react'

import type { FormEvent } from 'react'

import {
  FormStatus,
  WorkspacePageHeader,
  formString,
} from '#/components/workspace-shell.tsx'
import {
  getPublicationDetail,
  updatePublication,
} from '#/lib/workspace-functions.ts'

export const Route = createFileRoute('/app/publications/$publicationId/edit')({
  loader: async ({ params }) => {
    try {
      return {
        publication: await getPublicationDetail({
          data: { publicationId: params.publicationId },
        }),
      }
    } catch (error) {
      if (error instanceof Error && error.message === 'Publication not found') {
        throw redirect({ to: '/app/publications' })
      }

      throw error
    }
  },
  component: EditPublicationPage,
})

const publicationTypeOptions = [
  ['journal_article', 'Journal article'],
  ['conference_paper', 'Conference paper'],
  ['book_chapter', 'Book chapter'],
  ['book', 'Book'],
  ['dataset', 'Dataset'],
  ['technical_report', 'Technical report'],
  ['thesis', 'Thesis'],
  ['other', 'Other'],
] as const

function EditPublicationPage() {
  const { publication } = Route.useLoaderData()
  const navigate = useNavigate()
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    const formData = new FormData(event.currentTarget)

    try {
      await updatePublication({
        data: {
          publicationId: publication.id,
          title: formString(formData, 'title'),
          abstract: formString(formData, 'abstract'),
          summary: formString(formData, 'summary'),
          publicationType: formString(formData, 'publicationType') as
            | 'journal_article'
            | 'conference_paper'
            | 'book_chapter'
            | 'book'
            | 'dataset'
            | 'technical_report'
            | 'thesis'
            | 'other',
          researchCategory: formString(formData, 'researchCategory'),
          keywords: formString(formData, 'keywords'),
          publicationYear: formString(formData, 'publicationYear'),
          venueName: formString(formData, 'venueName'),
          doi: formString(formData, 'doi'),
          sourceUrl: formString(formData, 'sourceUrl'),
          documentUrl: formString(formData, 'documentUrl'),
          fundingInformation: formString(formData, 'fundingInformation'),
          collaborationDetails: formString(formData, 'collaborationDetails'),
        },
      })
      await router.invalidate()
      await navigate({
        to: '/app/publications/$publicationId',
        params: { publicationId: publication.id },
      })
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to update publication',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <WorkspacePageHeader
        eyebrow="Edit publication"
        title={publication.title}
        description="Update the publication record attached to your account."
      />

      <section className="mt-8 max-w-4xl card-panel bg-white! p-6!">
        <FormStatus successMessage={null} errorMessage={errorMessage} />

        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="field-label" htmlFor="title">
            Publication title
          </label>
          <input
            className="input-field"
            id="title"
            name="title"
            defaultValue={publication.title}
            required
          />

          <label className="field-label" htmlFor="publicationType">
            Publication type
          </label>
          <select
            className="input-field"
            id="publicationType"
            name="publicationType"
            defaultValue={publication.publicationType}
          >
            {publicationTypeOptions.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <div className="grid gap-4 md:grid-cols-2">
            <input
              className="input-field"
              name="venueName"
              defaultValue={publication.venueName ?? ''}
              placeholder="Venue or journal"
            />
            <input
              className="input-field"
              name="publicationYear"
              defaultValue={publication.publicationYear ?? ''}
              placeholder="Publication year"
              inputMode="numeric"
            />
            <input
              className="input-field"
              name="doi"
              defaultValue={publication.doi ?? ''}
              placeholder="DOI"
            />
            <input
              className="input-field"
              name="sourceUrl"
              defaultValue={publication.sourceUrl ?? ''}
              placeholder="Source URL"
            />
            <input
              className="input-field"
              name="documentUrl"
              defaultValue={publication.documentUrl ?? ''}
              placeholder="Document URL"
            />
            <input
              className="input-field"
              name="researchCategory"
              defaultValue={publication.researchCategory ?? ''}
              placeholder="Research category"
            />
          </div>

          <textarea
            className="textarea-field"
            name="keywords"
            defaultValue={publication.keywords?.join(', ') ?? ''}
            placeholder="Keywords, separated by commas"
          />
          <textarea
            className="textarea-field"
            name="abstract"
            defaultValue={publication.abstract ?? ''}
            placeholder="Abstract"
          />
          <textarea
            className="textarea-field"
            name="summary"
            defaultValue={publication.summary ?? ''}
            placeholder="Short public summary"
          />
          <textarea
            className="textarea-field"
            name="fundingInformation"
            defaultValue={publication.fundingInformation ?? ''}
            placeholder="Funding information"
          />
          <textarea
            className="textarea-field"
            name="collaborationDetails"
            defaultValue={publication.collaborationDetails ?? ''}
            placeholder="Collaboration details"
          />

          <div className="mt-2 flex flex-wrap gap-3">
            <button className="button-primary" type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving…' : 'Save publication'}
            </button>
            <Link
              to="/app/publications/$publicationId"
              params={{ publicationId: publication.id }}
              className="button-secondary"
            >
              Cancel
            </Link>
          </div>
        </form>
      </section>
    </>
  )
}