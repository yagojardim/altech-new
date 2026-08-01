import { type ReactNode } from 'react'
import { T } from './tokens'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  size?: 'sm' | 'md' | 'lg'
}

const iconSizes = { sm: 36, md: 48, lg: 64 }

function DefaultIcon({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none">
      <rect x="8" y="8" width="14" height="14" rx="3" stroke={T.text3} strokeWidth="1.5" />
      <rect x="26" y="8" width="14" height="14" rx="3" stroke={T.text3} strokeWidth="1.5" />
      <rect x="8" y="26" width="14" height="14" rx="3" stroke={T.text3} strokeWidth="1.5" />
      <rect x="26" y="26" width="14" height="14" rx="3" stroke={T.text3} strokeWidth="1.5" />
    </svg>
  )
}

export function EmptyState({ icon, title, description, action, size = 'md' }: EmptyStateProps) {
  const iconPx = iconSizes[size]
  const titleSize = size === 'sm' ? '13px' : size === 'md' ? '15px' : '17px'
  const descSize = size === 'sm' ? '12px' : '13px'

  return (
    <div className="flex flex-col items-center justify-center text-center gap-4 px-8 py-12">
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: iconPx * 1.75,
          height: iconPx * 1.75,
          background: T.bgSurface2,
          border: `1px solid ${T.border}`,
        }}
      >
        {icon ?? <DefaultIcon size={iconPx} />}
      </div>
      <div className="max-w-xs space-y-1.5">
        <p className="font-semibold" style={{ fontSize: titleSize, color: T.text1 }}>{title}</p>
        {description && (
          <p className="leading-relaxed" style={{ fontSize: descSize, color: T.text2 }}>{description}</p>
        )}
      </div>
      {action && (
        <button
          onClick={action.onClick}
          className="h-8 px-4 text-[13px] font-medium rounded-lg transition-all hover:brightness-110"
          style={{ background: T.accent, color: '#fff', border: 'none' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
