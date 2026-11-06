import { useEffect, useState } from 'react'
import { AlertTriangle, Check, Download, Search, X, ZoomIn } from 'lucide-react'
import { errorMessage, formatDate, formatPrice } from '../../lib/session'
import { adminListTopups, type TopupFilters } from '../../server/admin.functions'
import { adminReviewTopup } from '../../server/store.functions'
import { card, Empty, Filter, fieldClass, SectionTitle, TOPUP_STATUS, useDebounced, type Notify } from './ui'

type Result = Awaited<ReturnType<typeof adminListTopups>>
type Topup = Result['items'][number]

export function ProofsPanel({ notify, onChange }: { notify: Notify; onChange: () => void }) {
  const [filters, setFilters] = useState<Required<Pick<TopupFilters, 'status'>> & { search: string; from: string; to: string; min: string; max: string }>({ status: 'pending', search: '', from: '', to: '', min: '', max: '' })
  const search = useDebounced(filters.search)
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [preview, setPreview] = useState<Topup | null>(null)
  const [reviewing, setReviewing] = useState<{ topup: Topup; approve: boolean } | null>(null)
  const [note, setNote] = useState('')
  const [processing, setProcessing] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    adminListTopups({ data: { status: filters.status, search, from: filters.from, to: filters.to, min: Number(filters.min.replace(/\D/g, '')) || undefined, max: Number(filters.max.replace(/\D/g, '')) || undefined } })
      .then(r => { if (!cancelled) setResult(r) })
      .catch(e => notify('error', errorMessage(e, 'No se pudieron cargar los comprobantes.')))
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [filters.status, search, filters.from, filters.to, filters.min, filters.max, reload])

  const set = (k: keyof typeof filters) => (v: string) => setFilters(f => ({ ...f, [k]: v }))

  async function confirmReview() {
    if (!reviewing) return
    if (!reviewing.approve && note.trim().length < 3) return notify('error', 'Escribe el motivo del rechazo.')
    setProcessing(true)
    try {
      await adminReviewTopup({ data: { topupId: reviewing.topup.id, approve: reviewing.approve, note } })
      notify('success', reviewing.approve ? `Recarga #${reviewing.topup.id} aprobada: ${formatPrice(reviewing.topup.amount)} acreditados.` : `Recarga #${reviewing.topup.id} rechazada.`)
      setReviewing(null)
      setPreview(null)
      setNote('')
      setReload(n => n + 1)
      onChange()
    } catch (error) {
      notify('error', errorMessage(error, 'No se pudo revisar la recarga.'))
      setReload(n => n + 1)
    } finally {
      setProcessing(false)
    }
  }

  const s = result?.summary
  return (
    <section>
      <SectionTitle title="Comprobantes de recarga" subtitle="Cada comprobante solo puede revisarse una vez. Las imágenes y referencias repetidas se bloquean al enviarse y se marcan aquí." />

      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <div className={`${card} border-yellow-900/70 p-4`}><p className="text-sm text-gray-400">Pendiente de aprobación</p><p className="mt-1 font-mono text-2xl">{formatPrice(s?.pendingTotal ?? 0)}</p><p className="text-xs text-gray-500">{s?.pendingCount ?? 0} comprobantes en esta búsqueda</p></div>
        <div className={`${card} p-4`}><p className="text-sm text-gray-400">Resultados</p><p className="mt-1 font-mono text-2xl">{s?.count ?? 0}</p><p className="text-xs text-gray-500">Suman {formatPrice(s?.total ?? 0)}</p></div>
        <div className={`${card} p-4`}><p className="text-sm text-gray-400">Posibles duplicados</p><p className="mt-1 font-mono text-2xl">{result?.items.filter(t => t.warnings.length).length ?? 0}</p><p className="text-xs text-gray-500">En la lista mostrada</p></div>
      </div>

      <div className={`${card} mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6`}>
        <div className="sm:col-span-2">
          <Filter label="Buscar">
            <div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={filters.search} onChange={e => set('search')(e.target.value)} placeholder="Cliente, correo, referencia o #ID" className={`${fieldClass} pl-8`} /></div>
          </Filter>
        </div>
        <Filter label="Estado">
          <select value={filters.status} onChange={e => set('status')(e.target.value)} className={fieldClass}>
            <option value="pending">Por revisar</option><option value="approved">Aprobadas</option><option value="rejected">Rechazadas</option><option value="all">Todas</option>
          </select>
        </Filter>
        <Filter label="Desde"><input type="date" value={filters.from} onChange={e => set('from')(e.target.value)} className={fieldClass} /></Filter>
        <Filter label="Hasta"><input type="date" value={filters.to} onChange={e => set('to')(e.target.value)} className={fieldClass} /></Filter>
        <div className="grid grid-cols-2 gap-2">
          <Filter label="Mín."><input inputMode="numeric" value={filters.min} onChange={e => set('min')(e.target.value)} placeholder="$" className={fieldClass} /></Filter>
          <Filter label="Máx."><input inputMode="numeric" value={filters.max} onChange={e => set('max')(e.target.value)} placeholder="$" className={fieldClass} /></Filter>
        </div>
      </div>

      {!result ? <p className="text-gray-400">Cargando…</p> : result.items.length === 0 ? (
        <Empty>{filters.status === 'pending' ? 'No hay recargas pendientes.' : 'No hay comprobantes que coincidan.'}</Empty>
      ) : (
        <div className={`grid gap-4 md:grid-cols-2 ${loading ? 'opacity-60' : ''}`}>
          {result.items.map(topup => {
            const status = TOPUP_STATUS[topup.status] ?? TOPUP_STATUS.pending
            return (
              <div key={topup.id} className={`${card} flex gap-4 p-4 ${topup.warnings.length ? 'border-orange-800' : ''}`}>
                <button onClick={() => setPreview(topup)} className="group relative h-40 w-28 shrink-0 overflow-hidden rounded-lg border border-gray-800 bg-gray-900" title="Ampliar comprobante">
                  <img src={topup.proofUrl} alt={`Comprobante de la recarga #${topup.id}`} loading="lazy" className="h-full w-full object-cover" />
                  <span className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"><ZoomIn size={20} /></span>
                </button>
                <div className="flex min-w-0 flex-1 flex-col text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0"><p className="truncate font-semibold">{topup.username || topup.email}</p><p className="truncate text-xs text-gray-500">{topup.email}</p></div>
                    <span className={`shrink-0 rounded-md px-2 py-0.5 text-xs ${status.className}`}>{status.label}</span>
                  </div>
                  <p className="mt-1 font-mono text-xl text-green-400">{formatPrice(topup.amount)}</p>
                  <p className="text-xs text-gray-400">Ref: <span className="font-mono text-gray-200">{topup.reference ?? 'sin referencia'}</span></p>
                  <p className="text-xs text-gray-500">#{topup.id} · {formatDate(topup.createdAt)}</p>
                  {topup.reviewedAt && <p className="mt-1 text-xs text-gray-400">{topup.status === 'approved' ? 'Aprobada' : 'Rechazada'} por {topup.reviewedByEmail} · {formatDate(topup.reviewedAt)}{topup.reviewNote ? ` · "${topup.reviewNote}"` : ''}</p>}
                  {topup.warnings.map(w => <p key={w} className="mt-1 flex items-start gap-1 text-xs text-orange-300"><AlertTriangle size={12} className="mt-0.5 shrink-0" />{w}</p>)}
                  <div className="mt-auto flex flex-wrap gap-2 pt-3">
                    <a href={`${topup.proofUrl}?descargar=1`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-2.5 py-1.5 text-xs hover:border-gray-500"><Download size={13} /> Descargar</a>
                    {topup.status === 'pending' && (
                      <>
                        <button disabled={processing} onClick={() => { setNote(''); setReviewing({ topup, approve: false }) }} className="inline-flex items-center gap-1.5 rounded-lg border border-red-900 px-2.5 py-1.5 text-xs text-red-300 hover:bg-red-950/50"><X size={13} /> Rechazar</button>
                        <button disabled={processing} onClick={() => { setNote(''); setReviewing({ topup, approve: true }) }} className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700"><Check size={13} /> Aprobar</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {preview && !reviewing && (
        <div role="dialog" aria-modal="true" aria-label="Comprobante" onClick={() => setPreview(null)} className="fixed inset-0 z-50 flex flex-col bg-black/95 p-4 lg:flex-row">
          <div className="flex flex-1 items-center justify-center overflow-auto" onClick={e => e.stopPropagation()}>
            <img src={preview.proofUrl} alt="Comprobante de pago" className="max-h-[85vh] max-w-full rounded-lg object-contain" />
          </div>
          <aside onClick={e => e.stopPropagation()} className={`${card} mt-4 w-full space-y-2 p-5 text-sm lg:ml-4 lg:mt-0 lg:w-80`}>
            <div className="flex justify-between"><p className="text-lg font-semibold">Recarga #{preview.id}</p><button onClick={() => setPreview(null)} aria-label="Cerrar"><X size={18} /></button></div>
            <p className="font-mono text-2xl text-green-400">{formatPrice(preview.amount)}</p>
            <p><span className="text-gray-500">Cliente:</span> {preview.username} · {preview.email}</p>
            <p><span className="text-gray-500">Referencia:</span> <span className="font-mono">{preview.reference ?? '—'}</span></p>
            <p><span className="text-gray-500">Enviada:</span> {formatDate(preview.createdAt)}</p>
            <p><span className="text-gray-500">Estado:</span> {TOPUP_STATUS[preview.status]?.label}</p>
            {preview.reviewedAt && <p><span className="text-gray-500">Revisada por:</span> {preview.reviewedByEmail} · {formatDate(preview.reviewedAt)}</p>}
            {preview.warnings.map(w => <p key={w} className="text-orange-300">⚠ {w}</p>)}
            <div className="flex flex-wrap gap-2 pt-2">
              <a href={`${preview.proofUrl}?descargar=1`} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5"><Download size={14} /> Descargar</a>
              {preview.status === 'pending' && <>
                <button onClick={() => { setNote(''); setReviewing({ topup: preview, approve: false }) }} className="rounded-lg border border-red-900 px-3 py-1.5 text-red-300">Rechazar</button>
                <button onClick={() => { setNote(''); setReviewing({ topup: preview, approve: true }) }} className="rounded-lg bg-green-600 px-3 py-1.5 font-semibold text-white">Aprobar</button>
              </>}
            </div>
          </aside>
        </div>
      )}

      {reviewing && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
          <div className={`${card} w-full max-w-md p-6`}>
            <p className="text-lg font-semibold">{reviewing.approve ? 'Aprobar recarga' : 'Rechazar recarga'} #{reviewing.topup.id}</p>
            <p className="mt-2 text-sm text-gray-400">
              {reviewing.approve
                ? <>Se acreditarán <b className="font-mono text-green-400">{formatPrice(reviewing.topup.amount)}</b> a {reviewing.topup.email}. Esta acción queda registrada y no se puede repetir.</>
                : <>No se acreditará saldo a {reviewing.topup.email}. Indica el motivo; queda guardado en el historial.</>}
            </p>
            {reviewing.topup.warnings.length > 0 && <div className="mt-3 rounded-lg border border-orange-800 bg-orange-950/30 p-3 text-xs text-orange-300">{reviewing.topup.warnings.map(w => <p key={w}>⚠ {w}</p>)}</div>}
            <textarea value={note} onChange={e => setNote(e.target.value)} rows={2} placeholder={reviewing.approve ? 'Nota (opcional)' : 'Motivo del rechazo (obligatorio)'} className={`${fieldClass} mt-4`} />
            <div className="mt-4 flex flex-wrap justify-end gap-2">
              <button onClick={() => setReviewing(null)} className="rounded-lg border border-gray-800 px-4 py-2 text-sm">Cancelar</button>
              <button disabled={processing} onClick={() => void confirmReview()} className={`rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 ${reviewing.approve ? 'bg-green-600 hover:bg-green-700' : 'bg-red-700 hover:bg-red-800'}`}>{processing ? 'Procesando…' : reviewing.approve ? 'Confirmar aprobación' : 'Confirmar rechazo'}</button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
