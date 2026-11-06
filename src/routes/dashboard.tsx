import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useMemo, useState } from 'react'
import { Check, ExternalLink, History, LogOut, Package, RefreshCw, ShoppingCart, Users, Wallet, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Logo } from '../components/Logo'
import { errorMessage, formatDate, formatPrice, useSession } from '../lib/session'
import { adminChangeBalance, adminReviewTopup, adminSetOrderStatus, getAdminData, ORDER_STATUSES } from '../server/store.functions'

export const Route = createFileRoute('/dashboard')({
  head: () => ({ meta: [{ title: 'Panel · Servidor Uverley' }] }),
  component: DashboardPage,
})

type AdminData = Awaited<ReturnType<typeof getAdminData>>
type Client = AdminData['clients'][number]
type Section = 'inicio' | 'clientes' | 'movimientos' | 'pedidos' | 'recargas'

const card = 'rounded-xl border border-gray-800 bg-gray-950'
const fieldClass = 'w-full rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 focus:border-blue-500 focus:outline-none'

function DashboardPage() {
  const navigate = useNavigate()
  const { session, ready, logout } = useSession()
  const [data, setData] = useState<AdminData | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [section, setSection] = useState<Section>('inicio')
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [search, setSearch] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (!ready) return
    if (!session) navigate({ to: '/login' })
    else if (!session.isAdmin) navigate({ to: '/account' })
    else void loadData()
  }, [ready, session?.id, session?.isAdmin])

  async function loadData() {
    setRefreshing(true)
    try {
      setData(await getAdminData())
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudieron cargar los datos.') })
    } finally {
      setRefreshing(false)
    }
  }

  const emailById = useMemo(() => new Map((data?.clients ?? []).map(c => [c.id, c.email])), [data])
  const clientLabel = (id: string) => emailById.get(id) ?? `Usuario ${id.slice(0, 8)}…`

  async function changeBalance(type: 'recarga' | 'descuento') {
    if (!selectedClient) return
    const numericAmount = Number(amount.replace(/\D/g, ''))
    if (!numericAmount) return setNotice({ kind: 'error', text: 'Escribe un monto válido.' })
    if (!window.confirm(`¿Confirmas ${type === 'recarga' ? 'agregar' : 'descontar'} ${formatPrice(numericAmount)} a ${selectedClient.email}?`)) return
    setProcessing(true)
    try {
      const result = await adminChangeBalance({ data: { userId: selectedClient.id, amount: numericAmount, type, description } })
      setNotice({ kind: 'success', text: `Saldo actualizado. Nuevo saldo de ${selectedClient.email}: ${formatPrice(result.balance)}` })
      setAmount('')
      setDescription('')
      setSelectedClient(null)
      await loadData()
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudo modificar el saldo.') })
    } finally {
      setProcessing(false)
    }
  }

  async function reviewTopup(topupId: number, approve: boolean, value: number) {
    if (!window.confirm(approve ? `¿Aprobar ${formatPrice(value)} y acreditarlo al cliente?` : '¿Rechazar esta recarga?')) return
    setProcessing(true)
    try {
      await adminReviewTopup({ data: { topupId, approve } })
      setNotice({ kind: 'success', text: approve ? 'Recarga aprobada y saldo acreditado.' : 'Recarga rechazada.' })
      await loadData()
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudo revisar la recarga.') })
    } finally {
      setProcessing(false)
    }
  }

  async function changeOrderStatus(orderId: number, status: string) {
    setProcessing(true)
    try {
      const updated = await adminSetOrderStatus({ data: { orderId, status } })
      setData(current => current && { ...current, orders: current.orders.map(o => (o.id === orderId ? updated : o)) })
    } catch (error) {
      setNotice({ kind: 'error', text: errorMessage(error, 'No se pudo cambiar el estado.') })
    } finally {
      setProcessing(false)
    }
  }

  async function handleLogout() {
    await logout()
    navigate({ to: '/' })
  }

  if (!ready || !session?.isAdmin || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-gray-400">
        {notice?.kind === 'error' ? notice.text : 'Verificando acceso…'}
      </div>
    )
  }

  const pendingOrders = data.orders.filter(o => o.status === 'pendiente' || o.status === 'en proceso').length
  const totalBalance = data.clients.reduce((sum, c) => sum + c.balance, 0)
  const filteredClients = data.clients.filter(c => `${c.email} ${c.username}`.toLowerCase().includes(search.toLowerCase()))

  const menu: { section: Section; label: string; icon: LucideIcon; badge?: number }[] = [
    { section: 'inicio', label: 'Resumen', icon: Wallet },
    { section: 'recargas', label: 'Recargas', icon: Wallet, badge: data.topups.length },
    { section: 'pedidos', label: 'Pedidos', icon: ShoppingCart, badge: pendingOrders },
    { section: 'clientes', label: 'Clientes', icon: Users },
    { section: 'movimientos', label: 'Movimientos', icon: History },
  ]

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-black/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Logo /><span className="hidden rounded-md bg-blue-600/20 px-2 py-1 font-mono text-xs text-blue-300 sm:inline">admin</span></div>
          <div className="flex gap-2">
            <Link to="/products" className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-500"><Package size={18} /><span className="hidden sm:inline">Servicios</span></Link>
            <button onClick={() => void loadData()} disabled={refreshing} className="rounded-lg border border-gray-800 p-2.5 hover:border-gray-600" title="Actualizar" aria-label="Actualizar"><RefreshCw size={18} className={refreshing ? 'animate-spin' : ''} /></button>
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

        {section === 'inicio' && (
          <section>
            <h1 className="mb-6 text-3xl font-bold">Resumen</h1>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Clientes', value: String(data.clients.length) },
                { label: 'Recargas por revisar', value: String(data.topups.length), go: 'recargas' as Section },
                { label: 'Pedidos activos', value: String(pendingOrders), go: 'pedidos' as Section },
                { label: 'Saldo total de clientes', value: formatPrice(totalBalance) },
              ].map(stat => (
                <button key={stat.label} onClick={() => stat.go && setSection(stat.go)} className={`${card} p-6 text-left ${stat.go ? 'hover:border-gray-700' : 'cursor-default'}`}>
                  <p className="text-sm text-gray-400">{stat.label}</p>
                  <p className="mt-2 font-mono text-3xl font-medium">{stat.value}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        {section === 'recargas' && (
          <section>
            <h1 className="mb-6 text-3xl font-bold">Recargas por revisar</h1>
            {data.topups.length === 0 ? (
              <p className={`${card} p-8 text-center text-gray-400`}>No hay recargas pendientes.</p>
            ) : (
              <div className="space-y-3">
                {data.topups.map(topup => (
                  <div key={topup.id} className={`${card} flex flex-wrap items-center justify-between gap-4 p-5`}>
                    <div>
                      <p className="font-semibold">{clientLabel(topup.userId)}</p>
                      <p className="font-mono text-xl text-green-400">{formatPrice(topup.amount)}</p>
                      <p className="text-xs text-gray-500">#{topup.id} · {formatDate(topup.createdAt)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <a href={topup.proofUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><ExternalLink size={15} /> Ver comprobante</a>
                      <button disabled={processing} onClick={() => void reviewTopup(topup.id, false, topup.amount)} className="inline-flex items-center gap-2 rounded-lg border border-red-900 px-4 py-2 text-sm text-red-300 hover:bg-red-950/50 disabled:opacity-50"><X size={15} /> Rechazar</button>
                      <button disabled={processing} onClick={() => void reviewTopup(topup.id, true, topup.amount)} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"><Check size={15} /> Aprobar</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'pedidos' && (
          <section>
            <h1 className="mb-6 text-3xl font-bold">Pedidos</h1>
            {data.orders.length === 0 ? (
              <p className={`${card} p-8 text-center text-gray-400`}>Todavía no hay pedidos.</p>
            ) : (
              <div className="space-y-3">
                {data.orders.map(order => (
                  <div key={order.id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
                    <div>
                      <p className="font-mono text-xs text-gray-500">#{order.id} · {formatDate(order.createdAt)}</p>
                      <p className="font-semibold">{order.productName}</p>
                      <p className="text-sm text-gray-400">{clientLabel(order.userId)} · <span className="font-mono">{formatPrice(order.price)}</span></p>
                    </div>
                    <div className="flex items-center gap-2">
                      <select value={order.status} disabled={processing} onChange={e => void changeOrderStatus(order.id, e.target.value)} className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 capitalize">
                        {ORDER_STATUSES.map(status => <option key={status} value={status}>{status}</option>)}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'clientes' && (
          <section>
            <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
              <h1 className="text-3xl font-bold">Clientes y saldos</h1>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por correo o nombre" className={`${fieldClass} max-w-xs`} />
            </div>
            {selectedClient && (
              <div className={`${card} mb-6 border-blue-700 p-5`}>
                <div className="mb-4 flex items-center justify-between">
                  <p className="font-semibold">Modificar saldo de {selectedClient.email} <span className="font-mono text-gray-400">({formatPrice(selectedClient.balance)})</span></p>
                  <button onClick={() => setSelectedClient(null)} aria-label="Cancelar"><X size={18} /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto en COP" className={fieldClass} inputMode="numeric" />
                  <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción (opcional)" className={fieldClass} />
                </div>
                <div className="mt-3 flex gap-2">
                  <button disabled={processing} onClick={() => void changeBalance('recarga')} className="rounded-lg bg-green-600 px-4 py-2 font-semibold text-white hover:bg-green-700 disabled:opacity-50">Agregar saldo</button>
                  <button disabled={processing} onClick={() => void changeBalance('descuento')} className="rounded-lg border border-red-900 px-4 py-2 text-red-300 hover:bg-red-950/50 disabled:opacity-50">Descontar</button>
                </div>
              </div>
            )}
            {filteredClients.length === 0 ? (
              <p className={`${card} p-8 text-center text-gray-400`}>No hay clientes que coincidan.</p>
            ) : (
              <div className="space-y-3">
                {filteredClients.map(client => (
                  <div key={client.id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
                    <div>
                      <p className="font-semibold">{client.username || client.email}</p>
                      <p className="text-sm text-gray-400">{client.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-mono text-green-400">{formatPrice(client.balance)}</span>
                      <button onClick={() => setSelectedClient(client)} className="rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500">Modificar saldo</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'movimientos' && (
          <section>
            <h1 className="mb-6 text-3xl font-bold">Historial de saldo</h1>
            {data.transactions.length === 0 ? (
              <p className={`${card} p-8 text-center text-gray-400`}>Sin movimientos todavía.</p>
            ) : (
              <div className={`${card} divide-y divide-gray-900`}>
                {data.transactions.map(t => (
                  <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
                    <div>
                      <p className="font-semibold">{clientLabel(t.userId)}</p>
                      <p className="text-sm text-gray-400">{t.description ?? t.type} · {formatDate(t.createdAt)}</p>
                    </div>
                    <span className={`font-mono ${t.amount >= 0 ? 'text-green-400' : 'text-red-300'}`}>{t.amount >= 0 ? '+' : '−'}{formatPrice(Math.abs(t.amount))}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </main>
    </div>
  )
}
