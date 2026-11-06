import { createFileRoute } from '@tanstack/react-router'
import { verifyRequestOrigin } from '@netlify/identity'
import { db } from '../../../db/index.js'
import { topups } from '../../../db/schema.js'
import { requireUser } from '../../server/auth'
import { imageKeyFor, topupProofs } from '../../server/files'

const MIN_TOPUP = 20000
const MAX_TOPUP = 2000000

function json(body: unknown, status = 200) {
  return Response.json(body, { status })
}

export const Route = createFileRoute('/api/topups')({
  server: {
    handlers: {
      // Creates a pending top-up request with a payment proof image.
      POST: async ({ request }) => {
        try {
          verifyRequestOrigin(request)
        } catch {
          return Response.json({ error: 'Origen no permitido.' }, { status: 403 })
        }
        let session
        try {
          session = await requireUser()
        } catch {
          return json({ error: 'Debes iniciar sesión para recargar saldo.' }, 401)
        }
        const form = await request.formData().catch(() => null)
        const amount = Number(form?.get('amount'))
        const proof = form?.get('proof')
        if (!Number.isInteger(amount) || amount < MIN_TOPUP || amount > MAX_TOPUP) {
          return json({ error: 'El monto debe estar entre $20.000 y $2.000.000 COP.' }, 400)
        }
        if (!(proof instanceof File) || proof.size === 0) {
          return json({ error: 'Debes subir el comprobante de pago.' }, 400)
        }
        let key: string
        try {
          key = imageKeyFor(proof, session.profile.id)
        } catch (error) {
          return json({ error: (error as Error).message }, 400)
        }
        await topupProofs().set(key, await proof.arrayBuffer())
        const [topup] = await db
          .insert(topups)
          .values({ userId: session.profile.id, amount, proofKey: key })
          .returning({ id: topups.id })
        return json({ id: topup.id }, 201)
      },
    },
  },
})
