import { useEffect, useState } from 'react'
import { Ban, CheckCircle2, Search, X } from 'lucide-react'
import { errorMessage, formatDate, formatPrice } from '../../lib/session'
import { adminGetClient, adminListClients, adminSaveClientNotes, adminSetClientSuspended } from '../../server/admin.functions'
import { adminChangeBalance } from '../../server/store.functions'
import { card, Empty, Filter, fieldClass, Money, MOVEMENT_LABELS, SectionTitle, TOPUP_STATUS, useDebounced, type Notify } from './ui'

type Client = Awaited<ReturnType<typeof adminListClients>>[number]
type Detail = Awaited<ReturnType<typeof adminGetClient>>

function ClientDetail({ id, notify, onClose, onChange }: { id: string; notify: Notify; onClose: () => void; onChange: () => void }) {
  const [detail, setDetail] = useState<Detail | null>(null)
  const [tab, setTab] = useState<'movimientos' | 'recargas' | 'pedidos' | 'actividad'>('movimientos')
  const [notes, setNotes] = useState('')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [suspendReason, setSuspendReason] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    try {
      const d = await adminGetClient({ data: { id } })
      setDetail(d)
      setNotes(d.profile.adminNotes)
    } catch (e) {
      notify('error', errorMessage(e, 'No se pudo cargar el cliente.'))
    }
  }
  useEffect(() => void load(), [id])

  async function run(action: () => Promise<unknown>, success: string) {
    setBusy(true)
    try {
      await action()
      notify('success', success)
      await load()
      onChange()
    } catch (e) {
      notify('error', errorMessage(e, 'No se pudo completar la acción.'))
    } finally {
      setBusy(false)
    }
  }

  function adjust(type: 'recarga' | 'descuento') {
    if (!detail) return
    const value = Number(amount.replace(/\D/g, ''))
    if (!value) return notify('error', 'Escribe un monto válido.')
    if (reason.trim().length < 5) return notify('error', 'Escribe el motivo del ajuste (mínimo 5 caracteres). Es obligatorio para la auditoría.')
    const after = detail.profile.balance + (type === 'recarga' ? value : -value)
    if (!window.confirm(`¿${type === 'recarga' ? 'Agregar' : 'Descontar'} ${formatPrice(value)} a ${detail.profile.email}?\n\nSaldo actual: ${formatPrice(detail.profile.balance)}\nSaldo resultante: ${formatPrice(after)}\nMotivo: ${reason}`)) return
    void run(async () => {
      await adminChangeBalance({ data: { userId: id, amount: value, type, reason } })
      setAmount('')
      setReason('')
    }, 'Saldo ajustado y registrado en la auditoría.')
  }

  function toggleSuspend() {
    if (!detail) return
    const suspend = !detail.profile.suspended
    if (suspend && suspendReason.trim().length < 5) return notify('error', 'Escribe el motivo de la suspensión.')
    if (!window.confirm(suspend ? `¿Suspender la cuenta de ${detail.profile.email}? No podrá hacer pedidos ni enviar recargas.` : `¿Reactivar la cuenta de ${detail.profile.email}?`)) return
    void run(() => adminSetClientSuspended({ data: { id, suspended: suspend, reason: suspendReason } }), suspend ? 'Cuenta suspendida.' : 'Cuenta reactivada.')
  }

  const p = detail?.profile
  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 flex justify-end bg-black/70" onClick={onClose}>
      <div className="h-full w-full max-w-2xl overflow-y-auto border-l border-gray-800 bg-black p-6" onClick={e => e.stopPropagation()}>
        {!p ? <p className="text-gray-400">Cargando…</p> : (
          <>
            <div className="mb-6 flex items-start justify-between gap-3">
              <div>
                <p className="text-2xl font-bold">{p.username || p.email}</p>
                <p className="text-sm text-gray-400">{p.email}</p>
                <p className="mt-1 font-mono text-xs text-gray-500">ID {p.id}</p>
                <p className="text-xs text-gray-500">Registrado {formatDate(p.createdAt)} · Actualizado {formatDate(p.updatedAt)}</p>
              </div>
              <button onClick={onClose} aria-label="Cerrar" className="rounded-lg border border-gray-800 p-2"><X size={18} /></button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`${card} p-4`}>
                <p className="text-sm text-gray-400">Saldo actual</p>
                <p className="font-mono text-3xl text-green-400">{formatPrice(p.balance)}</p>
                <p className={`mt-1 text-xs ${detail.ledgerSum === p.balance ? 'text-gray-500' : 'text-orange-300'}`}>
                  {detail.ledgerSum === p.balance ? '✓ Cuadra con la suma de sus movimientos' : `⚠ La suma de movimientos es ${formatPrice(detail.ledgerSum)}: revisa el historial`}
                </p>
              </div>
              <div className={`${card} p-4`}>
                <p className="text-sm text-gray-400">Estado</p>
                <p className={`text-lg font-semibold ${p.suspended ? 'text-red-300' : 'text-green-300'}`}>{p.suspended ? 'Suspendida' : 'Activa'}</p>
                {!p.suspended && <input value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Motivo para suspender" className={`${fieldClass} mt-2`} />}
                <button disabled={busy} onClick={toggleSuspend} className={`mt-2 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm ${p.suspended ? 'bg-green-600 text-white' : 'border border-red-900 text-red-300'}`}>
                  {p.suspended ? <><CheckCircle2 size={14} /> Reactivar cuenta</> : <><Ban size={14} /> Suspender cuenta</>}
                </button>
              </div>
            </div>

            <div className={`${card} mt-3 p-4`}>
              <p className="mb-2 font-semibold">Ajuste manual de saldo</p>
              <p className="mb-3 text-xs text-gray-500">Cada ajuste queda en la auditoría con saldo anterior, saldo resultante, tu usuario y el motivo.</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto en COP" inputMode="numeric" className={fieldClass} />
                <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo (obligatorio)" className={fieldClass} />
              </div>
              <div className="mt-2 flex gap-2">
                <button disabled={busy} onClick={() => adjust('recarga')} className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50">Agregar saldo</button>
                <button disabled={busy} onClick={() => adjust('descuento')} className="rounded-lg border border-red-900 px-3 py-1.5 text-sm text-red-300 disabled:opacity-50">Descontar</button>
              </div>
            </div>

            <div className={`${card} mt-3 p-4`}>
              <p className="mb-2 font-semibold">Notas privadas</p>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={3} placeholder="Solo las ven los administradores" className={fieldClass} />
              <button disabled={busy || notes === p.adminNotes} onClick={() => void run(() => adminSaveClientNotes({ data: { id, notes } }), 'Notas guardadas.')} className="mt-2 rounded-lg border border-gray-700 px-3 py-1.5 text-sm disabled:opacity-40">Guardar notas</button>
            </div>

            <div className="mt-6 flex gap-2 overflow-x-auto">
              {([['movimientos', `Movimientos (${detail.movements.length})`], ['recargas', `Recargas (${detail.topups.length})`], ['pedidos', `Pedidos (${detail.orders.length})`], ['actividad', 'Acciones de admin']] as const).map(([k, l]) => (
                <button key={k} onClick={() => setTab(k)} className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm ${tab === k ? 'bg-gray-100 text-black' : 'border border-gray-800'}`}>{l}</button>
              ))}
            </div>
            <div className={`${card} mt-3 divide-y divide-gray-900 text-sm`}>
              {tab === 'movimientos' && (detail.movements.length === 0 ? <p className="p-4 text-gray-500">Sin movimientos.</p> : detail.movements.map(m => (
                <div key={m.id} className="flex items-start justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p>{MOVEMENT_LABELS[m.type] ?? m.type} · <span className="text-gray-400">{m.reason ?? m.description}</span></p>
                    <p className="text-xs text-gray-500">#{m.id} · {formatDate(m.createdAt)}{m.adminEmail ? ` · por ${m.adminEmail}` : ''}{m.reference ? ` · ${m.reference}` : ''}</p>
                    {m.balanceBefore !== null && <p className="font-mono text-xs text-gray-500">{formatPrice(m.balanceBefore)} → {formatPrice(m.balanceAfter ?? 0)}</p>}
                  </div>
                  <Money value={m.amount} signed />
                </div>
              )))}
              {tab === 'recargas' && (detail.topups.length === 0 ? <p className="p-4 text-gray-500">Sin recargas.</p> : detail.topups.map(t => (
                <div key={t.id} className="flex items-center justify-between gap-3 p-3">
                  <div><p>#{t.id} · <span className="font-mono">{t.reference ?? '—'}</span> <span className={`ml-1 rounded px-1.5 text-xs ${TOPUP_STATUS[t.status]?.className}`}>{TOPUP_STATUS[t.status]?.label}</span></p><p className="text-xs text-gray-500">{formatDate(t.createdAt)}{t.reviewedByEmail ? ` · revisada por ${t.reviewedByEmail}` : ''}</p></div>
                  <div className="flex items-center gap-3"><Money value={t.amount} /><a href={t.proofUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400">Ver</a></div>
                </div>
              )))}
              {tab === 'pedidos' && (detail.orders.length === 0 ? <p className="p-4 text-gray-500">Sin pedidos.</p> : detail.orders.map(o => (
                <div key={o.id} className="flex items-center justify-between gap-3 p-3">
                  <div><p>#{o.id} · {o.productName}</p><p className="text-xs capitalize text-gray-500">{o.status} · {formatDate(o.createdAt)}</p></div>
                  <Money value={o.price} />
                </div>
              )))}
              {tab === 'actividad' && (detail.activity.length === 0 ? <p className="p-4 text-gray-500">Ningún administrador ha modificado esta cuenta.</p> : detail.activity.map(a => (
                <div key={a.id} className="p-3"><p>{a.summary}</p><p className="text-xs text-gray-500">{a.actorEmail} · {formatDate(a.createdAt)}</p></div>
              )))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function ClientsPanel({ notify }: { notify: Notify }) {
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | 'active' | 'suspended'>('all')
  const q = useDebounced(search)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    adminListClients({ data: { search: q, status } }).then(setClients).catch(e => notify('error', errorMessage(e, 'No se pudieron cargar los clientes.')))
  }, [q, status, reload])

  return (
    <section>
      <SectionTitle title="Clientes" subtitle="Busca un cliente y ábrelo para ver su historial completo, ajustar su saldo, suspender la cuenta o dejar notas privadas." />
      <div className={`${card} mb-6 grid gap-3 p-4 sm:grid-cols-3`}>
        <div className="sm:col-span-2">
          <Filter label="Buscar"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Correo, nombre o ID de cliente" className={`${fieldClass} pl-8`} /></div></Filter>
        </div>
        <Filter label="Estado">
          <select value={status} onChange={e => setStatus(e.target.value as typeof status)} className={fieldClass}><option value="all">Todos</option><option value="active">Activos</option><option value="suspended">Suspendidos</option></select>
        </Filter>
      </div>
      {!clients ? <p className="text-gray-400">Cargando…</p> : clients.length === 0 ? <Empty>No hay clientes que coincidan.</Empty> : (
        <div className={`${card} overflow-x-auto`}>
          <table className="w-full min-w-[720px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
              <tr><th className="p-3">Cliente</th><th className="p-3 text-right">Saldo</th><th className="p-3 text-right">Recargado</th><th className="p-3 text-right">Gastado</th><th className="p-3 text-right">Pedidos</th><th className="p-3">Registro</th><th className="p-3" /></tr>
            </thead>
            <tbody className="divide-y divide-gray-900">
              {clients.map(c => (
                <tr key={c.id} className="cursor-pointer hover:bg-gray-900/50" onClick={() => setSelected(c.id)}>
                  <td className="p-3"><p className="font-semibold">{c.username || c.email} {c.suspended && <span className="ml-1 rounded bg-red-950/60 px-1.5 text-xs text-red-300">Suspendido</span>}</p><p className="text-xs text-gray-500">{c.email}</p></td>
                  <td className="p-3 text-right font-mono text-green-400">{formatPrice(c.balance)}</td>
                  <td className="p-3 text-right font-mono">{formatPrice(c.recharged)}</td>
                  <td className="p-3 text-right font-mono">{formatPrice(c.spent)}</td>
                  <td className="p-3 text-right font-mono">{c.orders}</td>
                  <td className="p-3 text-xs text-gray-400">{formatDate(c.createdAt)}</td>
                  <td className="p-3 text-right"><span className="text-blue-400">Abrir</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selected && <ClientDetail id={selected} notify={notify} onClose={() => setSelected(null)} onChange={() => setReload(n => n + 1)} />}
    </section>
  )
}
