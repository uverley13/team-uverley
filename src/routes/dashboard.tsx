import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  PlusCircle,
  List,
  CreditCard,
  Grid,
  LogOut,
  MessageCircle,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/dashboard')({
  component: DashboardPage,
})

const WA_BASE =
  'https://wa.me/+57TU-NUMERO?text=Hola%20Team%20Uverley%2C%20quiero%20hacer%20un%20pedido'

function DashboardPage() {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)
  const [authorized, setAuthorized] = useState(false)

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
      }
    }

    checkAccess()

    return () => {
      mounted = false
    }
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Verificando acceso...</p>
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
      href: '#',
      external: false,
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
  ]

  return (
    <div className="min-h-screen bg-black text-white fade-in">
      <header className="bg-gray-900/90 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <Link
            to="/"
            className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Team Uverley
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

      <main className="max-w-5xl mx-auto px-4 py-12">
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-8 mb-10 text-center">
          <h1 className="text-3xl font-black text-white mb-2">
            ¡Bienvenido al panel!
          </h1>
          <p className="text-gray-300 text-lg">
            Administración de Team Uverley
          </p>
        </div>

        <h2 className="text-2xl font-bold text-white mb-6">
          Acciones Rápidas
        </h2>

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
            ),
          )}
        </div>

        <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-8 text-center">
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
