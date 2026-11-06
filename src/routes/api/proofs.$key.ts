import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '../../server/auth'
import { serveBlob, topupProofs } from '../../server/files'

// Payment proofs are private: only admins can view them.
export const Route = createFileRoute('/api/proofs/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          await requireAdmin()
        } catch {
          return new Response('Forbidden', { status: 403 })
        }
        return serveBlob(topupProofs(), params.key, 'private, max-age=300')
      },
    },
  },
})
