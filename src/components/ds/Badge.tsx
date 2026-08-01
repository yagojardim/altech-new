import { T } from './tokens'

export type StatusKey =
  | 'todo' | 'backlog' | 'draft'
  | 'in-progress' | 'in-review'
  | 'done' | 'healthy'
  | 'at-risk' | 'warning'
  | 'blocked' | 'critical'
  | 'cancelled'

interface BadgeProps {
  status: StatusKey
  label?: string
  size?: 'sm' | 'md'
}

const config: Record<StatusKey, { label: string; color: string; dim: string }> = {
  todo:          { label: 'A fazer',      color: T.text3,   dim: T.neutralDim  },
  backlog:       { label: 'Backlog',      color: T.text3,   dim: T.neutralDim  },
  draft:         { label: 'Rascunho',     color: T.text3,   dim: T.neutralDim  },
  'in-progress': { label: 'Em andamento', color: T.accent,  dim: T.accentDim   },
  'in-review':   { label: 'Em revisão',   color: T.warn,    dim: T.warnDim     },
  done:          { label: 'Concluído',    color: T.success, dim: T.successDim  },
  healthy:       { label: 'Saudável',     color: T.success, dim: T.successDim  },
  'at-risk':     { label: 'Em risco',     color: T.warn,    dim: T.warnDim     },
  warning:       { label: 'Atenção',      color: T.warn,    dim: T.warnDim     },
  blocked:       { label: 'Bloqueado',    color: T.crit,    dim: T.critDim     },
  critical:      { label: 'Crítico',      color: T.crit,    dim: T.critDim     },
  cancelled:     { label: 'Cancelado',    color: T.crit,    dim: T.critDim     },
}

export function Badge({ status, label, size = 'md' }: BadgeProps) {
  const c = config[status]
  const text = label ?? c.label
  const dotPx = size === 'sm' ? 5 : 6
  return (
    <span
      className={`inline-flex items-center font-medium rounded-md border ${
        size === 'sm' ? 'gap-1 px-1.5 py-0.5 text-[11px]' : 'gap-1.5 px-2 py-0.5 text-xs'
      }`}
      style={{
        color: c.color,
        background: c.dim,
        borderColor: `${c.color}40`,
      }}
    >
      <span
        className="rounded-full flex-shrink-0"
        style={{ width: dotPx, height: dotPx, background: c.color }}
      />
      {text}
    </span>
  )
}
