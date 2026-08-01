import { type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react'

interface InputFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string
  helper?: string
  error?: string
  leadingIcon?: ReactNode
  trailingIcon?: ReactNode
  fieldSize?: 'sm' | 'md'
}

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helper?: string
  error?: string
}

// SelectField — inline native select for backward compat (FoundationsPage)
interface SelectFieldProps {
  label?: string
  helper?: string
  error?: string
  options: { value: string; label: string }[]
  value?: string
  onChange?: (v: string) => void
}

export function SelectField({ label, helper, error, options, value, onChange }: SelectFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && <label className="text-xs font-medium text-[--text-secondary]">{label}</label>}
      <div className="relative">
        <select
          value={value}
          onChange={e => onChange?.(e.target.value)}
          className={
            `w-full h-9 px-3 pr-8 text-[13px] text-[--text-primary] bg-[--bg-surface-2] border rounded-lg outline-none appearance-none transition-all duration-150 font-[inherit] ` +
            (error
              ? 'border-[--crit] focus:border-[--crit] focus:ring-2 focus:ring-[rgba(240,128,92,0.25)]'
              : 'border-[--border-subtle] focus:border-[--primary] focus:ring-2 focus:ring-[--focus-ring]')
          }
        >
          {options.map(o => (
            <option key={o.value} value={o.value} style={{ background: 'var(--bg-surface-2)' }}>{o.label}</option>
          ))}
        </select>
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[--text-muted]">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      {(helper || error) && (
        <p className={`text-xs ${error ? 'text-[--crit]' : 'text-[--text-muted]'}`}>{error ?? helper}</p>
      )}
    </div>
  )
}

const inputBase = (fieldSize: 'sm' | 'md', error: boolean) =>
  `w-full px-3 text-[--text-primary] bg-[--bg-surface-2] border rounded-lg outline-none transition-all duration-150 placeholder:text-[--text-muted] font-[inherit] ` +
  (fieldSize === 'sm' ? 'h-7 text-xs ' : 'h-9 text-[13px] ') +
  (error
    ? 'border-[--crit] focus:border-[--crit] focus:ring-2 focus:ring-[rgba(240,128,92,0.25)]'
    : 'border-[--border-subtle] focus:border-[--primary] focus:ring-2 focus:ring-[--focus-ring]')

export function InputField({
  label, helper, error, leadingIcon, trailingIcon,
  fieldSize = 'md', className = '', ...rest
}: InputFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && (
        <label className="text-xs font-medium text-[--text-secondary]">{label}</label>
      )}
      <div className="relative flex items-center">
        {leadingIcon && (
          <span className="absolute left-2.5 text-[--text-muted] flex items-center pointer-events-none">
            {leadingIcon}
          </span>
        )}
        <input
          className={`${inputBase(fieldSize, !!error)} ${leadingIcon ? 'pl-8' : ''} ${trailingIcon ? 'pr-8' : ''}`}
          {...rest}
        />
        {trailingIcon && (
          <span className="absolute right-2.5 text-[--text-muted] flex items-center pointer-events-none">
            {trailingIcon}
          </span>
        )}
      </div>
      {(helper || error) && (
        <p className={`text-xs ${error ? 'text-[--crit]' : 'text-[--text-muted]'}`}>{error ?? helper}</p>
      )}
    </div>
  )
}

export function TextareaField({ label, helper, error, className = '', ...rest }: TextareaFieldProps) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium text-[--text-secondary]">{label}</label>}
      <textarea
        rows={3}
        className={
          `w-full px-3 py-2 text-[13px] text-[--text-primary] bg-[--bg-surface-2] border rounded-lg outline-none resize-y transition-all duration-150 placeholder:text-[--text-muted] font-[inherit] ` +
          (error
            ? 'border-[--crit] focus:border-[--crit] focus:ring-2 focus:ring-[rgba(240,128,92,0.25)]'
            : 'border-[--border-subtle] focus:border-[--primary] focus:ring-2 focus:ring-[--focus-ring]')
        }
        {...rest}
      />
      {(helper || error) && (
        <p className={`text-xs ${error ? 'text-[--crit]' : 'text-[--text-muted]'}`}>{error ?? helper}</p>
      )}
    </div>
  )
}
