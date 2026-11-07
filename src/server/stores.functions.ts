import { createServerFn } from '@tanstack/react-start'
import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { orders, products, profiles, siteDomains, sites } from '../../db/schema.js'
import { DEFAULT_SITE, normalizeSite, type SiteConfig } from '../lib/site-config'
import { logAdminAction, requireAdmin } from './auth'
import { loadSite, storeSite } from './site'
import { clearStoreCache, currentStore, isValidDomain, listStores, normalizeDomain, rememberStore } from './tenant'

/*
 * Multi-store management (admin only). Every store has its own content, catalog,
 * customers, balances, top-ups and orders. A store opens on the domains linked to it;
 * on the main domain the admin chooses which store to manage from the panel.
 */

export type StoreSummary = {
  id: number
  slug: string
  name: string
  domains: string[]
  clients: number
  orders: number
  products: number
}

export type StoresOverview = {
  current: { id: number; name: string; host: string; viaDomain: boolean }
  mainDomains: string[]
  stores: StoreSummary[]
}

/** Domains that belong to the platform itself and can't be linked to a single store. */
function platformDomains() {
  const fromEnv = [process.env.URL, process.env.DEPLOY_PRIME_URL, process.env.DEPLOY_URL]
    .filter((v): v is string => Boolean(v))
    .map(normalizeDomain)
  return [...new Set(['uveley.com', ...fromEnv])]
}

function isPlatformDomain(domain: string) {
  return platformDomains().includes(domain) || domain.endsWith('.netlify.app') || domain === 'localhost' || domain.endsWith('.localhost')
}

function cleanName(value: unknown) {
  const name = String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  if (name.length < 2) throw new Error('Escribe el nombre de la tienda (mínimo 2 caracteres).')
  return name
}

function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

function cleanSlug(value: unknown, fallbackName: string) {
  const slug = slugify(String(value ?? '') || fallbackName)
  if (slug.length < 2) throw new Error('El identificador debe tener al menos 2 letras o números.')
  return slug
}

function cleanDomains(value: unknown) {
  const list = Array.isArray(value) ? value : String(value ?? '').split(/[\s,]+/)
  const domains = [...new Set(list.map(d => normalizeDomain(String(d ?? ''))).filter(Boolean))]
  if (domains.length > 10) throw new Error('Una tienda puede tener como máximo 10 dominios.')
  for (const domain of domains) {
    if (!isValidDomain(domain)) throw new Error(`"${domain}" no es un dominio válido. Ejemplo: mitienda.com`)
    if (isPlatformDomain(domain)) throw new Error(`"${domain}" es el dominio principal de la plataforma: no se puede asignar a una sola tienda.`)
  }
  return domains
}

async function assertDomainsFree(domains: string[], siteId?: number) {
  if (!domains.length) return
  const taken = await db
    .select({ domain: siteDomains.domain, name: sites.name })
    .from(siteDomains)
    .innerJoin(sites, eq(sites.id, siteDomains.siteId))
    .where(siteId ? and(inArray(siteDomains.domain, domains), ne(siteDomains.siteId, siteId)) : inArray(siteDomains.domain, domains))
  if (taken.length) throw new Error(`El dominio ${taken[0].domain} ya está asignado a la tienda "${taken[0].name}".`)
}

function isUniqueViolation(error: unknown) {
  let current = error as { code?: string; cause?: unknown } | undefined
  for (let i = 0; i < 4 && current; i++) {
    if (current.code === '23505') return true
    current = current.cause as typeof current
  }
  return false
}

/** Starting content for a new store: a copy of another store (or the defaults) under the new name. */
function brandedContent(base: SiteConfig, name: string, from: string) {
  const words = name.split(' ')
  const first = words.length > 1 ? words.slice(0, -1).join(' ') : name
  const second = words.length > 1 ? words[words.length - 1] : ''
  // Replace the old store name everywhere in the texts (messages, FAQ, footer...).
  const json = from ? JSON.stringify(base).split(from).join(name) : JSON.stringify(base)
  const copy = JSON.parse(json) as SiteConfig
  return normalizeSite({ ...copy, brand: { ...copy.brand, first, second } })
}

export const adminGetStores = createServerFn({ method: 'GET' }).handler(async (): Promise<StoresOverview> => {
  await requireAdmin()
  const current = await currentStore()
  const stores = await listStores()
  const counts = await db.execute(sql`
      select s.id,
        (select count(*) from ${profiles} p where p.site_id = s.id)::int as clients,
        (select count(*) from ${orders} o where o.site_id = s.id)::int as orders,
        (select count(*) from ${products} pr where pr.site_id = s.id)::int as products
      from ${sites} s`)
  const rows = ((counts as unknown as { rows?: unknown[] }).rows ?? counts) as { id: number; clients: number; orders: number; products: number }[]
  const byId = new Map(rows.map(r => [Number(r.id), r]))
  return {
    current: { id: current.id, name: current.name, host: current.host, viaDomain: current.viaDomain },
    mainDomains: platformDomains(),
    stores: stores.map(s => ({
      ...s,
      clients: Number(byId.get(s.id)?.clients ?? 0),
      orders: Number(byId.get(s.id)?.orders ?? 0),
      products: Number(byId.get(s.id)?.products ?? 0),
    })),
  }
})

