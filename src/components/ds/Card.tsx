import { type ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  accentColor?: string
  elevation?: 1 | 2 | 3
}

const shadowMap = {
  1: 'var(--shadow-1, 0 1px 3px rgba(0,0,0,0.3))',
  2: 'var(--shadow-2, 0 4px 16px rgba(0,0,0,0.4))',
  3: 'var(--shadow-3, 0 16px 48px rgba(0,0,0,0.5))',
}

export function Card({ children, className = '', accentColor, elevation = 1 }: CardProps) {
  return (
    <div
      className={`bg-[--bg-surface] border border-[--border-subtle] overflow-hidden ${className}`}
      style={{
        borderRadius: 'var(--radius-md, 10px)',
        boxShadow: shadowMap[elevation],
        ...(accentColor ? { borderLeft: `3px solid ${accentColor}` } : {}),
      }}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 border-b border-[--border-subtle] flex items-center justify-between gap-2 ${className}`}>
      {children}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`px-4 py-3 border-t border-[--border-subtle] flex items-center justify-end gap-2 ${className}`}>
      {children}
    </div>
  )
}
