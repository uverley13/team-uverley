import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { History, LogOut, MessageCircle, Package, Plus, RefreshCw, ShoppingCart, Users, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

type Client = { id: string; email: string | null; balance: number; role: string }
type Transaction = { id: number; user_id: string; amount: number; type: string; description: string | null; created_at: string }
type Order = { id: number; user_id: string; product_name: string; price: number; status: string; created_at: string }
type Topup = { id: number; user_id: string; amount: number; status: string; proof_url: string | null; created_at: string }
type Section = 'inicio' | 'clientes' | 'movimientos' | 'pedidos' | 'recargas'
type MenuItem = { section: Section; label: string; icon: LucideIcon }

const WA_NUMBER = '573172329884'

const menuItems: MenuItem[] = [
  { section: 'inicio', label: 'Inicio', icon: Wallet },
  { section: 'clientes', label: 'Clientes', icon: Users },
  { section: 'movimientos', label: 'Movimientos', icon: History },
  { section: 'pedidos', label: 'Pedidos', icon: ShoppingCart },
  { section: 'recargas', label: 'Recargas', icon: Plus },
]

function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function DashboardPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [section, setSection] = useState<Section>('inicio')
  const [clients, setClients] = useState<Client[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [topups, setTopups] = useState<Topup[]>([])
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [processing, setProcessing] = useState(false)
  const [changingOrder, setChangingOrder] = useState<number | null>(null)

  useEffect(() => { void checkAdmin() }, [])

  async function checkAdmin() {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      if (userError || !user) { navigate({ to: '/login' }); return }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (error || profile?.role !== 'admin') { await supabase.auth.signOut(); navigate({ to: '/' }); return }
      setAuthorized(true)
      await loadData()
    } catch (error) {
      console.error('Error verificando administrador:', error)
      alert('No se pudo verificar el acceso al panel.')
    } finally { setLoading(false) }
  }

  async function loadData() {
    setRefreshing(true)
    try {
      const [clientsResult, transactionsResult, ordersResult, topupsResult] = await Promise.all([
        supabase.from('profiles').select('id, email, balance, role').order('role', { ascending: true }),
        supabase.from('balance_transactions').select('id, user_id, amount, type, description, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('orders').select('id, user_id, product_name, price, status, created_at').order('created_at', { ascending: false }).limit(100),
        supabase.from('topups').select('id, user_id, amount, status, proof_url, created_at').eq('status', 'pending').order('created_at', { ascending: false }),
      ])
      if (clientsResult.error) throw clientsResult.error
      setClients((clientsResult.data ?? []) as Client[])
      if (!transactionsResult.error) setTransactions((transactionsResult.data ?? []) as Transaction[])
      if (!ordersResult.error) setOrders((ordersResult.data ?? []) as Order[])
      if (!topupsResult.error) setTopups((topupsResult.data ?? []) as Topup[])
    } catch (error) {
      console.error('Error cargando datos:', error)
      alert('No se pudieron cargar todos los datos.')
    } finally { setRefreshing(false) }
  }

  async function changeBalance(type: 'recarga' | 'descuento') {
    if (!selectedClient) { alert('Selecciona primero un cliente.'); return }
    const numericAmount = Number(amount.replace(/[^\d]/g, ''))
    if (!numericAmount || numericAmount > 2000000) { alert('Escribe un monto válido entre $1 y $2.000.000 COP.'); return }
    if (type === 'recarga' && numericAmount < 20000) { alert('La recarga mínima es de $20.000 COP.'); return }
    if (type === 'descuento' && numericAmount > Number(selectedClient.balance)) { alert('El descuento no puede ser mayor al saldo disponible.'); return }
    if (!window.confirm(`¿Confirmas ${type === 'recarga' ? 'agregar' : 'descontar'} ${formatPrice(numericAmount)}?`)) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_change_balance', { target_user_id: selectedClient.id, change_amount: numericAmount, change_type: type, change_description: description.trim() || null })
      if (error) throw error
      alert(`Saldo actualizado correctamente. Nuevo saldo: ${formatPrice(Number(data))}`)
      setAmount(''); setDescription(''); setSelectedClient(null); await loadData()
    } catch (error) {
      console.error(error)
      alert(`No se pudo modificar el saldo: ${error instanceof Error ? error.message : 'error desconocido'}`)
    } finally { setProcessing(false) }
  }

  async function approveTopup(topup: Topup) {
    if (!window.confirm(`¿Aprobar ${formatPrice(topup.amount)} y acreditarlo al usuario?`)) return
    setProcessing(true)
    try {
      const { error: balanceError } = await supabase.rpc('admin_change_balance', { target_user_id: topup.user_id, change_amount: topup.amount, change_type: 'recarga', change_description: `Recarga aprobada #${topup.id}` })
      if (balanceError) throw balanceError
      const { error: topupError } = await supabase.from('topups').update({ status: 'approved' }).eq('id', topup.id).eq('status', 'pending')
      if (topupError) throw topupError
      await loadData()
    } catch (error) {
      console.error(error)
      alert(`No se pudo aprobar la recarga: ${error instanceof Error ? error.message : 'error desconocido'}`)
    } finally { setProcessing(false) }
  }

  async function changeOrderStatus(orderId: number, status: string) {
    if (changingOrder !== null) return
    setChangingOrder(orderId)
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
      if (error) throw error
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status } : order))
    } catch (error) {
      console.error(error)
      alert(`No se pudo cambiar el estado: ${error instanceof Error ? error.message : 'error desconocido'}`)
    } finally { setChangingOrder(null) }
  }

  function clientEmail(id: string) { return clients.find(client => client.id === id)?.email ?? `Usuario ${id.slice(0, 12)}...` }
  async function logout() { await supabase.auth.signOut(); navigate({ to: '/' }) }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Verificando acceso...</div>
  if (!authorized) return null

  return <div className="min-h-screen bg-black text-white">
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-4"><div className="max-w-7xl mx-auto flex justify-between items-center gap-4"><Link to="/" className="text-2xl font-black text-blue-400">Servidor Uverley</Link><div className="flex gap-2"><button onClick={() => void loadData()} disabled={refreshing} className="bg-gray-800 p-3 rounded-lg" title="Actualizar"><RefreshCw size={20} className={refreshing ? 'animate-spin' : ''} /></button><button onClick={() => void logout()} className="bg-gray-800 p-3 rounded-lg" title="Cerrar sesión"><LogOut size={20} /></button></div></div></header>
    <main className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex gap-2 overflow-x-auto mb-8 pb-2">{menuItems.map(item => { const Icon = item.icon; return <button key={item.section} onClick={() => setSection(item.section)} className={`flex items-center gap-2 px-4 py-3 rounded-lg whitespace-nowrap ${section === item.section ? 'bg-blue-600' : 'bg-gray-900'}`}><Icon size={18} />{item.label}</button> })}</nav>
      {section === 'inicio' && <section><h1 className="text-3xl font-black mb-6">Bienvenido al panel</h1><div className="grid md:grid-cols-3 gap-4"><div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><Users className="text-blue-400 mb-3" /><p className="text-gray-400">Clientes</p><p className="text-3xl font-bold">{clients.length}</p></div><div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><Package className="text-green-400 mb-3" /><p className="text-gray-400">Pedidos</p><p className="text-3xl font-bold">{orders.length}</p></div><div className="bg-gray-900 border border-gray-800 rounded-xl p-6"><Wallet className="text-yellow-400 mb-3" /><p className="text-gray-400">Recargas pendientes</p><p className="text-3xl font-bold">{topups.length}</p></div></div></section>}
      {section === 'clientes' && <section><h1 className="text-3xl font-black mb-6">Clientes y saldos</h1><div className="space-y-3">{clients.map(client => <div key={client.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"><div><p className="font-semibold">{client.email ?? client.id}</p><p className="text-gray-400">Saldo: {formatPrice(client.balance)}</p></div><button onClick={() => setSelectedClient(client)} className="bg-blue-600 px-4 py-2 rounded-lg">Modificar saldo</button></div>)}</div>{selectedClient && <div className="mt-6 bg-gray-900 border border-blue-600 rounded-xl p-5"><p className="font-bold mb-3">Modificar saldo de {selectedClient.email ?? selectedClient.id}</p><input value={amount} onChange={event => setAmount(event.target.value)} placeholder="Monto" className="w-full bg-gray-800 p-3 rounded-lg mb-3" inputMode="numeric" /><input value={description} onChange={event => setDescription(event.target.value)} placeholder="Descripción opcional" className="w-full bg-gray-800 p-3 rounded-lg mb-3" /><div className="flex gap-2"><button disabled={processing} onClick={() => void changeBalance('recarga')} className="bg-green-600 px-4 py-2 rounded-lg">Recargar</button><button disabled={processing} onClick={() => void changeBalance('descuento')} className="bg-red-600 px-4 py-2 rounded-lg">Descontar</button></div></div>}</section>}
      {section === 'movimientos' && <section><h1 className="text-3xl font-black mb-6">Historial de saldo</h1><div className="space-y-3">{transactions.map(transaction => <div key={transaction.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4"><p>{clientEmail(transaction.user_id)}</p><p className="text-gray-400">{transaction.description ?? transaction.type} · {formatPrice(transaction.amount)}</p></div>)}</div></section>}
      {section === 'pedidos' && <section><h1 className="text-3xl font-black mb-6">Pedidos</h1><div className="space-y-3">{orders.map(order => <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-wrap justify-between gap-3"><div><p className="font-semibold">{order.product_name}</p><p className="text-gray-400">{clientEmail(order.user_id)} · {formatPrice(order.price)}</p></div><select value={order.status} disabled={changingOrder === order.id} onChange={event => void changeOrderStatus(order.id, event.target.value)} className="bg-gray-800 rounded-lg px-3"><option value="pendiente">Pendiente</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option></select></div>)}</div></section>}
      {section === 'recargas' && <section><h1 className="text-3xl font-black mb-6">Recargas pendientes</h1>{topups.length === 0 ? <p className="text-gray-400">No hay solicitudes pendientes.</p> : <div className="space-y-3">{topups.map(topup => <div key={topup.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex justify-between items-center gap-3"><div><p>{clientEmail(topup.user_id)}</p><p className="text-gray-400">{formatPrice(topup.amount)}</p></div><button disabled={processing} onClick={() => void approveTopup(topup)} className="bg-green-600 px-4 py-2 rounded-lg">Aprobar</button></div>)}</div>}</section>}
    </main>
    <a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-5 right-5 bg-green-600 p-4 rounded-full"><MessageCircle size={25} /></a>
  </div>
}
