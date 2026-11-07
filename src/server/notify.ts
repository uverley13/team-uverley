// Server-only: records events for the admin notification center. Never throws,
// so a notification problem can't break the customer's action.
import { db } from '../../db/index.js'
import { adminNotifications } from '../../db/schema.js'
import { currentSiteId } from './tenant'

export type NotificationKind = 'recarga' | 'pedido' | 'rechazo' | 'servicio' | 'error' | 'seguridad'

/**
 * `siteId`: the store the event belongs to. Defaults to the store of the current
 * request; pass null for platform-wide events (backups, scheduled jobs without a store).
 */
export async function notifyAdmin(kind: NotificationKind, title: string, body?: string, link?: string, siteId?: number | null) {
  try {
    const store = siteId === undefined ? await currentSiteId() : siteId
    await db.insert(adminNotifications).values({ siteId: store, kind, title: title.slice(0, 200), body: body?.slice(0, 500) ?? null, link: link ?? null })
  } catch (error) {
    console.error('No se pudo registrar la notificación:', error)
  }
}
