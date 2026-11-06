import type { ReactNode } from 'react'
import { createRootRoute, HeadContent, Link, Outlet, Scripts } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { SessionProvider } from '../lib/session'
import { PasswordRecovery } from '../components/PasswordRecovery'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { name: 'theme-color', content: '#000000' },
      { name: 'description', content: 'Servidor Uverley: servicios digitales, pedidos y soporte personalizado.' },
      { title: 'Servidor Uverley' },
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
  return (
    <html lang="es">
      <head>
        <HeadContent />
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
