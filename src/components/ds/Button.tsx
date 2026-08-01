import { type ReactNode, type ButtonHTMLAttributes } from 'react'

export type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline'
export type BtnSize    = 'xs' | 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
  loading?: boolean
  icon?: ReactNode
  children?: ReactNode
}

const base =
  'inline-flex items-center justify-center gap-1.5 font-medium transition-all duration-150 ease-out cursor-pointer select-none whitespace-nowrap border outline-none'

const sizes: Record<BtnSize, string> = {
  xs: 'h-6 px-2 text-[11px] rounded',
  sm: 'h-7 px-3 text-xs rounded',
  md: 'h-8 px-3.5 text-[13px] rounded-lg',
  lg: 'h-10 px-5 text-sm rounded-lg',
}

const variants: Record<BtnVariant, string> = {
  primary:
    'bg-[--primary] border-[--primary] text-white hover:bg-[--primary-hover] hover:border-[--primary-hover] active:bg-[--primary-active] disabled:opacity-40 disabled:cursor-not-allowed',
  secondary:
    'bg-[--bg-surface-2] border-[--border-subtle] text-[--text-primary] hover:bg-[--border-subtle] hover:border-[--border-default] active:bg-[--border-default] disabled:opacity-40 disabled:cursor-not-allowed',
  ghost:
    'bg-transparent border-transparent text-[--text-secondary] hover:bg-[--bg-surface-2] hover:text-[--text-primary] active:bg-[--border-subtle] disabled:opacity-40 disabled:cursor-not-allowed',
  outline:
    'bg-transparent border-[--border-default] text-[--text-primary] hover:bg-[--bg-surface-2] active:bg-[--border-subtle] disabled:opacity-40 disabled:cursor-not-allowed',
  destructive:
    'bg-[--crit] border-[--crit] text-white hover:opacity-90 active:opacity-80 disabled:opacity-40 disabled:cursor-not-allowed',
}

function Spinner() {
  return (
    <svg className="spin flex-shrink-0" width="13" height="13" viewBox="0 0 13 13" fill="none">
      <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeOpacity="0.3" strokeWidth="1.5" />
      <path d="M6.5 1.5A5 5 0 0 1 11.5 6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  children,
  className = '',
  ...rest
}: ButtonProps) {
  return (
    <button
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  )
}

// Icon-only button variant
export function IconButton({
  variant = 'ghost',
  size = 'md',
  loading = false,
  disabled,
  children,
  className = '',
  ...rest
}: Omit<ButtonProps, 'icon'>) {
  const squareSizes: Record<BtnSize, string> = {
    xs: 'w-6 h-6',
    sm: 'w-7 h-7',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  }
  return (
    <button
      className={`${base} ${squareSizes[size]} px-0 ${sizes[size].replace(/px-\S+/, '')} ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner /> : children}
    </button>
  )
}
