// Server-only: tables shown in the admin database explorer and CSV export.
// Kept out of the *.functions.ts files so database code never reaches the browser bundle.
import { and, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { adminAuditLog, adminNotifications, balanceTransactions, orders, products, profiles, siteSettingsRevisions, topups } from '../../db/schema.js'

// `site`: store column used to show only the managed store's rows. `shared`: rows with no store are platform-wide and shown too.
export type TableDef = { label: string; table: PgTable; order: PgColumn; search: PgColumn[]; site: PgColumn; shared?: boolean }

export const TABLES: Record<string, TableDef> = {
  profiles: { label: 'Clientes', table: profiles, order: profiles.createdAt, search: [profiles.email, profiles.username, profiles.id], site: profiles.siteId },
  topups: { label: 'Recargas', table: topups, order: topups.createdAt, search: [topups.userId, topups.status], site: topups.siteId },
  orders: { label: 'Pedidos', table: orders, order: orders.createdAt, search: [orders.productName, orders.status, orders.userId], site: orders.siteId },
  balance_transactions: { label: 'Movimientos de saldo', table: balanceTransactions, order: balanceTransactions.createdAt, search: [balanceTransactions.type, balanceTransactions.description, balanceTransactions.userId], site: balanceTransactions.siteId },
  products: { label: 'Servicios', table: products, order: products.createdAt, search: [products.name, products.description], site: products.siteId },
  admin_audit_log: { label: 'Registro de actividad', table: adminAuditLog, order: adminAuditLog.createdAt, search: [adminAuditLog.actorEmail, adminAuditLog.action, adminAuditLog.summary, adminAuditLog.targetId], site: adminAuditLog.siteId, shared: true },
  admin_notifications: { label: 'Notificaciones', table: adminNotifications, order: adminNotifications.createdAt, search: [adminNotifications.kind, adminNotifications.title, adminNotifications.body], site: adminNotifications.siteId, shared: true },
  site_settings_revisions: { label: 'Versiones del contenido', table: siteSettingsRevisions, order: siteSettingsRevisions.createdAt, search: [siteSettingsRevisions.source, siteSettingsRevisions.summary], site: siteSettingsRevisions.siteId },
}

/** Rows of the given store only (plus platform-wide rows for shared tables), optionally filtered by a search. */
export function tableWhere(def: TableDef, search: string, siteId: number): SQL | undefined {
  const store = def.shared ? or(eq(def.site, siteId), isNull(def.site)) : eq(def.site, siteId)
  const text = search ? or(...def.search.map(col => ilike(sql`${col}::text`, `%${search.replace(/[%_\\]/g, '\\$&')}%`))) : undefined
  return and(store, text)
}
