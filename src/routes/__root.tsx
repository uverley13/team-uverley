import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { SessionProvider } from '../lib/session'
import { PasswordRecovery } from '../components/PasswordRecovery'
import { getSiteConfig } from '../server/site.functions'
import { siteName, themeCss } from '../lib/site-config'
import { useSite } from '../lib/site'

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

function RootDocument({ children }: { children: ReactNode }) {
  const site = useSite()
  return (
    <html lang="es">
      <head>
        <HeadContent />
        {site && <style dangerouslySetInnerHTML={{ __html: themeCss(site.theme) }} />}
      </head>
      <body>
        <SessionProvider>
          {children}
          <PasswordRecovery />
        </SessionProvider>
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
