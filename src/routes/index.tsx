import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  Smartphone,
  CheckCircle,
  Zap,
  Shield,
  DollarSign,
  MessageCircle,
  Clock,
  User,
  LogOut,
  Settings,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/')({
  component: Home,
})

type Product = {
  id: number
  name: string
  description: string | null
  price: number
  image_url: string | null
  active: boolean
}

const WA_NUMBER = '573172329884'

const WA_BASE = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(
  'Hola Servidor Uverley, quiero información sobre sus servicios',
)}`

function waLink(service?: string) {
  const text = service
    ? `Hola Servidor Uverley, quiero el servicio de ${service}`
    : 'Hola Servidor Uverley, quiero información sobre sus servicios'

  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`
}

const whyUs = [
  {
    icon: <Shield size={32} className="text-blue-400" />,
    title: '100% Seguro',
    desc: 'Proceso verificado y atención profesional.',
  },
  {
    icon: <Zap size={32} className="text-yellow-400" />,
    title: 'Entrega Rápida',
    desc: 'Atención rápida según el servicio.',
  },
  {
    icon: <DollarSign size={32} className="text-green-400" />,
    title: 'Precios Competitivos',
    desc: 'Precios actualizados y accesibles.',
  },
  {
    icon: <Clock size={32} className="text-purple-400" />,
    title: 'Soporte',
    desc: 'Atención permanente por WhatsApp.',
  },
]

