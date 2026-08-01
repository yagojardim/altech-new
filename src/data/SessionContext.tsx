import { createContext, useContext, useState, type ReactNode } from 'react'
import {
  MOCK_USERS, type MockUser,
  ACTIVE_USER_ID,
  setActiveUser as _setActiveUser,
} from './session'

interface SessionCtx {
  activeUser:    MockUser
  setActiveUser: (id: string) => void
}

const SessionContext = createContext<SessionCtx>(null!)

export function SessionProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string>(ACTIVE_USER_ID)

  function setActiveUser(id: string) {
    _setActiveUser(id)   // keep module var in sync (for non-hook callers)
    setUserId(id)        // trigger React re-render
  }

  const activeUser = MOCK_USERS.find(u => u.user_id === userId) ?? MOCK_USERS[0]

  return (
    <SessionContext.Provider value={{ activeUser, setActiveUser }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession(): SessionCtx {
  return useContext(SessionContext)
}
