import { createFileRoute } from '@tanstack/react-router'
import { verifyRequestOrigin } from '@netlify/identity'
import { requireAdmin } from '../../server/auth'
import { imageKeyFor, productImages } from '../../server/files'

// Admin-only upload of a product image. Returns the storage key.
export const Route = createFileRoute('/api/product-images')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          verifyRequestOrigin(request)
        } catch {
          return Response.json({ error: 'Origen no permitido.' }, { status: 403 })
        }
        try {
          await requireAdmin()
        } catch {
          return Response.json({ error: 'No tienes permisos de administrador.' }, { status: 403 })
        }
        const form = await request.formData().catch(() => null)
        const file = form?.get('image')
        if (!(file instanceof File) || file.size === 0) return Response.json({ error: 'Selecciona una imagen.' }, { status: 400 })
        try {
          const key = imageKeyFor(file, 'product')
          await productImages().set(key, await file.arrayBuffer())
          return Response.json({ key, url: `/api/images/${key}` }, { status: 201 })
        } catch (error) {
          return Response.json({ error: (error as Error).message }, { status: 400 })
        }
      },
    },
  },
})
