/**
 * Storage adapter para o cliente Supabase.
 * 'altech_remember_me' === '1' → localStorage (sessão sobrevive ao navegador)
 * caso contrário            → sessionStorage (sessão morre ao fechar a aba)
 * Nunca loga token/senha.
 */
export const REMEMBER_ME_KEY = 'altech_remember_me'

export function setRememberMe(value: boolean): void {
  try { localStorage.setItem(REMEMBER_ME_KEY, value ? '1' : '0') } catch { /* storage indisponível */ }
}

export function clearRememberMe(): void {
  try { localStorage.removeItem(REMEMBER_ME_KEY) } catch { /* storage indisponível */ }
}

export function isRememberMe(): boolean {
  try { return localStorage.getItem(REMEMBER_ME_KEY) === '1' } catch { return false }
}

function target(): Storage | null {
  if (typeof window === 'undefined') return null
  try { return isRememberMe() ? window.localStorage : window.sessionStorage } catch { return null }
}

export const authStorage = {
  getItem(key: string): string | null {
    try {
      const t = target()
      if (!t) return null
      // fallback: lê do outro storage caso a preferência tenha mudado na sessão
      return t.getItem(key) ?? (isRememberMe() ? sessionStorage.getItem(key) : localStorage.getItem(key))
    } catch { return null }
  },
  setItem(key: string, value: string): void {
    try {
      const t = target()
      if (!t) return
      t.setItem(key, value)
      // evita cópia obsoleta no storage não usado
      const other = t === window.localStorage ? window.sessionStorage : window.localStorage
      other.removeItem(key)
    } catch { /* storage indisponível */ }
  },
  removeItem(key: string): void {
    try {
      window.localStorage.removeItem(key)
      window.sessionStorage.removeItem(key)
    } catch { /* storage indisponível */ }
  },
}
