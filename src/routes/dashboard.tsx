import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { PlusCircle, List, CreditCard, Grid, LogOut, MessageCircle } from 'lucide-react'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

const WA_BASE = 'https://wa.me/+57TU-NUMERO?text=Hola%20Team%20Uverley%2C%20quiero%20hacer%20un%20pedido'

// TODO: Protect this route with real auth (e.g., Supabase session check, Auth0 token validation)
// On page load, verify the user's session and redirect to /login if not authenticated.

const quickActions = [
  { label: 'Nueva Orden', icon: <PlusCircle size={28} />, href: WA_BASE, external: true, color: 'bg-blue-600 hover:bg-blue-700' },
  { label: 'Ver Órdenes', icon: <List size={28} />, href: '#', external: false, color: 'bg-gray-700 hover:bg-gray-600' },
  { label: 'Recargar Saldo', icon: <CreditCard size={28} />, href: WA_BASE, external: true, color: 'bg-green-700 hover:bg-green-600' },
  { label: 'Servicios', icon: <Grid size={28} />, href: '/', external: false, color: 'bg-purple-700 hover:bg-purple-600' },
]

function DashboardPage() {
  const navigate = useNavigate()

  function handleLogout() {
    // TODO: Clear real auth session (e.g., supabase.auth.signOut(), auth0.logout())
    navigate({ to: '/' })
  }

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      {/* Dashboard Header */}
      <header className="bg-gray-900/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <Link to="/" className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Team Uverley
          </Link>
          <p className="text-gray-400 text-sm mt-1">Bienvenido, <span className="text-white font-semibold">Usuario</span></p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white px-4 py-2 rounded-lg transition-all text-sm font-medium"
        >
          <LogOut size={16} />
          Cerrar Sesión
        </button>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-12">
        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-8 mb-10 text-center">
          <h1 className="text-3xl font-black text-white mb-2">¡Bienvenido! (Panel demo)</h1>
          <p className="text-gray-300 text-lg">
            Tu saldo demo:{' '}
            <span className="text-green-400 font-black text-2xl">$0.00</span>
            {' '}| Panel en desarrollo
          </p>
          {/* TODO: Connect to payment provider (e.g., Stripe, PayPal) to display real balance */}
        </div>

        {/* Quick Actions */}
        <h2 className="text-2xl font-bold text-white mb-6">Acciones Rápidas</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
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
            ) : (
              <Link
                key={action.label}
                to={action.href as '/'}
                className={`${action.color} text-white rounded-2xl p-6 flex flex-col items-center gap-3 font-bold text-lg transition-all hover:scale-105 hover:shadow-xl text-center`}
              >
                {action.icon}
                {action.label}
              </Link>
            )
          )}
        </div>

        {/* Support CTA */}
        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-3">¿Necesitas ayuda?</h3>
          <p className="text-gray-400 mb-6">Contacta a soporte directamente por WhatsApp para gestionar tu orden.</p>
          <a
            href={WA_BASE}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all hover:scale-105 hover:shadow-lg hover:shadow-green-900/50"
          >
            <MessageCircle size={22} />
            Soporte por WhatsApp
          </a>
        </div>
      </main>
    </div>
  )
}
