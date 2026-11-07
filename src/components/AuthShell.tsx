import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { ArrowLeft, CheckCircle2 } from 'lucide-react'
import { Logo } from './Logo'
import { useSite } from '../lib/site'
import { siteName } from '../lib/site-config'

export function AuthShell({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer: ReactNode }) {
  const site = useSite()
  const highlights = [
    'Pedidos registrados con su estado en tiempo real',
    `Recargas por ${site.payments.method} validadas por una persona`,
    'Soporte directo por WhatsApp',
  ]
  return (
    <div className="grain grid min-h-screen bg-black text-gray-100 lg:grid-cols-[1fr_1.1fr]">
      <aside className="relative hidden overflow-hidden border-r border-gray-900 bg-gray-950 p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-blue-600/15 blur-[110px]" />
        <div className="relative"><Logo /></div>
        <div className="relative">
          <h2 className="max-w-md text-4xl font-bold leading-tight">Tu cuenta, tus pedidos y tu saldo en un solo lugar.</h2>
          <ul className="mt-8 space-y-4">
            {highlights.map(item => (
              <li key={item} className="flex items-center gap-3 text-gray-300">
                <CheckCircle2 size={18} className="shrink-0 text-blue-400" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative font-mono text-xs text-gray-600">© {new Date().getFullYear()} {siteName(site)}</p>
      </aside>

      <main className="flex flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <div className="lg:hidden"><Logo /></div>
          <Link to="/" className="ml-auto inline-flex items-center gap-2 text-sm text-gray-400 hover:text-gray-100">
            <ArrowLeft size={16} /> Volver al inicio
          </Link>
        </div>
        <div className="fade-in mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-2 text-gray-400">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-gray-400">{footer}</div>
        </div>
      </main>
    </div>
  )
}

export const inputClass =
  'w-full rounded-lg border border-gray-800 bg-gray-950 px-4 py-3 text-gray-100 placeholder-gray-600 transition-colors focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20'

export function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-gray-300">{label}</label>
      {children}
    </div>
  )
}
