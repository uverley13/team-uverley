import { createServerFn } from '@tanstack/react-start'
import { desc, ilike, or, sql, type SQL } from 'drizzle-orm'
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core'
import { db } from '../../db/index.js'
import { balanceTransactions, orders, products, profiles, siteSettingsRevisions, topups } from '../../db/schema.js'
import { requireAdmin } from './auth'

/*
 * Read-only database explorer for the admin panel. Changes go through the
 * dedicated actions (balances, top-ups, orders, services, site content) so
 * every money movement stays consistent and recorded.
 */

type TableDef = { label: string; table: PgTable; order: PgColumn; search: PgColumn[] }

const TABLES: Record<string, TableDef> = {
  profiles: { label: 'Clientes', table: profiles, order: profiles.createdAt, search: [profiles.email, profiles.username, profiles.id] },
  topups: { label: 'Recargas', table: topups, order: topups.createdAt, search: [topups.userId, topups.status] },
  orders: { label: 'Pedidos', table: orders, order: orders.createdAt, search: [orders.productName, orders.status, orders.userId] },
  balance_transactions: { label: 'Movimientos de saldo', table: balanceTransactions, order: balanceTransactions.createdAt, search: [balanceTransactions.type, balanceTransactions.description, balanceTransactions.userId] },
  products: { label: 'Servicios', table: products, order: products.createdAt, search: [products.name, products.description] },
  site_settings_revisions: { label: 'Versiones del contenido', table: siteSettingsRevisions, order: siteSettingsRevisions.createdAt, search: [siteSettingsRevisions.source, siteSettingsRevisions.summary] },
}

const PAGE_SIZE = 50

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
    await requireAdmin()
    const def = TABLES[data.table]
    const where: SQL | undefined = data.search
      ? or(...def.search.map(col => ilike(sql`${col}::text`, `%${data.search.replace(/[%_\\]/g, '\\$&')}%`)))
      : undefined
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
