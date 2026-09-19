import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ArrowLeft, History, LogOut, MessageCircle, Package, Plus, RefreshCw, ShoppingCart, Users, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/dashboard')({ component: DashboardPage })

type Client = { id: string; email: string | null; balance: number; role: string }
type Transaction = { id: number; user_id: string; amount: number; type: string; description: string | null; created_at: string }
type Order = { id: number; user_id: string; product_name: string; price: number; status: string; created_at: string }
type Topup = { id: number; user_id: string; amount: number; status: string; proof_url: string | null; created_at: string }
type Section = 'inicio' | 'clientes' | 'movimientos' | 'pedidos' | 'recargas'

const WA_NUMBER = '573172329884'

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
    } catch (error) { console.error('Error cargando datos:', error); alert('No se pudieron cargar todos los datos.') }
    finally { setRefreshing(false) }
  }

  async function changeBalance(type: 'recarga' | 'descuento') {
    if (!selectedClient) { alert('Selecciona primero un cliente.'); return }
    const numericAmount = Number(amount.replace(/[^\d]/g, ''))
    if (!numericAmount || numericAmount <= 0 || numericAmount > 2000000) { alert('Escribe un monto válido entre $1 y $2.000.000 COP.'); return }
    if (type === 'recarga' && numericAmount < 20000) { alert('La recarga mínima es de $20.000 COP.'); return }
    if (type === 'descuento' && numericAmount > Number(selectedClient.balance)) { alert('El descuento no puede ser mayor al saldo disponible.'); return }
    if (!window.confirm(`¿Confirmas ${type === 'recarga' ? 'agregar' : 'descontar'} ${formatPrice(numericAmount)}?`)) return
    setProcessing(true)
    try {
      const { data, error } = await supabase.rpc('admin_change_balance', { target_user_id: selectedClient.id, change_amount: numericAmount, change_type: type, change_description: description.trim() || (type === 'recarga' ? 'Recarga manual realizada por administrador' : 'Descuento manual realizado por administrador') })
      if (error) throw error
      alert(`Saldo actualizado correctamente. Nuevo saldo: ${formatPrice(Number(data))}`)
      setAmount(''); setDescription(''); setSelectedClient(null); await loadData()
    } catch (error) { console.error(error); alert(`No se pudo modificar el saldo: ${error instanceof Error ? error.message : 'error desconocido'}`) }
    finally { setProcessing(false) }
  }

  async function approveTopup(topup: Topup) {
    if (!window.confirm(`¿Aprobar ${formatPrice(topup.amount)} y acreditarlo al usuario?`)) return
    setProcessing(true)
    try {
      // Reutiliza la RPC transaccional de saldos y no hace una lectura/escritura manual del balance.
      const { error: balanceError } = await supabase.rpc('admin_change_balance', { target_user_id: topup.user_id, change_amount: topup.amount, change_type: 'recarga', change_description: `Recarga aprobada #${topup.id}` })
      if (balanceError) throw balanceError
      const { error: topupError } = await supabase.from('topups').update({ status: 'approved' }).eq('id', topup.id).eq('status', 'pending')
      if (topupError) throw topupError
      alert('Recarga aprobada y saldo acreditado correctamente.')
      await loadData()
    } catch (error) { console.error(error); alert(`No se pudo aprobar la recarga: ${error instanceof Error ? error.message : 'error desconocido'}`) }
    finally { setProcessing(false) }
  }

  async function changeOrderStatus(orderId: number, status: string) {
    if (changingOrder !== null) return
    setChangingOrder(orderId)
    try {
      const { error } = await supabase.from('orders').update({ status }).eq('id', orderId)
      if (error) throw error
      setOrders(current => current.map(order => order.id === orderId ? { ...order, status } : order))
    } catch (error) { console.error(error); alert(`No se pudo cambiar el estado: ${error instanceof Error ? error.message : 'error desconocido'}`) }
    finally { setChangingOrder(null) }
  }

  async function logout() { await supabase.auth.signOut(); navigate({ to: '/' }) }
  function clientEmail(id: string) { return clients.find(client => client.id === id)?.email ?? `Usuario ${id.slice(0, 12)}...` }
  function statusClass(status: string) { return status === 'completado' ? 'text-green-400' : status === 'cancelado' ? 'text-red-400' : 'text-yellow-400' }

  if (loading) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Verificando acceso...</div>
  if (!authorized) return null

  return <div className="min-h-screen bg-black text-white">
    <header className="bg-gray-900 border-b border-gray-800 px-4 py-4"><div className="max-w-7xl mx-auto flex justify-between items-center"><div><Link to="/" className="text-2xl font-black text-blue-400">Servidor Uverley</Link><p className="text-gray-400 text-sm">Panel de administración</p></div><div className="flex gap-2"><button onClick={() => void loadData()} disabled={refreshing} className="p-3 bg-gray-800 rounded-lg" title="Actualizar"><RefreshCw size={19} className={refreshing ? 'animate-spin' : ''} /></button><button onClick={() => void logout()} className="bg-gray-800 px-4 py-3 rounded-lg flex gap-2"><LogOut size={18} />Salir</button></div></div></header>
    <main className="max-w-7xl mx-auto px-4 py-8">
      <nav className="flex gap-2 overflow-x-auto mb-8 pb-2">{([['inicio','Inicio'],['clientes','Clientes'],['movimientos','Movimientos'],['pedidos','Pedidos'],['recargas','Recargas']] as [Section,string][]).map(([key,label]) => <button key={key} onClick={() => setSection(key)} className={`px-5 py-3 rounded-lg font-semibold whitespace-nowrap ${section === key ? 'bg-blue-600' : 'bg-gray-800'}`}>{label}{key === 'recargas' && ` (${topups.length})`}</button>)}<Link to="/products" className="px-5 py-3 rounded-lg font-semibold bg-orange-600 whitespace-nowrap">Productos</Link></nav>
      {section === 'inicio' && <><div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 mb-8"><h1 className="text-3xl font-black mb-2">Bienvenido al panel</h1><p className="text-gray-300">Administra clientes, saldos, pedidos y productos desde un solo lugar.</p></div><div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">{[['Usuarios', clients.length, Users],['Saldo total', formatPrice(clients.reduce((sum, c) => sum + Number(c.balance || 0), 0)), Wallet],['Pedidos', orders.length, ShoppingCart],['Movimientos', transactions.length, History]].map(([label,value,Icon]) => <div key={String(label)} className="bg-gray-900 border border-gray-800 rounded-2xl p-6"><Icon className="text-blue-400 mb-4" /><p className="text-gray-400">{label}</p><p className="text-2xl font-black">{value}</p></div>)}</div></>}
      {section === 'recargas' && <section><h1 className="text-3xl font-black mb-6">Recargas pendientes</h1>{topups.length === 0 ? <p className="text-gray-400">No hay solicitudes pendientes.</p> : <div className="space-y-4">{topups.map(topup => <div key={topup.id} className="bg-gray-900 border border-gray-800 rounded-2xl p-6 flex flex-wrap justify-between gap-4"><div><p className="text-gray-400">{clientEmail(topup.user_id)}</p><p className="text-2xl font-black text-green-400">{formatPrice(topup.amount)}</p>{topup.proof_url && <a href={topup.proof_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Ver comprobante</a>}</div><button disabled={processing} onClick={() => void approveTopup(topup)} className="bg-green-600 disabled:bg-gray-700 px-5 py-3 rounded-lg font-bold">Aprobar recarga</button></div>)}</div>}</section>}
      {section === 'clientes' && <section><h1 className="text-3xl font-black mb-6">Clientes y saldos</h1>{selectedClient && <div className="bg-gray-900 border border-blue-600 rounded-2xl p-6 mb-8"><p className="text-xl font-bold">{selectedClient.email}</p><p className="text-green-400 text-3xl font-black my-4">{formatPrice(selectedClient.balance)}</p><div className="flex flex-wrap gap-3"><input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Monto" className="bg-black border border-gray-700 rounded-lg px-4 py-3" /><input value={description} onChange={e => setDescription(e.target.value)} placeholder="Descripción" className="bg-black border border-gray-700 rounded-lg px-4 py-3" /><button disabled={processing} onClick={() => void changeBalance('recarga')} className="bg-green-600 px-4 py-3 rounded-lg"><Plus size={18} /></button><button disabled={processing} onClick={() => void changeBalance('descuento')} className="bg-red-600 px-4 py-3 rounded-lg">Descontar</button><button onClick={() => setSelectedClient(null)} className="bg-gray-700 px-4 py-3 rounded-lg">Cancelar</button></div></div>}<div className="space-y-4">{clients.map(client => <div key={client.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-center gap-4"><div><p className="font-bold">{client.email ?? 'Usuario registrado'}</p><p className="text-green-400 text-xl font-black">{formatPrice(client.balance)}</p></div>{client.role !== 'admin' && <button onClick={() => setSelectedClient(client)} className="bg-blue-600 px-4 py-2 rounded-lg">Administrar</button>}</div>)}</div></section>}
      {section === 'movimientos' && <section><h1 className="text-3xl font-black mb-6">Historial de saldo</h1><div className="space-y-3">{transactions.map(t => <div key={t.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between"><div><p className="font-bold">{clientEmail(t.user_id)}</p><p className="text-gray-400">{t.description ?? 'Movimiento de saldo'}</p></div><p className={t.type === 'descuento' ? 'text-red-400' : 'text-green-400'}>{t.type === 'descuento' ? '-' : '+'}{formatPrice(t.amount)}</p></div>)}</div></section>}
      {section === 'pedidos' && <section><h1 className="text-3xl font-black mb-6">Pedidos</h1><div className="space-y-3">{orders.map(order => <div key={order.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5 flex justify-between items-center gap-4"><div><p className="font-bold">{order.product_name}</p><p className="text-gray-400">{clientEmail(order.user_id)}</p><p className="text-green-400">{formatPrice(order.price)}</p></div><select value={order.status || 'pendiente'} disabled={changingOrder === order.id} onChange={e => void changeOrderStatus(order.id, e.target.value)} className={`bg-gray-800 p-2 rounded ${statusClass(order.status)}`}><option value="pendiente">Pendiente</option><option value="procesando">Procesando</option><option value="completado">Completado</option><option value="cancelado">Cancelado</option></select></div>)}</div></section>}
    </main><a href={`https://wa.me/${WA_NUMBER}`} target="_blank" rel="noopener noreferrer" className="fixed bottom-5 right-5 bg-green-600 p-4 rounded-full"><MessageCircle size={25} /></a>
  </div>
}
