import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  ArrowRight,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  LogOut,
  Menu,
  MessageCircle,
  Settings,
  ShieldCheck,
  Smartphone,
  User,
  Wallet,
  X,
  Zap,
} from 'lucide-react'
import { formatPrice, errorMessage, useSession } from '../lib/session'
import { createOrder as createOrderFn, listActiveProducts, type ProductDTO } from '../server/store.functions'
import { Logo } from '../components/Logo'

export const Route = createFileRoute('/')({ component: Home })

type Product = ProductDTO
type Toast = { kind: 'success' | 'error'; text: string } | null

const WA_NUMBER = '573172329884'

function waLink(service?: string) {
  const text = service
    ? `Hola Servidor Uverley, quiero el servicio de ${service}`
    : 'Hola Servidor Uverley, quiero información sobre sus servicios'
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`
}

const steps = [
  { n: '01', title: 'Crea tu cuenta', desc: 'Regístrate con tu correo en menos de un minuto.' },
  { n: '02', title: 'Recarga saldo', desc: 'Paga por Nequi y sube el comprobante. Lo validamos y acreditamos.' },
  { n: '03', title: 'Pide el servicio', desc: 'Elige del catálogo; el valor se descuenta de tu saldo al instante.' },
  { n: '04', title: 'Seguimiento', desc: 'Consulta el estado en "Mis pedidos" o escríbenos por WhatsApp.' },
]

const values = [
  { icon: ShieldCheck, title: 'Procesos verificados', desc: 'Cada pedido queda registrado en tu cuenta con su estado y su historial de saldo.' },
  { icon: Zap, title: 'Atención ágil', desc: 'Gestionamos las solicitudes en orden de llegada y te avisamos cuando cambian de estado.' },
  { icon: Wallet, title: 'Saldo transparente', desc: 'Recargas desde $20.000 COP. Ves cada movimiento antes y después de pedir.' },
  { icon: Clock, title: 'Soporte directo', desc: 'Hablas con una persona por WhatsApp, no con un bot.' },
]

function Home() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [orderingId, setOrderingId] = useState<number | null>(null)
  const { session, ready, refresh, logout } = useSession()
  const user = session
  const isAdmin = Boolean(session?.isAdmin)
  const checkingUser = !ready
  const [menuOpen, setMenuOpen] = useState(false)
  const [toast, setToast] = useState<Toast>(null)

  useEffect(() => {
    void loadProducts()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 6000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      setProducts(await listActiveProducts())
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProducts([])
    } finally {
      setLoadingProducts(false)
    }
  }

  async function handleLogout() {
    await logout()
    setMenuOpen(false)
    navigate({ to: '/' })
  }

  async function createOrder(product: Product) {
    if (!session) {
      navigate({ to: '/login' })
      return
    }
    if (session.balance < product.price) {
      setToast({ kind: 'error', text: `Saldo insuficiente: tienes ${formatPrice(session.balance)} y el servicio cuesta ${formatPrice(product.price)}. Recarga desde "Mi cuenta".` })
      return
    }
    if (!window.confirm(`¿Confirmas el pedido de "${product.name}" por ${formatPrice(product.price)}? Se descontará de tu saldo.`)) return
    setOrderingId(product.id)
    try {
      const result = await createOrderFn({ data: { productId: product.id } })
      await refresh()
      setToast({ kind: 'success', text: `Pedido #${result.order.id} creado: ${product.name}. Saldo restante ${formatPrice(result.balance)}. Te abrimos WhatsApp para coordinar.` })
      window.open(waLink(`${product.name} (pedido #${result.order.id})`), '_blank', 'noopener,noreferrer')
    } catch (error) {
      setToast({ kind: 'error', text: errorMessage(error, 'No se pudo crear el pedido. Intenta de nuevo.') })
    } finally {
      setOrderingId(null)
    }
  }

  const accountLink = isAdmin
    ? { to: '/dashboard' as const, label: 'Panel admin', icon: Settings }
    : { to: '/account' as const, label: 'Mi cuenta', icon: User }

  const navLinks = [
    { href: '#servicios', label: 'Servicios' },
    { href: '#proceso', label: 'Cómo funciona' },
    { href: '#contacto', label: 'Contacto' },
  ]

  return (
    <div className="grain min-h-screen bg-black text-gray-100">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-black/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-5">
          <Logo />
          <nav className="hidden items-center gap-8 text-sm text-gray-400 md:flex">
            {navLinks.map(link => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-gray-100">{link.label}</a>
            ))}
            <Link to="/faq" className="transition-colors hover:text-gray-100">Preguntas frecuentes</Link>
          </nav>
          <div className="flex items-center gap-2">
            {checkingUser ? (
              <span className="skeleton hidden h-9 w-28 rounded-lg sm:block" />
            ) : user ? (
              <>
                {!isAdmin && (
                  <Link to="/topup" className="hidden items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 font-mono text-sm text-green-400 hover:bg-gray-800 lg:inline-flex" title="Saldo disponible · Recargar">
                    <Wallet size={14} /> {formatPrice(user.balance)}
                  </Link>
                )}
                <Link to={accountLink.to} className="hidden items-center gap-2 rounded-lg border border-gray-700 px-4 py-2 text-sm font-semibold transition-colors hover:border-gray-500 sm:inline-flex">
                  <accountLink.icon size={16} /> {accountLink.label}
                </Link>
                <button onClick={() => void handleLogout()} className="hidden rounded-lg p-2.5 text-gray-400 transition-colors hover:bg-gray-900 hover:text-gray-100 sm:block" title="Cerrar sesión" aria-label="Cerrar sesión">
                  <LogOut size={18} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="hidden px-3 py-2 text-sm font-semibold text-gray-300 transition-colors hover:text-white sm:block">Ingresar</Link>
                <Link to="/register" className="hidden rounded-lg bg-gray-100 px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white sm:block">Crear cuenta</Link>
              </>
            )}
            <button onClick={() => setMenuOpen(open => !open)} className="rounded-lg p-2.5 text-gray-300 hover:bg-gray-900 md:hidden" aria-label="Abrir menú" aria-expanded={menuOpen}>
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <div className="border-t border-white/5 bg-black/95 px-5 py-4 md:hidden">
            <div className="flex flex-col gap-1">
              {navLinks.map(link => (
                <a key={link.href} href={link.href} onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-3 text-gray-300 hover:bg-gray-900">{link.label}</a>
              ))}
              <Link to="/faq" className="rounded-lg px-3 py-3 text-gray-300 hover:bg-gray-900">Preguntas frecuentes</Link>
              <div className="my-2 h-px bg-gray-800" />
              {user ? (
                <>
                  <Link to={accountLink.to} className="rounded-lg px-3 py-3 font-semibold hover:bg-gray-900">{accountLink.label}</Link>
                  <button onClick={() => void handleLogout()} className="rounded-lg px-3 py-3 text-left text-gray-400 hover:bg-gray-900">Cerrar sesión</button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <Link to="/login" className="rounded-lg border border-gray-700 py-3 text-center font-semibold">Ingresar</Link>
                  <Link to="/register" className="rounded-lg bg-gray-100 py-3 text-center font-semibold text-black">Crear cuenta</Link>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden px-5 pb-24 pt-36 md:pt-44">
        <div className="bg-grid pointer-events-none absolute inset-0" />
        <div className="pointer-events-none absolute -left-40 top-10 h-[480px] w-[480px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[1.25fr_1fr]">
          <div>
            <p className="fade-in mb-6 inline-flex items-center gap-2 rounded-full border border-gray-800 bg-gray-950/80 px-3 py-1.5 font-mono text-xs text-gray-400">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-green-400" /> Atendiendo pedidos · Colombia
            </p>
            <h1 className="fade-in delay-1 text-5xl font-bold leading-[1.02] md:text-7xl">
              Servicios para tu celular,
              <span className="block text-gray-500">sin vueltas.</span>
            </h1>
            <p className="fade-in delay-2 mt-7 max-w-xl text-lg leading-relaxed text-gray-400">
              Pide servicios técnicos para dispositivos móviles desde tu cuenta, paga con saldo recargado por Nequi y sigue cada pedido hasta que esté listo.
            </p>
            <div className="fade-in delay-3 mt-10 flex flex-col gap-3 sm:flex-row">
              <a href="#servicios" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-7 py-4 font-semibold text-white transition-colors hover:bg-blue-500">
                Ver servicios <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
              </a>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-700 px-7 py-4 font-semibold text-gray-200 transition-colors hover:border-gray-500 hover:bg-gray-950">
                <MessageCircle size={18} className="text-green-400" /> Hablar por WhatsApp
              </a>
            </div>
          </div>

          {/* Process panel */}
          <div className="fade-in delay-4 relative">
            <div className="absolute -inset-px rounded-2xl bg-gradient-to-b from-blue-500/30 via-gray-800/40 to-transparent" />
            <div className="relative rounded-2xl bg-gray-950 p-6 md:p-7">
              <div className="mb-6 flex items-center justify-between border-b border-gray-800 pb-4">
                <span className="font-mono text-xs uppercase tracking-[0.2em] text-gray-500">Tu pedido</span>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-green-900/50 px-2 py-1 font-mono text-[11px] text-green-300">
                  <BadgeCheck size={12} /> en curso
                </span>
              </div>
              <ol className="space-y-5">
                {steps.map((step, i) => (
                  <li key={step.n} className="flex gap-4">
                    <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border font-mono text-xs ${i < 3 ? 'border-blue-500/60 bg-blue-600/20 text-blue-300' : 'border-gray-700 text-gray-500'}`}>{step.n}</span>
                    <div>
                      <p className="font-semibold text-gray-100">{step.title}</p>
                      <p className="mt-0.5 text-sm text-gray-500">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="servicios" className="scroll-mt-20 border-t border-gray-900 px-5 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-blue-400">Catálogo</p>
              <h2 className="text-4xl font-bold md:text-5xl">Servicios disponibles</h2>
            </div>
            <p className="max-w-md text-gray-400">Precios en pesos colombianos. El valor se descuenta de tu saldo al confirmar el pedido.</p>
          </div>

          {loadingProducts ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="overflow-hidden rounded-2xl border border-gray-900">
                  <div className="skeleton h-44" />
                  <div className="space-y-3 p-6"><div className="skeleton h-5 w-2/3 rounded" /><div className="skeleton h-4 w-full rounded" /><div className="skeleton h-10 w-full rounded-lg" /></div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-gray-800 bg-gray-950/50 px-6 py-16 text-center">
              <Smartphone size={40} className="mx-auto mb-4 text-gray-600" />
              <h3 className="text-xl font-semibold">Estamos actualizando el catálogo</h3>
              <p className="mx-auto mt-2 max-w-md text-gray-400">Escríbenos por WhatsApp y te contamos qué servicios tenemos disponibles hoy.</p>
              <a href={waLink()} target="_blank" rel="noopener noreferrer" className="mt-6 inline-flex items-center gap-2 rounded-lg bg-green-600 px-5 py-3 font-semibold text-white hover:bg-green-700">
                <MessageCircle size={18} /> Consultar disponibilidad
              </a>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(product => (
                <article key={product.id} className="group flex flex-col overflow-hidden rounded-2xl border border-gray-800/80 bg-gray-950 transition-colors hover:border-gray-700">
                  <div className="relative h-44 overflow-hidden bg-gray-900">
                    {product.imageUrl ? (
                      <img src={product.imageUrl} alt={product.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
                    ) : (
                      <div className="bg-grid flex h-full items-center justify-center"><Smartphone size={44} className="text-gray-700" /></div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h3 className="text-xl font-semibold">{product.name}</h3>
                    {product.description && <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-400">{product.description}</p>}
                    <div className="mt-6 flex items-center justify-between gap-4 border-t border-gray-900 pt-5">
                      <span className="font-mono text-lg font-medium text-gray-100">{formatPrice(product.price)}</span>
                      <button
                        onClick={() => void createOrder(product)}
                        disabled={orderingId === product.id}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:bg-gray-800 disabled:text-gray-400"
                      >
                        {orderingId === product.id ? 'Procesando…' : <>Pedir <ArrowUpRight size={15} /></>}
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Process + values */}
      <section id="proceso" className="scroll-mt-20 border-t border-gray-900 bg-gray-950/60 px-5 py-24">
        <div className="mx-auto grid max-w-7xl gap-16 lg:grid-cols-[1fr_1.4fr]">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="mb-3 font-mono text-xs uppercase tracking-[0.25em] text-blue-400">Por qué nosotros</p>
            <h2 className="text-4xl font-bold leading-tight md:text-5xl">Un proceso claro, de principio a fin.</h2>
            <p className="mt-6 text-gray-400">Todo queda en tu cuenta: saldo, recargas y pedidos. Si tienes dudas, revisa las{' '}
              <Link to="/faq" className="text-blue-400 underline-offset-4 hover:underline">preguntas frecuentes</Link>.
            </p>
            {!user && (
              <Link to="/register" className="mt-8 inline-flex items-center gap-2 rounded-xl bg-gray-100 px-6 py-3.5 font-semibold text-black hover:bg-white">
                Crear cuenta gratis <ArrowRight size={18} />
              </Link>
            )}
          </div>
          <div className="grid gap-px overflow-hidden rounded-2xl border border-gray-800 bg-gray-800 sm:grid-cols-2">
            {values.map(item => (
              <div key={item.title} className="bg-gray-950 p-8">
                <item.icon size={22} className="mb-5 text-blue-400" strokeWidth={1.75} />
                <h3 className="text-lg font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contacto" className="scroll-mt-20 px-5 py-24">
        <div className="relative mx-auto max-w-7xl overflow-hidden rounded-3xl border border-gray-800 bg-gray-950 px-8 py-14 md:px-14">
          <div className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-green-600/10 blur-[100px]" />
          <div className="relative flex flex-col items-start justify-between gap-8 md:flex-row md:items-center">
            <div>
              <h2 className="text-3xl font-bold md:text-4xl">¿Tienes un caso específico?</h2>
              <p className="mt-3 max-w-lg text-gray-400">Cuéntanos el modelo de tu equipo y lo que necesitas. Te respondemos por WhatsApp con el servicio y el valor.</p>
            </div>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="inline-flex shrink-0 items-center gap-3 rounded-xl bg-green-600 px-7 py-4 font-semibold text-white transition-colors hover:bg-green-700">
              <MessageCircle size={20} /> +57 317 232 9884
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-900 px-5 py-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-center">
          <div>
            <Logo />
            <p className="mt-3 text-sm text-gray-500">Servicios digitales para dispositivos móviles.</p>
          </div>
          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-gray-400">
            <a href="#servicios" className="hover:text-gray-100">Servicios</a>
            <Link to="/faq" className="hover:text-gray-100">Preguntas frecuentes</Link>
            <Link to="/login" className="hover:text-gray-100">Ingresar</Link>
            <a href={waLink()} target="_blank" rel="noopener noreferrer" className="hover:text-gray-100">WhatsApp</a>
          </nav>
        </div>
        <p className="mx-auto mt-10 max-w-7xl font-mono text-xs text-gray-600">© {new Date().getFullYear()} Servidor Uverley</p>
      </footer>

      {/* Floating WhatsApp */}
      <a href={waLink()} target="_blank" rel="noopener noreferrer" aria-label="Escribir por WhatsApp" className="fixed bottom-5 right-5 z-40 grid h-14 w-14 place-items-center rounded-full bg-green-600 text-white shadow-lg shadow-black/50 transition-transform hover:scale-105">
        <MessageCircle size={24} />
      </a>

      {/* Toast */}
      {toast && (
        <div role="status" className={`fade-in fixed bottom-24 left-1/2 z-50 w-[calc(100%-2.5rem)] max-w-md -translate-x-1/2 rounded-xl border px-5 py-4 text-sm shadow-2xl shadow-black/60 ${toast.kind === 'success' ? 'border-green-800 bg-green-900/90 text-green-100' : 'border-red-800 bg-red-950/90 text-red-100'}`}>
          <div className="flex items-start justify-between gap-4">
            <p>{toast.text}</p>
            <button onClick={() => setToast(null)} aria-label="Cerrar aviso" className="text-current opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        </div>
      )}
    </div>
  )
}
