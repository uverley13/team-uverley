import { createServerFn } from '@tanstack/react-start'
import { admin, AuthError, getSettings, type User } from '@netlify/identity'

/*
 * Account creation runs on the server through the Identity admin API so new
 * accounts are confirmed immediately. The confirmation emails sent by Identity
 * were not reaching customers, which left them unable to sign in.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeEmail(value: unknown) {
  const email = String(value ?? '').trim().toLowerCase()
  if (!EMAIL_RE.test(email) || email.length > 254) throw new Error('Escribe un correo electrónico válido.')
  return email
}

async function findUserByEmail(email: string): Promise<User | null> {
  const perPage = 100
  for (let page = 1; page <= 50; page++) {
    const users = await admin.listUsers({ page, perPage })
    const match = users.find(user => user.email?.toLowerCase() === email)
    if (match) return match
    if (users.length < perPage) return null
  }
  return null
}

/** Confirms an existing account that is still waiting for its email confirmation. */
async function confirmIfPending(email: string) {
  const user = await findUserByEmail(email)
  if (user && !user.confirmedAt) {
    await admin.updateUser(user.id, { confirm: true })
    return true
  }
  return false
}

export const registerAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; password: string; name: string }) => {
    const email = normalizeEmail(data?.email)
    const password = String(data?.password ?? '')
    if (password.length < 8 || password.length > 128) throw new Error('La contraseña debe tener entre 8 y 128 caracteres.')
    const name = String(data?.name ?? '').trim().slice(0, 60)
    if (!name) throw new Error('Escribe tu nombre o usuario.')
    return { email, password, name }
  })
  .handler(async ({ data }) => {
    try {
      const settings = await getSettings()
      if (settings.disableSignup) throw new Error('El registro está cerrado en este momento.')
    } catch (error) {
      if (!(error instanceof AuthError)) throw error
    }

    try {
      await admin.createUser({
        email: data.email,
        password: data.password,
        data: { user_metadata: { full_name: data.name } },
      })
      return { ok: true as const }
    } catch (error) {
      // The email may belong to an account created before this change that was never confirmed.
      const existing = await findUserByEmail(data.email).catch(() => null)
      if (existing) {
        if (!existing.confirmedAt) {
          await admin.updateUser(existing.id, { confirm: true })
          return { ok: true as const }
        }
        throw new Error('Este correo ya tiene una cuenta. Inicia sesión.')
      }
      console.error('No se pudo crear la cuenta:', error)
      throw new Error('No se pudo crear la cuenta. Intenta de nuevo en unos minutos.')
    }
  })

/**
 * Called when a sign-in is rejected. If the account exists but was never
 * confirmed, it is confirmed so the customer can retry with their password.
 * The response is the same either way to avoid revealing which emails exist.
 */
export const confirmPendingAccount = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => ({ email: normalizeEmail(data?.email) }))
  .handler(async ({ data }) => {
    try {
      await confirmIfPending(data.email)
    } catch (error) {
      console.error('No se pudo confirmar la cuenta pendiente:', error)
    }
    return { ok: true as const }
  })
