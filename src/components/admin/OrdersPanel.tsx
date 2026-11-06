import { useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { errorMessage, formatDate, formatPrice } from '../../lib/session'
import { adminListOrders } from '../../server/admin.functions'
import { adminSetOrderStatus, ORDER_STATUSES } from '../../server/store.functions'
import { card, Empty, Filter, fieldClass, SectionTitle, useDebounced, type Notify } from './ui'

type Order = Awaited<ReturnType<typeof adminListOrders>>[number]

export function OrdersPanel({ notify, onChange }: { notify: Notify; onChange: () => void }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('all')
  const q = useDebounced(search)
  const [orders, setOrders] = useState<Order[] | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    adminListOrders({ data: { search: q, status } }).then(setOrders).catch(e => notify('error', errorMessage(e, 'No se pudieron cargar los pedidos.')))
  }, [q, status])

  async function change(order: Order, next: string) {
    if (next === 'cancelado' && !window.confirm(`¿Marcar el pedido #${order.id} como cancelado? El saldo NO se devuelve automáticamente; si corresponde, haz un ajuste en la ficha del cliente.`)) return
    setBusy(true)
    try {
      const updated = await adminSetOrderStatus({ data: { orderId: order.id, status: next } })
      setOrders(list => list?.map(o => (o.id === order.id ? { ...o, status: updated.status, updatedAt: updated.updatedAt } : o)) ?? null)
      onChange()
    } catch (e) {
      notify('error', errorMessage(e, 'No se pudo cambiar el estado.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section>
      <SectionTitle title="Pedidos" actions={<a href="/api/export/orders" className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><Download size={16} /> Exportar CSV</a>} />
      <div className={`${card} mb-6 grid gap-3 p-4 sm:grid-cols-3`}>
        <div className="sm:col-span-2"><Filter label="Buscar"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cliente, servicio o #pedido" className={`${fieldClass} pl-8`} /></div></Filter></div>
        <Filter label="Estado"><select value={status} onChange={e => setStatus(e.target.value)} className={`${fieldClass} capitalize`}><option value="all">Todos</option>{ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select></Filter>
      </div>
      {!orders ? <p className="text-gray-400">Cargando…</p> : orders.length === 0 ? <Empty>No hay pedidos.</Empty> : (
        <div className="space-y-3">
          {orders.map(order => (
            <div key={order.id} className={`${card} flex flex-wrap items-center justify-between gap-3 p-4`}>
              <div>
                <p className="font-mono text-xs text-gray-500">#{order.id} · creado {formatDate(order.createdAt)} · actualizado {formatDate(order.updatedAt)}</p>
                <p className="font-semibold">{order.productName}</p>
                <p className="text-sm text-gray-400">{order.email} · <span className="font-mono">{formatPrice(order.price)}</span></p>
              </div>
              <select value={order.status} disabled={busy} onChange={e => void change(order, e.target.value)} className="rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 capitalize">
                {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
