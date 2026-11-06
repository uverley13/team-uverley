import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Upload,
  Wallet,
  CheckCircle,
  Clock,
  AlertCircle,
} from 'lucide-react'
import { formatPrice, useSession } from '../lib/session'
import { Logo } from '../components/Logo'
import { useSite } from '../lib/site'

export const Route = createFileRoute('/topup')({
  component: TopupPage,
})

function TopupPage() {
  const site = useSite()
  const MIN_AMOUNT = site.payments.minTopup
  const MAX_AMOUNT = site.payments.maxTopup
  const navigate = useNavigate()

  const { session, ready, refresh } = useSession()
  const balance = session?.balance ?? 0
  const [amount, setAmount] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const loading = !ready

  useEffect(() => {
    if (ready && !session) navigate({ to: '/login' })
  }, [ready, session?.id])

  function formatInput(value: string) {
    const numbers = value.replace(/\D/g, '')

    if (!numbers) {
      setAmount('')
      return
    }

    const number = Number(numbers)

    setAmount(
      new Intl.NumberFormat('es-CO', {
        maximumFractionDigits: 0,
      }).format(number),
    )
  }

  async function submitTopup() {
    setError('')
    setMessage('')

    const numericAmount = Number(amount.replace(/\D/g, ''))

    if (!numericAmount) {
      setError('Escribe el monto que deseas recargar.')
      return
    }

    if (numericAmount < MIN_AMOUNT) {
      setError(
        `La recarga mínima es de ${formatPrice(MIN_AMOUNT)}.`,
      )
      return
    }

    if (numericAmount > MAX_AMOUNT) {
      setError(
        `La recarga máxima es de ${formatPrice(MAX_AMOUNT)}.`,
      )
      return
    }

    if (!file) {
      setError('Debes subir el comprobante de pago.')
      return
    }

    if (!file.type.startsWith('image/')) {
      setError('El comprobante debe ser una imagen.')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('La imagen no puede superar los 5 MB.')
      return
    }

    if (!session) {
      navigate({ to: '/login' })
      return
    }

    setSending(true)

    try {
      const body = new FormData()
      body.set('amount', String(numericAmount))
      body.set('proof', file)
      const response = await fetch('/api/topups', { method: 'POST', body })
      const result = (await response.json().catch(() => ({}))) as { error?: string }
      if (!response.ok) {
        throw new Error(result.error || 'No se pudo registrar la recarga.')
      }
      void refresh()

      setMessage(
        `Solicitud enviada correctamente por ${formatPrice(
          numericAmount,
        )}. Revisaremos tu comprobante y acreditaremos el saldo. Puedes seguir el estado en "Mi cuenta".`,
      )

      setAmount('')
      setFile(null)

      const fileInput = document.getElementById(
        'proof',
      ) as HTMLInputElement | null

      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ocurrió un error.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Cargando cuenta...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-black/80 backdrop-blur-xl border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Logo />

          <Link
            to="/account"
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <ArrowLeft size={18} />
            Mi cuenta
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        {/* SALDO */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-4 rounded-xl">
              <Wallet className="text-blue-400" size={32} />
            </div>

            <div>
              <p className="text-gray-400 text-sm">
                Saldo disponible
              </p>

              <p className="text-3xl font-bold text-green-400">
                {formatPrice(balance)}
              </p>
            </div>
          </div>
        </div>

        {/* RECARGA */}
        <div className="bg-gray-950 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-3xl font-bold mb-2">
            Recargar saldo
          </h1>

          <p className="text-gray-400 mb-8">
            Agrega saldo a tu cuenta para realizar pedidos.
          </p>

          {/* NEQUI */}
          <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 mb-8">
            <p className="text-gray-400 text-sm mb-2">
              Realiza el pago por {site.payments.method} a:
            </p>

            <p className="text-2xl font-bold">
              {site.payments.accountName}
            </p>

            <p className="text-3xl font-bold text-green-400 mt-2">
              {site.payments.accountNumber}
            </p>

            <p className="text-gray-400 text-sm mt-4">
              Mínimo: {formatPrice(MIN_AMOUNT)}
            </p>

            <p className="text-gray-400 text-sm">
              Máximo: {formatPrice(MAX_AMOUNT)}
            </p>
          </div>

          {/* MONTO */}
          <h2 className="text-xl font-bold mb-3">
            ¿Cuánto deseas recargar?
          </h2>

          <div className="relative mb-3">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
              $
            </span>

            <input
              type="text"
              inputMode="numeric"
              value={amount}
              onChange={(e) => formatInput(e.target.value)}
              placeholder={new Intl.NumberFormat('es-CO').format(MIN_AMOUNT)}
              className="w-full bg-gray-950 border border-gray-700 focus:border-blue-500 outline-none rounded-xl py-4 pl-10 pr-4 text-2xl font-bold text-white"
            />
          </div>

          <p className="text-gray-500 text-sm mb-8">
            Puedes recargar desde {formatPrice(MIN_AMOUNT)} hasta{' '}
            {formatPrice(MAX_AMOUNT)}.
          </p>

          {/* COMPROBANTE */}
          <h2 className="text-xl font-bold mb-4">
            Comprobante de pago
          </h2>

          <label
            htmlFor="proof"
            className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-950"
          >
            <Upload
              size={40}
              className="text-blue-400 mb-3"
            />

            {file ? (
              <>
                <p className="text-white font-semibold text-center">
                  {file.name}
                </p>

                <p className="text-green-400 text-sm mt-1">
                  Comprobante seleccionado
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">
                  Subir comprobante
                </p>

                <p className="text-gray-500 text-sm mt-1">
                  JPG, PNG o WEBP — máximo 5 MB
                </p>
              </>
            )}

            <input
              id="proof"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                setFile(e.target.files?.[0] ?? null)
                setError('')
              }}
            />
          </label>

          {/* ERRORES */}
          {error && (
            <div className="mt-5 bg-red-900/30 border border-red-800 rounded-xl p-4 flex gap-3">
              <AlertCircle
                className="text-red-400 shrink-0"
                size={22}
              />

              <p className="text-red-300">
                {error}
              </p>
            </div>
          )}

          {/* ÉXITO */}
          {message && (
            <div className="mt-5 bg-green-900/30 border border-green-800 rounded-xl p-4 flex gap-3">
              <CheckCircle
                className="text-green-400 shrink-0"
                size={22}
              />

              <p className="text-green-300">
                {message}
              </p>
            </div>
          )}

          {/* BOTÓN */}
          <button
            type="button"
            onClick={submitTopup}
            disabled={sending}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
          >
            {sending
              ? 'Enviando solicitud...'
              : 'Recargar saldo'}
          </button>

          <div className="mt-6 bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 flex gap-3">
            <Clock
              className="text-yellow-400 shrink-0"
              size={22}
            />

            <p className="text-yellow-200 text-sm">
              {site.payments.note}
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
