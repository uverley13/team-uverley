import { createServerFn } from '@tanstack/react-start'
import { and, desc, eq, ilike, isNull, or, sql, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { db } from '../../db/index.js'
import { adminAuditLog, adminNotifications, balanceTransactions, orders, products, profiles, siteSettingsRevisions, topups } from '../../db/schema.js'
import { requireAdmin } from './auth'

/*
 * Read-only database explorer for the admin panel. Changes go through the
 * dedicated actions (balances, top-ups, orders, services, site content) so
 * every money movement stays consistent and recorded.
 */

// `site`: store column used to show only the managed store's rows. `shared`: rows with no store are platform-wide and shown too.
type TableDef = { label: string; table: PgTable; order: PgColumn; search: PgColumn[]; site: PgColumn; shared?: boolean }

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

const PAGE_SIZE = 50

/** Rows of the given store only (plus platform-wide rows for shared tables), optionally filtered by a search. */
export function tableWhere(def: TableDef, search: string, siteId: number): SQL | undefined {
  const store = def.shared ? or(eq(def.site, siteId), isNull(def.site)) : eq(def.site, siteId)
  const text = search ? or(...def.search.map(col => ilike(sql`${col}::text`, `%${search.replace(/[%_\\]/g, '\\$&')}%`))) : undefined
  return and(store, text)
}

function cell(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 300)
  return value as string | number | boolean
}

export const adminBrowseTable = createServerFn({ method: 'GET' })
  .inputValidator((data: { table: string; page?: number; search?: string }) => {
    if (!(data?.table in TABLES)) throw new Error('Tabla no válida.')
    const page = Math.max(1, Math.min(10_000, Number(data.page) || 1))
    return { table: data.table, page, search: String(data.search ?? '').trim().slice(0, 100) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const def = TABLES[data.table]
    const where = tableWhere(def, data.search, admin.siteId)
    const [rows, [{ count }]] = await Promise.all([
      db.select().from(def.table).where(where).orderBy(desc(def.order)).limit(PAGE_SIZE).offset((data.page - 1) * PAGE_SIZE),
      db.select({ count: sql<number>`count(*)::int` }).from(def.table).where(where),
    ])
    const records = rows as Record<string, unknown>[]
    const columns = records[0] ? Object.keys(records[0]) : []
    return {
      label: def.label,
      columns,
      rows: records.map(r => columns.map(c => cell(r[c]))),
      total: count,
      page: data.page,
      pages: Math.max(1, Math.ceil(count / PAGE_SIZE)),
    }
  })
