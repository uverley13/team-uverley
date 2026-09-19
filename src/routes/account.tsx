import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { User, Mail, ShoppingBag, LogOut, ArrowLeft } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/account')({ component: AccountPage })
type Order = { id: number; product_name: string; price: number; status: string; created_at: string }

function AccountPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [orders, setOrders] = useState<Order[]>([])

  useEffect(() => {
    let mounted = true
    async function loadAccount() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigate({ to: '/login' }); return }
      const { data: profile, error: profileError } = await supabase.from('profiles').select('username, role').eq('id', user.id).single()
      if (profileError || !profile) { await supabase.auth.signOut(); navigate({ to: '/login' }); return }
      if (profile.role === 'admin') { navigate({ to: '/dashboard' }); return }
      const { data: orderData, error: orderError } = await supabase.from('orders').select('id, product_name, price, status, created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)
      if (mounted) { setEmail(user.email ?? ''); setUsername(profile.username ?? 'Cliente'); setOrders(orderError ? [] : (orderData ?? [])); setLoading(false) }
    }
    void loadAccount()
    return () => { mounted = false }
  }, [navigate])

  async function handleLogout() { await supabase.auth.signOut(); navigate({ to: '/' }) }
  function formatPrice(value: number) { return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value) }
  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Cargando tu cuenta...</div>

  return <div className="min-h-screen bg-black text-white"><header className="bg-gray-900 border-b border-gray-800 px-6 py-4"><div className="max-w-5xl mx-auto flex items-center justify-between"><Link to="/" className="text-2xl font-black text-blue-400">Team Uverley</Link><button onClick={() => void handleLogout()} className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-lg"><LogOut size={16} />Cerrar sesión</button></div></header><main className="max-w-5xl mx-auto px-4 py-10"><div className="bg-gray-900 border border-blue-800 rounded-2xl p-8 mb-8"><p className="text-blue-400 font-semibold mb-2">Mi cuenta</p><h1 className="text-3xl font-black mb-2">¡Hola, {username}! 👋</h1><p className="text-gray-400">Administra tus servicios y pedidos.</p></div><div className="grid md:grid-cols-2 gap-6 mb-8"><div className="bg-gray-900 border border-gray-800 rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><User className="text-blue-400" /><h2 className="text-xl font-bold">Información personal</h2></div><p className="text-gray-400 text-sm">Usuario</p><p className="font-semibold mb-4">{username}</p><p className="text-gray-400 text-sm">Correo electrónico</p><div className="flex items-center gap-2"><Mail size={16} className="text-gray-500" />{email}</div></div><div className="bg-gray-900 border border-gray-800 rounded-2xl p-6"><div className="flex items-center gap-3 mb-4"><ShoppingBag className="text-purple-400" /><h2 className="text-xl font-bold">Pedidos recientes</h2></div>{orders.length === 0 ? <p className="text-gray-400 mb-6">Todavía no tienes pedidos registrados.</p> : <div className="space-y-3 mb-6">{orders.map(order => <div key={order.id} className="flex justify-between gap-3 border-b border-gray-800 pb-2"><div><p className="font-semibold">{order.product_name}</p><p className="text-gray-500 text-sm">{order.status}</p></div><span className="text-green-400">{formatPrice(Number(order.price))}</span></div>)}</div>}<Link to="/orders" className="inline-flex items-center gap-2 bg-blue-600 px-5 py-3 rounded-lg font-semibold">Ver todos los pedidos</Link></div></div><Link to="/" className="inline-flex items-center gap-2 text-gray-400"><ArrowLeft size={18} />Volver a la página principal</Link></main></div>
}
