```tsx
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Users,
  Wallet,
  Plus,
  Minus,
  History,
  Package,
  ShoppingCart,
  LogOut,
  MessageCircle,
  RefreshCw,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

type Client = {
  id: string
  email: string | null
  balance: number
  role: string
}

type Transaction = {
  id: number
  user_id: string
  amount: number
  type: string
  description: string | null
  admin_id: string | null
  created_at: string
}

type Order = {
  id: number
  user_id: string
  product_name: string
  price: number
  status: string
  created_at: string
}

const WA_NUMBER = '573172329884'

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function DashboardPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  const [clients, setClients] = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orders, setOrders] = useState<Order[]>([])

  const [selectedClient, setSelectedClient] =
    useState<Client | null>(null)

  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)

  const [activeSection, setActiveSection] =
    useState<
      'inicio' | 'clientes' | 'movimientos' | 'pedidos'
    >('inicio')

  useEffect(() => {
    checkAdmin()
  }, [])

  async function checkAdmin() {
    setLoading(true)

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

    setAuthorized(true)
    setLoading(false)

    await loadData()
  }

  async function loadData() {
    await Promise.all([
      loadClients(),
      loadTransactions(),
      loadOrders(),
    ])
  }

  async function loadClients() {
    const { data, error } = await supabase.rpc(
      'admin_get_clients',
    )

    if (error) {
      console.error(
        'Error cargando clientes:',
        error,
      )

      alert(
        'No se pudieron cargar los clientes:\n' +
          error.message,
      )

      return
    }

    setClients(data ?? [])
  }

  async function loadTransactions() {
    const { data, error } = await supabase
      .from('balance_transactions')
      .select(
        'id, user_id, amount, type, description, admin_id, created_at',
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (error) {
      console.error(
        'Error cargando movimientos:',
        error,
      )
      return
    }

    setTransactions(data ?? [])
  }

  async function loadOrders() {
    const { data, error } = await supabase
      .from('orders')
      .select(
        'id, user_id, product_name, price, status, created_at',
      )
      .order('created_at', {
        ascending: false,
      })
      .limit(100)

    if (error) {
      console.error(
        'Error cargando pedidos:',
        error,
      )
      return
    }

    setOrders(data ?? [])
  }

  async function changeBalance(
    type: 'recarga' | 'descuento',
  ) {
    if (!selectedClient) {
      alert('Selecciona primero un cliente.')
      return
    }

    const numericAmount = Number(
      amount.replace(/[^\d]/g, ''),
    )

    if (!numericAmount || numericAmount <= 0) {
      alert('Escribe un monto válido.')
      return
    }

    if (numericAmount > 2000000) {
      alert(
        'El monto máximo permitido es $2.000.000 COP.',
      )
      return
    }

    if (
      type === 'recarga' &&
      numericAmount < 20000
    ) {
      alert(
        'La recarga mínima es de $20.000 COP.',
      )
      return
    }

    if (
      type === 'descuento' &&
      numericAmount >
        Number(selectedClient.balance)
    ) {
      alert(
        'El descuento no puede ser mayor al saldo disponible.',
      )
      return
    }

    const action =
      type === 'recarga'
        ? 'agregar'
        : 'descontar'

    const confirmation = window.confirm(
      `¿Confirmas ${action} ${formatPrice(
        numericAmount,
      )} ${
        type === 'recarga'
          ? 'al saldo'
          : 'del saldo'
      } de ${
        selectedClient.email ??
        'este cliente'
      }?`,
    )

    if (!confirmation) return

    setProcessing(true)

    try {
      const { data, error } =
        await supabase.rpc(
          'admin_change_balance',
          {
            target_user_id:
              selectedClient.id,
            change_amount:
              numericAmount,
            change_type: type,
            change_description:
              description.trim() ||
              (type === 'recarga'
                ? 'Recarga manual realizada por administrador'
                : 'Descuento manual realizado por administrador'),
          },
        )

      if (error) {
        console.error(error)

        alert(
          'No se pudo modificar el saldo:\n' +
            error.message,
        )

        return
      }

      alert(
        `Saldo actualizado correctamente.\n\nNuevo saldo: ${formatPrice(
          Number(data),
        )}`,
      )

      setAmount('')
      setDescription('')
      setSelectedClient(null)

      await loadData()
    } finally {
      setProcessing(false)
    }
  }

  async function changeOrderStatus(
    orderId: number,
    newStatus: string,
  ) {
    const confirmation = window.confirm(
      `¿Cambiar el estado del pedido a "${newStatus}"?`,
    )

    if (!confirmation) return

    const { error } = await supabase
      .from('orders')
      .update({
        status: newStatus,
      })
      .eq('id', orderId)

    if (error) {
      console.error(
        'Error cambiando estado:',
        error,
      )

      alert(
        'No se pudo cambiar el estado:\n' +
          error.message,
      )

      return
    }

    await loadOrders()
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  function clientEmail(userId: string) {
    const client = clients.find(
      (item) => item.id === userId,
    )

    return (
      client?.email ??
      `Usuario ${userId.slice(0, 8)}...`
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">
          Verificando acceso...
        </p>
      </div>
    )
  }

  if (!authorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}

      <header className="bg-gray-900 border-b border-gray-800 px-4 md:px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">

          <div>
            <Link
              to="/"
              className="text-2xl md:text-3xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
            >
              Servidor Uverley
            </Link>

            <p className="text-gray-400 text-sm">
              Panel de administración
            </p>
          </div>

          <div className="flex items-center gap-2">

            <button
              onClick={loadData}
              className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg"
              title="Actualizar"
            >
              <RefreshCw size={19} />
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-3 rounded-lg"
            >
              <LogOut size={18} />

              <span className="hidden sm:inline">
                Salir
              </span>
            </button>

          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">

        {/* NAVEGACIÓN */}

        <div className="flex gap-2 overflow-x-auto mb-8 pb-2">

          <button
            onClick={() =>
              setActiveSection('inicio')
            }
            className={`px-5 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeSection === 'inicio'
                ? 'bg-blue-600'
                : 'bg-gray-800'
            }`}
          >
            Inicio
          </button>

          <button
            onClick={() =>
              setActiveSection('clientes')
            }
            className={`px-5 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeSection === 'clientes'
                ? 'bg-blue-600'
                : 'bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <Users size={18} />
              Clientes
            </span>
          </button>

          <button
            onClick={() =>
              setActiveSection('movimientos')
            }
            className={`px-5 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeSection === 'movimientos'
                ? 'bg-blue-600'
                : 'bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <History size={18} />
              Movimientos
            </span>
          </button>

          <button
            onClick={() =>
              setActiveSection('pedidos')
            }
            className={`px-5 py-3 rounded-lg font-semibold whitespace-nowrap ${
              activeSection === 'pedidos'
                ? 'bg-blue-600'
                : 'bg-gray-800'
            }`}
          >
            <span className="flex items-center gap-2">
              <ShoppingCart size={18} />
              Pedidos
            </span>
          </button>

          <Link
            to="/products"
            className="px-5 py-3 rounded-lg font-semibold bg-orange-600 hover:bg-orange-700 whitespace-nowrap"
          >
            <span className="flex items-center gap-2">
              <Package size={18} />
              Productos
            </span>
          </Link>

        </div>

        {/* INICIO */}

        {activeSection === 'inicio' && (
          <>
            <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-8 mb-8">

              <h1 className="text-3xl font-black mb-2">
                Bienvenido al panel
              </h1>

              <p className="text-gray-300">
                Administra clientes, saldos,
                pedidos y productos desde un
                solo lugar.
              </p>

            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <Users className="text-blue-400 mb-4" />

                <p className="text-gray-400">
                  Usuarios
                </p>

                <p className="text-3xl font-black">
                  {clients.length}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <Wallet className="text-green-400 mb-4" />

                <p className="text-gray-400">
                  Saldo total
                </p>

                <p className="text-2xl font-black">
                  {formatPrice(
                    clients.reduce(
                      (sum, client) =>
                        sum +
                        Number(
                          client.balance || 0,
                        ),
                      0,
                    ),
                  )}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <ShoppingCart className="text-purple-400 mb-4" />

                <p className="text-gray-400">
                  Pedidos
                </p>

                <p className="text-3xl font-black">
                  {orders.length}
                </p>
              </div>

              <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                <History className="text-yellow-400 mb-4" />

                <p className="text-gray-400">
                  Movimientos
                </p>

                <p className="text-3xl font-black">
                  {transactions.length}
                </p>
              </div>

            </div>

            <div className="grid md:grid-cols-2 gap-5 mt-8">

              <button
                onClick={() =>
                  setActiveSection('clientes')
                }
                className="bg-blue-600 hover:bg-blue-700 rounded-2xl p-7 text-left transition-all"
              >
                <Wallet size={30} />

                <h2 className="text-xl font-bold mt-4">
                  Administrar saldos
                </h2>

                <p className="text-blue-100 mt-2">
                  Agrega o descuenta saldo a
                  tus clientes.
                </p>
              </button>

              <Link
                to="/products"
                className="bg-orange-600 hover:bg-orange-700 rounded-2xl p-7 text-left transition-all"
              >
                <Package size={30} />

                <h2 className="text-xl font-bold mt-4">
                  Administrar productos
                </h2>

                <p className="text-orange-100 mt-2">
                  Agrega productos, cambia
                  precios e imágenes.
                </p>
              </Link>

            </div>
          </>
        )}

        {/* CLIENTES */}

        {activeSection === 'clientes' && (
          <>
            <div className="flex items-center gap-3 mb-6">

              <button
                onClick={() =>
                  setActiveSection('inicio')
                }
                className="p-2 bg-gray-800 rounded-lg"
              >
                <ArrowLeft size={20} />
              </button>

              <div>
                <h1 className="text-3xl font-black">
                  Clientes y saldos
                </h1>

                <p className="text-gray-400">
                  Administra el saldo de cada
                  cliente.
                </p>
              </div>

            </div>

            {selectedClient && (
              <div className="bg-gray-900 border border-blue-600 rounded-2xl p-6 mb-8">

                <h2 className="text-xl font-bold mb-2">
                  Modificar saldo
                </h2>

                <p className="text-gray-400 mb-5">
                  {selectedClient.email}
                </p>

                <p className="text-green-400 text-3xl font-black mb-5">
                  {formatPrice(
                    selectedClient.balance,
                  )}
                </p>

                <div className="grid md:grid-cols-2 gap-4">

                  <input
                    type="number"
                    min="20000"
                    max="2000000"
                    placeholder="Monto"
                    value={amount}
                    onChange={(e) =>
                      setAmount(e.target.value)
                    }
                    className="bg-black border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                  <input
                    type="text"
                    placeholder="Descripción (opcional)"
                    value={description}
                    onChange={(e) =>
                      setDescription(
                        e.target.value,
                      )
                    }
                    className="bg-black border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-blue-500"
                  />

                </div>

                <div className="flex flex-wrap gap-3 mt-5">

                  <button
                    disabled={processing}
                    onClick={() =>
                      changeBalance(
                        'recarga',
                      )
                    }
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 px-5 py-3 rounded-lg font-bold"
                  >
                    <Plus size={20} />
                    Agregar saldo
                  </button>

                  <button
                    disabled={processing}
                    onClick={() =>
                      changeBalance(
                        'descuento',
                      )
                    }
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 px-5 py-3 rounded-lg font-bold"
                  >
                    <Minus size={20} />
                    Descontar saldo
                  </button>

                  <button
                    onClick={() =>
                      setSelectedClient(null)
                    }
                    className="bg-gray-700 hover:bg-gray-600 px-5 py-3 rounded-lg font-bold"
                  >
                    Cancelar
                  </button>

                </div>
              </div>
            )}

            <div className="space-y-4">

              {clients.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl p-8 text-center text-gray-400">
                  No se encontraron clientes.
                </div>
              ) : (
                clients.map((client) => (
                  <div
                    key={client.id}
                    className="bg-gray-900 border border-gray-800 rounded-2xl p-5"
                  >

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">

                      <div>
                        <p className="font-bold text-lg">
                          {client.email ??
                            'Sin correo'}
                        </p>

                        <p className="text-gray-500 text-xs mt-1">
                          ID: {client.id}
                        </p>

                        <p className="text-gray-500 text-xs">
                          Rol: {client.role}
                        </p>
                      </div>

                      <div className="flex items-center gap-5">

                        <div>
                          <p className="text-gray-400 text-sm">
                            Saldo
                          </p>

                          <p className="text-green-400 text-2xl font-black">
                            {formatPrice(
                              client.balance,
                            )}
                          </p>
                        </div>

                        {client.role !==
                          'admin' && (
                          <button
                            onClick={() =>
                              setSelectedClient(
                                client,
                              )
                            }
                            className="bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-bold"
                          >
                            Administrar
                          </button>
                        )}

                      </div>
                    </div>
                  </div>
                ))
              )}

            </div>
          </>
        )}

        {/* MOVIMIENTOS */}

        {activeSection === 'movimientos' && (
          <>
            <h1 className="text-3xl font-black mb-2">
              Historial de saldo
            </h1>

            <p className="text-gray-400 mb-8">
              Últimos movimientos realizados.
            </p>

            <div className="space-y-3">

              {transactions.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl p-8 text-center text-gray-400">
                  Todavía no hay movimientos.
                </div>
              ) : (
                transactions.map(
                  (transaction) => (
                    <div
                      key={transaction.id}
                      className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                    >

                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">

                        <div>
                          <p className="font-bold">
                            {clientEmail(
                              transaction.user_id,
                            )}
                          </p>

                          <p className="text-gray-400 text-sm">
                            {transaction.description ??
                              'Movimiento de saldo'}
                          </p>

                          <p className="text-gray-500 text-xs mt-1">
                            {new Date(
                              transaction.created_at,
                            ).toLocaleString(
                              'es-CO',
                            )}
                          </p>
                        </div>

                        <div
                          className={`text-xl font-black ${
                            transaction.type ===
                            'descuento'
                              ? 'text-red-400'
                              : 'text-green-400'
                          }`}
                        >
                          {transaction.type ===
                          'descuento'
                            ? '-'
                            : '+'}

                          {formatPrice(
                            transaction.amount,
                          )}
                        </div>

                      </div>
                    </div>
                  ),
                )
              )}

            </div>
          </>
        )}

        {/* PEDIDOS */}

        {activeSection === 'pedidos' && (
          <>
            <h1 className="text-3xl font-black mb-2">
              Pedidos
            </h1>

            <p className="text-gray-400 mb-8">
              Pedidos realizados por los
              clientes.
            </p>

            <div className="space-y-3">

              {orders.length === 0 ? (
                <div className="bg-gray-900 rounded-2xl p-8 text-center text-gray-400">
                  Todavía no hay pedidos.
                </div>
              ) : (
                orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-gray-900 border border-gray-800 rounded-xl p-5"
                  >

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">

                      <div>
                        <p className="font-bold text-lg">
                          {order.product_name}
                        </p>

                        <p className="text-gray-400 text-sm">
                          Cliente:{' '}
                          {clientEmail(
                            order.user_id,
                          )}
                        </p>

                        <p className="text-gray-500 text-xs mt-1">
                          {new Date(
                            order.created_at,
                          ).toLocaleString(
                            'es-CO',
                          )}
                        </p>
                      </div>

                      <div className="text-left md:text-right">

                        <p className="text-green-400 font-black text-xl">
                          {formatPrice(
                            order.price,
                          )}
                        </p>

                        <select
                          value={
                            order.status ||
                            'pendiente'
                          }
                          onChange={(e) =>
                            changeOrderStatus(
                              order.id,
                              e.target.value,
                            )
                          }
                          className="bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 mt-2"
                        >
                          <option value="pendiente">
                            Pendiente
                          </option>

                          <option value="procesando">
                            Procesando
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
                ))
              )}

            </div>
          </>
        )}

      </main>

      {/* WHATSAPP */}

      <a
        href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
          'Hola Servidor Uverley, necesito ayuda.',
        )}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-5 right-5 bg-green-600 hover:bg-green-700 p-4 rounded-full shadow-xl"
      >
        <MessageCircle size={25} />
      </a>

    </div>
  )
}
```
