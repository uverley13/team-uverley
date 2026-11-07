import { useEffect, useState } from 'react'
import { Download, Search } from 'lucide-react'
import { errorMessage, formatDate } from '../../lib/session'
import { adminListAuditLog } from '../../server/admin.functions'
import { card, Empty, Filter, fieldClass, SectionTitle, useDebounced, type Notify } from './ui'

type Entry = Awaited<ReturnType<typeof adminListAuditLog>>[number]

const GROUP: Record<string, string> = { recarga: 'Recargas', saldo: 'Saldos', pedido: 'Pedidos', servicio: 'Servicios', contenido: 'Contenido', cliente: 'Clientes', datos: 'Datos', copia: 'Copias', tienda: 'Tiendas' }

export function ActivityPanel({ notify }: { notify: Notify }) {
  const [search, setSearch] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const q = useDebounced(search)
  const [rows, setRows] = useState<Entry[] | null>(null)

  useEffect(() => {
    adminListAuditLog({ data: { search: q, from, to } }).then(setRows).catch(e => notify('error', errorMessage(e, 'No se pudo cargar el registro.')))
  }, [q, from, to])

  return (
    <section>
      <SectionTitle title="Registro de actividad" subtitle="Quién aprobó o rechazó recargas, ajustó saldos, editó servicios, publicó o restauró contenido, exportó datos y más." actions={<a href="/api/export/admin_audit_log" className="inline-flex items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm hover:border-gray-500"><Download size={16} /> Exportar CSV</a>} />
      <div className={`${card} mb-6 grid gap-3 p-4 sm:grid-cols-4`}>
        <div className="sm:col-span-2"><Filter label="Buscar"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Administrador, acción o texto" className={`${fieldClass} pl-8`} /></div></Filter></div>
        <Filter label="Desde"><input type="date" value={from} onChange={e => setFrom(e.target.value)} className={fieldClass} /></Filter>
        <Filter label="Hasta"><input type="date" value={to} onChange={e => setTo(e.target.value)} className={fieldClass} /></Filter>
      </div>
      {!rows ? <p className="text-gray-400">Cargando…</p> : rows.length === 0 ? <Empty>Todavía no hay actividad registrada.</Empty> : (
        <div className={`${card} divide-y divide-gray-900`}>
          {rows.map(r => (
            <div key={r.id} className="flex flex-wrap items-start justify-between gap-3 px-5 py-3 text-sm">
              <div className="min-w-0 flex-1"><p>{r.summary}</p><p className="text-xs text-gray-500">{r.actorEmail} · {formatDate(r.createdAt)}</p></div>
              <span className="rounded bg-gray-900 px-2 py-0.5 text-xs text-gray-400">{GROUP[r.action.split('.')[0]] ?? r.action}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
