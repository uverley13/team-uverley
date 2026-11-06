import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthShell, Field, inputClass } from '../components/AuthShell'

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
        options: { data: { username: form.username.trim() } },
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (!data.user) {
        setError('No se pudo crear la cuenta.')
        return
      }

      if (!data.session) {
        // Email confirmation is required: the profile is created on first login.
        setMessage(
          'Cuenta creada correctamente. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.'
        )
        return
      }

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          username: form.username.trim(),
          role: 'customer',
        })

      if (profileError) {
        console.error(profileError)
        setError('La cuenta fue creada, pero no se pudo crear el perfil.')
        return
      }

      navigate({ to: '/' })
    } catch {
      setError('Ocurrió un error al crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell
      title="Crear cuenta"
      subtitle="Regístrate para pedir servicios y recargar saldo."
      footer={<>¿Ya tienes cuenta?{' '}<Link to="/login" className="font-semibold text-blue-400 hover:text-blue-300">Inicia sesión</Link></>}
    >
      {message ? (
        <div role="status" className="rounded-xl border border-green-800 bg-green-900/40 p-5 text-green-200">
          <p className="font-semibold">Revisa tu correo</p>
          <p className="mt-1 text-sm text-green-300/90">{message}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Correo electrónico" htmlFor="email">
            <input id="email" name="email" type="email" autoComplete="email" placeholder="tu@correo.com" value={form.email} onChange={handleChange} className={inputClass} required />
          </Field>
          <Field label="Nombre o usuario" htmlFor="username">
            <input id="username" name="username" type="text" autoComplete="nickname" placeholder="Cómo quieres que te llamemos" value={form.username} onChange={handleChange} className={inputClass} required />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Contraseña" htmlFor="password">
              <input id="password" name="password" type="password" autoComplete="new-password" placeholder="Mín. 6 caracteres" value={form.password} onChange={handleChange} className={inputClass} required minLength={6} />
            </Field>
            <Field label="Confirmar" htmlFor="confirm">
              <input id="confirm" name="confirm" type="password" autoComplete="new-password" placeholder="Repite la contraseña" value={form.confirm} onChange={handleChange} className={inputClass} required />
            </Field>
          </div>
          {error && (
            <div role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
          )}
          <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
            <UserPlus size={18} />
            {loading ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>
      )}
    </AuthShell>
  )
}
