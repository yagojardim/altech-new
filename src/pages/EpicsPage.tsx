import { useState, useRef, useEffect } from 'react'
import { CreateIssueModal } from '../components/CreateIssueModal'
import { WorkItemDetail, type WorkItemData } from '../components/WorkItemDetail'
import { T } from '../components/ds/tokens'
import {
  ISSUES, EPICS, SPRINTS, STATUS_CFG, TYPE_ICON, AV_COLOR,
  type IssueStatus, type Issue,
} from '../data/issues'

const PRESET_COLORS = [T.accent, T.warn, T.purple, T.success, T.crit]

const STATUSES: IssueStatus[] = ['backlog', 'todo', 'in-progress', 'in-review', 'done']

// ─── Assignee name map (initials → display name) ──────────────────────────────
const AV_NAME: Record<string, string> = {
  AL: 'Ana Lima', NM: 'Natalia Moreira', JN: 'João Nunes',
  CS: 'Camila Santos', RM: 'Rafael Mendes', LF: 'Lucas Ferreira',
}

// ─── Map Issue → WorkItemData for WorkItemDetail ──────────────────────────────
function issueToWID(issue: Issue, allIssues: Issue[]): WorkItemData {
  const epic = EPICS.find(e => e.id === issue.epic)
  const sprint = SPRINTS.find(s => s.id === issue.sprint)
  const children = allIssues
    .filter(i => i.epic === issue.epic && i.key !== issue.key && i.type === 'subtask')
    .map(i => ({ key: i.key, type: i.type, title: i.title, status: i.status, points: i.points, assigneeInitials: i.assignee }))

  return {
    key:              issue.key,
    type:             issue.type,
    title:            issue.title,
    status:           issue.status,
    priority:         issue.priority,
    labels:           issue.labels,
    assigneeInitials: issue.assignee,
    assigneeName:     AV_NAME[issue.assignee],
    epicKey:          epic?.key,
    epicLabel:        epic?.label,
    epicColor:        epic?.color,
    sprintId:         issue.sprint,
    sprintName:       sprint?.name,
    blocked:          issue.blocked,
    delayed:          issue.delayed,
    dueDate:          issue.dueDateIso,
    points:           issue.points,
    children:         issue.type === 'story' || issue.type === 'epic' ? children : undefined,
    availableEpics:   EPICS.map(e => ({ id: e.id, label: e.label, color: e.color })),
    availableMembers: Object.keys(AV_NAME).map(k => ({ id: k, name: AV_NAME[k], initials: k })),
    availableSprints: SPRINTS.map(s => ({ id: s.id, name: s.name })),
    availableLabels:  ['Design', 'Eng', 'UX', 'Content', 'SEO', 'Mobile', 'Web', 'Research', 'Brand', 'Hero'],
    createdAt:        '2025-04-01T09:00:00Z',
    updatedAt:        new Date().toISOString(),
  }
}

// ─── Map WorkItemData updates back to Issue fields ────────────────────────────
function widToIssue(issue: Issue, updated: WorkItemData): Issue {
  return {
    ...issue,
    title:    updated.title,
    status:   updated.status as IssueStatus,
    priority: updated.priority as Issue['priority'],
    labels:   updated.labels,
    assignee: updated.assigneeInitials,
    points:   updated.points ?? issue.points,
    blocked:  updated.blocked,
    delayed:  updated.delayed,
    epic:     updated.epicKey ?? issue.epic,
    sprint:   updated.sprintId ?? issue.sprint,
  }
}

