import { HeadContent, Scripts, createRootRoute, Outlet } from '@tanstack/react-router'

import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Team Uverley - Servicios Elite 2026' },
      { name: 'description', content: 'Bypass iCloud FMI OFF • Eliminación iCloud • FRP Bypass • Liberación Permanente • Check IMEI Blacklist • Soporte 24/7' },
    ],
  }),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <head>
        <HeadContent />
      </head>
      <body className="bg-black text-white min-h-screen">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
