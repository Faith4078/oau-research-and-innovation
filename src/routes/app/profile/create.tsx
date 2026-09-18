import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/app/profile/create')({
  validateSearch: (search: Record<string, unknown>) => ({
    reason: search.reason === 'missing-profile' ? 'missing-profile' : undefined,
  }),
  loader: () => {
    throw redirect({
      to: '/app/profile/edit',
      search: { reason: undefined },
    })
  },
})
