import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, Database, Search } from 'lucide-react'
import { errorMessage } from '../../lib/session'
import { adminBrowseTable } from '../../server/database.functions'

const TABLES = [
  { id: 'profiles', label: 'Clientes' },
  { id: 'topups', label: 'Recargas' },
  { id: 'orders', label: 'Pedidos' },
  { id: 'balance_transactions', label: 'Movimientos de saldo' },
  { id: 'products', label: 'Servicios' },
  { id: 'site_settings_revisions', label: 'Versiones del contenido' },
]

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

      <form onSubmit={e => { e.preventDefault(); setPage(1); setQuery(search) }} className="mb-4 flex max-w-md gap-2">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar…" className="flex-1 rounded-lg border border-gray-800 bg-gray-900 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none" />
        <button className="rounded-lg border border-gray-700 px-3 hover:border-gray-500" aria-label="Buscar"><Search size={16} /></button>
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
    </section>
  )
}
