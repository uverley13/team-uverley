import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { handleAuthCallback, logout as identityLogout, onAuthChange } from '@netlify/identity'
import { getSession, type SessionDTO } from '../server/store.functions'

type SessionContextValue = {
  /** Store profile of the signed-in user, or null. */
  session: SessionDTO
  /** False until the first session check finishes. */
  ready: boolean
  /** Set when the user arrives from a password-recovery email link. */
  recovering: boolean
  clearRecovering: () => void
  refresh: () => Promise<SessionDTO>
  logout: () => Promise<void>
}

const SessionContext = createContext<SessionContextValue | null>(null)

const AUTH_HASH = /^#(confirmation_token|recovery_token|invite_token|email_change_token|access_token)=/

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionDTO>(null)
  const [ready, setReady] = useState(false)
  const [recovering, setRecovering] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const next = await getSession()
      setSession(next)
      return next
    } catch {
      setSession(null)
      return null
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function init() {
      if (AUTH_HASH.test(window.location.hash)) {
        try {
          const result = await handleAuthCallback()
          if (result?.type === 'recovery') setRecovering(true)
        } catch (error) {
          console.error('No se pudo procesar el enlace de acceso:', error)
        }
        window.history.replaceState(null, '', window.location.pathname + window.location.search)
      }
      if (!cancelled) await refresh()
    }
    void init()
    const unsubscribe = onAuthChange(() => { void refresh() })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [refresh])

  const logout = useCallback(async () => {
    try {
      await identityLogout()
    } finally {
      setSession(null)
    }
  }, [])

  return (
    <SessionContext.Provider value={{ session, ready, recovering, clearRecovering: () => setRecovering(false), refresh, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used within SessionProvider')
  return ctx
}

export function formatPrice(value: number) {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(value || 0))
}

export function formatDate(value: string) {
  return new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
}

export function errorMessage(error: unknown, fallback = 'Ocurrió un error. Intenta de nuevo.') {
  return error instanceof Error && error.message ? error.message : fallback
}
