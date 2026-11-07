// Server-only: works out which store a request belongs to.
//
// 1. If the request's domain is registered for a store, that store is used.
// 2. Otherwise (main domain uveley.com, *.netlify.app, localhost...) the store chosen
//    by an admin in the panel (cookie) is used, or store #1 when none was chosen.
import { getCookie, getRequestHeader, setCookie, deleteCookie } from '@tanstack/react-start/server'
import { asc, eq } from 'drizzle-orm'
import { db } from '../../db/index.js'
import { siteDomains, sites } from '../../db/schema.js'

export const DEFAULT_SITE_ID = 1
const COOKIE = 'uv_tienda'

export type Store = { id: number; slug: string; name: string }
export type StoreContext = Store & { host: string; viaDomain: boolean }

/** Lowercase host without port and without a leading "www.". */
export function normalizeDomain(value: string) {
  let host = value.trim().toLowerCase()
  host = host.replace(/^[a-z]+:\/\//, '').split('/')[0].split(':')[0]
  return host.replace(/^www\./, '').replace(/\.$/, '')
}

export function isValidDomain(domain: string) {
  return domain.length <= 253 && /^(?!-)[a-z0-9-]{1,63}(?<!-)(\.(?!-)[a-z0-9-]{1,63}(?<!-))+$/.test(domain)
}

// Short cache so every request doesn't look up the domain table.
let cache: { at: number; domains: Map<string, number>; stores: Map<number, Store> } | null = null
const TTL_MS = 30_000

async function loadMaps() {
  if (cache && Date.now() - cache.at < TTL_MS) return cache
  const [storeRows, domainRows] = await Promise.all([
    db.select({ id: sites.id, slug: sites.slug, name: sites.name }).from(sites).orderBy(asc(sites.id)),
    db.select().from(siteDomains),
  ])
  cache = {
    at: Date.now(),
    stores: new Map(storeRows.map(s => [s.id, s])),
    domains: new Map(domainRows.map(d => [d.domain, d.siteId])),
  }
  return cache
}

/** Call after creating stores or changing domains. */
export function clearStoreCache() {
  cache = null
}

export function requestHost() {
  try {
    return normalizeDomain(getRequestHeader('x-forwarded-host') || getRequestHeader('host') || '')
  } catch {
    return ''
  }
}

/** The store of the current request. Never throws: falls back to store #1. */
export async function currentStore(): Promise<StoreContext> {
  const host = requestHost()
  const fallback: StoreContext = { id: DEFAULT_SITE_ID, slug: 'servidor-uverley', name: 'Servidor Uverley', host, viaDomain: false }
  let maps
  try {
    maps = await loadMaps()
  } catch (error) {
    console.error('No se pudo leer la lista de tiendas:', error)
    return fallback
  }
  const byDomain = maps.domains.get(host)
  if (byDomain && maps.stores.has(byDomain)) return { ...maps.stores.get(byDomain)!, host, viaDomain: true }

  let chosen: number | undefined
  try {
    chosen = Number(getCookie(COOKIE))
  } catch {}
  if (chosen && maps.stores.has(chosen)) return { ...maps.stores.get(chosen)!, host, viaDomain: false }
  const first = maps.stores.get(DEFAULT_SITE_ID) ?? maps.stores.values().next().value
  return first ? { ...first, host, viaDomain: false } : fallback
}

export async function currentSiteId() {
  return (await currentStore()).id
}

/** Remembers the store an admin is working on (only applies on domains not linked to a store). */
export function rememberStore(siteId: number) {
  if (siteId === DEFAULT_SITE_ID) {
    deleteCookie(COOKIE, { path: '/' })
    return
  }
  setCookie(COOKIE, String(siteId), { path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: 60 * 60 * 24 * 30 })
}

export async function listStores(): Promise<(Store & { domains: string[] })[]> {
  const maps = await loadMaps()
  const domainsBySite = new Map<number, string[]>()
  for (const [domain, siteId] of maps.domains) domainsBySite.set(siteId, [...(domainsBySite.get(siteId) ?? []), domain].sort())
  return [...maps.stores.values()].map(s => ({ ...s, domains: domainsBySite.get(s.id) ?? [] }))
}

export async function storeExists(siteId: number) {
  const [row] = await db.select({ id: sites.id }).from(sites).where(eq(sites.id, siteId))
  return Boolean(row)
}
