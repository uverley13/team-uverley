// Server-only: records events for the admin notification center. Never throws,
// so a notification problem can't break the customer's action.
import { db } from '../../db/index.js'
import { adminNotifications } from '../../db/schema.js'

export type NotificationKind = 'recarga' | 'pedido' | 'rechazo' | 'servicio' | 'error' | 'seguridad'

export async function notifyAdmin(kind: NotificationKind, title: string, body?: string, link?: string) {
  try {
    await db.insert(adminNotifications).values({ kind, title: title.slice(0, 200), body: body?.slice(0, 500) ?? null, link: link ?? null })
  } catch (error) {
    console.error('No se pudo registrar la notificación:', error)
  }
}
