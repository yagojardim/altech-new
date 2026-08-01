import { useState, useRef, useEffect } from 'react'
import { Avatar } from './ds/Avatar'
import { T } from './ds/tokens'

// ─── Types & data ─────────────────────────────────────────────────────────────
type Status   = 'pending' | 'in-progress' | 'in-review' | 'done' | 'blocked'
type Priority = 'critical' | 'high' | 'medium' | 'low'
type ActivityTab = 'comments' | 'history'

const statusConfig: Record<Status, { label: string; color: string; dim: string }> = {
  pending:      { label: 'Pendente',      color: T.text3,   dim: T.neutralDim  },
  'in-progress':{ label: 'Em andamento',  color: T.accent,  dim: T.accentDim   },
  'in-review':  { label: 'Em revisão',    color: T.warn,    dim: T.warnDim     },
  done:         { label: 'Concluído',     color: T.success, dim: T.successDim  },
  blocked:      { label: 'Bloqueado',     color: T.crit,    dim: T.critDim     },
}

const priorityConfig: Record<Priority, { label: string; icon: string; color: string }> = {
  critical: { label: 'Crítico', icon: '⬆⬆', color: T.crit    },
  high:     { label: 'Alto',    icon: '⬆',   color: T.warn    },
  medium:   { label: 'Médio',   icon: '→',   color: T.accent  },
  low:      { label: 'Baixo',   icon: '⬇',   color: T.text3   },
}

const subtasks = [
  { id: 1, label: 'Configurar provider OAuth2 (Google, GitHub)', done: true  },
  { id: 2, label: 'Implementar Authorization Code Flow + PKCE',  done: true  },
  { id: 3, label: 'Refresh token automático (60s antes do vencimento)', done: false },
  { id: 4, label: 'Revogação de sessão e logout global',          done: false },
  { id: 5, label: 'Testes unitários e integração E2E',            done: false },
]

const comments = [
  { author: 'Ana Lima',       when: '14 jun, 16:47', body: 'Precisamos das credenciais do ambiente de produção para prosseguir com a integração OAuth2. @Rafael, você tem acesso ao Vault?' },
  { author: 'Rafael Mendes',  when: '14 jun, 18:22', body: 'Já abri um ticket com a equipe de infra (INFRA-2041). Eles estimam 2 dias úteis para liberar o acesso.' },
  { author: 'Lucas Ferreira', when: '15 jun, 09:05', body: 'Enquanto isso posso avançar com os testes unitários e mocks. Assim que as credenciais chegarem, basta trocar para o ambiente real.' },
]

const historyEvents = [
  { actor: 'Ana Lima',       action: 'criou a tarefa',               date: '10 jun, 14:32', color: T.accent  },
  { actor: 'Rafael Mendes',  action: 'moveu para Em andamento',       date: '12 jun, 09:15', color: T.accent  },
  { actor: 'Lucas Ferreira', action: 'adicionou um comentário',       date: '14 jun, 16:47', color: T.text3   },
  { actor: 'Rafael Mendes',  action: 'alterou status para Bloqueado', date: '15 jun, 11:03', color: T.crit    },
]

const teamMembers = ['Ana Lima', 'Lucas Ferreira', 'Carla Souza', 'Rafael Mendes', 'Beatriz Costa', 'Felipe Duarte']
const tagOptions  = ['backend', 'auth', 'oauth2', 'sprint-14', 'crítico', 'infra', 'api']

// ─── Shared helpers ───────────────────────────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: T.text3 }}>
      {children}
    </p>
  )
}

