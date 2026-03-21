import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'

export const Route = createFileRoute('/register')({
  component: RegisterPage,
})

function RegisterPage() {
  const navigate = useNavigate()
  const [form, setForm] = useState({ email: '', username: '', password: '', confirm: '' })

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    // TODO: Replace with real user registration (e.g., Supabase Auth signUp or Auth0 signup)
    // Example: await supabase.auth.signUp({ email: form.email, password: form.password })
    navigate({ to: '/dashboard' })
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

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg text-xl font-bold transition-all hover:scale-105 hover:shadow-lg hover:shadow-blue-900/50 flex items-center justify-center gap-2"
          >
            <UserPlus size={22} />
            Registrarme
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link to="/login" className="text-gray-400 hover:text-white transition-colors text-sm">
            ¿Ya tienes cuenta?{' '}
            <span className="text-blue-400 underline">Inicia sesión</span>
          </Link>
        </div>
      </div>
    </div>
  )
}
