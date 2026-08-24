import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  Package,
  Clock,
  CheckCircle,
  XCircle,
  LogOut,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/orders')({
  component: OrdersPage,
})

type Order = {
  id: number
  product_name: string
  price: number
  status: string
  created_at: string
}

function OrdersPage() {
  const navigate = useNavigate()

  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [balance, setBalance] = useState(0)

  useEffect(() => {
    loadOrders()
  }, [])

  async function loadOrders() {
    setLoading(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      navigate({ to: '/login' })
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('balance')
      .eq('id', user.id)
      .single()

    setBalance(Number(profile?.balance ?? 0))

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, product_name, price, status, created_at',
      )
      .eq('user_id', user.id)
      .order('created_at', {
        ascending: false,
      })

    if (error) {
      console.error(error)
      alert(
        'No se pudieron cargar tus pedidos: ' +
          error.message,
      )
    } else {
      setOrders(data ?? [])
    }

    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price)
  }

  function formatDate(date: string) {
    return new Date(date).toLocaleString('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  }

  function StatusIcon({
    status,
  }: {
    status: string
  }) {
    if (status === 'completado') {
      return (
        <CheckCircle
          size={20}
          className="text-green-400"
        />
      )
    }

    if (
      status === 'cancelado' ||
      status === 'rechazado'
    ) {
      return (
        <XCircle
          size={20}
          className="text-red-400"
        />
      )
    }

    return (
      <Clock
        size={20}
        className="text-yellow-400"
      />
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">

      <header className="bg-gray-900/90 border-b border-gray-800 px-4 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">

          <Link
            to="/"
            className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Servidor Uverley
          </Link>

          <button
            onClick={handleLogout}
            className="bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <LogOut size={18} />
            Salir
          </button>

        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8"
        >
          <ArrowLeft size={18} />
          Volver a servicios
        </Link>

        <div className="grid md:grid-cols-2 gap-6 mb-10">

          <div className="bg-gradient-to-r from-blue-900/50 to-purple-900/50 border border-blue-800/50 rounded-2xl p-7">
            <p className="text-gray-400 mb-2">
              Mis pedidos
            </p>

            <h1 className="text-4xl font-black">
              {orders.length}
            </h1>
          </div>

          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-7">
            <p className="text-gray-400 mb-2">
              Mi saldo
            </p>

            <h2 className="text-4xl font-black text-green-400">
              {formatPrice(balance)}
            </h2>
          </div>

        </div>

        <h2 className="text-3xl font-black mb-6">
          Historial de pedidos
        </h2>

        {loading ? (

          <div className="text-center py-20">
            <p className="text-gray-400">
              Cargando tus pedidos...
            </p>
          </div>

        ) : orders.length === 0 ? (

          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-12 text-center">

            <Package
              size={60}
              className="mx-auto text-gray-600 mb-5"
            />

            <h3 className="text-xl font-bold mb-2">
              Todavía no tienes pedidos
            </h3>

            <p className="text-gray-400 mb-6">
              Cuando realices un pedido aparecerá aquí.
            </p>

            <Link
              to="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 px-6 py-3 rounded-lg font-bold"
            >
              Ver servicios
            </Link>

          </div>

        ) : (

          <div className="space-y-4">

            {orders.map((order) => (

              <div
                key={order.id}
                className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6"
              >

                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5">

                  <div>

                    <p className="text-xs text-gray-500 mb-2">
                      PEDIDO #{order.id}
                    </p>

                    <h3 className="text-xl font-bold mb-2">
                      {order.product_name}
                    </h3>

                    <p className="text-gray-500 text-sm">
                      {formatDate(order.created_at)}
                    </p>

                  </div>

                  <div className="text-left md:text-right">

                    <p className="text-2xl font-black text-green-400 mb-3">
                      {formatPrice(order.price)}
                    </p>

                    <div className="flex items-center gap-2 md:justify-end">

                      <StatusIcon
                        status={order.status}
                      />

                      <span className="capitalize text-gray-300">
                        {order.status}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>
    </div>
  )
}
