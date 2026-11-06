import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { MessageCircle, LogIn } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { AuthShell, Field, inputClass } from '../components/AuthShell'
export const Route = createFileRoute('/login')({
  component: LoginPage,
})
const WA_LOGIN =
  'https://wa.me/573172329884?text=Hola%20Servidor%20Uverley%2C%20quiero%20acceder%20al%20panel'
function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        })
      if (loginError) {
        setError('Correo o contraseña incorrectos.')
        return
      }
      if (!data.user) {
        setError('No se pudo iniciar sesión.')
        return
      }
      let { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle()
      if (!profileError && !profile) {
        // The profile could not be created at sign-up (e.g. email confirmation
        // was pending), so create it now that the user has a session.
        const metadata = data.user.user_metadata as { username?: string } | undefined
        const created = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            username: metadata?.username || data.user.email?.split('@')[0] || 'Cliente',
            role: 'customer',
          })
          .select('role')
          .single()
        profile = created.data
        profileError = created.error
      }
      if (profileError || !profile) {
        setError('No se encontró el perfil del usuario.')
        await supabase.auth.signOut()
        return
      }
      if (profile.role === 'admin') {
        navigate({ to: '/dashboard' })
      } else {
        navigate({ to: '/' })
      }
    } catch {
      setError('Ocurrió un error al iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthShell
      title="Iniciar sesión"
      subtitle="Ingresa con el correo de tu cuenta."
      footer={<>¿No tienes cuenta?{' '}<Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300">Regístrate</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate={false}>
        <Field label="Correo electrónico" htmlFor="email">
          <input id="email" type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </Field>
        <Field label="Contraseña" htmlFor="password">
          <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
        </Field>
        {error && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
        )}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
          <LogIn size={18} />
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-gray-600"><span className="h-px flex-1 bg-gray-800" />o<span className="h-px flex-1 bg-gray-800" /></div>
      <a href={WA_LOGIN} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-800 py-3.5 font-semibold text-gray-200 transition-colors hover:border-gray-600 hover:bg-gray-950">
        <MessageCircle size={18} className="text-green-400" />
        ¿Problemas para ingresar? Escríbenos
      </a>
    </AuthShell>
  )
}
