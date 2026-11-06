import { createServerFn } from '@tanstack/react-start'
import { getRequestIP } from '@tanstack/react-start/server'
import { eq, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { loginAttempts } from '../../db/schema.js'
import { getUser } from '@netlify/identity'
import { notifyAdmin } from './notify'

/*
 * Limits sign-in attempts: after MAX_FAILURES wrong passwords for the same
 * email (or from the same IP) within WINDOW_MS, sign-in is blocked for LOCK_MS.
 */
const MAX_FAILURES = 5
const WINDOW_MS = 15 * 60 * 1000
const LOCK_MS = 15 * 60 * 1000
const MAX_IP_FAILURES = 20

function keysFor(email: unknown) {
  const clean = String(email ?? '').trim().toLowerCase().slice(0, 254)
  let ip = 'unknown'
  try {
    ip = getRequestIP({ xForwardedFor: true }) ?? 'unknown'
  } catch {}
  return { emailKey: `email:${clean}`, ipKey: `ip:${ip}` }
}

async function lockedFor(key: string) {
  const [row] = await db.select().from(loginAttempts).where(eq(loginAttempts.key, key))
  if (row?.lockedUntil && row.lockedUntil > new Date()) return Math.ceil((row.lockedUntil.getTime() - Date.now()) / 60000)
  return 0
}

export const checkLoginAllowed = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string }) => ({ email: String(data?.email ?? '') }))
  .handler(async ({ data }) => {
    const { emailKey, ipKey } = keysFor(data.email)
    try {
      const minutes = Math.max(await lockedFor(emailKey), await lockedFor(ipKey))
      return { allowed: minutes === 0, minutes }
    } catch (error) {
      // Never lock everyone out because the counter could not be read.
      console.error('No se pudo comprobar los intentos de inicio de sesión:', error)
      return { allowed: true, minutes: 0 }
    }
  })

async function registerFailure(key: string, limit: number) {
  const now = new Date()
  const windowStart = new Date(now.getTime() - WINDOW_MS)
  const [row] = await db
    .insert(loginAttempts)
    .values({ key, failures: 1, windowStart: now })
    .onConflictDoUpdate({
      target: loginAttempts.key,
      set: {
        failures: sql`case when ${loginAttempts.windowStart} < ${windowStart} then 1 else ${loginAttempts.failures} + 1 end`,
        windowStart: sql`case when ${loginAttempts.windowStart} < ${windowStart} then ${now} else ${loginAttempts.windowStart} end`,
      },
    })
    .returning()
  if (row.failures >= limit) {
    await db.update(loginAttempts).set({ lockedUntil: new Date(now.getTime() + LOCK_MS), failures: 0, windowStart: now }).where(eq(loginAttempts.key, key))
    return true
  }
  return false
}

export const reportLoginResult = createServerFn({ method: 'POST' })
  .inputValidator((data: { email: string; success: boolean }) => ({ email: String(data?.email ?? ''), success: Boolean(data?.success) }))
  .handler(async ({ data }) => {
    const { emailKey, ipKey } = keysFor(data.email)
    if (data.success) {
      // Only reset the counter when the caller really is signed in as that email.
      const user = await getUser()
      if (user?.email?.toLowerCase() !== emailKey.slice(6)) return { locked: false, remaining: MAX_FAILURES }
      await db.delete(loginAttempts).where(eq(loginAttempts.key, emailKey))
      return { locked: false, remaining: MAX_FAILURES }
    }
    const [emailLocked, ipLocked] = await Promise.all([registerFailure(emailKey, MAX_FAILURES), registerFailure(ipKey, MAX_IP_FAILURES)])
    if (emailLocked || ipLocked) {
      await notifyAdmin('seguridad', 'Inicio de sesión bloqueado', `Demasiados intentos fallidos para ${emailLocked ? emailKey.slice(6) : 'una misma conexión'}. Bloqueado 15 minutos.`)
    }
    const [row] = await db.select({ failures: loginAttempts.failures }).from(loginAttempts).where(eq(loginAttempts.key, emailKey))
    return { locked: emailLocked || ipLocked, remaining: Math.max(0, MAX_FAILURES - (row?.failures ?? 0)) }
  })
