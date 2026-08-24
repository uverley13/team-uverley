import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  PlusCircle,
  List,
  CreditCard,
  Grid,
  Package,
  LogOut,
  MessageCircle,
  RefreshCw,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  LoaderCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

const WA_BASE =
  'https://wa.me/573172329884?text=Hola%20Servidor%20Uverley%2C%20quiero%20hacer%20un%20pedido'

type Order = {
  id: string | number
  user_id: string
  product_id: number | null
  product_name: string | null
  price: number | null
  status: string | null
  created_at?: string
}

function DashboardPage() {
  const navigate = useNavigate()

  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [orders, setOrders] = useState<Order[]>([])
  const [loadingOrders, setLoadingOrders] = useState(false)
  const [updatingOrder, setUpdatingOrder] = useState<string | number | null>(
    null,
  )

  useEffect(() => {
    let mounted = true

    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate({ to: '/login' })
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (error || profile?.role !== 'admin') {
        await supabase.auth.signOut()
        navigate({ to: '/' })
        return
      }

      if (mounted) {
        setAuthorized(true)
        setChecking(false)

        loadOrders()
      }
    }

    checkAccess()

    return () => {
      mounted = false
    }
  }, [navigate])

  async function loadOrders() {
    setLoadingOrders(true)

    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, user_id, product_id, product_name, price, status, created_at',
      )
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando pedidos:', error)

      alert(
        'No se pudieron cargar los pedidos.\n\n' +
          error.message +
          '\n\nSi el error menciona RLS, debemos crear la política de administrador en Supabase.',
      )

      setOrders([])
    } else {
      setOrders(data ?? [])
    }

    setLoadingOrders(false)
  }

  async function updateOrderStatus(
    orderId: string | number,
    status: string,
  ) {
    setUpdatingOrder(orderId)

    const { error } = await supabase
      .from('orders')
      .update({ status })
      .eq('id', orderId)

    if (error) {
      console.error(error)
      alert('No se pudo actualizar el pedido: ' + error.message)
    } else {
      setOrders((current) =>
        current.map((order) =>
          order.id === orderId
            ? { ...order, status }
            : order,
        ),
      )
    }

    setUpdatingOrder(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  function scrollToOrders() {
    document
      .getElementById('ordenes')
      ?.scrollIntoView({ behavior: 'smooth' })
  }

  function formatPrice(price: number | null) {
    if (price === null || price === undefined) {
      return '$ 0'
    }

    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price)
  }

  function formatDate(date?: string) {
    if (!date) return 'Sin fecha'

    return new Date(date).toLocaleString('es-CO', {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  }

  function getStatusColor(status: string | null) {
    switch (status?.toLowerCase()) {
      case 'completado':
      case 'completada':
        return 'bg-green-600/20 text-green-400 border-green-600/30'

      case 'en proceso':
      case 'procesando':
        return 'bg-blue-600/20 text-blue-400 border-blue-600/30'

      case 'cancelado':
      case 'cancelada':
        return 'bg-red-600/20 text-red-400 border-red-600/30'

      default:
        return 'bg-yellow-600/20 text-yellow-400 border-yellow-600/30'
    }
  }

  function getStatusIcon(status: string | null) {
    switch (status?.toLowerCase()) {
      case 'completado':
      case 'completada':
        return <CheckCircle size={16} />

      case 'cancelado':
      case 'cancelada':
        return <XCircle size={16} />

      case 'en proceso':
      case 'procesando':
        return <LoaderCircle size={16} />

      default:
        return <Clock size={16} />
    }
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <LoaderCircle
            size={40}
            className="animate-spin text-blue-500 mx-auto mb-4"
          />
          <p className="text-gray-400">
            Verificando acceso...
          </p>
        </div>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  const quickActions = [
    {
      label: 'Nueva Orden',
      icon: <PlusCircle size={28} />,
      href: WA_BASE,
      external: true,
      color: 'bg-blue-600 hover:bg-blue-700',
    },
    {
      label: 'Ver Órdenes',
      icon: <List size={28} />,
      action: scrollToOrders,
      color: 'bg-gray-700 hover:bg-gray-600',
    },
    {
      label: 'Recargar Saldo',
      icon: <CreditCard size={28} />,
      href: WA_BASE,
      external: true,
      color: 'bg-green-700 hover:bg-green-600',
    },
    {
      label: 'Servicios',
      icon: <Grid size={28} />,
      href: '/',
      external: false,
      color: 'bg-purple-700 hover:bg-purple-600',
    },
    {
      label: 'Administrar Productos',
      icon: <Package size={28} />,
      href: '/products',
      external: false,
      color: 'bg-orange-600 hover:bg-orange-700',
    },
  ]

  return (
    <div className="min-h-screen bg-black text-white fade-in">

      {/* HEADER */}
      <header className="bg-gray-900/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md">

        <div>
          <Link
            to="/"
            className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Servidor Uverley
          </Link>

          <p className="text-gray-400 text-sm mt-1">
            Panel de administración
          </p>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>

      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">

        {/* BIENVENIDA */}
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-8 mb-10 text-center">

          <h1 className="text-3xl font-black text-white mb-2">
            ¡Bienvenido al panel!
          </h1>

          <p className="text-gray-300 text-lg">
            Administración de Servidor Uverley
          </p>

        </div>

        {/* ACCIONES */}
        <h2 className="text-2xl font-bold text-white mb-6">
          Acciones Rápidas
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-14">

          {quickActions.map((action) =>
            action.external ? (
              <a
                key={action.label}
                href={action.href}
                target="_blank"
                rel="noopener noreferrer"
                className={`${action.color} text-white rounded-2xl p-6 flex flex-col items-center gap-3 font-bold text-lg transition-all hover:scale-105 hover:shadow-xl text-center`}
              >
                {action.icon}
                {action.label}
              </a>
            ) : action.action ? (
              <button
                key={action.label}
                onClick={action.action}
                className={`${action.color} text-white rounded-2xl p-6 flex flex-col items-center gap-3 font-bold text-lg transition-all hover:scale-105 hover:shadow-xl text-center`}
              >
                {action.icon}
                {action.label}
              </button>
            ) : (
              <Link
                key={action.label}
                to={action.href as '/'}
                className={`${action.color} text-white rounded-2xl p-6 flex flex-col items-center gap-3 font-bold text-lg transition-all hover:scale-105 hover:shadow-xl text-center`}
              >
                {action.icon}
                {action.label}
              </Link>
            ),
          )}

        </div>

        {/* PEDIDOS */}
        <section
          id="ordenes"
          className="scroll-mt-24"
        >

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">

            <div>
              <h2 className="text-2xl font-bold text-white">
                Pedidos
              </h2>

              <p className="text-gray-400 mt-1">
                Gestiona los pedidos realizados por tus clientes.
              </p>
            </div>

            <button
              onClick={loadOrders}
              disabled={loadingOrders}
              className="flex items-center justify-center gap-2 bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white px-5 py-3 rounded-lg font-semibold transition-all"
            >
              <RefreshCw
                size={18}
                className={
                  loadingOrders
                    ? 'animate-spin'
                    : ''
                }
              />
              Actualizar
            </button>

          </div>

          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden">

            {loadingOrders ? (

              <div className="py-20 text-center">

                <LoaderCircle
                  size={40}
                  className="animate-spin text-blue-500 mx-auto mb-4"
                />

                <p className="text-gray-400">
                  Cargando pedidos...
                </p>

              </div>

            ) : orders.length === 0 ? (

              <div className="py-20 text-center px-6">

                <ShoppingBag
                  size={50}
                  className="text-gray-600 mx-auto mb-4"
                />

                <h3 className="text-xl font-bold text-white mb-2">
                  No hay pedidos
                </h3>

                <p className="text-gray-400">
                  Los nuevos pedidos aparecerán aquí.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-gray-800">

                {orders.map((order) => (

                  <div
                    key={order.id}
                    className="p-6 hover:bg-gray-800/30 transition-all"
                  >

                    <div className="flex flex-col lg:flex-row lg:items-center gap-5">

                      {/* INFORMACIÓN */}
                      <div className="flex-1 min-w-0">

                        <div className="flex items-center gap-3 mb-2">

                          <ShoppingBag
                            size={20}
                            className="text-blue-400 shrink-0"
                          />

                          <h3 className="text-lg font-bold text-white truncate">
                            {order.product_name ||
                              'Servicio sin nombre'}
                          </h3>

                        </div>

                        <p className="text-green-400 text-xl font-black mb-2">
                          {formatPrice(order.price)}
                        </p>

                        <p className="text-gray-500 text-xs break-all">
                          Cliente: {order.user_id}
                        </p>

                        <p className="text-gray-500 text-xs mt-1">
                          Pedido #{order.id}
                          {' • '}
                          {formatDate(order.created_at)}
                        </p>

                      </div>

                      {/* ESTADO */}
                      <div className="flex flex-col sm:flex-row lg:flex-col gap-3 min-w-[220px]">

                        <div
                          className={`flex items-center justify-center gap-2 border rounded-lg px-4 py-2 font-semibold ${getStatusColor(
                            order.status,
                          )}`}
                        >
                          {getStatusIcon(order.status)}
                          {order.status || 'Pendiente'}
                        </div>

                        <select
                          value={order.status || 'pendiente'}
                          disabled={
                            updatingOrder === order.id
                          }
                          onChange={(event) =>
                            updateOrderStatus(
                              order.id,
                              event.target.value,
                            )
                          }
                          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:border-blue-500"
                        >
                          <option value="pendiente">
                            Pendiente
                          </option>

                          <option value="en proceso">
                            En proceso
                          </option>

                          <option value="completado">
                            Completado
                          </option>

                          <option value="cancelado">
                            Cancelado
                          </option>
                        </select>

                      </div>

                    </div>

                  </div>

                ))}

              </div>

            )}

          </div>

        </section>

        {/* AYUDA */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 text-center mt-12">

          <h3 className="text-xl font-bold text-white mb-3">
            ¿Necesitas ayuda?
          </h3>

          <p className="text-gray-400 mb-6">
            Contacta a soporte directamente por WhatsApp.
          </p>

          <a
            href={WA_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all"
          >
            <MessageCircle size={22} />
            Soporte por WhatsApp
          </a>

        </div>

      </main>
    </div>
  )
}