function MetaBlock({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function Dropdown({ open, children }: { open: boolean; children: React.ReactNode }) {
  if (!open) return null
  return (
    <div
      className="absolute top-full left-0 right-0 mt-1 z-50 py-1 rounded-xl overflow-hidden fade-rise"
      style={{
        background: T.bgSurface,
        border: `1px solid ${T.border2}`,
        boxShadow: T.shadowModal,
      }}
    >
      {children}
    </div>
  )
}

function DropItem({ onClick, children, active }: { onClick: () => void; children: React.ReactNode; active?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors text-left"
      style={{ background: active ? T.accentDim : 'transparent', color: active ? T.accent : T.text1 }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = active ? T.accentDim : 'transparent' }}
    >
      {children}
    </button>
  )
}

// ─── SavePill ──────────────────────────────────────────────────────────────────
function SavePill({ saved }: { saved: boolean }) {
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-300"
      style={{
        background: saved ? T.successDim : T.bgSurface2,
        color: saved ? T.success : T.text3,
        border: `1px solid ${saved ? T.success + '40' : T.border}`,
      }}
    >
      {saved ? '✓ Salvo' : 'Editando…'}
    </span>
  )
}

// ─── Status dropdown ──────────────────────────────────────────────────────────
function StatusDropdown({ value, onChange }: { value: Status; onChange: (v: Status) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const c = statusConfig[value]
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded-lg border text-[13px] font-medium transition-all"
        style={{ background: c.dim, borderColor: `${c.color}40`, color: c.color }}
      >
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: c.color }} />
          {c.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Dropdown open={open}>
        {(Object.entries(statusConfig) as [Status, typeof statusConfig[Status]][]).map(([k, v]) => (
          <DropItem key={k} onClick={() => { onChange(k); setOpen(false) }} active={k === value}>
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: v.color }} />
            <span style={{ color: v.color }}>{v.label}</span>
          </DropItem>
        ))}
      </Dropdown>
    </div>
  )
}

// ─── Assignee selector ────────────────────────────────────────────────────────
function AssigneeSelector({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-3 h-9 rounded-lg border transition-all"
        style={{
          background: T.bgSurface2,
          borderColor: open ? T.accent : T.border,
          boxShadow: open ? `0 0 0 2px ${T.accentBorder}` : 'none',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = T.border2 }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLButtonElement).style.borderColor = T.border }}
      >
        <Avatar name={value} size="sm" />
        <span className="flex-1 text-left text-[13px]" style={{ color: T.text1 }}>{value}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: T.text3 }}>
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Dropdown open={open}>
        <div className="max-h-48 overflow-y-auto">
          {teamMembers.map(m => (
            <DropItem key={m} onClick={() => { onChange(m); setOpen(false) }} active={m === value}>
              <Avatar name={m} size="sm" />
              <span>{m}</span>
            </DropItem>
          ))}
        </div>
      </Dropdown>
    </div>
  )
}

// ─── Priority selector ────────────────────────────────────────────────────────
function PrioritySelector({ value, onChange }: { value: Priority; onChange: (v: Priority) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    function close(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const c = priorityConfig[value]
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 h-9 rounded-lg border text-[13px] transition-all"
        style={{
          background: T.bgSurface2,
          borderColor: open ? T.accent : T.border,
          color: c.color,
        }}
      >
        <span className="flex items-center gap-2">
          <span className="font-bold text-xs w-4 text-center">{c.icon}</span>
          {c.label}
        </span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ color: T.text3 }}>
          <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <Dropdown open={open}>
        {(Object.entries(priorityConfig) as [Priority, typeof priorityConfig[Priority]][]).map(([k, v]) => (
          <DropItem key={k} onClick={() => { onChange(k); setOpen(false) }} active={k === value}>
            <span className="font-bold text-xs w-4 text-center" style={{ color: v.color }}>{v.icon}</span>
            <span style={{ color: v.color }}>{v.label}</span>
          </DropItem>
        ))}
      </Dropdown>
    </div>
  )
}

