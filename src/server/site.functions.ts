import { db } from '../../db/index.js'
import { createServerFn } from '@tanstack/react-start'
import { DEFAULT_SITE, normalizeSite, type SiteConfig } from '../lib/site-config'
import { logAdminAction, requireAdmin } from './auth'
import { deleteDraft, listRevisions, loadDraft, loadSite, revisionValue, saveDraft, storeSite } from './site'

export const getSiteConfig = createServerFn({ method: 'GET' }).handler(async (): Promise<SiteConfig> => {
  try {
    return await loadSite()
  } catch (error) {
    // Never take the public site down because the settings could not be read.
    console.error('No se pudo leer la configuración del sitio:', error)
    return DEFAULT_SITE
  }
})

export const adminSaveSite = createServerFn({ method: 'POST' })
  .inputValidator((data: { site: SiteConfig }) => ({ site: normalizeSite(data?.site) }))
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const saved = await storeSite(data.site, { source: 'panel', summary: 'Cambios desde el panel', by: admin.profile.email })
    await deleteDraft()
    await logAdminAction(db, admin, { action: 'contenido.publicar', summary: 'Publicó cambios del contenido desde el panel', targetType: 'site' })
    return saved
  })

export const adminListSiteRevisions = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return listRevisions()
})

export const adminRestoreSiteRevision = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number }) => {
    const id = Number(data?.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Versión no válida.')
    return { id }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const value = await revisionValue(data.id)
    if (!value) throw new Error('Esa versión ya no existe.')
    const saved = await storeSite(value, { source: 'restaurar', summary: `Restaurada la versión #${data.id}`, by: admin.profile.email })
    await logAdminAction(db, admin, { action: 'contenido.restaurar', summary: `Restauró la versión #${data.id} del contenido`, targetType: 'site_revision', targetId: data.id })
    return saved
  })

export const adminGetDraft = createServerFn({ method: 'GET' }).handler(async () => {
  await requireAdmin()
  return loadDraft()
})

/** Auto-saves the editor content as a draft. Nothing is published. */
export const adminSaveDraft = createServerFn({ method: 'POST' })
  .inputValidator((data: { site: SiteConfig; scheduledAt?: string | null }) => {
    let scheduledAt: string | null = null
    if (data?.scheduledAt) {
      const date = new Date(data.scheduledAt)
      if (Number.isNaN(date.getTime())) throw new Error('Fecha de publicación no válida.')
      if (date.getTime() < Date.now() - 60_000) throw new Error('La fecha de publicación debe ser futura.')
      scheduledAt = date.toISOString()
    }
    return { site: normalizeSite(data?.site), scheduledAt }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const previous = await loadDraft()
    await saveDraft(data.site, { scheduledAt: data.scheduledAt, by: admin.profile.email })
    if (data.scheduledAt && data.scheduledAt !== previous?.scheduledAt) {
      await logAdminAction(db, admin, { action: 'contenido.programar', summary: `Programó la publicación del contenido para ${new Date(data.scheduledAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}`, targetType: 'site' })
    } else if (!data.scheduledAt && previous?.scheduledAt) {
      await logAdminAction(db, admin, { action: 'contenido.desprogramar', summary: 'Canceló la publicación programada del contenido', targetType: 'site' })
    }
    return loadDraft()
  })

export const adminDiscardDraft = createServerFn({ method: 'POST' }).handler(async () => {
  const admin = await requireAdmin()
  await deleteDraft()
  await logAdminAction(db, admin, { action: 'contenido.descartar', summary: 'Descartó el borrador del contenido', targetType: 'site' })
  return { ok: true }
})
