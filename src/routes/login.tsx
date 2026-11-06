import { createFileRoute, useNavigate, Link } from '@tanstack/react-router'
import { useState } from 'react'
import { MessageCircle, LogIn } from 'lucide-react'
import { AuthError, login, requestPasswordRecovery } from '@netlify/identity'
import { errorMessage, useSession } from '../lib/session'
import { confirmPendingAccount } from '../server/account.functions'
import { AuthShell, Field, inputClass } from '../components/AuthShell'
export const Route = createFileRoute('/login')({
  component: LoginPage,
})
const WA_LOGIN =
  'https://wa.me/573172329884?text=Hola%20Servidor%20Uverley%2C%20quiero%20acceder%20al%20panel'
function LoginPage() {
  const navigate = useNavigate()
  const { refresh } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgot, setForgot] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setInfo('')
    setLoading(true)
    try {
      if (forgot) {
        await requestPasswordRecovery(email.trim())
        setInfo('Si el correo está registrado, te enviamos un enlace para crear una nueva contraseña. Puede tardar unos minutos: revisa también la carpeta de spam o correo no deseado. Si no llega, escríbenos por WhatsApp.')
        return
      }
      const cleanEmail = email.trim()
      try {
        await login(cleanEmail, password)
      } catch (err) {
        // Accounts created before confirmation emails were dropped may still be pending.
        if (!(err instanceof AuthError && (err.status === 400 || err.status === 401))) throw err
        await confirmPendingAccount({ data: { email: cleanEmail } })
        await login(cleanEmail, password)
      }
      const session = await refresh()
      navigate({ to: session?.isAdmin ? '/dashboard' : '/' })
    } catch (err) {
      if (err instanceof AuthError && (err.status === 400 || err.status === 401)) {
        setError('Correo o contraseña incorrectos.')
      } else {
        setError(errorMessage(err, 'Ocurrió un error al iniciar sesión.'))
      }
    } finally {
      setLoading(false)
    }
  }
  return (
    <AuthShell
      title={forgot ? 'Recuperar contraseña' : 'Iniciar sesión'}
      subtitle={forgot ? 'Te enviaremos un enlace a tu correo.' : 'Ingresa con el correo de tu cuenta.'}
      footer={<>¿No tienes cuenta?{' '}<Link to="/register" className="font-semibold text-blue-400 hover:text-blue-300">Regístrate</Link></>}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Correo electrónico" htmlFor="email">
          <input id="email" type="email" autoComplete="email" placeholder="tu@correo.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} required />
        </Field>
        {!forgot && (
          <Field label="Contraseña" htmlFor="password">
            <input id="password" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} required />
          </Field>
        )}
        <button type="button" onClick={() => { setForgot(!forgot); setError(''); setInfo('') }} className="text-sm text-blue-400 hover:text-blue-300">
          {forgot ? 'Volver a iniciar sesión' : '¿Olvidaste tu contraseña?'}
        </button>
        {info && (
          <div role="status" className="rounded-lg border border-green-800 bg-green-900/40 px-4 py-3 text-sm text-green-200">{info}</div>
        )}
        {error && (
          <div role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</div>
        )}
        <button type="submit" disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3.5 font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-wait disabled:opacity-60">
          <LogIn size={18} />
          {loading ? 'Enviando…' : forgot ? 'Enviar enlace' : 'Ingresar'}
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
