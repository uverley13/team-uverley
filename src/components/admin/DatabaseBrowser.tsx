import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Database, Download, HardDriveDownload, Search } from 'lucide-react'
import { errorMessage, formatDate } from '../../lib/session'
import { adminCreateBackup, adminListBackups } from '../../server/admin.functions'
import { adminBrowseTable } from '../../server/database.functions'

const TABLES = [
  { id: 'profiles', label: 'Clientes' },
  { id: 'topups', label: 'Recargas' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'balance_transactions', label: 'Movimientos de saldo' },
  { id: 'products', label: 'Servicios' },
  { id: 'admin_audit_log', label: 'Registro de actividad' },
  { id: 'admin_notifications', label: 'Notificaciones' },
  { id: 'site_settings_revisions', label: 'Versiones del contenido' },
]

type Backup = Awaited<ReturnType<typeof adminListBackups>>[number]

function Backups() {
  const [items, setItems] = useState<Backup[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const load = () => adminListBackups().then(setItems).catch(() => setItems([]))
  useEffect(() => void load(), [])
  async function create() {
    if (!window.confirm('¿Crear ahora una copia de seguridad completa de la base de datos?')) return
    setBusy(true)
    setMessage('')
    try {
      await adminCreateBackup()
      setMessage('Copia creada.')
      await load()
    } catch (e) {
      setMessage(errorMessage(e, 'No se pudo crear la copia.'))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="mt-10 rounded-xl border border-gray-800 bg-gray-950 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-lg font-semibold"><HardDriveDownload size={18} className="text-blue-400" /> Copias de seguridad</p>
          <p className="text-sm text-gray-400">Se crea una copia automática cada día y se conservan las últimas 60. Cada copia incluye clientes, saldos, recargas, pedidos, movimientos, servicios, contenido y registro de actividad.</p>
        </div>
        <button disabled={busy} onClick={() => void create()} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{busy ? 'Creando…' : 'Crear copia ahora'}</button>
      </div>
      {message && <p className="mb-3 text-sm text-gray-300">{message}</p>}
      {!items ? <p className="text-sm text-gray-500">Cargando…</p> : items.length === 0 ? <p className="text-sm text-gray-500">Todavía no hay copias. La primera automática se crea en las próximas 24 horas.</p> : (
        <div className="divide-y divide-gray-900 text-sm">
          {items.map(b => (
            <div key={b.key} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
              <div>
                <p>{b.createdAt ? formatDate(b.createdAt) : b.key} <span className="ml-1 rounded bg-gray-900 px-1.5 text-xs text-gray-400">{b.trigger === 'manual' ? `manual · ${b.by ?? ''}` : 'automática'}</span></p>
                <p className="text-xs text-gray-500">{b.counts.profiles ?? 0} clientes · {b.counts.topups ?? 0} recargas · {b.counts.orders ?? 0} pedidos · {b.counts.balance_transactions ?? 0} movimientos</p>
              </div>
              <a href={`/api/backups/${b.key}`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-xs hover:border-gray-500"><Download size={13} /> Descargar</a>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type Result = Awaited<ReturnType<typeof adminBrowseTable>>

export function DatabaseBrowser() {
  const [table, setTable] = useState(TABLES[0].id)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    adminBrowseTable({ data: { table, page, search: query } })
      .then(r => { if (!cancelled) setResult(r) })
      .catch(e => { if (!cancelled) setError(errorMessage(e, 'No se pudo leer la tabla.')) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [table, page, query])

  return (
    <section>
      <h1 className="mb-2 flex items-center gap-2 text-3xl font-bold"><Database className="text-blue-400" /> Base de datos</h1>
      <p className="mb-6 text-sm text-gray-400">Consulta todos los registros guardados. Para modificarlos usa las secciones del panel, así los saldos y el historial siempre cuadran.</p>

      <div className="mb-4 flex flex-wrap gap-2">
        {TABLES.map(t => (
          <button key={t.id} onClick={() => { setTable(t.id); setPage(1); setSearch(''); setQuery('') }} className={`rounded-lg px-3 py-2 text-sm font-semibold ${table === t.id ? 'bg-gray-100 text-black' : 'border border-gray-800 text-gray-300 hover:border-gray-600'}`}>{t.label}</button>
        ))}
      </div>

      <form onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search) }} className="mb-4 flex max-w-xl gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
        <button className="rounded-lg border border-gray-700 px-3 hover:border-gray-500" aria-label="Buscar"><Search size={16} /></button>
        <a href={`/api/export/${table}${query ? `?q=${encodeURIComponent(query)}` : ''}`} className="inline-flex items-center gap-2 whitespace-nowrap rounded-lg border border-gray-700 px-3 text-sm hover:border-gray-500"><Download size={16} /> CSV / Excel</a>
      </form>

      {error && <p className="mb-4 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>}

      <div className={`overflow-x-auto rounded-xl border border-gray-800 bg-gray-950 ${loading ? 'opacity-60' : ''}`}>
        {result && result.rows.length > 0 ? (
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-800 font-mono text-xs uppercase text-gray-500">
              <tr>{result.columns.map(c => <th key={c} className="whitespace-nowrap px-4 py-3">{c}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {result.rows.map((row, i) => (
                <tr key={i} className="hover:bg-gray-900/50">
                  {row.map((v, j) => (
                    <td key={j} className="max-w-xs truncate whitespace-nowrap px-4 py-2.5 font-mono text-xs" title={v === null ? '' : String(v)}>
                      {v === null ? <span className="text-gray-600">—</span> : String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="p-8 text-center text-gray-400">{loading ? 'Cargando…' : 'No hay registros.'}</p>
        )}
      </div>

      {result && (
        <div className="mt-4 flex items-center justify-between text-sm text-gray-400">
          <span>{result.total} registros</span>
          <div className="flex items-center gap-2">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="rounded-lg border border-gray-800 p-2 disabled:opacity-30" aria-label="Anterior"><ChevronLeft size={16} /></button>
            <span>Página {result.page} de {result.pages}</span>
            <button disabled={page >= result.pages} onClick={() => setPage(p => p + 1)} className="rounded-lg border border-gray-800 p-2 disabled:opacity-30" aria-label="Siguiente"><ChevronRight size={16} /></button>
          </div>
        </div>
      )}

      <Backups />
    </section>
  )
}
