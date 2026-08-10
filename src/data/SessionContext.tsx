import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import {
  MOCK_USERS, type MockUser,
  ACTIVE_USER_ID,
  setActiveUser as _setActiveUser,
} from './session'
import {
  getSession, onAuthStateChange, signOut as authSignOut,
  INSPECTION_MODE_ENABLED, hasManualLogout, clearManualLogout, type AuthUser,
} from '../lib/auth'
import { loadProfileByAuthUserId, touchAccess } from './db/authProfile'

export type SessionStatus = 'loading' | 'authenticated' | 'inspection' | 'anonymous'

interface SessionCtx {
  activeUser:    MockUser
  setActiveUser: (id: string) => void
  status:        SessionStatus
  authUser:      AuthUser | null
  inspectionEnabled: boolean
  signOut:       () => Promise<void>
  enterInspection: () => void
  mustChangePassword: boolean
  clearMustChangePassword: () => void
}

const SessionContext = createContext<SessionCtx>(null!)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(ACTIVE_USER_ID)
  const [status, setStatus] = useState<SessionStatus>('loading')
  const [authUser, setAuthUser] = useState<AuthUser | null>(null)
  const [dbUser, setDbUser] = useState<MockUser | null>(null)
  const [mustChangePassword, setMustChange] = useState(false)

  /** Inspection só vale quando NÃO houve logout manual nesta aba. */
  function fallbackStatus(): SessionStatus {
    return INSPECTION_MODE_ENABLED && !hasManualLogout() ? 'inspection' : 'anonymous'
  }


  function setActiveUser(id: string) {
    _setActiveUser(id)   // keep module var in sync (for non-hook callers)
    setUserId(id)        // trigger React re-render
  }

  useEffect(() => {
    let alive = true

    async function resolve(u: AuthUser | null) {
      if (!alive) return
      setAuthUser(u)
      if (u) {
        const profile = await loadProfileByAuthUserId(u.id, u.email)
        if (!alive) return
        if (profile) {
          setDbUser(profile)
          setMustChange(!!profile.password_must_change)
          setStatus('authenticated')
          void touchAccess(profile.user_id, profile.tenant_id, null)
          return
        }
      }
      setDbUser(null)
      setMustChange(false)
      // Fallback de desenvolvimento: Inspection Mode atrás da flag,
      // bloqueado quando o usuário clicou em "Sair".
      setStatus(fallbackStatus())
    }

    getSession().then(resolve)
    const unsub = onAuthStateChange(u => { void resolve(u) })
    return () => { alive = false; unsub() }
  }, [])

  async function signOut() {
    await authSignOut()
    setDbUser(null)
    setAuthUser(null)
    setMustChange(false)
    setUserId(ACTIVE_USER_ID)
    setStatus('anonymous')
  }

  /** Atalho Inspection intencional (dev): libera o fallback novamente. */
  function enterInspection() {
    if (!INSPECTION_MODE_ENABLED) return
    clearManualLogout()
    setStatus('inspection')
  }


  const mockUser = MOCK_USERS.find(u => u.user_id === userId) ?? MOCK_USERS[0]
  const activeUser = dbUser ?? mockUser

  return (
    <SessionContext.Provider value={{
      activeUser, setActiveUser, status, authUser,
      inspectionEnabled: INSPECTION_MODE_ENABLED, signOut, enterInspection,
      mustChangePassword, clearMustChangePassword: () => setMustChange(false),
    }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionCtx {
  return useContext(SessionContext)
}
