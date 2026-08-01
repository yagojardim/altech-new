import { useState, type ReactNode } from 'react'
import { T } from './tokens'

interface TooltipProps {
  label: string
  children: ReactNode
  side?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
}

const posClass: Record<string, string> = {
  top:    'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
  left:   'right-full top-1/2 -translate-y-1/2 mr-1.5',
  right:  'left-full top-1/2 -translate-y-1/2 ml-1.5',
}

export function Tooltip({ label, children, side = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className={`pointer-events-none absolute z-50 ${posClass[side]} fade-rise`}>
          <span
            className="block px-2 py-1 rounded-md text-[11px] font-medium whitespace-nowrap"
            style={{
              background: T.bgSurface2,
              color: T.text1,
              border: `1px solid ${T.border2}`,
              boxShadow: T.shadow2,
            }}
          >
            {label}
          </span>
        </span>
      )}
    </span>
  )
}
