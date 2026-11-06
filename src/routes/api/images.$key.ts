import { createFileRoute } from '@tanstack/react-router'
import { productImages, serveBlob } from '../../server/files'

// Public product images. Keys are unique per upload, so they can be cached long-term.
export const Route = createFileRoute('/api/images/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => serveBlob(productImages(), params.key, 'public, max-age=31536000, immutable'),
    },
  },
})
