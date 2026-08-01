import { T } from '../components/ds/tokens'

interface HomePageProps {
  role: string
}

// ─── Sample data ─────────────────────────────────────────────────────────────
const TODAY_TASKS = [
  { id: 't1', title: 'Revisar PR #341 — OAuth2 token refresh', project: 'ERP Corp', priority: 'crit', done: false },
  { id: 't2', title: 'Atualizar spec de autenticação',          project: 'ERP Corp', priority: 'high', done: false },
  { id: 't3', title: 'Reunião de sprint planning — 14h',        project: 'Geral',    priority: 'med',  done: false },
  { id: 't4', title: 'Fechar PM-178 — Formulário de contato',   project: 'Website',  priority: 'low',  done: true  },
]

const CEREMONIES = [
  { name: 'Sprint Planning', time: 'Hoje · 14:00', project: 'ERP Corp', type: 'planning' },
  { name: 'Daily Standup',   time: 'Amanhã · 09:30', project: 'Galpão', type: 'daily' },
  { name: 'Sprint Review',   time: '28 jul · 15:00', project: 'ERP Corp', type: 'review' },
]

const RECENT_ACTIVITY = [
  { actor: 'NM', name: 'Nicolas Melo',  action: 'moveu PM-142 para Em Revisão', time: '2h',  project: 'ERP Corp' },
  { actor: 'JN', name: 'João Nunes',   action: 'adicionou comentário em PM-158', time: '3h',  project: 'Galpão'  },
  { actor: 'CS', name: 'Clara Silva',  action: 'concluiu PM-164 — Hero layout',  time: '5h',  project: 'Website' },
  { actor: 'RM', name: 'Rafael Mendes',action: 'criou bloqueador em PM-171',     time: '1d',  project: 'ERP Corp'},
]

const TEAM_STATUS = [
  { initials: 'NM', name: 'Nicolas Melo', role: 'Designer',     tasks: 3, blocked: 0, color: T.purple },
  { initials: 'JN', name: 'João Nunes',   role: 'Dev Backend',  tasks: 5, blocked: 1, color: T.warn   },
  { initials: 'CS', name: 'Clara Silva',  role: 'Dev Frontend', tasks: 4, blocked: 0, color: T.success },
  { initials: 'RM', name: 'Rafael Mendes',role: 'DevOps',       tasks: 2, blocked: 2, color: T.crit   },
]

const PROJECT_HEALTH = [
  { name: 'ERP Corp',  pct: 48, health: 'at-risk',  members: 4, daysLeft: 14 },
  { name: 'Galpão',    pct: 18, health: 'healthy',  members: 3, daysLeft: 42 },
  { name: 'Website',   pct: 72, health: 'healthy',  members: 5, daysLeft: 7  },
]

const AVATAR_COLORS: Record<string, string> = {
  AL: T.accent, NM: T.purple, JN: T.warn, CS: T.success, RM: T.crit,
}

const PRIORITY: Record<string, { color: string; label: string }> = {
  crit: { color: T.crit,    label: 'Crítico'  },
  high: { color: T.warn,    label: 'Alta'     },
  med:  { color: T.accent,  label: 'Média'    },
  low:  { color: T.text3,   label: 'Baixa'    },
}

const HEALTH_CFG: Record<string, { color: string; bg: string; label: string }> = {
  'healthy':  { color: T.success, bg: T.successDim, label: 'Saudável'  },
  'at-risk':  { color: T.warn,    bg: T.warnDim,    label: 'Em risco'  },
  'blocked':  { color: T.crit,    bg: T.critDim,    label: 'Bloqueado' },
}

function Av({ initials, size = 28, color }: { initials: string; size?: number; color?: string }) {
  const bg = color ?? AVATAR_COLORS[initials] ?? T.text3
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: bg }}
    >
      {initials}
    </span>
  )
}

// ─── Quick stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, color, note }: { label: string; value: string | number; color: string; note?: string }) {
  return (
    <div
      className="flex-1 rounded-xl p-4 flex flex-col gap-1"
      style={{ background: T.bgSurface, border: `1px solid ${T.border}` }}
    >
      <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: T.text3 }}>{label}</p>
      <p className="text-[28px] font-bold tabular leading-none" style={{ color }}>{value}</p>
      {note && <p className="text-[11px]" style={{ color: T.text3 }}>{note}</p>}
    </div>
  )
}

