import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { BarChart3, Database, FileText, History, LogOut, Package, Receipt, RefreshCw, ScrollText, ShoppingCart, Sparkles, Store, Users, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { SiteEditor } from '../components/admin/SiteEditor'
import { AssistantPanel } from '../components/admin/AssistantPanel'
import { DatabaseBrowser } from '../components/admin/DatabaseBrowser'
import { Overview } from '../components/admin/Overview'
import { ProofsPanel } from '../components/admin/ProofsPanel'
import { ClientsPanel } from '../components/admin/ClientsPanel'
import { LedgerPanel } from '../components/admin/LedgerPanel'
import { OrdersPanel } from '../components/admin/OrdersPanel'
import { ActivityPanel } from '../components/admin/ActivityPanel'
import { Notifications } from '../components/admin/Notifications'
import { StoreSwitcher, StoresPanel } from '../components/admin/StoresPanel'
import { useSession } from '../lib/session'
import { adminGetStats } from '../server/admin.functions'

export const Route = createFileRoute('/dashboard')({
  head: () => ({ meta: [{ title: 'Panel de administración' }, { name: 'robots', content: 'noindex' }] }),
  component: DashboardPage,
})

type Section = 'inicio' | 'recargas' | 'pedidos' | 'clientes' | 'movimientos' | 'actividad' | 'contenido' | 'asistente' | 'datos' | 'tiendas'
const SECTIONS: Section[] = ['inicio', 'recargas', 'pedidos', 'clientes', 'movimientos', 'actividad', 'contenido', 'asistente', 'datos', 'tiendas']

// Automatic sign-out after inactivity, with a one-minute warning.
const IDLE_MS = 15 * 60 * 1000
const WARNING_MS = 60 * 1000

function useIdleLogout(onTimeout: () => void) {
  const [warning, setWarning] = useState(false)
  const lastActivity = useRef(Date.now())
  useEffect(() => {
    const touch = () => {
      lastActivity.current = Date.now()
      setWarning(false)
    }
    const events = ['mousemove', 'keydown', 'pointerdown', 'scroll', 'touchstart'] as const
    events.forEach(e => window.addEventListener(e, touch, { passive: true }))
    const timer = setInterval(() => {
      const idle = Date.now() - lastActivity.current
      if (idle >= IDLE_MS) onTimeout()
      else if (idle >= IDLE_MS - WARNING_MS) setWarning(true)
    }, 5000)
    return () => {
      events.forEach(e => window.removeEventListener(e, touch))
      clearInterval(timer)
    }
  }, [])
  return warning
}

function DashboardPage() {
  const navigate = useNavigate()
  const { session, ready, logout } = useSession()
  const [section, setSection] = useState<Section>('inicio')
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [badges, setBadges] = useState({ topups: 0, orders: 0 })
  const notify = (kind: 'success' | 'error', text: string) => setNotice({ kind, text })
  const refresh = () => setRefreshKey(k => k + 1)

  useEffect(() => {
    if (!ready) return
    if (!session) navigate({ to: '/login' })
    else if (!session.isAdmin) navigate({ to: '/account' })
  }, [ready, session?.id, session?.isAdmin])

  useEffect(() => {
    if (!session?.isAdmin) return
    adminGetStats()
      .then(s => setBadges({ topups: s.topups.pendingCount, orders: s.sales.activeOrders }))
      .catch(() => {})
  }, [session?.isAdmin, refreshKey])

  async function handleLogout() {
    await logout()
    navigate({ to: '/login' })
  }

  const idleWarning = useIdleLogout(() => {
    void logout().finally(() => {
      window.location.href = '/login'
    })
  })

  if (!ready || !session?.isAdmin) {
    return <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">Verificando acceso…</div>
  }

  const go = (s: string) => {
    if (s === 'servicios') return navigate({ to: '/products' })
    if (SECTIONS.includes(s as Section)) setSection(s as Section)
  }

  const menu: { section: Section; label: string; icon: LucideIcon; badge?: number }[] = [
    { section: 'inicio', label: 'Resumen', icon: BarChart3 },
    { section: 'recargas', label: 'Comprobantes', icon: Receipt, badge: badges.topups },
    { section: 'pedidos', label: 'Pedidos', icon: ShoppingCart, badge: badges.orders },
    { section: 'clientes', label: 'Clientes', icon: Users },
    { section: 'movimientos', label: 'Auditoría financiera', icon: History },
    { section: 'actividad', label: 'Actividad', icon: ScrollText },
    { section: 'contenido', label: 'Contenido', icon: FileText },
    { section: 'asistente', label: 'Asistente IA', icon: Sparkles },
    { section: 'datos', label: 'Base de datos', icon: Database },
    { section: 'tiendas', label: 'Tiendas', icon: Store },
  ]

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-black/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo />
            <span className="hidden rounded-md bg-blue-600/20 px-2 py-1 font-mono text-xs text-blue-300 sm:inline">admin</span>
            <span className="hidden truncate text-xs text-gray-500 md:inline">{session.email}</span>
          </div>
          <div className="flex gap-2">
            <StoreSwitcher notify={notify} onManage={() => setSection('tiendas')} />
            <Link to="/products" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"><Package size={18} /><span className="hidden sm:inline">Servicios</span></Link>
            <Notifications onOpenLink={go} onNew={refresh} />
            <button onClick={refresh} className="rounded-lg border border-gray-800 p-2.5 hover:border-gray-600" title="Actualizar" aria-label="Actualizar"><RefreshCw size={18} /></button>
            <button onClick={() => void handleLogout()} className="rounded-lg border border-gray-800 p-2.5 hover:border-gray-600" title="Cerrar sesión" aria-label="Cerrar sesión"><LogOut size={18} /></button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8">
        <nav className="mb-8 flex gap-2 overflow-x-auto pb-2">
          {menu.map(item => (
            <button key={item.section} onClick={() => setSection(item.section)} className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${section === item.section ? 'bg-gray-100 text-black' : 'border border-gray-800 bg-gray-950 text-gray-300 hover:border-gray-700'}`}>
              <item.icon size={16} /> {item.label}
              {!!item.badge && <span className="rounded-full bg-blue-600 px-1.5 font-mono text-xs text-white">{item.badge}</span>}
            </button>
          ))}
        </nav>

        {notice && (
          <div role="status" className={`mb-6 flex items-start justify-between gap-4 rounded-lg border px-4 py-3 text-sm ${notice.kind === 'success' ? 'border-green-800 bg-green-900/40 text-green-200' : 'border-red-900 bg-red-950/50 text-red-300'}`}>
            {notice.text}
            <button onClick={() => setNotice(null)} aria-label="Cerrar"><X size={16} /></button>
          </div>
        )}

        <div key={`${section}-${section === 'contenido' || section === 'asistente' ? 0 : refreshKey}`}>
          {section === 'inicio' && <Overview go={go} refreshKey={refreshKey} />}
          {section === 'recargas' && <ProofsPanel notify={notify} onChange={refresh} />}
          {section === 'pedidos' && <OrdersPanel notify={notify} onChange={refresh} />}
          {section === 'clientes' && <ClientsPanel notify={notify} />}
          {section === 'movimientos' && <LedgerPanel notify={notify} />}
          {section === 'actividad' && <ActivityPanel notify={notify} />}
          {section === 'contenido' && <SiteEditor notify={notify} />}
          {section === 'asistente' && <AssistantPanel notify={notify} />}
          {section === 'datos' && <DatabaseBrowser />}
          {section === 'tiendas' && <StoresPanel notify={notify} />}
        </div>
      </main>

      {idleWarning && (
        <div role="alertdialog" className="fixed bottom-4 right-4 z-[70] max-w-sm rounded-xl border border-yellow-800 bg-gray-950 p-4 text-sm shadow-2xl">
          <p className="font-semibold text-yellow-300">Tu sesión se cerrará por inactividad</p>
          <p className="mt-1 text-gray-400">Por seguridad, el panel cierra la sesión tras 15 minutos sin actividad. Mueve el ratón o pulsa una tecla para continuar.</p>
        </div>
      )}
    </div>
  )
}
