import { useEffect, useState, type ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { SessionProvider } from '../lib/session'
import { PasswordRecovery } from '../components/PasswordRecovery'
import { getSiteConfig } from '../server/site.functions'
import { normalizeSite, siteName, themeCss, type SiteConfig } from '../lib/site-config'
import { SitePreviewContext, useSite } from '../lib/site'

export const Route = createRootRoute({
  loader: () => getSiteConfig(),
  staleTime: 60_000,
  head: ({ loaderData }) => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#000000' },
      ...(loaderData ? [{ name: 'description', content: loaderData.brand.metaDescription }, { title: siteName(loaderData) }] : [{ title: 'Servidor Uverley' }]),
    ],
    links: [
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&display=swap',
      },
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico' },
    ],
  }),
  shellComponent: RootDocument,
  component: Outlet,
  notFoundComponent: NotFound,
})

/**
 * Inside the admin editor's preview frame (?vista-previa=1), the page renders the
 * draft content the editor sends via postMessage. Visitors never see drafts:
 * the draft only exists in the admin's browser memory.
 */
function usePreviewSite() {
  const [preview, setPreview] = useState<SiteConfig | null>(null)
  useEffect(() => {
    if (window.parent === window || !new URLSearchParams(window.location.search).has('vista-previa')) return
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.data?.type !== 'site-preview') return
      setPreview(normalizeSite(event.data.site))
    }
    window.addEventListener('message', onMessage)
    window.parent.postMessage({ type: 'site-preview-ready' }, window.location.origin)
    return () => window.removeEventListener('message', onMessage)
  }, [])
  return preview
}

function RootDocument({ children }: { children: ReactNode }) {
  const live = useSite()
  const preview = usePreviewSite()
  const site = preview ?? live
  return (
    <html lang="es">
      <head>
        <HeadContent />
        {site && <style dangerouslySetInnerHTML={{ __html: themeCss(site.theme) }} />}
      </head>
      <body>
        <SitePreviewContext.Provider value={preview}>
          <SessionProvider>
            {children}
            <PasswordRecovery />
          </SessionProvider>
        </SitePreviewContext.Provider>
        <Scripts />
      </body>
    </html>
  )
}

function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-4 text-center">
      <p className="font-mono text-sm uppercase tracking-[0.3em] text-blue-400">Error 404</p>
      <h1 className="text-5xl font-bold">Página no encontrada</h1>
      <p className="text-gray-400 text-lg">La página que buscas no existe.</p>
      <Link to="/" className="bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold">
        Volver al inicio
      </Link>
    </div>
  )
}
