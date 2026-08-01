import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react'
import { T } from './tokens'

// ─── Types ────────────────────────────────────────────────────────────────────
type ToastVariant = 'success' | 'warn' | 'error' | 'info'

interface ToastItem {
  id: string
  variant: ToastVariant
  title: string
  body?: string
  duration?: number
}

interface ToastContextValue {
  toast: (item: Omit<ToastItem, 'id'>) => void
  dismiss: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────
const ToastCtx = createContext<ToastContextValue>({
  toast: () => {},
  dismiss: () => {},
})

export function useToast() {
  return useContext(ToastCtx)
}

// ─── Config ───────────────────────────────────────────────────────────────────
const variantConfig: Record<ToastVariant, { color: string; dim: string; icon: ReactNode }> = {
  success: {
    color: T.success,
    dim: T.successDim,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={T.success} strokeWidth="1.4" />
        <path d="M4.5 8L7 10.5L11.5 5.5" stroke={T.success} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  warn: {
    color: T.warn,
    dim: T.warnDim,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={T.warn} strokeWidth="1.4" />
        <path d="M8 5v4M8 10.5v.5" stroke={T.warn} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  error: {
    color: T.crit,
    dim: T.critDim,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={T.crit} strokeWidth="1.4" />
        <path d="M5.5 5.5L10.5 10.5M10.5 5.5L5.5 10.5" stroke={T.crit} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  info: {
    color: T.accent,
    dim: T.accentDim,
    icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke={T.accent} strokeWidth="1.4" />
        <path d="M8 7v5M8 5v.5" stroke={T.accent} strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
}

// ─── Single Toast ─────────────────────────────────────────────────────────────
function ToastItem({ item, onDismiss }: { item: ToastItem; onDismiss: () => void }) {
  const cfg = variantConfig[item.variant]
  const dur = item.duration ?? 4000

  useEffect(() => {
    const t = setTimeout(onDismiss, dur)
    return () => clearTimeout(t)
  }, [dur, onDismiss])

  return (
    <div
      className="toast-in flex items-start gap-3 px-4 py-3 rounded-xl w-full"
      style={{
        background: T.bgSurface,
        border: `1px solid ${cfg.color}40`,
        boxShadow: T.shadowModal,
        minWidth: 280,
        maxWidth: 380,
      }}
    >
      <span className="flex-shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold leading-tight" style={{ color: T.text1 }}>{item.title}</p>
        {item.body && (
          <p className="text-xs mt-0.5 leading-relaxed" style={{ color: T.text2 }}>{item.body}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded transition-opacity hover:opacity-70 mt-0.5"
        style={{ color: T.text3 }}
      >
        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
          <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>
      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 rounded-b-xl"
        style={{
          background: cfg.color,
          animation: `shrink ${dur}ms linear forwards`,
          width: '100%',
        }}
      />
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((item: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { ...item, id }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastCtx.Provider value={{ toast, dismiss }}>
      {children}
      {/* Portal */}
      <div
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2 items-end pointer-events-none"
        style={{ maxWidth: 400 }}
      >
        {toasts.map(t => (
          <div key={t.id} className="pointer-events-auto relative w-full">
            <ToastItem item={t} onDismiss={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
    </ToastCtx.Provider>
  )
}
