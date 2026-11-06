import { createFileRoute } from '@tanstack/react-router'
import { verifyRequestOrigin } from '@netlify/identity'
import { and, eq, inArray, or } from 'drizzle-orm'
import { db } from '../../../db/index.js'
import { topups } from '../../../db/schema.js'
import { requireActiveUser } from '../../server/auth'
import { imageKeyFor, topupProofs } from '../../server/files'

import { loadSite } from '../../server/site'
import { notifyAdmin } from '../../server/notify'

const formatPrice = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n)

const DUPLICATE_MESSAGE = 'Este comprobante o número de referencia ya fue enviado antes. Si crees que es un error, escríbenos por WhatsApp.'

/** Uppercase, letters and digits only. Returns null when it is not a usable reference. */
function normalizeReference(value: unknown) {
  const ref = String(value ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '')
  return ref.length >= 4 && ref.length <= 40 ? ref : null
}

async function findActiveDuplicate(proofHash: string, reference: string) {
  const [row] = await db
    .select({ id: topups.id })
    .from(topups)
    .where(and(inArray(topups.status, ['pending', 'approved']), or(eq(topups.proofHash, proofHash), eq(topups.reference, reference))))
    .limit(1)
  return row ?? null
}

function isUniqueViolation(error: unknown) {
  let current = error as { code?: string; cause?: unknown } | undefined
  for (let i = 0; i < 4 && current; i++) {
    if (current.code === '23505') return true
    current = current.cause as typeof current
  }
  return false
}

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
          session = await requireActiveUser()
        } catch (error) {
          const message = (error as Error).message
          return json({ error: message.includes('suspendida') ? message : 'Debes iniciar sesión para recargar saldo.' }, message.includes('suspendida') ? 403 : 401)
        }
        const form = await request.formData().catch(() => null)
        const amount = Number(form?.get('amount'))
        const proof = form?.get('proof')
        const { payments } = await loadSite()
        if (!Number.isInteger(amount) || amount < payments.minTopup || amount > payments.maxTopup) {
          return json({ error: `El monto debe estar entre ${formatPrice(payments.minTopup)} y ${formatPrice(payments.maxTopup)}.` }, 400)
        }
        if (!(proof instanceof File) || proof.size === 0) {
          return json({ error: 'Debes subir el comprobante de pago.' }, 400)
        }
        const reference = normalizeReference(form?.get('reference'))
        if (!reference) {
          return json({ error: 'Escribe el número de referencia o de transacción que aparece en tu comprobante (4 a 40 letras o números).' }, 400)
        }
        let key: string
        try {
          key = imageKeyFor(proof, session.profile.id)
        } catch (error) {
          return json({ error: (error as Error).message }, 400)
        }
        const bytes = await proof.arrayBuffer()
        const proofHash = Buffer.from(await crypto.subtle.digest('SHA-256', bytes)).toString('hex')

        // Duplicate protection: the same image or reference cannot be pending or approved twice.
        const duplicate = await findActiveDuplicate(proofHash, reference)
        if (duplicate) {
          await notifyAdmin('seguridad', 'Comprobante duplicado bloqueado', `${session.profile.email} intentó enviar de nuevo un comprobante ya usado (recarga #${duplicate.id}, ref. ${reference}).`, 'recargas')
          return json({ error: DUPLICATE_MESSAGE }, 409)
        }

        await topupProofs().set(key, bytes)
        try {
          const [topup] = await db
            .insert(topups)
            .values({ userId: session.profile.id, amount, proofKey: key, proofHash, reference })
            .returning({ id: topups.id })
          await notifyAdmin('recarga', `Nuevo comprobante por ${formatPrice(amount)}`, `${session.profile.email} envió la recarga #${topup.id} (ref. ${reference}). Está pendiente de revisión.`, 'recargas')
          return json({ id: topup.id }, 201)
        } catch (error) {
          await topupProofs().delete(key).catch(() => {})
          // Unique index violation: another request with the same proof won the race.
          if (isUniqueViolation(error)) return json({ error: DUPLICATE_MESSAGE }, 409)
          throw error
        }
      },
    },
  },
})
