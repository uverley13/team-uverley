import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'
import { errorMessage, formatDate, formatPrice } from '../../lib/session'
import { adminGetStats } from '../../server/admin.functions'
import { card, Money, MOVEMENT_LABELS, SectionTitle } from './ui'

type Stats = Awaited<ReturnType<typeof adminGetStats>>
type Go = (section: 'recargas' | 'pedidos' | 'clientes' | 'movimientos') => void

function Tile({ label, value, hint, onClick, tone }: { label: string; value: string; hint?: string; onClick?: () => void; tone?: 'warn' }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={`${card} p-5 text-left ${onClick ? 'transition-colors hover:border-gray-600' : ''} ${tone === 'warn' ? 'border-yellow-900/70' : ''}`}>
      <p className="text-sm text-gray-400">{label}</p>
      <p className="mt-2 font-mono text-2xl font-medium tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Comp>
  )
}

const shortDay = (day: string) => new Date(`${day}T12:00:00`).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })

/** Single-series daily bar chart with a hover tooltip and an accessible table fallback. */
function DailyBars({ title, data, color }: { title: string; data: { day: string; value: number }[]; color: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = Math.max(1, ...data.map(d => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)
  const W = 600, H = 160, gap = 2
  const bw = W / data.length
  return (
    <div className={`${card} p-5`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <p className="font-semibold">{title}</p>
        <p className="text-sm text-gray-400">30 días · <span className="font-mono text-gray-200">{formatPrice(total)}</span></p>
      </div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H + 18}`} className="h-44 w-full" role="img" aria-label={`${title}, últimos 30 días`} onMouseLeave={() => setHover(null)}>
          <line x1={0} x2={W} y1={H} y2={H} stroke="#374151" strokeWidth={1} />
          <line x1={0} x2={W} y1={H / 2} y2={H / 2} stroke="#1f2937" strokeWidth={1} strokeDasharray="3 4" />
          {data.map((d, i) => {
            const h = d.value ? Math.max(3, (d.value / max) * (H - 8)) : 0
            const x = i * bw + gap / 2
            return (
              <g key={d.day} onMouseEnter={() => setHover(i)}>
                <rect x={i * bw} y={0} width={bw} height={H} fill="transparent" />
                {h > 0 && <path d={`M${x},${H} v${-(h - 3)} q0,-3 3,-3 h${bw - gap - 6} q3,0 3,3 v${h - 3} z`} fill={color} opacity={hover === null || hover === i ? 1 : 0.45} />}
              </g>
            )
          })}
          {[0, 14, 29].map(i => data[i] && (
            <text key={i} x={i === 29 ? W : i * bw} y={H + 14} textAnchor={i === 29 ? 'end' : i === 0 ? 'start' : 'middle'} fontSize={11} fill="#6b7280">{shortDay(data[i].day)}</text>
          ))}
        </svg>
        {hover !== null && data[hover] && (
          <div className="pointer-events-none absolute top-0 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-xs shadow-lg" style={{ left: `min(calc(${((hover + 0.5) / data.length) * 100}% ), calc(100% - 9rem))` }}>
            <p className="text-gray-400">{shortDay(data[hover].day)}</p>
            <p className="font-mono text-sm text-gray-100">{formatPrice(data[hover].value)}</p>
          </div>
        )}
      </div>
      <details className="mt-2 text-xs text-gray-500">
        <summary className="cursor-pointer">Ver como tabla</summary>
        <table className="mt-2 w-full">
          <tbody>{data.filter(d => d.value).map(d => <tr key={d.day}><td className="py-0.5">{shortDay(d.day)}</td><td className="text-right font-mono">{formatPrice(d.value)}</td></tr>)}</tbody>
        </table>
      </details>
    </div>
  )
}

export function Overview({ go, refreshKey }: { go: Go; refreshKey: number }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    adminGetStats().then(setStats).catch(e => setError(errorMessage(e, 'No se pudieron cargar las estadísticas.')))
  }, [refreshKey])

  if (error) return <p className={`${card} p-6 text-red-300`}>{error}</p>
  if (!stats) return <p className="text-gray-400">Cargando estadísticas…</p>

  return (
    <section>
      <SectionTitle title="Resumen del negocio" subtitle="Cifras en tiempo real. Las ventas excluyen pedidos cancelados." />

      {stats.topups.pendingCount > 0 && (
        <button onClick={() => go('recargas')} className="mb-6 flex w-full items-center justify-between gap-3 rounded-xl border border-yellow-900/70 bg-yellow-950/30 px-5 py-4 text-left">
          <span className="flex items-center gap-3"><AlertTriangle size={18} className="text-yellow-400" /> <span><b>{stats.topups.pendingCount}</b> comprobante{stats.topups.pendingCount === 1 ? '' : 's'} por revisar · <span className="font-mono">{formatPrice(stats.topups.pendingAmount)}</span> pendientes de aprobación</span></span>
          <ArrowRight size={18} />
        </button>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <Tile label="Ventas de hoy" value={formatPrice(stats.sales.today)} hint={`${stats.sales.ordersToday} pedido${stats.sales.ordersToday === 1 ? '' : 's'}`} />
        <Tile label="Ventas de la semana" value={formatPrice(stats.sales.week)} hint="Desde el lunes" />
        <Tile label="Ventas del mes" value={formatPrice(stats.sales.month)} hint="Desde el día 1" />
      </div>
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile label="Total recargado (aprobado)" value={formatPrice(stats.topups.approvedAmount)} hint={`${stats.topups.approvedCount} recargas aprobadas`} onClick={() => go('recargas')} />
        <Tile label="Recargas pendientes" value={String(stats.topups.pendingCount)} hint={formatPrice(stats.topups.pendingAmount)} onClick={() => go('recargas')} tone={stats.topups.pendingCount ? 'warn' : undefined} />
        <Tile label="Total de ventas" value={formatPrice(stats.sales.total)} hint={`${stats.sales.orders} pedidos · ${stats.sales.activeOrders} activos`} onClick={() => go('pedidos')} />
        <Tile label="Clientes registrados" value={String(stats.clients.total)} hint={`${stats.clients.newThisMonth} nuevos este mes${stats.clients.suspended ? ` · ${stats.clients.suspended} suspendidos` : ''}`} onClick={() => go('clientes')} />
      </div>
      <p className="mt-3 text-xs text-gray-500">Saldo total en cuentas de clientes: <span className="font-mono text-gray-300">{formatPrice(stats.clients.totalBalance)}</span></p>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <DailyBars title="Recargas aprobadas por día" data={stats.chart.map(d => ({ day: d.day, value: d.topups }))} color="#3b82f6" />
        <DailyBars title="Ventas por día" data={stats.chart.map(d => ({ day: d.day, value: d.sales }))} color="#22c55e" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className={`${card} p-5`}>
          <p className="mb-4 font-semibold">Servicios más vendidos</p>
          {stats.topServices.length === 0 ? <p className="text-sm text-gray-500">Todavía no hay ventas.</p> : (
            <ol className="space-y-3">
              {stats.topServices.map((s, i) => {
                const pct = (s.count / stats.topServices[0].count) * 100
                return (
                  <li key={s.name}>
                    <div className="flex justify-between gap-2 text-sm"><span className="truncate"><span className="mr-2 font-mono text-gray-500">{i + 1}</span>{s.name}</span><span className="shrink-0 text-gray-400">{s.count} · <span className="font-mono">{formatPrice(s.total)}</span></span></div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-gray-900"><div className="h-full rounded-full bg-blue-500" style={{ width: `${pct}%` }} /></div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
        <div className={`${card} p-5`}>
          <div className="mb-4 flex items-center justify-between"><p className="font-semibold">Últimos movimientos</p><button onClick={() => go('movimientos')} className="text-sm text-blue-400 hover:text-blue-300">Ver todos</button></div>
          {stats.latest.length === 0 ? <p className="text-sm text-gray-500">Sin movimientos todavía.</p> : (
            <div className="divide-y divide-gray-900">
              {stats.latest.map(m => (
                <div key={m.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0"><p className="truncate">{m.email ?? '—'}</p><p className="text-xs text-gray-500">{MOVEMENT_LABELS[m.type] ?? m.type} · {formatDate(m.createdAt)}</p></div>
                  <Money value={m.amount} signed />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
