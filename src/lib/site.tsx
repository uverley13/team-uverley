import { getRouteApi } from '@tanstack/react-router'
import type { SiteConfig } from './site-config'

const rootApi = getRouteApi('__root__')

/** Editable site content loaded by the root route. */
export function useSite(): SiteConfig {
  return rootApi.useLoaderData()
}
