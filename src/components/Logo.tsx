import { Link } from '@tanstack/react-router'

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="group inline-flex items-center gap-2.5" aria-label="Servidor Uverley, inicio">
      <span className="relative grid h-9 w-9 place-items-center rounded-lg border border-blue-500/40 bg-blue-600/15 font-display text-lg font-bold text-blue-300 transition-colors group-hover:border-blue-400">
        U
        <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-green-400" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold leading-none tracking-tight text-gray-100">
          Servidor <span className="text-blue-400">Uverley</span>
        </span>
      )}
    </Link>
  )
}
