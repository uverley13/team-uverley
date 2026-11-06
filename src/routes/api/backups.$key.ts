import { createFileRoute } from '@tanstack/react-router'
import { logAdminAction, requireAdmin } from '../../server/auth'
import { backupsStore } from '../../server/backup'
import { db } from '../../../db/index.js'

// Admin-only download of a database backup.
export const Route = createFileRoute('/api/backups/$key')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        let admin
        try {
          admin = await requireAdmin()
        } catch {
          return new Response('Forbidden', { status: 403 })
        }
        if (!/^backup-[A-Za-z0-9-]+\.json$/.test(params.key)) return new Response('Not found', { status: 404 })
        const data = await backupsStore().get(params.key, { type: 'text' })
        if (!data) return new Response('Not found', { status: 404 })
        await logAdminAction(db, admin, { action: 'copia.descargar', summary: `Descargó la copia de seguridad ${params.key}`, targetType: 'backup', targetId: params.key })
        return new Response(data, {
          headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${params.key}"`, 'Cache-Control': 'no-store' },
        })
      },
    },
  },
})
