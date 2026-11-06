// Server-only helpers shared by server functions and API routes.
import { getUser, type User } from '@netlify/identity'
import { eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { profiles } from '../../db/schema.js'

export type Profile = typeof profiles.$inferSelect

/**
 * A user is an admin when they have the `admin` role in Netlify Identity
 * or their email is listed in the ADMIN_EMAILS environment variable.
 */
export function isAdminUser(user: User) {
  if (user.roles?.includes('admin') || user.role === 'admin') return true
  const admins = (process.env.ADMIN_EMAILS ?? '')
    .split(',')
    .map(email => email.trim().toLowerCase())
    .filter(Boolean)
  return Boolean(user.email && admins.includes(user.email.toLowerCase()))
}

/** Returns the profile row for an Identity user, creating it on first use. */
export async function ensureProfile(user: User): Promise<Profile> {
  const email = user.email ?? ''
  const metadataName = typeof user.userMetadata?.full_name === 'string' ? user.userMetadata.full_name : ''
  const username = (user.name || metadataName || email.split('@')[0] || 'Cliente').slice(0, 60)

  await db.insert(profiles).values({ id: user.id, email, username }).onConflictDoNothing()
  const [profile] = await db.select().from(profiles).where(eq(profiles.id, user.id))
  if (profile.email !== email && email) {
    await db.update(profiles).set({ email }).where(eq(profiles.id, user.id))
    profile.email = email
  }
  return profile
}

export async function requireUser() {
  const user = await getUser()
  if (!user) throw new Error('Debes iniciar sesión para continuar.')
  const profile = await ensureProfile(user)
  return { user, profile, isAdmin: isAdminUser(user) }
}

export async function requireAdmin() {
  const session = await requireUser()
  if (!session.isAdmin) throw new Error('No tienes permisos de administrador.')
  return session
}
