import { useState } from 'react'
import { updateUser } from '@netlify/identity'
import { errorMessage, useSession } from '../lib/session'
import { inputClass } from './AuthShell'

/** Modal shown after the user opens a password-recovery email link. */
export function PasswordRecovery() {
  const { recovering, clearRecovering } = useSession()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState(false)

  if (!recovering) return null

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (password.length < 8) return setError('La contraseña debe tener al menos 8 caracteres.')
    if (password !== confirm) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    try {
      await updateUser({ password })
      setDone(true)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo actualizar la contraseña.'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] grid place-items-center bg-black/80 px-5 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
      <div className="fade-in w-full max-w-sm rounded-2xl border border-gray-800 bg-gray-950 p-7">
        <h2 id="recovery-title" className="text-2xl font-bold">{done ? 'Contraseña actualizada' : 'Crea una nueva contraseña'}</h2>
        {done ? (
          <>
            <p className="mt-2 text-gray-400">Ya puedes seguir usando tu cuenta.</p>
            <button onClick={clearRecovering} className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500">Continuar</button>
          </>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-4">
            <input type="password" autoComplete="new-password" placeholder="Nueva contraseña" value={password} onChange={e => setPassword(e.target.value)} className={inputClass} required />
            <input type="password" autoComplete="new-password" placeholder="Confirmar contraseña" value={confirm} onChange={e => setConfirm(e.target.value)} className={inputClass} required />
            {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/50 px-4 py-3 text-sm text-red-300">{error}</p>}
            <button type="submit" disabled={saving} className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-500 disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar contraseña'}</button>
          </form>
        )}
      </div>
    </div>
  )
}
