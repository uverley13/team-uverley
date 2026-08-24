import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    email: '',
    username: '',
    password: '',
    confirm: '',
  })

  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    setError('')
    setMessage('')

    if (form.password !== form.confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }

    if (form.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.')
      return
    }

    setLoading(true)

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError('No se pudo crear la cuenta.')
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .insert({
          id: data.user.id,
          username: form.username,
          role: 'customer',
        })

      if (profileError) {
        console.error(profileError)
        setError(
          'La cuenta fue creada, pero no se pudo crear el perfil.'
        )
        return
      }

      if (data.session) {
        navigate({ to: '/' })
        return
      }

      setMessage(
        'Cuenta creada correctamente. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.'
      )
    } catch {
      setError('Ocurrió un error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-gray-950 to-black flex items-center justify-center px-4 fade-in">
      <div className="bg-gray-900/80 border border-gray-700 rounded-3xl p-12 w-full max-w-md shadow-2xl shadow-black/70">
        <h2 className="text-4xl font-bold text-center mb-8 text-white">
          Crear Cuenta Nueva
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            required
          />

          <input
            name="username"
            type="text"
            placeholder="Nombre / Usuario"
            value={form.username}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            required
          />

          <input
            name="confirm"
            type="password"
            placeholder="Confirmar Contraseña"
            value={form.confirm}
            onChange={handleChange}
            className="w-full bg-gray-800 border border-gray-700 text-white placeholder-gray-500 p-4 rounded-lg focus:outline-none focus:border-blue-500 transition-colors"
            required
          />

          {error && (
            <div className="bg-red-900/30 border border-red-700 text-red-300 p-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-900/30 border border-green-700 text-green-300 p-3 rounded-lg text-sm">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white py-4 rounded-lg text-xl font-bold transition-all flex items-center justify-center gap-2"
          >
            <UserPlus size={22} />
            {loading ? 'Creando cuenta...' : 'Registrarme'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ¿Ya tienes cuenta?{' '}
            <span className="text-blue-400 underline">
              Inicia sesión
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}
