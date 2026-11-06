import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { LogOut, Mail, Package, ShoppingBag, User, Wallet } from 'lucide-react'
import { OrderStatus } from '../components/OrderStatus'
import { Logo } from '../components/Logo'
import { errorMessage, formatDate, formatPrice, useSession } from '../lib/session'
import { getMyAccount } from '../server/store.functions'

export const Route = createFileRoute('/account')({
  head: () => ({ meta: [{ title: 'Mi cuenta · Servidor Uverley' }] }),
  component: AccountPage,
})

type Account = Awaited<ReturnType<typeof getMyAccount>>

const TOPUP_LABEL: Record<string, { label: string; className: string }> = {
  pending: { label: 'En revisión', className: 'text-yellow-300 bg-yellow-900/30' },
  approved: { label: 'Aprobada', className: 'text-green-300 bg-green-900/40' },
  rejected: { label: 'Rechazada', className: 'text-red-300 bg-red-950/60' },
}

function AccountPage() {
  const navigate = useNavigate()
  const { session, ready, logout } = useSession()
  const [account, setAccount] = useState<Account | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!ready) return
    if (!session) {
      navigate({ to: '/login' })
      return
    }
    if (session.isAdmin) {
      navigate({ to: '/dashboard' })
      return
    }
    getMyAccount().then(setAccount).catch(err => setError(errorMessage(err)))
  }, [ready, session?.id, session?.isAdmin, session?.balance])

  async function handleLogout() {
    await logout()
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-black text-gray-100">
      <header className="border-b border-gray-900 bg-black/80 px-5 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Logo />
          <button onClick={() => void handleLogout()} className="inline-flex items-center gap-2 rounded-lg border border-gray-800 px-4 py-2 text-sm text-gray-300 hover:border-gray-600">
            <LogOut size={16} /> Cerrar sesión
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 py-10">
        {error && <p role="alert" className="mb-6 rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-red-300">{error}</p>}
        {!account ? (
          <div className="space-y-6">
            <div className="skeleton h-36 rounded-2xl" />
            <div className="grid gap-6 md:grid-cols-2"><div className="skeleton h-48 rounded-2xl" /><div className="skeleton h-48 rounded-2xl" /></div>
          </div>
        ) : (
          <>
            {account.profile.suspended && (
              <div role="alert" className="mb-6 rounded-xl border border-red-900 bg-red-950/50 px-5 py-4 text-sm text-red-200">
                Tu cuenta está suspendida: no puedes hacer pedidos ni enviar recargas por ahora. Escríbenos por WhatsApp para más información.
              </div>
            )}
            <section className="fade-in grid gap-6 rounded-2xl border border-gray-800 bg-gray-950 p-7 md:grid-cols-[1fr_auto] md:items-center">
              <div>
                <p className="font-mono text-xs uppercase tracking-[0.25em] text-blue-400">Mi cuenta</p>
                <h1 className="mt-2 text-3xl font-bold">Hola, {account.profile.username}</h1>
                <p className="mt-1 flex items-center gap-2 text-gray-400"><Mail size={15} /> {account.profile.email}</p>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5 md:min-w-64">
                <p className="text-sm text-gray-400">Saldo disponible</p>
                <p className="mt-1 font-mono text-3xl font-medium text-green-400">{formatPrice(account.profile.balance)}</p>
                <Link to="/topup" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
                  <Wallet size={16} /> Recargar saldo
                </Link>
              </div>
            </section>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
              <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="flex items-center gap-2 text-xl font-semibold"><ShoppingBag size={20} className="text-blue-400" /> Mis pedidos</h2>
                  <span className="font-mono text-sm text-gray-500">{account.orders.length}</span>
                </div>
                {account.orders.length === 0 ? (
                  <div className="py-10 text-center">
                    <Package size={40} className="mx-auto mb-3 text-gray-700" />
                    <p className="text-gray-400">Todavía no tienes pedidos.</p>
                    <Link to="/" hash="servicios" className="mt-4 inline-block rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-500">Ver servicios</Link>
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-900">
                    {account.orders.map(order => (
                      <li key={order.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                        <div>
                          <p className="font-mono text-xs text-gray-500">#{order.id} · {formatDate(order.createdAt)}</p>
                          <p className="mt-1 font-semibold">{order.productName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-gray-200">{formatPrice(order.price)}</p>
                          <OrderStatus status={order.status} />
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-gray-800 bg-gray-950 p-6">
                <h2 className="mb-5 flex items-center gap-2 text-xl font-semibold"><User size={20} className="text-blue-400" /> Recargas recientes</h2>
                {account.topups.length === 0 ? (
                  <p className="text-gray-400">Aún no has enviado recargas.</p>
                ) : (
                  <ul className="space-y-3">
                    {account.topups.map(topup => {
                      const status = TOPUP_LABEL[topup.status] ?? TOPUP_LABEL.pending
                      return (
                        <li key={topup.id} className="flex items-center justify-between gap-3 rounded-lg bg-gray-900 px-4 py-3">
                          <div>
                            <p className="font-mono">{formatPrice(topup.amount)}</p>
                            <p className="text-xs text-gray-500">{formatDate(topup.createdAt)}</p>
                          </div>
                          <span className={`rounded-md px-2 py-1 text-xs font-semibold ${status.className}`}>{status.label}</span>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