// ─── Widget wrapper ───────────────────────────────────────────────────────────
function Widget({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col rounded-xl overflow-hidden" style={{ background: T.bgSurface, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between px-4 py-3 flex-shrink-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        <p className="text-[13px] font-semibold" style={{ color: T.text1 }}>{title}</p>
        {action}
      </div>
      <div className="flex-1 overflow-y-auto">{children}</div>
    </div>
  )
}

// ─── Ceremony type icon ───────────────────────────────────────────────────────
function CeremonyDot({ type }: { type: string }) {
  const c = type === 'planning' ? T.accent : type === 'daily' ? T.success : T.warn
  return <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: c }} />
}

// ─── Sprint mini donut ────────────────────────────────────────────────────────
function MiniDonut({ pct, color }: { pct: number; color: string }) {
  const r = 14, cx = 18, cy = 18, circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="36" height="36" viewBox="0 0 36 36">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={`${color}22`} strokeWidth="4" />
      <circle
        cx={cx} cy={cy} r={r} fill="none"
        stroke={color} strokeWidth="4"
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 18 18)"
      />
    </svg>
  )
}

// ─── Approval item (Admin only) ───────────────────────────────────────────────
const APPROVALS = [
  { title: 'PM-168 — Deploy hotfix auth',  requester: 'JN', project: 'ERP Corp', urgency: 'crit'  },
  { title: 'PM-155 — Merge feature/oauth', requester: 'CS', project: 'ERP Corp', urgency: 'high'  },
]