// ─── Tags editor ──────────────────────────────────────────────────────────────
function TagsEditor({ tags, onChange }: { tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')
  const [open, setOpen] = useState(false)
  const filtered = tagOptions.filter(t => !tags.includes(t) && t.includes(input.toLowerCase()))
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(t => (
        <span
          key={t}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md border"
          style={{
            background: T.accentDim,
            borderColor: T.accentBorder,
            color: T.accent,
          }}
        >
          {t}
          <button
            onClick={() => onChange(tags.filter(x => x !== t))}
            className="transition-opacity hover:opacity-60 leading-none"
            style={{ color: T.accent }}
          >
            ×
          </button>
        </span>
      ))}
      <div className="relative">
        <input
          value={input}
          onChange={e => { setInput(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="+ Tag"
          className="h-5 px-2 text-[11px] rounded-md border border-dashed outline-none w-14 transition-colors"
          style={{
            background: 'transparent',
            borderColor: T.border2,
            color: T.text2,
          }}
        />
        {open && filtered.length > 0 && (
          <div
            className="absolute top-full left-0 mt-1 z-50 py-1 rounded-xl overflow-hidden fade-rise"
            style={{ background: T.bgSurface, border: `1px solid ${T.border2}`, boxShadow: T.shadowModal, width: 140 }}
          >
            {filtered.slice(0, 6).map(t => (
              <button
                key={t}
                onMouseDown={() => { onChange([...tags, t]); setInput('') }}
                className="w-full text-left px-3 py-1.5 text-[12px] transition-colors"
                style={{ color: T.text2 }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
              >
                {t}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Subtask list ─────────────────────────────────────────────────────────────
function SubtaskList() {
  const [tasks, setTasks] = useState(subtasks)
  const [newTask, setNewTask] = useState('')
  const done = tasks.filter(t => t.done).length
  const pct  = Math.round((done / tasks.length) * 100)

  function toggle(id: number) {
    setTasks(t => t.map(x => x.id === id ? { ...x, done: !x.done } : x))
  }

  function addTask(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && newTask.trim()) {
      setTasks(t => [...t, { id: Date.now(), label: newTask.trim(), done: false }])
      setNewTask('')
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: T.bgSurface2 }}>
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${pct}%`, background: pct === 100 ? T.success : T.accent }}
          />
        </div>
        <span className="text-xs font-medium flex-shrink-0 tabular" style={{ color: T.text2 }}>{done}/{tasks.length}</span>
      </div>
      <div className="space-y-0.5">
        {tasks.map(task => (
          <label
            key={task.id}
            className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg cursor-pointer transition-colors group"
            style={{ background: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.background = T.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.background = 'transparent' }}
          >
            <input
              type="checkbox"
              checked={task.done}
              onChange={() => toggle(task.id)}
              className="w-4 h-4 rounded cursor-pointer flex-shrink-0"
              style={{ accentColor: T.accent }}
            />
            <span
              className="text-[13px] transition-all"
              style={{ color: task.done ? T.text3 : T.text1, textDecoration: task.done ? 'line-through' : 'none' }}
            >
              {task.label}
            </span>
          </label>
        ))}
      </div>
      <input
        value={newTask}
        onChange={e => setNewTask(e.target.value)}
        onKeyDown={addTask}
        placeholder="Adicionar subtarefa… (Enter)"
        className="w-full text-[13px] px-3 py-2 rounded-lg border border-dashed outline-none transition-all"
        style={{
          background: 'transparent',
          borderColor: T.border2,
          color: T.text1,
        }}
        onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.background = T.bgSurface2 }}
        onBlur={e => { e.currentTarget.style.borderColor = T.border2; e.currentTarget.style.background = 'transparent' }}
      />
    </div>
  )
}

// ─── Activity section ─────────────────────────────────────────────────────────
function ActivitySection() {
  const [tab, setTab] = useState<ActivityTab>('comments')
  const [draft, setDraft] = useState('')
  const [mention, setMention] = useState(false)

  function handleDraft(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const v = e.target.value
    setDraft(v)
    setMention(v.endsWith('@'))
  }

  return (
    <div className="space-y-3">
      {/* Tabs */}
      <div className="flex gap-0" style={{ borderBottom: `1px solid ${T.border}` }}>
        {(['comments', 'history'] as ActivityTab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="px-4 py-2 text-[13px] font-medium border-b-2 -mb-px transition-all"
            style={{
              borderColor: tab === t ? T.accent : 'transparent',
              color: tab === t ? T.accent : T.text3,
            }}
          >
            {t === 'comments' ? 'Comentários' : 'Histórico'}
          </button>
        ))}
      </div>

      {tab === 'comments' && (
        <div className="space-y-4">
          {comments.map((c, i) => (
            <div key={i} className="flex gap-3">
              <Avatar name={c.author} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[13px] font-semibold" style={{ color: T.text1 }}>{c.author}</span>
                  <span className="text-[11px]" style={{ color: T.text3 }}>{c.when}</span>
                </div>
                <p
                  className="text-[13px] leading-relaxed rounded-xl px-4 py-3 border"
                  style={{ color: T.text2, background: T.bgSurface2, borderColor: T.border }}
                >
                  {c.body}
                </p>
              </div>
            </div>
          ))}

          {/* Comment input */}
          <div className="flex gap-3">
            <Avatar name="Ana Lima" size="sm" />
            <div className="flex-1 space-y-2 relative">
              <div className="relative">
                <textarea
                  value={draft}
                  onChange={handleDraft}
                  placeholder="Adicionar comentário… Use @ para mencionar"
                  rows={3}
                  className="w-full px-4 py-3 text-[13px] rounded-xl outline-none resize-none border transition-all"
                  style={{
                    background: T.bgSurface2,
                    color: T.text1,
                    borderColor: draft ? T.accent : T.border,
                    boxShadow: draft ? `0 0 0 2px ${T.accentBorder}` : 'none',
                    caretColor: T.accent,
                  }}
                />
                {mention && (
                  <div
                    className="absolute bottom-full left-0 mb-1 z-50 py-1 rounded-xl overflow-hidden w-48 fade-rise"
                    style={{ background: T.bgSurface, border: `1px solid ${T.border2}`, boxShadow: T.shadowModal }}
                  >
                    {teamMembers.slice(0, 4).map(m => (
                      <button
                        key={m}
                        onMouseDown={() => { setDraft(d => d.slice(0, -1) + `@${m} `); setMention(false) }}
                        className="w-full flex items-center gap-2 px-3 py-2 transition-colors"
                        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
                        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                      >
                        <Avatar name={m} size="xs" />
                        <span className="text-[13px]" style={{ color: T.text1 }}>{m}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {draft.trim() && (
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setDraft('')}
                    className="px-3 py-1.5 text-[13px] transition-colors rounded-lg"
                    style={{ color: T.text3 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text1 }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = T.text3 }}
                  >
                    Cancelar
                  </button>
                  <button
                    className="px-4 py-1.5 text-[13px] font-medium text-white rounded-lg transition-all hover:brightness-110"
                    style={{ background: T.accent }}
                    onClick={() => setDraft('')}
                  >
                    Comentar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === 'history' && (
        <div className="relative">
          <div
            className="absolute left-[9px] top-2 bottom-2 w-px"
            style={{ background: T.border }}
          />
          {historyEvents.map((e, i) => (
            <div key={i} className="flex gap-3 py-2.5 relative">
              <span
                className="w-4 h-4 rounded-full flex-shrink-0 relative z-10 mt-0.5"
                style={{ background: e.color, outline: `3px solid ${T.bgSurface}` }}
              />
              <div>
                <p className="text-[13px]" style={{ color: T.text2 }}>
                  <strong style={{ color: T.text1 }}>{e.actor}</strong> {e.action}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: T.text3 }}>{e.date}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main modal ───────────────────────────────────────────────────────────────
interface TaskModalProps {
  onClose: () => void
}

export function TaskModal({ onClose }: TaskModalProps) {
  const [status,   setStatus]   = useState<Status>('blocked')
  const [assignee, setAssignee] = useState('Ana Lima')
  const [priority, setPriority] = useState<Priority>('critical')
  const [tags,     setTags]     = useState(['backend', 'auth', 'oauth2', 'sprint-14'])
  const [points,   setPoints]   = useState('8')
  const [dueDate,  setDueDate]  = useState('2025-07-28')
  const [saved,    setSaved]    = useState(true)
  const [moreOpen, setMoreOpen] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function markEditing() {
    setSaved(false)
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => setSaved(true), 1800)
  }

  useEffect(() => {
    function handler(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(8,10,14,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="relative flex flex-col overflow-hidden fade-rise w-full"
        style={{
          maxWidth: 920,
          maxHeight: '92vh',
          background: T.bgSurface,
          border: `1px solid ${T.border}`,
          borderRadius: 14,
          boxShadow: T.shadowModal,
        }}
      >
        {/* ── Top bar ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-6 py-3 flex-shrink-0"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-[12px]" style={{ color: T.text3 }}>
            <span className="hover:text-[--accent] cursor-pointer transition-colors" style={{ '--accent': T.accent } as React.CSSProperties} onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = T.accent }} onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = T.text3 }}>Payments API v3</span>
            <span style={{ color: T.border2 }}>/</span>
            <span className="cursor-pointer transition-colors" onMouseEnter={e => { (e.currentTarget as HTMLSpanElement).style.color = T.accent }} onMouseLeave={e => { (e.currentTarget as HTMLSpanElement).style.color = T.text3 }}>Auth Epic</span>
            <span style={{ color: T.border2 }}>/</span>
            <span className="font-mono font-semibold" style={{ color: T.text2 }}>#PM-142</span>
            <span className="ml-2"><SavePill saved={saved} /></span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <div className="relative">
              <button
                onClick={() => setMoreOpen(o => !o)}
                className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
                style={{ color: T.text3, background: 'transparent' }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2; (e.currentTarget as HTMLButtonElement).style.color = T.text1 }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3 }}
              >
                <svg width="16" height="4" viewBox="0 0 16 4" fill="none">
                  <circle cx="2" cy="2" r="1.5" fill="currentColor" />
                  <circle cx="8" cy="2" r="1.5" fill="currentColor" />
                  <circle cx="14" cy="2" r="1.5" fill="currentColor" />
                </svg>
              </button>
              {moreOpen && (
                <div
                  className="absolute top-full right-0 mt-1 z-50 py-1 rounded-xl overflow-hidden w-40 fade-rise"
                  style={{ background: T.bgSurface, border: `1px solid ${T.border2}`, boxShadow: T.shadowModal }}
                >
                  {['Duplicar', 'Compartilhar', 'Exportar', 'Arquivar'].map(a => (
                    <DropItem key={a} onClick={() => setMoreOpen(false)}>
                      {a}
                    </DropItem>
                  ))}
                  <div className="h-px mx-2 my-1" style={{ background: T.border }} />
                  <button
                    className="w-full text-left px-3 py-2 text-[13px] transition-colors"
                    style={{ color: T.crit }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.critDim }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    Excluir
                  </button>
                </div>
              )}
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-all"
              style={{ color: T.text3 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2; (e.currentTarget as HTMLButtonElement).style.color = T.text1 }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.color = T.text3 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path d="M2 2L12 12M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────── */}
        <div className="flex flex-1 overflow-hidden">

          {/* Left: content (65%) */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6" style={{ minWidth: 0 }}>
            {/* Editable title */}
            <h2
              contentEditable
              suppressContentEditableWarning
              onInput={markEditing}
              className="text-[20px] font-bold leading-snug outline-none rounded-lg px-1 -mx-1 transition-colors cursor-text"
              style={{ color: T.text1, letterSpacing: '-0.02em' }}
              onFocus={e => { (e.currentTarget as HTMLHeadingElement).style.background = T.bgSurface2 }}
              onBlur={e => { (e.currentTarget as HTMLHeadingElement).style.background = 'transparent' }}
            >
              Autenticação OAuth2 — fluxo completo de autorização e refresh token
            </h2>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição</Label>
              <div
                contentEditable
                suppressContentEditableWarning
                onInput={markEditing}
                className="min-h-[80px] text-[13px] leading-relaxed outline-none rounded-xl px-4 py-3 border transition-all cursor-text"
                style={{
                  color: T.text2,
                  background: T.bgSurface2,
                  borderColor: T.border,
                }}
                onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = `0 0 0 2px ${T.accentBorder}` }}
                onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}
              >
                <p>Implementar o <strong style={{ color: T.text1 }}>fluxo completo de autenticação OAuth2</strong> com suporte a Authorization Code Flow, PKCE e refresh automático de tokens.</p>
                <br />
                <p>A integração deve ser compatível com múltiplos provedores (Google, GitHub, Okta) e garantir revogação de sessão e logout global.</p>
              </div>
              <p className="text-[10px]" style={{ color: T.text3 }}>Clique para editar · Selecione o texto para formatação</p>
            </div>

            {/* Subtasks */}
            <div className="space-y-3">
              <Label>Subtarefas / checklist</Label>
              <SubtaskList />
            </div>

            {/* Activity */}
            <div className="space-y-3">
              <Label>Atividade</Label>
              <ActivitySection />
            </div>
          </div>

          {/* Right: metadata (35%) */}
          <div
            className="flex-shrink-0 overflow-y-auto px-5 py-5 space-y-5 border-l"
            style={{ width: 280, background: T.bgPage, borderColor: T.border }}
          >
            <MetaBlock label="Status">
              <StatusDropdown value={status} onChange={v => { setStatus(v); markEditing() }} />
            </MetaBlock>

            <MetaBlock label="Responsável">
              <AssigneeSelector value={assignee} onChange={v => { setAssignee(v); markEditing() }} />
            </MetaBlock>

            <MetaBlock label="Prioridade">
              <PrioritySelector value={priority} onChange={v => { setPriority(v); markEditing() }} />
            </MetaBlock>

            <MetaBlock label="Estimativa (pts)">
              <div className="relative">
                <input
                  type="number"
                  value={points}
                  onChange={e => { setPoints(e.target.value); markEditing() }}
                  className="w-full h-9 px-3 pr-8 text-[13px] rounded-lg border outline-none transition-all tabular"
                  style={{ background: T.bgSurface2, borderColor: T.border, color: T.text1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = T.accent; e.currentTarget.style.boxShadow = `0 0 0 2px ${T.accentBorder}` }}
                  onBlur={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.boxShadow = 'none' }}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs" style={{ color: T.text3 }}>pts</span>
              </div>
            </MetaBlock>

            <MetaBlock label="Data de entrega">
              <input
                type="date"
                value={dueDate}
                onChange={e => { setDueDate(e.target.value); markEditing() }}
                className="w-full h-9 px-3 text-[13px] rounded-lg border outline-none transition-all"
                style={{
                  background: T.bgSurface2,
                  borderColor: T.border,
                  color: T.text1,
                  colorScheme: 'dark',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = T.accent }}
                onBlur={e => { e.currentTarget.style.borderColor = T.border }}
              />
            </MetaBlock>

            <MetaBlock label="Tags">
              <TagsEditor tags={tags} onChange={v => { setTags(v); markEditing() }} />
            </MetaBlock>

            {/* Info rows */}
            <div className="pt-4 space-y-3" style={{ borderTop: `1px solid ${T.border}` }}>
              {[
                { label: 'Criado por', val: <span className="flex items-center gap-1.5"><Avatar name="Ana Lima" size="xs" /><span>Ana Lima</span></span> },
                { label: 'Criado em',  val: '10 jun 2025' },
                { label: 'Atualizado', val: '15 jun 2025' },
                { label: 'Sprint',     val: 'Sprint 14'   },
                { label: 'Epic',       val: 'Auth & Identity' },
              ].map(({ label, val }) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <span className="text-[11px]" style={{ color: T.text3 }}>{label}</span>
                  <span className="text-[12px] flex items-center gap-1" style={{ color: T.text2 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
