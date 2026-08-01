import { useEffect, type ReactNode } from 'react'
import { T } from './tokens'

type DrawerSide = 'right' | 'left'
type DrawerWidth = 'sm' | 'md' | 'lg'

interface DrawerProps {
  open: boolean
  onClose: () => void
  title?: string
  side?: DrawerSide
  width?: DrawerWidth
  children: ReactNode
  footer?: ReactNode
}

const widths: Record<DrawerWidth, number> = { sm: 360, md: 480, lg: 600 }

export function Drawer({ open, onClose, title, side = 'right', width = 'md', children, footer }: DrawerProps) {
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  const w = widths[width]

  return (
    <div
      className="fixed inset-0 z-50 flex"
      style={{ background: 'var(--bg-overlay, rgba(8,10,14,0.72))', backdropFilter: 'blur(2px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className={`absolute flex flex-col ${side === 'right' ? 'right-0 top-0 bottom-0 slide-right' : 'left-0 top-0 bottom-0'}`}
        style={{
          width: w,
          background: T.bgSurface,
          borderLeft: side === 'right' ? `1px solid ${T.border}` : 'none',
          borderRight: side === 'left' ? `1px solid ${T.border}` : 'none',
          boxShadow: side === 'right'
            ? '-16px 0 48px rgba(0,0,0,0.4)'
            : '16px 0 48px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        {title && (
          <div
            className="flex items-center justify-between gap-3 px-5 py-3.5 flex-shrink-0"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            <h2 className="text-[14px] font-semibold truncate" style={{ color: T.text1 }}>{title}</h2>
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
              style={{ color: T.text3, background: T.bgSurface2 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text3 }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M1.5 1.5L9.5 9.5M9.5 1.5L1.5 9.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div
            className="flex items-center justify-end gap-2 px-5 py-3.5 flex-shrink-0"
            style={{ borderTop: `1px solid ${T.border}` }}
          >
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