// ─── Issue search dropdown (for linking unlinked issues into an epic) ─────────
function IssueSearchDropdown({
  epicId, epicColor, issues, onLink,
}: { epicId: string; epicColor: string; issues: Issue[]; onLink: (key: string) => void }) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const [cursor, setCursor] = useState(-1)
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const linkedKeys = new Set(issues.filter(i => i.epic === epicId).map(i => i.key))

  const results = query.trim().length < 1 ? [] : issues.filter(i => {
    if (linkedKeys.has(i.key)) return false
    const q = query.toLowerCase()
    const epicLabel = EPICS.find(e => e.id === i.epic)?.label ?? ''
    return (
      i.key.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      epicLabel.toLowerCase().includes(q) ||
      i.labels.some(l => l.toLowerCase().includes(q))
    )
  }).slice(0, 8)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery(''); setCursor(-1)
      }
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    else if (e.key === 'Enter' && cursor >= 0 && results[cursor]) {
      e.preventDefault()
      onLink(results[cursor].key); setQuery(''); setOpen(false); setCursor(-1)
    } else if (e.key === 'Escape') { setOpen(false); setQuery(''); setCursor(-1) }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={ref} style={{ position: 'relative', marginTop: 12 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: T.bgSurface2, border: `1px solid ${epicColor}50`,
        borderRadius: 8, padding: '7px 12px',
        boxShadow: open ? `0 0 0 2px ${epicColor}20` : 'none',
        transition: 'box-shadow 0.15s',
      }}>
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
          <circle cx="5.5" cy="5.5" r="4" stroke={T.text3} strokeWidth="1.2"/>
          <path d="M8.5 8.5l2 2" stroke={T.text3} strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
        <input
          ref={inputRef}
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1) }}
          onFocus={() => { if (query.trim()) setOpen(true) }}
          onKeyDown={handleKeyDown}
          placeholder="Buscar e adicionar issues por título, key, épico ou funcionalidade…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: T.text2 }}
        />
        {query && (
          <button
            onMouseDown={e => { e.preventDefault(); setQuery(''); setOpen(false); setCursor(-1); inputRef.current?.focus() }}
            style={{ background: 'none', border: 'none', color: T.text3, cursor: 'pointer', fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
        )}
      </div>

      {showDropdown && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 300,
          background: T.bgSurface2, border: `1px solid ${T.border2}`,
          borderRadius: 8, boxShadow: T.shadowModal, overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: T.text3, textAlign: 'center' }}>
              Nenhuma issue fora do épico corresponde a "{query}"
            </div>
          ) : (
            results.map((issue, idx) => {
              const sc = STATUS_CFG[issue.status]
              const ti = TYPE_ICON[issue.type]
              const isCursor = idx === cursor
              return (
                <div
                  key={issue.key}
                  onMouseDown={e => { e.preventDefault(); onLink(issue.key); setQuery(''); setOpen(false); setCursor(-1) }}
                  onMouseEnter={() => setCursor(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    cursor: 'pointer',
                    background: isCursor ? `${epicColor}18` : 'transparent',
                    borderTop: idx > 0 ? `1px solid ${T.border}` : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ color: ti.color, fontSize: 13, flexShrink: 0 }}>{ti.icon}</span>
                  <span style={{ fontSize: 11, color: T.text3, fontFamily: 'monospace', width: 62, flexShrink: 0 }}>{issue.key}</span>
                  <span style={{ fontSize: 12, color: T.text1, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                  <span style={{ fontSize: 10, color: sc.color, background: sc.bg, borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>{sc.label}</span>
                  <span style={{ fontSize: 10, color: epicColor, background: `${epicColor}14`, borderRadius: 4, padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    + Vincular
                  </span>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DonutRing({ pct, size = 48, color }: { pct: number; size?: number; color: string }) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={T.border2} strokeWidth={5} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fill={T.text1}
        style={{ fontSize: 11, fontWeight: 700 }}>
        {pct}%
      </text>
    </svg>
  )
}

function Avatar({ initials, size = 26 }: { initials: string; size?: number }) {
  const bg = AV_COLOR[initials] ?? T.text3
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', background: bg,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, color: '#fff', flexShrink: 0,
    }}>{initials}</div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function EpicsPage() {
  const [epicCreate, setEpicCreate] = useState(false)
  const [epicColors, setEpicColors] = useState<Record<string, string>>(
    () => Object.fromEntries(EPICS.map(e => [e.id, e.color]))
  )
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [pickerOpen, setPickerOpen] = useState<string | null>(null)

  // Local mutable issue store so edits persist within session
  const [issues, setIssues] = useState<Issue[]>([...ISSUES])

  // WorkItemDetail drawer
  const [detailKey, setDetailKey] = useState<string | null>(null)
  const detailIssue = detailKey ? issues.find(i => i.key === detailKey) : null
  const detailData = detailIssue ? issueToWID(detailIssue, issues) : null

  function handleUpdate(updated: WorkItemData) {
    setIssues(prev => prev.map(i => i.key === updated.key ? widToIssue(i, updated) : i))
  }

  return (
    <>
    <div style={{ padding: 32, maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
        <span style={{ fontSize: 22, fontWeight: 700, color: T.text1 }}>Épicos</span>
        <span style={{ fontSize: 13, color: T.text3, background: T.neutralDim, borderRadius: 20, padding: '2px 10px' }}>
          {EPICS.length} épicos
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {EPICS.map(epic => {
          const color = epicColors[epic.id] ?? epic.color
          const epicIssues = issues.filter(i => i.epic === epic.id)
          const done = epicIssues.filter(i => i.status === 'done').length
          const total = epicIssues.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const points = epicIssues.reduce((s, i) => s + i.points, 0)
          const assignees = [...new Set(epicIssues.map(i => i.assignee))]
          const isExpanded = expanded[epic.id]

          const statusCounts = Object.fromEntries(
            STATUSES.map(s => [s, epicIssues.filter(i => i.status === s).length])
          )

          return (
            <div key={epic.id} style={{
              background: T.bgSurface, border: `1px solid ${T.border}`,
              borderRadius: 12, overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              display: 'flex',
            }}>
              {/* Left color bar / color picker */}
              <div style={{ position: 'relative' }}>
                <div
                  onClick={() => setPickerOpen(pickerOpen === epic.id ? null : epic.id)}
                  style={{
                    width: 6, height: '100%', minHeight: 180, background: color,
                    cursor: 'pointer', transition: 'opacity 0.15s',
                  }}
                  title="Alterar cor"
                />
                {pickerOpen === epic.id && (
                  <div style={{
                    position: 'absolute', top: 8, left: 14, zIndex: 100,
                    background: T.bgSurface2, border: `1px solid ${T.border2}`,
                    borderRadius: 8, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
                    boxShadow: T.shadowModal,
                  }}>
                    {PRESET_COLORS.map(c => (
                      <div key={c} onClick={(e) => {
                        e.stopPropagation()
                        setEpicColors(prev => ({ ...prev, [epic.id]: c }))
                        setPickerOpen(null)
                      }} style={{
                        width: 20, height: 20, borderRadius: '50%', background: c,
                        cursor: 'pointer', border: c === color ? `2px solid ${T.text1}` : '2px solid transparent',
                      }} />
                    ))}
                  </div>
                )}
              </div>

              {/* Main content */}
              <div style={{ flex: 1, padding: '20px 24px' }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color, fontFamily: 'monospace', letterSpacing: 1 }}>
                    {epic.key}
                  </span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>{epic.label}</span>
                  <span style={{
                    fontSize: 11, color: T.text3, background: T.neutralDim,
                    borderRadius: 20, padding: '2px 10px', border: `1px solid ${T.border}`,
                  }}>{epic.quarter}</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Avatar initials={epic.owner} size={28} />
                  </div>
                </div>

                <p style={{ fontSize: 13, color: T.text2, margin: '0 0 16px', lineHeight: 1.5 }}>{epic.desc}</p>

                {/* Progress + stats row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <DonutRing pct={pct} color={color} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text1 }}>{done}/{total} issues</div>
                      <div style={{ fontSize: 11, color: T.text3 }}>concluídas</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {STATUSES.map(s => {
                      const cnt = statusCounts[s] ?? 0
                      const cfg = STATUS_CFG[s]
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.color, flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: cnt > 0 ? T.text2 : T.text3 }}>{cnt}</span>
                          <span style={{ fontSize: 11, color: T.text3 }}>{cfg.label}</span>
                        </div>
                      )
                    })}
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: T.text3 }}>Story points:</span>
                    <span style={{
                      fontSize: 12, fontWeight: 700, color, background: `${color}18`,
                      borderRadius: 6, padding: '2px 8px',
                    }}>{points}</span>
                  </div>
                </div>

                {/* Assignees */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
                  {assignees.slice(0, 6).map(a => <Avatar key={a} initials={a} size={24} />)}
                  {assignees.length > 6 && (
                    <span style={{ fontSize: 11, color: T.text3, marginLeft: 4 }}>+{assignees.length - 6}</span>
                  )}
                </div>

                {/* Expand button */}
                <button
                  onClick={() => setExpanded(prev => ({ ...prev, [epic.id]: !prev[epic.id] }))}
                  style={{
                    fontSize: 12, color, background: `${color}18`,
                    border: `1px solid ${color}40`, borderRadius: 6, padding: '5px 14px',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {isExpanded ? '▲ Ocultar issues' : `▼ Ver issues (${total})`}
                </button>

                {/* Expanded issue list */}
                {isExpanded && (
                  <div style={{ marginTop: 16, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                    {epicIssues.length === 0 ? (
                      <p style={{ fontSize: 13, color: T.text3 }}>Nenhuma issue neste épico.</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {epicIssues.map(issue => {
                          const ti = TYPE_ICON[issue.type]
                          const sc = STATUS_CFG[issue.status]
                          const isActive = detailKey === issue.key
                          return (
                            <div
                              key={issue.key}
                              role="button"
                              tabIndex={0}
                              onClick={() => setDetailKey(issue.key)}
                              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setDetailKey(issue.key) } }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                padding: '8px 10px', borderRadius: 8,
                                background: isActive ? `${color}14` : T.bgSurface2,
                                border: `1px solid ${isActive ? color + '60' : T.border}`,
                                cursor: 'pointer', transition: 'all 0.12s',
                                outline: 'none',
                              }}
                              onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = `${color}0A`; e.currentTarget.style.borderColor = `${color}40` }}
                              onMouseLeave={e => { e.currentTarget.style.background = isActive ? `${color}14` : T.bgSurface2; e.currentTarget.style.borderColor = isActive ? `${color}60` : T.border }}
                            >
                              <span style={{ color: ti.color, fontSize: 14, flexShrink: 0 }}>{ti.icon}</span>
                              <span style={{ fontSize: 11, color: T.text3, fontFamily: 'monospace', width: 62, flexShrink: 0 }}>{issue.key}</span>
                              <span style={{ fontSize: 13, color: T.text1, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {issue.title}
                              </span>
                              <span style={{
                                fontSize: 11, color: sc.color, background: sc.bg,
                                borderRadius: 20, padding: '2px 8px', flexShrink: 0,
                              }}>{sc.label}</span>
                              <Avatar initials={issue.assignee} size={22} />
                              <span style={{
                                fontSize: 11, color: T.text3, background: T.neutralDim,
                                borderRadius: 4, padding: '1px 6px', flexShrink: 0,
                              }}>{issue.points}pt</span>
                              {/* Open indicator */}
                              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.3, transition: 'opacity 0.12s' }}>
                                <path d="M4 2.5l3.5 3.5L4 9.5" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {/* Search to link existing issues */}
                    <IssueSearchDropdown
                      epicId={epic.id}
                      epicColor={color}
                      issues={issues}
                      onLink={key => setIssues(prev => prev.map(i => i.key === key ? { ...i, epic: epic.id } : i))}
                    />

                    {/* Add issue CTA */}
                    <button
                      onClick={e => { e.stopPropagation(); setEpicCreate(true) }}
                      style={{
                        marginTop: 12, fontSize: 12, color: T.text3,
                        background: 'transparent', border: `1px dashed ${T.border2}`,
                        borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
                        width: '100%', textAlign: 'left',
                      }}
                    >
                      + Criar issue neste épico
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>

    {/* WorkItemDetail drawer */}
    {detailData && (
      <WorkItemDetail
        data={detailData}
        mode="drawer"
        onUpdate={handleUpdate}
        onClose={() => setDetailKey(null)}
      />
    )}

    {epicCreate && <CreateIssueModal onClose={() => setEpicCreate(false)} onCreate={() => setEpicCreate(false)} />}
    </>
  )
}