function ApprovalsWidget() {
  return (
    <Widget title="Aprovações pendentes" action={
      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: T.critDim, color: T.crit }}>
        {APPROVALS.length}
      </span>
    }>
      <div className="divide-y" style={{ borderColor: T.border }}>
        {APPROVALS.map(a => (
          <div key={a.title} className="flex items-start gap-3 px-4 py-3">
            <Av initials={a.requester} size={26} />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-medium truncate" style={{ color: T.text1 }}>{a.title}</p>
              <p className="text-[11px]" style={{ color: T.text3 }}>{a.project}</p>
            </div>
            <div className="flex gap-1.5">
              <button
                className="h-6 px-2.5 text-[11px] font-semibold rounded-lg transition-colors"
                style={{ background: T.successDim, color: T.success }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${T.success}30` }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.successDim }}
              >
                Aprovar
              </button>
              <button
                className="h-6 px-2.5 text-[11px] font-semibold rounded-lg transition-colors"
                style={{ background: T.critDim, color: T.crit }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = `${T.crit}30` }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = T.critDim }}
              >
                Rejeitar
              </button>
            </div>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// ─── Home page ────────────────────────────────────────────────────────────────
export default function HomePage({ role }: HomePageProps) {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'

  // Role-specific quick stats
  const stats = role === 'Admin'
    ? [
        { label: 'Tarefas para hoje',       value: 4,  color: T.text1,    note: '2 com alta prioridade' },
        { label: 'Bloqueados no time',       value: 3,  color: T.crit,     note: 'Ação necessária' },
        { label: 'Aprovações pendentes',     value: 2,  color: T.warn,     note: 'Aguardando você' },
      ]
    : role === 'Member'
    ? [
        { label: 'Minhas tarefas hoje',      value: 4,  color: T.text1,    note: '2 com alta prioridade' },
        { label: 'Em revisão',               value: 2,  color: T.accent,   note: 'Aguardando feedback' },
        { label: 'Sprint progress',          value: '72%', color: T.success, note: 'Sprint 14 · +5 pts/dia' },
      ]
    : [
        { label: 'Projetos ativos',          value: 3,  color: T.accent,   note: 'Participando como viewer' },
        { label: 'Entregas esta semana',      value: 2,  color: T.success,  note: 'Dentro do prazo' },
        { label: 'Próxima review',           value: '28 jul', color: T.warn, note: 'Sprint Review · 15:00' },
      ]

  return (
    <div className="h-full overflow-y-auto" style={{ background: T.bgPage }}>
      <div className="max-w-6xl mx-auto px-6 py-6 space-y-6">

        {/* Greeting ────────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white text-sm flex-shrink-0"
              style={{ background: T.accent }}
            >
              AL
            </div>
            <div>
              <h1 className="text-[22px] font-bold leading-tight" style={{ color: T.text1 }}>
                {greeting}, Ana Lima!
              </h1>
              <p className="text-[13px]" style={{ color: T.text3 }}>
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                {' · '}
                <span style={{ color: T.accent }}>{role}</span>
              </p>
            </div>
          </div>
          {/* [ROLE Admin] Quick action */}
          {role === 'Admin' && (
            <button
              className="flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white transition-all"
              style={{ background: T.accent }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
            >
              <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
                <path d="M5.5 1.5v8M1.5 5.5h8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              Nova tarefa
            </button>
          )}
        </div>

        {/* Quick stats row ─────────────────────────────────────────────────── */}
        <div className="flex gap-3">
          {stats.map(s => <StatCard key={s.label} {...s} />)}
        </div>

        {/* Main grid ──────────────────────────────────────────────────────── */}
        <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 340px' }}>

          {/* Left column */}
          <div className="flex flex-col gap-4">

            {/* Minhas tarefas hoje — [ROLE All] */}
            <Widget
              title="Minhas tarefas · hoje"
              action={
                <span className="text-[11px]" style={{ color: T.text3 }}>
                  {TODAY_TASKS.filter(t => !t.done).length} pendentes
                </span>
              }
            >
              <div className="divide-y" style={{ borderColor: T.border }}>
                {TODAY_TASKS.map(task => (
                  <div
                    key={task.id}
                    className="flex items-center gap-3 px-4 py-2.5 transition-colors group"
                    style={{ opacity: task.done ? 0.5 : 1 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.bgSurface2 }}
                    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                  >
                    {/* Priority dot */}
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PRIORITY[task.priority].color }}
                    />
                    {/* Checkbox */}
                    <span
                      className="w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border"
                      style={{
                        background: task.done ? T.success : 'transparent',
                        borderColor: task.done ? T.success : T.border2,
                      }}
                    >
                      {task.done && (
                        <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
                          <path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
                        </svg>
                      )}
                    </span>
                    {/* Title + project */}
                    <span
                      className="flex-1 text-[13px] truncate"
                      style={{
                        color: task.done ? T.text3 : T.text1,
                        textDecoration: task.done ? 'line-through' : 'none',
                      }}
                    >
                      {task.title}
                    </span>
                    {/* Project tag */}
                    <span
                      className="text-[10px] px-2 py-0.5 rounded-md flex-shrink-0"
                      style={{ background: T.bgSurface2, color: T.text3 }}
                    >
                      {task.project}
                    </span>
                    {/* Priority label */}
                    <span className="text-[10px] flex-shrink-0 font-medium" style={{ color: PRIORITY[task.priority].color }}>
                      {PRIORITY[task.priority].label}
                    </span>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2.5">
                <button
                  className="text-[12px] font-medium"
                  style={{ color: T.accent }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = `${T.accent}cc` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.accent }}
                >
                  + Adicionar tarefa
                </button>
              </div>
            </Widget>

            {/* [ROLE Admin] Visão do time / [ROLE Member] Atividade recente / [ROLE Viewer] Projetos */}
            {role === 'Admin' ? (
              <Widget title="Visão do time" action={
                <span className="text-[11px]" style={{ color: T.text3 }}>4 membros ativos</span>
              }>
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {TEAM_STATUS.map(m => (
                    <div key={m.name} className="flex items-center gap-3 px-4 py-3">
                      <Av initials={m.initials} size={28} color={m.color} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium" style={{ color: T.text1 }}>{m.name}</p>
                        <p className="text-[11px]" style={{ color: T.text3 }}>{m.role}</p>
                      </div>
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: T.text3 }}>
                        <span>{m.tasks} tarefas</span>
                        {m.blocked > 0 && (
                          <span
                            className="px-1.5 py-0.5 rounded font-bold"
                            style={{ background: T.critDim, color: T.crit }}
                          >
                            {m.blocked} bloq.
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Widget>
            ) : role === 'Member' ? (
              <Widget title="Atividade recente">
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {RECENT_ACTIVITY.map(a => (
                    <div key={a.actor + a.time} className="flex items-start gap-3 px-4 py-3">
                      <Av initials={a.actor} size={26} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px]" style={{ color: T.text2 }}>
                          <span className="font-medium" style={{ color: T.text1 }}>{a.name}</span>{' '}{a.action}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[10px]" style={{ color: T.text3 }}>{a.time} · {a.project}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </Widget>
            ) : (
              // [ROLE Viewer] — project health overview
              <Widget title="Projetos que acompanho">
                <div className="divide-y" style={{ borderColor: T.border }}>
                  {PROJECT_HEALTH.map(p => {
                    const hc = HEALTH_CFG[p.health]
                    return (
                      <div key={p.name} className="flex items-center gap-3 px-4 py-3">
                        <MiniDonut pct={p.pct} color={hc.color} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium" style={{ color: T.text1 }}>{p.name}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span
                              className="text-[10px] font-semibold px-1.5 py-px rounded-md"
                              style={{ background: hc.bg, color: hc.color }}
                            >
                              {hc.label}
                            </span>
                            <span className="text-[10px]" style={{ color: T.text3 }}>{p.daysLeft}d restantes</span>
                          </div>
                        </div>
                        <span className="text-[20px] font-bold tabular" style={{ color: T.text2 }}>{p.pct}%</span>
                      </div>
                    )
                  })}
                </div>
              </Widget>
            )}
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">

            {/* Próximas cerimônias — [ROLE All] */}
            <Widget title="Próximas cerimônias">
              <div className="divide-y" style={{ borderColor: T.border }}>
                {CEREMONIES.map(c => (
                  <div key={c.name} className="flex items-center gap-3 px-4 py-3">
                    <CeremonyDot type={c.type} />
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium" style={{ color: T.text1 }}>{c.name}</p>
                      <p className="text-[10px]" style={{ color: T.text3 }}>{c.time}</p>
                    </div>
                    <span className="text-[10px] px-1.5 py-px rounded-md" style={{ background: T.bgSurface2, color: T.text3 }}>
                      {c.project}
                    </span>
                  </div>
                ))}
              </div>
            </Widget>

            {/* [ROLE Admin] Project health cards */}
            {role === 'Admin' && (
              <Widget title="Saúde dos projetos">
                <div className="p-4 flex flex-col gap-3">
                  {PROJECT_HEALTH.map(p => {
                    const hc = HEALTH_CFG[p.health]
                    return (
                      <div
                        key={p.name}
                        className="flex items-center gap-3 p-3 rounded-xl"
                        style={{ background: T.bgSurface2, border: `1px solid ${T.border}` }}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-[12px] font-semibold" style={{ color: T.text1 }}>{p.name}</p>
                            <span
                              className="text-[9px] font-bold px-1.5 py-px rounded-full"
                              style={{ background: hc.bg, color: hc.color }}
                            >
                              {hc.label}
                            </span>
                          </div>
                          {/* Progress bar */}
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: `${hc.color}22` }}>
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${p.pct}%`, background: hc.color }}
                            />
                          </div>
                          <div className="flex justify-between mt-1">
                            <span className="text-[10px] tabular" style={{ color: T.text3 }}>{p.pct}%</span>
                            <span className="text-[10px]" style={{ color: T.text3 }}>{p.daysLeft}d</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </Widget>
            )}

            {/* [ROLE Admin] Pending approvals */}
            {role === 'Admin' && <ApprovalsWidget />}

            {/* [ROLE Member] My sprint progress */}
            {role === 'Member' && (
              <Widget title="Meu progresso na sprint">
                <div className="p-4">
                  <div className="flex items-center gap-4 mb-4">
                    <MiniDonut pct={72} color={T.success} />
                    <div>
                      <p className="text-[22px] font-bold tabular" style={{ color: T.success }}>72%</p>
                      <p className="text-[11px]" style={{ color: T.text3 }}>Sprint 14 · termina 28 jul</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {[
                      { label: 'Concluído',   count: 8,  color: T.success },
                      { label: 'Em andamento',count: 2,  color: T.accent  },
                      { label: 'Pendente',    count: 1,  color: T.text3   },
                    ].map(row => (
                      <div key={row.label} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                        <span className="flex-1 text-[12px]" style={{ color: T.text2 }}>{row.label}</span>
                        <span className="text-[12px] font-semibold tabular" style={{ color: T.text1 }}>{row.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Widget>
            )}

            {/* [ROLE Viewer] Upcoming milestones */}
            {role === 'Viewer' && (
              <Widget title="Marcos do projeto">
                <div className="p-4 space-y-3">
                  {[
                    { date: '28 jul', name: 'Sprint Review',    status: 'warn' },
                    { date: '4 ago',  name: 'Beta Launch',      status: 'accent' },
                    { date: '18 ago', name: 'v2 Feature Drop',  status: 'accent' },
                    { date: '1 set',  name: 'GA Release',       status: 'success' },
                  ].map(m => {
                    const c = m.status === 'success' ? T.success : m.status === 'warn' ? T.warn : T.accent
                    return (
                      <div key={m.name} className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-bold tabular px-2 py-1 rounded-lg flex-shrink-0"
                          style={{ background: `${c}18`, color: c, minWidth: 48, textAlign: 'center' }}
                        >
                          {m.date}
                        </span>
                        <span className="text-[12px]" style={{ color: T.text1 }}>{m.name}</span>
                      </div>
                    )
                  })}
                </div>
              </Widget>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