function Home() {
  const navigate = useNavigate()

  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [orderingId, setOrderingId] = useState<number | null>(null)

  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)
  const [balance, setBalance] = useState<number>(0)

  useEffect(() => {
    loadProducts()
    checkUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      checkUser()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function checkUser() {
    setCheckingUser(true)

    const {
      data: { user },
    } = await supabase.auth.getUser()

    setUser(user)

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, balance')
        .eq('id', user.id)
        .single()

      setIsAdmin(profile?.role === 'admin')
      setBalance(Number(profile?.balance ?? 0))
    } else {
      setIsAdmin(false)
      setBalance(0)
    }

    setCheckingUser(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setIsAdmin(false)
    setBalance(0)
    navigate({ to: '/' })
  }

  async function loadProducts() {
    setLoadingProducts(true)

    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, description, price, image_url, active',
      )
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (!error) {
      setProducts(data ?? [])
    } else {
      console.error('Error cargando productos:', error)
    }

    setLoadingProducts(false)
  }

  function formatPrice(price: number) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(price)
  }

  async function createOrder(product: Product) {
    setOrderingId(product.id)

    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()

      if (!currentUser) {
        alert('Debes iniciar sesión para realizar un pedido.')
        navigate({ to: '/login' })
        return
      }

      const { data, error } = await supabase.rpc(
        'create_order',
        {
          p_product_id: product.id,
        },
      )

      if (error) {
        console.error(error)
        alert(error.message || 'No se pudo crear el pedido.')
        return
      }

      alert(
        `Pedido creado correctamente.\n\nServicio: ${
          data.product_name
        }\nPrecio: ${formatPrice(
          Number(data.price),
        )}\n\nNúmero de pedido: #${data.order_id}`,
      )

      await checkUser()

      window.open(
        waLink(product.name),
        '_blank',
        'noopener,noreferrer',
      )
    } finally {
      setOrderingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* HEADER */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">

          <Link
            to="/"
            className="text-3xl font-black tracking-tight bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent shrink-0"
          >
            Servidor Uverley
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <a
              href="#"
              className="text-white hover:text-blue-400 transition-colors font-medium"
            >
              Inicio
            </a>

            <a
              href="#servicios"
              className="text-white hover:text-blue-400 transition-colors font-medium"
            >
              Servicios
            </a>

            <a
              href="#precios"
              className="text-white hover:text-blue-400 transition-colors font-medium"
            >
              Precios
            </a>

            <a
              href="#contacto"
              className="text-white hover:text-blue-400 transition-colors font-medium"
            >
              Contacto
            </a>
          </nav>

          <div className="flex items-center gap-3">

            {!checkingUser && !user && (
              <Link
                to="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition-all hover:scale-105 text-sm flex items-center gap-2"
              >
                <User size={18} />
                Iniciar Sesión
              </Link>
            )}

            {!checkingUser && user && isAdmin && (
              <Link
                to="/dashboard"
                className="bg-purple-600 hover:bg-purple-700 text-white px-5 py-3 rounded-lg font-semibold transition-all hover:scale-105 text-sm flex items-center gap-2"
              >
                <Settings size={18} />
                Panel Admin
              </Link>
            )}

            {!checkingUser && user && !isAdmin && (
              <Link
                to="/orders"
                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-3 rounded-lg font-semibold transition-all hover:scale-105 text-sm flex items-center gap-2"
              >
                <User size={18} />
                Mis Pedidos
              </Link>
            )}

            {!checkingUser && user && (
              <div className="hidden sm:block text-right">
                <p className="text-xs text-gray-400">
                  Saldo
                </p>

                <p className="text-green-400 font-bold">
                  {formatPrice(balance)}
                </p>
              </div>
            )}

            {!checkingUser && user && (
              <button
                onClick={handleLogout}
                className="bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white p-3 rounded-lg transition-all"
                title="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            )}

            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full transition-all hover:scale-110 flex items-center justify-center"
              title="WhatsApp"
            >
              <MessageCircle size={20} />
            </a>

          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="min-h-screen flex items-center justify-center px-4 pt-24 bg-gradient-to-b from-black via-gray-950 to-black">

        <div className="max-w-5xl mx-auto text-center">

          <p className="text-blue-400 font-bold tracking-[0.3em] uppercase mb-4">
            Soluciones digitales
          </p>

          <h1 className="text-6xl md:text-8xl font-black mb-6 bg-gradient-to-r from-blue-400 to-purple-600 bg-clip-text text-transparent leading-tight">
            Servidor Uverley
          </h1>

          <p className="text-3xl md:text-4xl font-bold text-white mb-6">
            Tecnología, servicios y soluciones
          </p>

          <p className="text-xl text-gray-400 mb-12 max-w-3xl mx-auto leading-relaxed">
            Servicios profesionales para dispositivos móviles,
            atención rápida, precios competitivos y soporte
            personalizado.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">

            <a
              href="#servicios"
              className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-5 rounded-xl text-xl font-bold transition-all hover:scale-105"
            >
              Explorar Servicios
            </a>

            <a
              href={WA_BASE}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-green-600 hover:bg-green-700 text-white px-10 py-5 rounded-xl text-xl font-bold transition-all hover:scale-105 flex items-center justify-center gap-2"
            >
              <MessageCircle size={24} />
              Contactar por WhatsApp
            </a>

          </div>
        </div>
      </section>

      {/* SERVICIOS */}
      <section id="servicios" className="py-20 px-4">

        <div className="max-w-7xl mx-auto">

          <h2 className="text-4xl md:text-5xl font-black text-center mb-4 text-white">
            Nuestros Servicios
          </h2>

          <p className="text-gray-400 text-center text-lg mb-14 max-w-2xl mx-auto">
            Elige el servicio que necesitas y realiza tu pedido.
          </p>

          {loadingProducts ? (

            <div className="text-center py-16">
              <p className="text-gray-400 text-lg">
                Cargando servicios...
              </p>
            </div>

          ) : products.length === 0 ? (

            <div className="text-center py-16 bg-gray-900/70 border border-gray-800 rounded-2xl">
              <p className="text-gray-400 text-lg">
                Actualmente no hay servicios disponibles.
              </p>
            </div>

          ) : (

            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">

              {products.map((product) => (

                <div
                  key={product.id}
                  className="bg-gray-900/70 border border-gray-800 rounded-2xl overflow-hidden flex flex-col hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-900/40 transition-all hover:scale-105"
                >

                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-52 object-cover"
                    />
                  ) : (
                    <div className="w-full h-52 bg-gray-800 flex items-center justify-center">
                      <Smartphone
                        size={60}
                        className="text-gray-600"
                      />
                    </div>
                  )}

                  <div className="p-6 flex flex-col flex-1">

                    <div className="mb-4">
                      <CheckCircle
                        size={28}
                        className="text-blue-400"
                      />
                    </div>

                    <h3 className="text-xl font-bold mb-2 text-white">
                      {product.name}
                    </h3>

                    <p className="text-gray-400 text-sm mb-5 flex-1">
                      {product.description}
                    </p>

                    <p className="text-2xl font-black text-green-400 mb-5">
                      {formatPrice(product.price)}
                    </p>

                    <button
                      onClick={() => createOrder(product)}
                      disabled={orderingId === product.id}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg px-4 py-3 text-sm font-semibold text-center transition-all"
                    >
                      {orderingId === product.id
                        ? 'Creando pedido...'
                        : 'Pedir Servicio'}
                    </button>

                  </div>
                </div>

              ))}

            </div>

          )}

        </div>
      </section>

      {/* POR QUÉ ELEGIRNOS */}
      <section
        id="precios"
        className="py-20 px-4 bg-gray-950/50"
      >

        <div className="max-w-5xl mx-auto">

          <h2 className="text-4xl font-black text-center mb-14 text-white">
            ¿Por qué elegirnos?
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">

            {whyUs.map((item) => (

              <div
                key={item.title}
                className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6 text-center hover:border-blue-500 hover:shadow-xl transition-all hover:scale-105"
              >

                <div className="flex justify-center mb-4">
                  {item.icon}
                </div>

                <h3 className="text-xl font-bold mb-2 text-white">
                  {item.title}
                </h3>

                <p className="text-gray-400 text-sm">
                  {item.desc}
                </p>

              </div>

            ))}

          </div>
        </div>
      </section>

      {/* CONTACTO */}
      <section
        id="contacto"
        className="py-24 px-4 bg-gradient-to-b from-gray-950 to-black text-center"
      >

        <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
          ¿Necesitas ayuda?
        </h2>

        <p className="text-gray-400 text-xl mb-10 max-w-xl mx-auto">
          Contacta ahora y recibe atención por WhatsApp.
        </p>

        <a
          href={WA_BASE}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white px-14 py-6 rounded-2xl text-2xl font-black transition-all hover:scale-105"
        >
          <MessageCircle size={32} />
          Escribir por WhatsApp
        </a>

      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 py-10 px-4 text-center border-t border-gray-800">

        <p className="text-gray-400 text-sm">
          © 2026 Servidor Uverley | WhatsApp +57 317 232 9884
        </p>

      </footer>

    </div>
  )
}
