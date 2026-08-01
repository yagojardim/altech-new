import { useState, useRef, useEffect, type ReactNode } from 'react'
import { T } from './tokens'

export interface SelectOption<V extends string = string> {
  value: V
  label: string
  icon?: ReactNode
  group?: string
}

interface SelectProps<V extends string = string> {
  options: SelectOption<V>[]
  value?: V
  onChange?: (v: V) => void
  placeholder?: string
  label?: string
  error?: string
  size?: 'sm' | 'md'
  searchable?: boolean
  disabled?: boolean
  className?: string
}

const ChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: T.text3 }}>
    <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function Select<V extends string = string>({
  options, value, onChange, placeholder = 'Selecionar...',
  label, error, size = 'md', searchable = false, disabled = false, className = '',
}: SelectProps<V>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (open && searchable) setTimeout(() => inputRef.current?.focus(), 10)
    if (!open) setQuery('')
  }, [open, searchable])

  const selected = options.find(o => o.value === value)
  const filtered = query
    ? options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()))
    : options

  const h = size === 'sm' ? 28 : 32
  const fs = size === 'sm' ? '12px' : '13px'

  return (
    <div ref={ref} className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs font-medium" style={{ color: T.text2 }}>{label}</label>}
      <div className="relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(o => !o)}
          className="w-full flex items-center justify-between gap-2 px-3 rounded-lg outline-none transition-all duration-150 border"
          style={{
            height: h, fontSize: fs,
            background: T.bgSurface2,
            border: `1px solid ${error ? T.crit : open ? T.accent : T.border}`,
            color: selected ? T.text1 : T.text3,
            opacity: disabled ? 0.5 : 1,
            cursor: disabled ? 'not-allowed' : 'pointer',
            boxShadow: open ? `0 0 0 2px ${T.accentBorder}` : 'none',
          }}
        >
          <span className="flex items-center gap-2 truncate">
            {selected?.icon}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </span>
          <ChevronDown />
        </button>

        {open && (
          <div
            className="absolute z-50 top-full mt-1 left-0 right-0 fade-rise overflow-hidden"
            style={{
              background: T.bgSurface,
              border: `1px solid ${T.border}`,
              borderRadius: '10px',
              boxShadow: T.shadowModal,
              maxHeight: 280,
            }}
          >
            {searchable && (
              <div className="p-2" style={{ borderBottom: `1px solid ${T.border}` }}>
                <input
                  ref={inputRef}
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Buscar..."
                  className="w-full h-7 px-2.5 text-xs rounded-lg outline-none"
                  style={{
                    background: T.bgSurface2,
                    border: `1px solid ${T.border}`,
                    color: T.text1,
                  }}
                />
              </div>
            )}
            <div className="overflow-y-auto" style={{ maxHeight: searchable ? 220 : 260 }}>
              {filtered.length === 0 ? (
                <p className="px-3 py-3 text-xs text-center" style={{ color: T.text3 }}>Nenhum resultado</p>
              ) : (
                filtered.map(o => (
                  <button
                    key={o.value}
                    type="button"
                    onClick={() => { onChange?.(o.value); setOpen(false) }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-[13px] transition-colors"
                    style={{
                      color: o.value === value ? T.accent : T.text1,
                      background: o.value === value ? T.accentDim : 'transparent',
                    }}
                    onMouseEnter={e => {
                      if (o.value !== value) (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLButtonElement).style.background = o.value === value ? T.accentDim : 'transparent'
                    }}
                  >
                    {o.icon}
                    <span className="truncate">{o.label}</span>
                    {o.value === value && (
                      <svg className="ml-auto flex-shrink-0" width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke={T.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      {error && <p className="text-xs" style={{ color: T.crit }}>{error}</p>}
    </div>
  )
}

// Backward-compat alias used by Input.tsx re-export
export const SelectField = Select
