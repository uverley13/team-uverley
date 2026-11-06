import { useEffect, useState, type ReactNode } from 'react'

export const card = 'rounded-xl border border-gray-800 bg-gray-950'
export const fieldClass = 'w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none'
export type Notify = (kind: 'success' | 'error', text: string) => void

export const TOPUP_STATUS: Record<string, { label: string; className: string }> = {
  pending: { label: 'En revisión', className: 'bg-yellow-900/30 text-yellow-300' },
  approved: { label: 'Aprobada', className: 'bg-green-900/40 text-green-300' },
  rejected: { label: 'Rechazada', className: 'bg-red-950/60 text-red-300' },
}

export const MOVEMENT_LABELS: Record<string, string> = {
  recarga: 'Recarga',
  pedido: 'Pedido',
  ajuste_credito: 'Ajuste (+)',
  ajuste_debito: 'Ajuste (−)',
  descuento: 'Descuento',
}

export function SectionTitle({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-gray-400">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  )
}

export function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className={`${card} p-8 text-center text-gray-400`}>{children}</p>
}

export function Money({ value, signed }: { value: number; signed?: boolean }) {
  const text = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.abs(value))
  if (!signed) return <span className="font-mono">{value < 0 ? '−' : ''}{text}</span>
  return <span className={`font-mono ${value >= 0 ? 'text-green-400' : 'text-red-300'}`}>{value >= 0 ? '+' : '−'}{text}</span>
}

/** Small debounce so search boxes don't query the server on every key. */
export function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}