/** Chooses which store the admin manages (and previews) on the main domain. */
export const adminSelectStore = createServerFn({ method: 'POST' })
  .inputValidator((data: { siteId: number }) => {
    const siteId = Number(data?.siteId)
    if (!Number.isInteger(siteId) || siteId <= 0) throw new Error('Tienda no válida.')
    return { siteId }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    if (admin.store.viaDomain) {
      throw new Error(`Estás en el dominio de "${admin.store.name}". Para cambiar de tienda, entra al panel desde el dominio principal.`)
    }
    const stores = await listStores()
    const target = stores.find(s => s.id === data.siteId)
    if (!target) throw new Error('Esa tienda no existe.')
    rememberStore(target.id)
    return { id: target.id, name: target.name }
  })

export const adminCreateStore = createServerFn({ method: 'POST' })
  .inputValidator((data: { name: string; slug?: string; domains?: string[] | string; copyFrom?: number | null; copyProducts?: boolean }) => {
    const name = cleanName(data?.name)
    const copyFrom = data?.copyFrom ? Number(data.copyFrom) : null
    if (copyFrom !== null && (!Number.isInteger(copyFrom) || copyFrom <= 0)) throw new Error('Tienda de origen no válida.')
    return { name, slug: cleanSlug(data?.slug, name), domains: cleanDomains(data?.domains), copyFrom, copyProducts: Boolean(data?.copyProducts && copyFrom) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    await assertDomainsFree(data.domains)
    let source: { site: SiteConfig; name: string } = { site: DEFAULT_SITE, name: 'Servidor Uverley' }
    if (data.copyFrom) {
      const [origin] = await db.select({ name: sites.name }).from(sites).where(eq(sites.id, data.copyFrom))
      if (!origin) throw new Error('La tienda de origen no existe.')
      source = { site: await loadSite(data.copyFrom), name: origin.name }
    }

    let created: typeof sites.$inferSelect
    try {
      created = await db.transaction(async tx => {
        const [row] = await tx.insert(sites).values({ name: data.name, slug: data.slug }).returning()
        if (data.domains.length) await tx.insert(siteDomains).values(data.domains.map(domain => ({ domain, siteId: row.id })))
        if (data.copyProducts && data.copyFrom) {
          const catalog = await tx.select().from(products).where(eq(products.siteId, data.copyFrom))
          if (catalog.length) {
            await tx.insert(products).values(
              catalog.map(p => ({ siteId: row.id, name: p.name, description: p.description, price: p.price, imageKey: p.imageKey, active: p.active })),
            )
          }
        }
        return row
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error('Ya existe una tienda con ese identificador o uno de los dominios ya está en uso.')
      throw error
    }

    await storeSite(created.id, brandedContent(source.site, data.name, source.name), {
      source: 'panel',
      summary: data.copyFrom ? `Contenido inicial copiado de "${source.name}"` : 'Contenido inicial de la tienda',
      by: admin.profile.email,
    })
    clearStoreCache()
    await logAdminAction(db, admin, {
      siteId: created.id,
      action: 'tienda.crear',
      summary: `Creó la tienda "${created.name}"${data.domains.length ? ` (${data.domains.join(', ')})` : ''}${data.copyFrom ? `, copiando de "${source.name}"${data.copyProducts ? ' con su catálogo' : ''}` : ''}`,
      targetType: 'store',
      targetId: created.id,
    })
    return { id: created.id }
  })

export const adminUpdateStore = createServerFn({ method: 'POST' })
  .inputValidator((data: { id: number; name: string; slug: string; domains: string[] | string }) => {
    const id = Number(data?.id)
    if (!Number.isInteger(id) || id <= 0) throw new Error('Tienda no válida.')
    const name = cleanName(data?.name)
    return { id, name, slug: cleanSlug(data?.slug, name), domains: cleanDomains(data?.domains) }
  })
  .handler(async ({ data }) => {
    const admin = await requireAdmin()
    const [previous] = await db.select().from(sites).where(eq(sites.id, data.id))
    if (!previous) throw new Error('Esa tienda no existe.')
    await assertDomainsFree(data.domains, data.id)
    const before = (await listStores()).find(s => s.id === data.id)?.domains ?? []
    // Removing the domain currently in use would lock the admin out of this panel.
    if (admin.store.viaDomain && admin.store.id === data.id && !data.domains.includes(admin.store.host)) {
      throw new Error(`No puedes quitar ${admin.store.host} mientras lo estás usando. Hazlo desde el dominio principal.`)
    }
    try {
      await db.transaction(async tx => {
        await tx.update(sites).set({ name: data.name, slug: data.slug, updatedAt: new Date() }).where(eq(sites.id, data.id))
        await tx.delete(siteDomains).where(eq(siteDomains.siteId, data.id))
        if (data.domains.length) await tx.insert(siteDomains).values(data.domains.map(domain => ({ domain, siteId: data.id })))
      })
    } catch (error) {
      if (isUniqueViolation(error)) throw new Error('Ya existe una tienda con ese identificador o uno de los dominios ya está en uso.')
      throw error
    }
    clearStoreCache()
    const added = data.domains.filter(d => !before.includes(d))
    const removed = before.filter(d => !data.domains.includes(d))
    const changes = [
      previous.name !== data.name ? `nombre "${previous.name}" → "${data.name}"` : '',
      previous.slug !== data.slug ? `identificador ${previous.slug} → ${data.slug}` : '',
      added.length ? `dominios agregados: ${added.join(', ')}` : '',
      removed.length ? `dominios quitados: ${removed.join(', ')}` : '',
    ].filter(Boolean)
    await logAdminAction(db, admin, {
      siteId: data.id,
      action: 'tienda.editar',
      summary: `Editó la tienda "${data.name}"${changes.length ? `: ${changes.join('; ')}` : ''}`,
      targetType: 'store',
      targetId: data.id,
    })
    return { ok: true }
  })
