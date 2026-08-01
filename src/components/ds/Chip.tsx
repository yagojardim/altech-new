import { type ReactNode } from 'react'
import { T } from './tokens'

type ChipVariant = 'default' | 'accent' | 'success' | 'warn' | 'crit' | 'purple' | 'custom'
type ChipSize = 'xs' | 'sm' | 'md'

interface ChipProps {
  label: string
  variant?: ChipVariant
  color?: string        // custom hex, used when variant='custom'
  size?: ChipSize
  removable?: boolean
  dot?: boolean
  icon?: ReactNode
  onClick?: () => void
  onRemove?: () => void
  active?: boolean
}

const variantMap: Record<ChipVariant, { color: string; dim: string }> = {
  default: { color: T.text2,   dim: T.bgSurface2   },
  accent:  { color: T.accent,  dim: T.accentDim    },
  success: { color: T.success, dim: T.successDim   },
  warn:    { color: T.warn,    dim: T.warnDim      },
  crit:    { color: T.crit,    dim: T.critDim      },
  purple:  { color: T.purple,  dim: T.purpleDim    },
  custom:  { color: T.text2,   dim: T.bgSurface2   },
}

const sizeMap: Record<ChipSize, { cls: string; dot: number }> = {
  xs: { cls: 'h-5 px-1.5 gap-1 text-[10px] rounded',     dot: 4 },
  sm: { cls: 'h-6 px-2 gap-1 text-[11px] rounded-md',    dot: 5 },
  md: { cls: 'h-7 px-2.5 gap-1.5 text-xs rounded-lg',    dot: 6 },
}

export function Chip({
  label, variant = 'default', color, size = 'sm',
  removable = false, dot = false, icon, onClick, onRemove, active = false,
}: ChipProps) {
  const s = sizeMap[size]
  const vc = variantMap[variant]
  const c = color ?? vc.color
  const dim = color ? `${color}18` : (active ? `${vc.color}22` : vc.dim)

  return (
    <span
      className={`inline-flex items-center font-medium border transition-all select-none ${s.cls} ${onClick ? 'cursor-pointer' : ''}`}
      style={{
        color: c,
        background: dim,
        borderColor: `${c}40`,
      }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {dot && (
        <span
          className="rounded-full flex-shrink-0"
          style={{ width: s.dot, height: s.dot, background: c }}
        />
      )}
      {icon && <span className="flex items-center flex-shrink-0">{icon}</span>}
      <span className="truncate">{label}</span>
      {removable && (
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove?.() }}
          className="flex items-center justify-center flex-shrink-0 rounded transition-opacity hover:opacity-70 ml-0.5"
          style={{ color: c }}
        >
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <path d="M1.5 1.5L7.5 7.5M7.5 1.5L1.5 7.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </span>
  )
}

// Multi-chip input (tag editor)
interface ChipInputProps {
  values: string[]
  onChange: (v: string[]) => void
  placeholder?: string
  variant?: ChipVariant
  size?: ChipSize
}

export function ChipInput({ values, onChange, placeholder = 'Adicionar...', variant = 'accent', size = 'sm' }: ChipInputProps) {
  const handleKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const val = (e.target as HTMLInputElement).value.trim()
    if ((e.key === 'Enter' || e.key === ',') && val) {
      e.preventDefault()
      if (!values.includes(val)) onChange([...values, val]);
      (e.target as HTMLInputElement).value = ''
    }
    if (e.key === 'Backspace' && !val && values.length > 0) {
      onChange(values.slice(0, -1))
    }
  }

  return (
    <div
      className="flex flex-wrap gap-1.5 px-2.5 py-1.5 rounded-lg min-h-[36px] items-center"
      style={{ background: T.bgSurface2, border: `1px solid ${T.border}` }}
    >
      {values.map(v => (
        <Chip key={v} label={v} variant={variant} size={size} removable onRemove={() => onChange(values.filter(x => x !== v))} />
      ))}
      <input
        onKeyDown={handleKey}
        placeholder={values.length === 0 ? placeholder : ''}
        className="flex-1 min-w-[80px] bg-transparent text-[13px] outline-none"
        style={{ color: T.text1, caretColor: T.accent }}
      />
    </div>
  )
}
