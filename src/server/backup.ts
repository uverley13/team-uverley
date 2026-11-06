// Server-only: full JSON backups of the store database, saved in Netlify Blobs.
import { getStore } from '@netlify/blobs'
import { asc } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { adminAuditLog, balanceTransactions, orders, products, profiles, siteSettings, siteSettingsRevisions, topups } from '../../db/schema.js'

export const backupsStore = () => getStore('database-backups')
const KEEP = 60

export async function createBackup(trigger: 'automatica' | 'manual', by?: string) {
  const [p, pr, o, t, tu, ss, ssr, al] = await Promise.all([
    db.select().from(profiles).orderBy(asc(profiles.createdAt)),
    db.select().from(products).orderBy(asc(products.id)),
    db.select().from(orders).orderBy(asc(orders.id)),
    db.select().from(balanceTransactions).orderBy(asc(balanceTransactions.id)),
    db.select().from(topups).orderBy(asc(topups.id)),
    db.select().from(siteSettings),
    db.select().from(siteSettingsRevisions).orderBy(asc(siteSettingsRevisions.id)),
    db.select().from(adminAuditLog).orderBy(asc(adminAuditLog.id)),
  ])
  const createdAt = new Date().toISOString()
  const key = `backup-${createdAt.replace(/[:.]/g, '-')}.json`
  const tables = { profiles: p, products: pr, orders: o, balance_transactions: t, topups: tu, site_settings: ss, site_settings_revisions: ssr, admin_audit_log: al }
  const counts = Object.fromEntries(Object.entries(tables).map(([k, v]) => [k, v.length]))
  const store = backupsStore()
  await store.set(key, JSON.stringify({ createdAt, trigger, by: by ?? null, tables }), { metadata: { createdAt, trigger, by: by ?? '', counts: JSON.stringify(counts) } })
  await pruneBackups()
  return { key, createdAt, counts }
}

async function pruneBackups() {
  const { blobs } = await backupsStore().list()
  const keys = blobs.map(b => b.key).sort()
  for (const key of keys.slice(0, Math.max(0, keys.length - KEEP))) await backupsStore().delete(key)
}

export async function listBackups() {
  const { blobs } = await backupsStore().list()
  const keys = blobs.map(b => b.key).sort().reverse().slice(0, 30)
  const items = await Promise.all(
    keys.map(async key => {
      const meta = await backupsStore().getMetadata(key)
      const m = (meta?.metadata ?? {}) as Record<string, string>
      let counts: Record<string, number> = {}
      try { counts = JSON.parse(m.counts ?? '{}') } catch {}
      return { key, createdAt: m.createdAt ?? null, trigger: m.trigger ?? 'automatica', by: m.by || null, counts }
    }),
  )
  return items
}
