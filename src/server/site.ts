// Server-only helpers for the editable site content.
import { and, desc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { siteSettings, siteSettingsRevisions } from '../../db/schema.js'
import { DEFAULT_SITE, normalizeSite, type SiteConfig } from '../lib/site-config'

const KEY = 'site'
const DRAFT_KEY = 'draft'

const keyOf = (siteId: number, key: string) => and(eq(siteSettings.siteId, siteId), eq(siteSettings.key, key))

/** Published content of a store. Stores without saved content use the defaults. */
export async function loadSite(siteId: number): Promise<SiteConfig> {
  const [row] = await db.select().from(siteSettings).where(keyOf(siteId, KEY))
  return row ? normalizeSite(row.value) : DEFAULT_SITE
}

/** Saves a new version of the site content and keeps the previous one as a revision. */
export async function storeSite(siteId: number, next: SiteConfig, opts: { source: 'panel' | 'asistente' | 'restaurar' | 'programado'; summary?: string; by?: string }) {
  const value = normalizeSite(next)
  await db.transaction(async tx => {
    const [current] = await tx.select().from(siteSettings).where(keyOf(siteId, KEY))
    await tx.insert(siteSettingsRevisions).values({
      siteId,
      value: current ? current.value : DEFAULT_SITE,
      source: opts.source,
      summary: (opts.summary ?? '').slice(0, 300) || null,
      createdBy: opts.by ?? null,
    })
    await tx
      .insert(siteSettings)
      .values({ siteId, key: KEY, value, updatedAt: new Date() })
      .onConflictDoUpdate({ target: [siteSettings.siteId, siteSettings.key], set: { value, updatedAt: new Date() } })
  })
  return value
}

export async function listRevisions(siteId: number, limit = 30) {
  const rows = await db.select().from(siteSettingsRevisions).where(eq(siteSettingsRevisions.siteId, siteId)).orderBy(desc(siteSettingsRevisions.createdAt)).limit(limit)
  return rows.map(r => ({ id: r.id, source: r.source, summary: r.summary, createdBy: r.createdBy, createdAt: r.createdAt.toISOString() }))
}

export async function revisionValue(siteId: number, id: number) {
  const [row] = await db.select().from(siteSettingsRevisions).where(and(eq(siteSettingsRevisions.siteId, siteId), eq(siteSettingsRevisions.id, id)))
  return row ? normalizeSite(row.value) : null
}

export type SiteDraft = { site: SiteConfig; scheduledAt: string | null; savedBy: string | null; savedAt: string }

/** The unpublished draft of the site content, if any. Never shown to visitors. */
export async function loadDraft(siteId: number): Promise<SiteDraft | null> {
  const [row] = await db.select().from(siteSettings).where(keyOf(siteId, DRAFT_KEY))
  if (!row) return null
  const value = row.value as Partial<SiteDraft>
  return {
    site: normalizeSite(value.site),
    scheduledAt: typeof value.scheduledAt === 'string' ? value.scheduledAt : null,
    savedBy: typeof value.savedBy === 'string' ? value.savedBy : null,
    savedAt: row.updatedAt.toISOString(),
  }
}

export async function saveDraft(siteId: number, site: SiteConfig, opts: { scheduledAt: string | null; by: string }) {
  const value = { site: normalizeSite(site), scheduledAt: opts.scheduledAt, savedBy: opts.by }
  await db
    .insert(siteSettings)
    .values({ siteId, key: DRAFT_KEY, value, updatedAt: new Date() })
    .onConflictDoUpdate({ target: [siteSettings.siteId, siteSettings.key], set: { value, updatedAt: new Date() } })
}

export async function deleteDraft(siteId: number) {
  await db.delete(siteSettings).where(keyOf(siteId, DRAFT_KEY))
}

/** Publishes every store draft whose scheduled date has passed. Used by the scheduled function. */
export async function publishDueDrafts(now = new Date()) {
  const rows = await db.select({ siteId: siteSettings.siteId }).from(siteSettings).where(eq(siteSettings.key, DRAFT_KEY))
  const published: { siteId: number; draft: SiteDraft }[] = []
  for (const { siteId } of rows) {
    const draft = await loadDraft(siteId)
    if (!draft?.scheduledAt || new Date(draft.scheduledAt) > now) continue
    await storeSite(siteId, draft.site, { source: 'programado', summary: `Publicación programada (${draft.savedBy ?? 'admin'})`, by: draft.savedBy ?? undefined })
    await deleteDraft(siteId)
    published.push({ siteId, draft })
  }
  return published
}
