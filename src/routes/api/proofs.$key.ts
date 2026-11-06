import { createFileRoute } from '@tanstack/react-router'
import { requireAdmin } from '../../server/auth'
import { serveBlob, topupProofs } from '../../server/files'

// Payment proofs are private: only admins can view them.
export const Route = createFileRoute('/api/proofs/$key')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        try {
          await requireAdmin()
        } catch {
          return new Response('Forbidden', { status: 403 })
        }
        const response = await serveBlob(topupProofs(), params.key, 'private, max-age=300')
        // ?descargar=1 downloads the file instead of showing it.
        if (response.ok && new URL(request.url).searchParams.has('descargar')) {
          response.headers.set('Content-Disposition', `attachment; filename="comprobante-${params.key}"`)
        }
        return response
      },
    },
  },
})
