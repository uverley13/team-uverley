import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { CheckCircle, Clock, DollarSign, LogOut, MessageCircle, Settings, Shield, Smartphone, User, Zap } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/')({ component: Home })

type Product = { id: number; name: string; description: string | null; price: number; image_url: string | null; active: boolean }

const WA_NUMBER = '573172329884'
const WA_BASE = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent('Hola Servidor Uverley, quiero información sobre sus servicios')}`

function waLink(service?: string) {
  const text = service ? `Hola Servidor Uverley, quiero el servicio de ${service}` : 'Hola Servidor Uverley, quiero información sobre sus servicios'
  return `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(text)}`
}

const whyUs = [
  { icon: <Shield size={32} className="text-blue-400" />, title: '100% Seguro', desc: 'Proceso verificado y atención profesional.' },
  { icon: <Zap size={32} className="text-yellow-400" />, title: 'Entrega Rápida', desc: 'Atención rápida según el servicio.' },
  { icon: <DollarSign size={32} className="text-green-400" />, title: 'Precios Competitivos', desc: 'Precios actualizados y accesibles.' },
  { icon: <Clock size={32} className="text-purple-400" />, title: 'Soporte', desc: 'Atención permanente por WhatsApp.' },
]

function Home() {
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [orderingId, setOrderingId] = useState<number | null>(null)
  const [user, setUser] = useState<Awaited<ReturnType<typeof supabase.auth.getUser>>['data']['user']>(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingUser, setCheckingUser] = useState(true)

  useEffect(() => {
    void loadProducts()
    void checkUser()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void checkUser() })
    return () => subscription.unsubscribe()
  }, [])

  async function checkUser() {
    setCheckingUser(true)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      setUser(currentUser)
      if (currentUser) {
        const { data: profile } = await supabase.from('profiles').select('role').eq('id', currentUser.id).single()
        setIsAdmin(profile?.role === 'admin')
      } else setIsAdmin(false)
    } catch (error) {
      console.error('Error al verificar usuario:', error)
      setUser(null)
      setIsAdmin(false)
    } finally { setCheckingUser(false) }
  }

  async function loadProducts() {
    setLoadingProducts(true)
    try {
      const { data, error } = await supabase.from('products').select('id, name, description, price, image_url, active').eq('active', true).order('created_at', { ascending: false })
      if (error) throw error
      setProducts((data ?? []) as Product[])
    } catch (error) {
      console.error('Error cargando productos:', error)
      setProducts([])
    } finally { setLoadingProducts(false) }
  }

  async function handleLogout() { await supabase.auth.signOut(); setUser(null); setIsAdmin(false); navigate({ to: '/' }) }
  function formatPrice(price: number) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(price) }

  async function createOrder(product: Product) {
    setOrderingId(product.id)
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) { alert('Debes iniciar sesión para realizar un pedido.'); navigate({ to: '/login' }); return }
      const { error } = await supabase.rpc('create_order_with_balance', { p_product_id: product.id })
      if (error) { alert(`No se pudo crear el pedido: ${error.message}`); return }
      alert(`Pedido creado correctamente.\n\nServicio: ${product.name}\nPrecio: ${formatPrice(Number(product.price))}`)
      window.open(waLink(product.name), '_blank', 'noopener,noreferrer')
    } catch (error) {
      console.error(error)
      alert('Ocurrió un error al crear el pedido.')
    } finally { setOrderingId(null) }
  }

  return <div className="min-h-screen bg-black text-white">
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
        <Link to="/" className="text-2xl font-black text-blue-400">Servidor Uverley</Link>
        <nav className="hidden md:flex items-center gap-6"><a href="#servicios">Servicios</a><a href="#precios">Precios</a><a href="#contacto">Contacto</a></nav>
        <div className="flex items-center gap-2">
          {!checkingUser && !user && <Link to="/login" className="bg-blue-600 px-4 py-2 rounded-lg flex items-center gap-2"><User size={18} /> Iniciar Sesión</Link>}
          {!checkingUser && user && isAdmin && <Link to="/dashboard" className="bg-purple-600 px-4 py-2 rounded-lg flex items-center gap-2"><Settings size={18} /> Panel Admin</Link>}
          {!checkingUser && user && !isAdmin && <Link to="/account" className="bg-blue-600 px-4 py-2 rounded-lg">Mi Cuenta</Link>}
          {!checkingUser && user && <button onClick={() => void handleLogout()} className="bg-gray-800 p-2 rounded-lg" title="Cerrar sesión"><LogOut size={20} /></button>}
          <a href={WA_BASE} target="_blank" rel="noopener noreferrer" className="bg-green-600 p-3 rounded-full"><MessageCircle size={20} /></a>
        </div>
      </div>
    </header>

    <section className="min-h-screen flex items-center justify-center px-4 pt-24 bg-gradient-to-b from-black via-gray-950 to-black">
      <div className="max-w-4xl mx-auto text-center"><p className="text-blue-400 font-bold tracking-[0.3em] uppercase mb-4">Soluciones digitales</p><h1 className="text-5xl md:text-8xl font-black mb-6 text-blue-400">Servidor Uverley</h1><p className="text-2xl md:text-4xl font-bold mb-6">Tecnología, servicios y soluciones</p><p className="text-xl text-gray-400 mb-10">Servicios profesionales para dispositivos móviles, atención rápida y soporte personalizado.</p><div className="flex flex-col sm:flex-row gap-4 justify-center"><a href="#servicios" className="bg-blue-600 px-8 py-4 rounded-xl font-bold">Explorar Servicios</a><a href={WA_BASE} target="_blank" rel="noopener noreferrer" className="bg-green-600 px-8 py-4 rounded-xl font-bold">Contactar por WhatsApp</a></div></div>
    </section>

    <section id="servicios" className="py-20 px-4"><div className="max-w-7xl mx-auto"><h2 className="text-4xl font-black text-center mb-14">Nuestros Servicios</h2>{loadingProducts ? <p className="text-center text-gray-400">Cargando servicios...</p> : products.length === 0 ? <p className="text-center text-gray-400">Actualmente no hay servicios disponibles.</p> : <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">{products.map(product => <div key={product.id} className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden flex flex-col">{product.image_url ? <img src={product.image_url} alt={product.name} className="w-full h-48 object-cover" /> : <div className="w-full h-48 bg-gray-800 flex items-center justify-center"><Smartphone size={60} className="text-gray-600" /></div>}<div className="p-6 flex flex-col flex-1"><CheckCircle size={28} className="text-blue-400 mb-4" /><h3 className="text-xl font-bold mb-2">{product.name}</h3><p className="text-gray-400 text-sm mb-5 flex-1">{product.description}</p><p className="text-2xl font-black text-green-400 mb-5">{formatPrice(Number(product.price))}</p><button onClick={() => void createOrder(product)} disabled={orderingId === product.id} className="bg-blue-600 disabled:bg-gray-700 rounded-lg px-4 py-3 font-semibold">{orderingId === product.id ? 'Creando pedido...' : 'Pedir Servicio'}</button></div></div>)}</div>}</div></section>

    <section id="precios" className="py-20 px-4 bg-gray-950/50"><h2 className="text-4xl font-black text-center mb-14">¿Por qué elegirnos?</h2><div className="max-w-5xl mx-auto grid sm:grid-cols-2 lg:grid-cols-4 gap-8">{whyUs.map(item => <div key={item.title} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 text-center"><div className="flex justify-center mb-4">{item.icon}</div><h3 className="text-xl font-bold mb-2">{item.title}</h3><p className="text-gray-400 text-sm">{item.desc}</p></div>)}</div></section>
    <section id="contacto" className="py-24 px-4 text-center"><h2 className="text-4xl font-black mb-6">¿Necesitas ayuda?</h2><p className="text-gray-400 text-xl mb-10">Contacta ahora y recibe atención por WhatsApp.</p><a href={WA_BASE} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-3 bg-green-600 px-10 py-5 rounded-2xl text-xl font-bold"><MessageCircle size={28} /> Escribir por WhatsApp</a></section>
    <footer className="bg-gray-900 py-8 px-4 text-center border-t border-gray-800"><p className="text-gray-400 text-sm">© 2026 Servidor Uverley | WhatsApp +57 317 232 9884</p></footer>
  </div>
}
