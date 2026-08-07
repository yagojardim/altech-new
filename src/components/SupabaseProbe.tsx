import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { T } from './ds/tokens'

type Row = { id: string; name: string }
type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; rows: Row[] }

export function SupabaseProbe() {
  const [state, setState] = useState<State>({ kind: 'loading' })

  useEffect(() => {
    let cancelled = false
    const timeout = setTimeout(() => {
      if (!cancelled) setState(s => (s.kind === 'loading'
        ? { kind: 'error', message: 'Tempo esgotado ao consultar o Supabase (10s).' }
        : s))
    }, 10000)

    supabase
      .from('projects')
      .select('id, name')
      .limit(5)
      .then(({ data, error }) => {
        if (cancelled) return
        clearTimeout(timeout)
        if (error) {
          console.error('[SupabaseProbe] erro ao ler projects:', error)
          setState({ kind: 'error', message: `${error.message}${error.code ? ` (${error.code})` : ''}` })
          return
        }
        console.log('[SupabaseProbe] projects do Supabase:', data)
        setState({ kind: 'ok', rows: (data ?? []) as Row[] })
      })

    return () => { cancelled = true; clearTimeout(timeout) }
  }, [])

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{ background: T.bgSurface2, border: `1px solid ${T.border}` }}
    >
      <p className="text-[12px] font-semibold mb-2" style={{ color: T.text2 }}>
        Conexão Supabase — tabela <code>projects</code>
      </p>

      {state.kind === 'loading' && (
        <p className="text-[13px]" style={{ color: T.text2 }}>Consultando…</p>
      )}

      {state.kind === 'error' && (
        <p className="text-[13px]" style={{ color: T.danger ?? '#ef4444' }}>
          Erro: {state.message}
        </p>
      )}

      {state.kind === 'ok' && state.rows.length === 0 && (
        <p className="text-[13px]" style={{ color: T.text2 }}>Sem projetos</p>
      )}

      {state.kind === 'ok' && state.rows.length > 0 && (
        <ul className="space-y-1">
          {state.rows.map(r => (
            <li key={r.id} className="text-[13px]" style={{ color: T.text1 }}>
              {r.name} <span style={{ color: T.text3 }}>· {r.id}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
