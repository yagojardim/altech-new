import { useEffect, useRef, useState } from 'react'
import { T } from './tokens'

export interface HelpHintProps {
  /** Texto explicativo exibido no popover. */
  text: string
  /** Título opcional acima do texto. */
  title?: string
  /** aria-label do botão (default: "Ajuda"). */
  label?: string
}

/**
 * Botão circular "?" com popover theme-aware.
 * Abre no hover, no clique e no foco por teclado; fecha ao sair, clicar fora ou Esc.
 */
export function HelpHint({ text, title, label }: HelpHintProps) {
  const [hover, setHover]   = useState(false)
  const [pinned, setPinned] = useState(false)
  const wrapRef = useRef<HTMLSpanElement>(null)

  const open = hover || pinned

  useEffect(() => {
    if (!pinned) return
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setPinned(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setPinned(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [pinned])

  return (
    <span
      ref={wrapRef}
      style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', verticalAlign: 'middle' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <button
        type="button"
        aria-label={label ?? 'Ajuda'}
        aria-expanded={open}
        onClick={e => { e.stopPropagation(); setPinned(p => !p) }}
        onFocus={() => setHover(true)}
        onBlur={() => setHover(false)}
        style={{
          width: 16, height: 16, borderRadius: 99, flexShrink: 0,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: open ? `${T.accent}18` : 'transparent',
          border: `1px solid ${open ? T.accent : T.text3}`,
          color: open ? T.accent : T.text3,
          fontSize: 10, fontWeight: 700, lineHeight: 1, cursor: 'pointer',
          padding: 0, transition: 'all .12s', fontFamily: 'inherit',
        }}
      >?</button>

      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 3000,
            width: 'max-content', maxWidth: 260,
            background: T.bgSurface2, border: `1px solid ${T.border}`,
            borderRadius: 8, padding: '8px 10px',
            boxShadow: T.shadow2, textAlign: 'left', whiteSpace: 'normal',
          }}
        >
          {title && (
            <span style={{ display: 'block', fontSize: 11, fontWeight: 700, color: T.text1, marginBottom: 3 }}>
              {title}
            </span>
          )}
          <span style={{ display: 'block', fontSize: 11, lineHeight: 1.5, color: T.text2, fontWeight: 400 }}>
            {text}
          </span>
        </span>
      )}
    </span>
  )
}

export default HelpHint
