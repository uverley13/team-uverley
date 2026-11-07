import { createFileRoute } from '@tanstack/react-router'
import { desc } from 'drizzle-orm'
import { db } from '../../../db/index.js'
import { logAdminAction, requireAdmin } from '../../server/auth'
import { TABLES, tableWhere } from '../../server/database.functions'

function csvValue(value: unknown) {
  if (value === null || value === undefined) return ''
  let text = value instanceof Date ? value.toISOString() : typeof value === 'object' ? JSON.stringify(value) : String(value)
  // Prevent spreadsheet formula injection.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`
  return /[",;\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

// Admin-only CSV export of a table (opens in Excel). Optional ?q= applies the same search as the browser.
export const Route = createFileRoute('/api/export/$table')({
  server: {
    handlers: {
      GET: async ({ params, request }) => {
        let admin
        try {
          admin = await requireAdmin()
        } catch {
          return new Response('Forbidden', { status: 403 })
        }
        const def = TABLES[params.table]
        if (!def) return new Response('Not found', { status: 404 })
        const search = (new URL(request.url).searchParams.get('q') ?? '').trim().slice(0, 100)
        const rows = (await db.select().from(def.table).where(tableWhere(def, search, admin.siteId)).orderBy(desc(def.order)).limit(50_000)) as Record<string, unknown>[]
        const columns = rows[0] ? Object.keys(rows[0]) : []
        const lines = [columns.join(';'), ...rows.map(r => columns.map(c => csvValue(r[c])).join(';'))]
        await logAdminAction(db, admin, { action: 'datos.exportar', summary: `Exportó ${rows.length} registros de "${def.label}" (${admin.store.name})${search ? ` (búsqueda: ${search})` : ''}`, targetType: 'table', targetId: params.table })
        const date = new Date().toISOString().slice(0, 10)
        // BOM + semicolons so Excel in Spanish opens it with accents and columns correctly.
        return new Response('﻿' + lines.join('\r\n'), {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${params.table}-${date}.csv"`,
            'Cache-Control': 'no-store',
          },
        })
      },
    },
  },
})
