// Preferências locais do usuário (tema e idioma) — apenas localStorage, sem banco.
export const THEME_KEY = 'altech_theme'
export const LANG_KEY = 'altech_lang'

export type ThemeMode = 'dark' | 'light'
export type LangCode = 'pt-BR'

export interface LanguageOption {
  code: string
  label: string
  /** Idiomas em construção aparecem na lista mas não são selecionáveis. */
  disabled?: boolean
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'pt-BR', label: 'Português (Brasil)' },
  { code: 'en-US', label: 'Inglês (EUA) (em construção)', disabled: true },
  { code: 'es-ES', label: 'Espanhol (em construção)', disabled: true },
  { code: 'pt-PT', label: 'Português (Portugal) (em construção)', disabled: true },
  { code: 'fr-FR', label: 'Francês (em construção)', disabled: true },
  { code: 'de-DE', label: 'Alemão (em construção)', disabled: true },
  { code: 'it-IT', label: 'Italiano (em construção)', disabled: true },
]

/** Apenas idiomas realmente disponíveis. */
export const ACTIVE_LANGUAGES = LANGUAGES.filter(l => !l.disabled)

export function getTheme(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  try {
    const v = window.localStorage.getItem(THEME_KEY)
    return v === 'light' ? 'light' : 'dark'
  } catch { return 'dark' }
}

export function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.setAttribute('data-theme', mode)
  root.classList.toggle('theme-light', mode === 'light')
  root.classList.toggle('theme-dark', mode !== 'light')
  root.style.colorScheme = mode
}

export function setTheme(mode: ThemeMode): void {
  try { window.localStorage.setItem(THEME_KEY, mode) } catch { /* noop */ }
  applyTheme(mode)
}

export function getLang(): LangCode {
  if (typeof window === 'undefined') return 'pt-BR'
  try {
    const v = window.localStorage.getItem(LANG_KEY)
    return (ACTIVE_LANGUAGES.some(l => l.code === v) ? v : 'pt-BR') as LangCode
  } catch { return 'pt-BR' }
}

export function setLang(code: LangCode): void {
  try { window.localStorage.setItem(LANG_KEY, code) } catch { /* noop */ }
  if (typeof document !== 'undefined') document.documentElement.lang = code
}

/** Aplica as preferências salvas no boot. */
export function initAppPrefs(): void {
  applyTheme(getTheme())
  setLang(getLang())
}
