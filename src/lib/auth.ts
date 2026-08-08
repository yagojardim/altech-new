// Supabase Auth — camada fina de autenticação real (email/senha).
// Sem signup público: usuários entram só por convite/seed.
// NUNCA logar senha nem token.
import { supabase } from '../integrations/supabase/client'
import { logger } from '../utils/logger'

export const INSPECTION_MODE_ENABLED =
  String(import.meta.env.VITE_INSPECTION_MODE ?? '') === 'true'

export interface AuthUser {
  id: string
  email: string
}

export interface SignInResult {
  ok: boolean
  user?: AuthUser
  error?: string
}

function toAuthUser(u: { id: string; email?: string | null } | null | undefined): AuthUser | null {
  if (!u) return null
  return { id: u.id, email: (u.email ?? '').toLowerCase() }
}

export async function signIn(email: string, password: string): Promise<SignInResult> {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) {
      logger.warn('auth.signIn', error.message, { email: email.trim().toLowerCase() })
      return { ok: false, error: error.message }
    }
    const user = toAuthUser(data.user)
    if (!user) return { ok: false, error: 'Sessão não retornada.' }
    return { ok: true, user }
  } catch (err) {
    logger.error('auth.signIn', err)
    return { ok: false, error: 'Não foi possível autenticar agora.' }
  }
}

export async function signOut(): Promise<void> {
  try {
    await supabase.auth.signOut()
  } catch (err) {
    logger.error('auth.signOut', err)
  }
}

export async function getSession(): Promise<AuthUser | null> {
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return toAuthUser(data.session?.user ?? null)
  } catch (err) {
    logger.error('auth.getSession', err)
    return null
  }
}

/** Assina mudanças de sessão. Retorna função de unsubscribe. */
export function onAuthStateChange(cb: (user: AuthUser | null) => void): () => void {
  try {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      cb(toAuthUser(session?.user ?? null))
    })
    return () => data.subscription.unsubscribe()
  } catch (err) {
    logger.error('auth.onAuthStateChange', err)
    return () => {}
  }
}
