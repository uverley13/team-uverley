import { CheckCircle, Clock, XCircle } from 'lucide-react'

export function OrderStatus({ status }: { status: string }) {
  const Icon = status === 'completado' ? CheckCircle : status === 'cancelado' ? XCircle : Clock
  const color = status === 'completado' ? 'text-green-400' : status === 'cancelado' ? 'text-red-400' : 'text-yellow-400'
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm capitalize ${color}`}>
      <Icon size={15} /> {status}
    </span>
  )
}
