import { useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { errorMessage, formatDate, formatPrice } from '../../lib/session'
import { adminListTransactions } from '../../server/admin.functions'
import { card, Empty, Filter, fieldClass, Money, MOVEMENT_LABELS, SectionTitle, useDebounced, type Notify } from './ui'

type Row = Awaited<ReturnType<typeof adminListTransactions>>[number]

/** Financial audit: every balance movement with balance before/after, admin and reason. */
export function LedgerPanel({ notify }: { notify: Notify }) {
  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const q = useDebounced(search)
  const [rows, setRows] = useState<Row[] | null>(null)

  useEffect(() => {
    adminListTransactions({ data: { search: q, type, from, to } }).then(setRows).catch(e => notify('error', errorMessage(e, 'No se pudo cargar la auditoría.')))
  }, [q, type, from, to])

  const credits = rows?.filter(r => r.amount > 0).reduce((s, r) => s + r.amount, 0) ?? 0
  const debits = rows?.filter(r => r.amount < 0).reduce((s, r) => s + r.amount, 0) ?? 0

  return (
    <section>
      <SectionTitle
        title="Auditoría financiera"
        subtitle="Cada movimiento de dinero con saldo anterior, monto, saldo resultante, cliente, administrador responsable, motivo y fecha."
        actions={<a href="/api/export/balance_transactions" className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><Download size={16} /> Exportar CSV</a>}
      />
      <div className={`${card} mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5`}>
        <div className="sm:col-span-2"><Filter label="Buscar"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cliente, ID, motivo, referencia o #movimiento" className={`${fieldClass} pl-8`} /></div></Filter></div>
        <Filter label="Tipo"><select value={type} onChange={e => setType(e.target.value)} className={fieldClass}><option value="all">Todos</option><option value="recarga">Recargas</option><option value="pedido">Pedidos</option><option value="ajuste">Ajustes manuales</option></select></Filter>
        <Filter label="Desde"><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldClass} /></Filter>
        <Filter label="Hasta"><input type="date" value={to} onChange={e => setTo(e.target.value)} className={fieldClass} /></Filter>
      </div>
      {rows && <p className="mb-4 text-sm text-gray-400">{rows.length} movimientos · Entradas <span className="font-mono text-green-400">{formatPrice(credits)}</span> · Salidas <span className="font-mono text-red-300">{formatPrice(Math.abs(debits))}</span></p>}
      {!rows ? <p className="text-gray-400">Cargando…</p> : rows.length === 0 ? <Empty>Sin movimientos para estos filtros.</Empty> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[900px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="p-3">ID</th><th className="p-3">Fecha</th><th className="p-3">Cliente</th><th className="p-3">Tipo</th><th className="p-3 text-right">Saldo anterior</th><th className="p-3 text-right">Monto</th><th className="p-3 text-right">Saldo resultante</th><th className="p-3">Responsable / motivo</th></tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="p-3 font-mono text-xs text-gray-500">#{r.id}</td>
                  <td className="whitespace-nowrap p-3 text-xs text-gray-400">{formatDate(r.createdAt)}</td>
                  <td className="p-3"><p className="max-w-48 truncate">{r.email}</p><p className="max-w-48 truncate font-mono text-[10px] text-gray-600">{r.userId}</p></td>
                  <td className="p-3">{MOVEMENT_LABELS[r.type] ?? r.type}{r.reference && <p className="font-mono text-[10px] text-gray-500">{r.reference}</p>}</td>
                  <td className="p-3 text-right font-mono text-gray-400">{r.balanceBefore === null ? '—' : formatPrice(r.balanceBefore)}</td>
                  <td className="p-3 text-right"><Money value={r.amount} signed /></td>
                  <td className="p-3 text-right font-mono">{r.balanceAfter === null ? '—' : formatPrice(r.balanceAfter)}</td>
                  <td className="p-3 text-xs"><p className="text-gray-300">{r.adminEmail ?? (r.type === 'pedido' ? 'Cliente (compra)' : 'Sistema')}</p><p className="text-gray-500">{r.reason ?? r.description}</p></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-gray-500">Los movimientos anteriores a esta actualización no tienen saldo anterior/resultante registrado y se muestran con "—".</p>
    </section>
  )
}
