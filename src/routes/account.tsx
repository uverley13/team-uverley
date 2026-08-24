import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import {
  User,
  Mail,
  ShoppingBag,
  LogOut,
  ArrowLeft,
} from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/account')({
  component: AccountPage,
})

function AccountPage() {
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [isCustomer, setIsCustomer] = useState(false)

  useEffect(() => {
    let mounted = true

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        navigate({ to: '/login' })
        return
      }

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username, role')
        .eq('id', user.id)
        .single()

      if (error || !profile) {
        await supabase.auth.signOut()
        navigate({ to: '/login' })
        return
      }

      // Los administradores utilizan /dashboard.
      if (profile.role === 'admin') {
        navigate({ to: '/dashboard' })
        return
      }

      if (mounted) {
        setEmail(user.email ?? '')
        setUsername(profile.username ?? 'Cliente')
        setIsCustomer(profile.role === 'customer')
        setLoading(false)
      }
    }

    loadAccount()

    return () => {
      mounted = false
    }
  }, [navigate])

  async function handleLogout() {
    await supabase.auth.signOut()
    navigate({ to: '/' })
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-gray-400">Cargando tu cuenta...</p>
      </div>
    )
  }

  if (!isCustomer) {
    return null
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900/90 border-b border-gray-800 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-2xl font-black bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent"
          >
            Team Uverley
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg text-sm font-medium transition-all"
          >
            <LogOut size={16} />
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-10">
        <div className="bg-gradient-to-r from-blue-900/40 to-purple-900/40 border border-blue-800/50 rounded-2xl p-8 mb-8">
          <p className="text-blue-400 font-semibold mb-2">
            Mi cuenta
          </p>

          <h1 className="text-3xl md:text-4xl font-black mb-2">
            ¡Hola, {username}! 👋
          </h1>

          <p className="text-gray-400">
            Desde aquí podrás administrar tus servicios y pedidos.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <User className="text-blue-400" />
              <h2 className="text-xl font-bold">Información personal</h2>
            </div>

            <p className="text-gray-400 text-sm mb-1">
              Usuario
            </p>

            <p className="text-white font-semibold mb-4">
              {username}
            </p>

            <p className="text-gray-400 text-sm mb-1">
              Correo electrónico
            </p>

            <div className="flex items-center gap-2 text-white">
              <Mail size={16} className="text-gray-500" />
              {email}
            </div>
          </div>

          <div className="bg-gray-900/70 border border-gray-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <ShoppingBag className="text-purple-400" />
              <h2 className="text-xl font-bold">Mis pedidos</h2>
            </div>

            <p className="text-gray-400 mb-6">
              Todavía no tienes pedidos registrados.
            </p>

            <Link
              to="/"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 px-5 py-3 rounded-lg font-semibold transition-all"
            >
              Ver servicios
            </Link>
          </div>
        </div>

        <Link
          to="/"
          className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={18} />
          Volver a la página principal
        </Link>
      </main>
    </div>
  )
}
