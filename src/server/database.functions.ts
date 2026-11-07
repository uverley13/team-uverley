import { createServerFn } from '@tanstack/react-start'
import { desc, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { requireAdmin } from './auth'
import { TABLES, tableWhere } from './tables'

/*
 * Read-only database explorer for the admin panel. Changes go through the
 * dedicated actions (balances, top-ups, orders, services, site content) so
 * every money movement stays consistent and recorded.
 */

const PAGE_SIZE = 50

function cell(value: unknown): string | number | boolean | null {
  if (value === null || value === undefined) return null
  if (value instanceof Date) return value.toISOString()
  if (typeof value === 'object') return JSON.stringify(value).slice(0, 300)
  return value as string | number | boolean
}

export const adminBrowseTable = createServerFn({ method: 'GET' })
  .inputValidator((data: { table: string; page?: number; search?: string }) => {
    // The table name is checked on the server (handler): this validator also runs in the browser.
    const page = Math.max(1, Math.min(10_000, Number(data?.page) || 1))
    return { table: String(data?.table ?? ''), page, search: String(data.search ?? '').trim().slice(0, 100) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const def = Object.hasOwn(TABLES, data.table) ? TABLES[data.table] : undefined
    if (!def) throw new Error('Tabla no válida.')
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
