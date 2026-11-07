import { getRouteApi } from '@tanstack/react-router'
import { createContext, useContext } from 'react'
import { siteName, type SiteConfig } from './site-config'

const rootApi = getRouteApi('__root__')

/** Draft content sent by the admin editor to a preview frame. Only exists inside that frame. */
export const SitePreviewContext = createContext<SiteConfig | null>(null)

/** Editable site content loaded by the root route (or the draft, inside the admin preview). */
export function useSite(): SiteConfig {
  const preview = useContext(SitePreviewContext)
  const live = rootApi.useLoaderData()
  return preview ?? live
}

/** "<page> · <store name>", using the store content loaded by the root route. */
export function pageTitle(matches: ReadonlyArray<{ loaderData?: unknown }>, page: string) {
  const site = matches[0]?.loaderData as SiteConfig | undefined
  const name = site?.brand ? siteName(site) : ''
  return name ? `${page} · ${name}` : page
}
