// Server-only helpers for the editable site content.
import { desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { siteSettings, siteSettingsRevisions } from '../../db/schema.js'
import { DEFAULT_SITE, normalizeSite, type SiteConfig } from '../lib/site-config'

const KEY = 'site'

export async function loadSite(): Promise<SiteConfig> {
  const [row] = await db.select().from(siteSettings).where(eq(siteSettings.key, KEY))
  return row ? normalizeSite(row.value) : DEFAULT_SITE
}

/** Saves a new version of the site content and keeps the previous one as a revision. */
export async function storeSite(next: SiteConfig, opts: { source: 'panel' | 'asistente' | 'restaurar'; summary?: string; by?: string }) {
  const value = normalizeSite(next)
  await db.transaction(async tx => {
    const [current] = await tx.select().from(siteSettings).where(eq(siteSettings.key, KEY))
    await tx.insert(siteSettingsRevisions).values({
      value: current ? current.value : DEFAULT_SITE,
      source: opts.source,
      summary: (opts.summary ?? '').slice(0, 300) || null,
      createdBy: opts.by ?? null,
    })
    await tx
      .insert(siteSettings)
      .values({ key: KEY, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: siteSettings.key, set: { value, updatedAt: new Date() } })
  })
  return value
}

export async function listRevisions(limit = 30) {
  const rows = await db.select().from(siteSettingsRevisions).orderBy(desc(siteSettingsRevisions.createdAt)).limit(limit)
  return rows.map(r => ({ id: r.id, source: r.source, summary: r.summary, createdBy: r.createdBy, createdAt: r.createdAt.toISOString() }))
}

export async function revisionValue(id: number) {
  const [row] = await db.select().from(siteSettingsRevisions).where(eq(siteSettingsRevisions.id, id))
  return row ? normalizeSite(row.value) : null
}
