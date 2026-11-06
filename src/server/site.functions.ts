import { createServerFn } from '@tanstack/react-start'
import { DEFAULT_SITE, normalizeSite, type SiteConfig } from '../lib/site-config'
import { requireAdmin } from './auth'
import { listRevisions, loadSite, revisionValue, storeSite } from './site'

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
    const { profile } = await requireAdmin()
    return storeSite(data.site, { source: 'panel', summary: 'Cambios desde el panel', by: profile.email })
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
    const { profile } = await requireAdmin()
    const value = await revisionValue(data.id)
    if (!value) throw new Error('Esa versión ya no existe.')
    return storeSite(value, { source: 'restaurar', summary: `Restaurada la versión #${data.id}`, by: profile.email })
  })
