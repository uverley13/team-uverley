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
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/topup')({
  component: TopupPage,
})

const NEQUI_NAME = 'Uverley Rodriguez'
const NEQUI_NUMBER = '3153310730'

const AMOUNTS = [10000, 20000, 50000, 100000, 200000]

function TopupPage() {
  const navigate = useNavigate()

  const [user, setUser] = useState<any>(null)
  const [balance, setBalance] = useState(0)
  const [amount, setAmount] = useState<number | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    loadAccount()
  }, [])

  async function loadAccount() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    setUser(user)

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    if (!error) {
      setBalance(Number(profile?.balance ?? 0))
    }

    setLoading(false)
  }

  function formatPrice(value: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value)
  }

  async function submitTopup() {
    setError('')
    setMessage('')

    if (!amount || amount <= 0) {
      setError('Selecciona un monto para recargar.')
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

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    setSending(true)

    try {
      const extension = file.name.split('.').pop() || 'jpg'

      const fileName = `${user.id}/${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from('topup-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (uploadError) {
        throw new Error(
          'No se pudo subir el comprobante: ' + uploadError.message,
        )
      }

      const { data: publicUrlData } = supabase.storage
        .from('topup-proofs')
        .getPublicUrl(fileName)

      const proofUrl = publicUrlData.publicUrl

      const { error: insertError } = await supabase
        .from('topups')
        .insert({
          user_id: user.id,
          amount,
          proof_url: proofUrl,
          status: 'pending',
        })

      if (insertError) {
        throw new Error(
          'No se pudo registrar la recarga: ' + insertError.message,
        )
      }

      setMessage(
        'Recarga enviada correctamente. Será revisada por el administrador.',
      )

      setAmount(null)
      setFile(null)

      const fileInput = document.getElementById(
        'proof',
      ) as HTMLInputElement | null

      if (fileInput) {
        fileInput.value = ''
      }
    } catch (err: any) {
      setError(err.message || 'Ocurrió un error.')
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
      <header className="bg-gray-900/90 border-b border-gray-800 px-4 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Servidor Uverley
          </Link>

          <Link
            to="/"
            className="flex items-center gap-2 text-gray-300 hover:text-white"
          >
            <ArrowLeft size={18} />
            Volver
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-10">
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 mb-6">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600/20 p-4 rounded-xl">
              <Wallet className="text-blue-400" size={32} />
            </div>

            <div>
              <p className="text-gray-400 text-sm">Saldo actual</p>
              <p className="text-3xl font-black text-green-400">
                {formatPrice(balance)}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8">
          <h1 className="text-3xl font-black mb-2">
            Recargar saldo
          </h1>

          <p className="text-gray-400 mb-8">
            Realiza el pago por Nequi y envía el comprobante.
          </p>

          <div className="bg-gradient-to-r from-purple-900/40 to-blue-900/40 border border-purple-700/50 rounded-2xl p-6 mb-8">
            <p className="text-gray-400 text-sm mb-2">
              Envía el dinero por Nequi a:
            </p>

            <p className="text-2xl font-black text-white">
              {NEQUI_NAME}
            </p>

            <p className="text-3xl font-black text-green-400 mt-2">
              {NEQUI_NUMBER}
            </p>

            <p className="text-gray-400 text-sm mt-3">
              Verifica cuidadosamente el número antes de realizar el pago.
            </p>
          </div>

          <h2 className="text-xl font-bold mb-4">
            1. Selecciona el monto
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            {AMOUNTS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setAmount(value)}
                className={`p-4 rounded-xl font-bold border transition-all ${
                  amount === value
                    ? 'bg-blue-600 border-blue-400 text-white'
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700'
                }`}
              >
                {formatPrice(value)}
              </button>
            ))}
          </div>

          <h2 className="text-xl font-bold mb-4">
            2. Sube el comprobante
          </h2>

          <label
            htmlFor="proof"
            className="border-2 border-dashed border-gray-700 hover:border-blue-500 rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all bg-gray-950"
          >
            <Upload size={40} className="text-blue-400 mb-3" />

            {file ? (
              <>
                <p className="text-white font-semibold text-center">
                  {file.name}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  Comprobante seleccionado
                </p>
              </>
            ) : (
              <>
                <p className="text-white font-semibold">
                  Seleccionar comprobante
                </p>
                <p className="text-gray-500 text-sm mt-1">
                  JPG, PNG o imagen similar — máximo 5 MB
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

          {error && (
            <div className="mt-5 bg-red-900/30 border border-red-800 rounded-xl p-4 flex gap-3">
              <AlertCircle
                className="text-red-400 shrink-0"
                size={22}
              />
              <p className="text-red-300">{error}</p>
            </div>
          )}

          {message && (
            <div className="mt-5 bg-green-900/30 border border-green-800 rounded-xl p-4 flex gap-3">
              <CheckCircle
                className="text-green-400 shrink-0"
                size={22}
              />
              <p className="text-green-300">{message}</p>
            </div>
          )}

          <button
            type="button"
            onClick={submitTopup}
            disabled={sending}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white py-4 rounded-xl font-bold text-lg transition-all"
          >
            {sending
              ? 'Enviando recarga...'
              : 'Enviar comprobante'}
          </button>

          <div className="mt-6 bg-yellow-900/20 border border-yellow-800/40 rounded-xl p-4 flex gap-3">
            <Clock
              className="text-yellow-400 shrink-0"
              size={22}
            />

            <p className="text-yellow-200 text-sm">
              Tu saldo no se agregará inmediatamente. El administrador
              verificará el comprobante y aprobará la recarga.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
