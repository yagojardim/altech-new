import { useState, useRef, useEffect, useCallback } from 'react'
import { T } from '../components/ds/tokens'
import { ISSUES, EPICS, STATUS_CFG, AV_COLOR, DEPENDENCIES, type Issue } from '../data/issues'

const DAY_PX = 28
const ROW_H  = 52
const TOTAL_DAYS = 30
const TODAY_DAY  = 15

const SPRINT_MARKERS = [
  { day: 1,  label: 'Sprint 13' },
  { day: 14, label: 'Sprint 14' },
  { day: 28, label: 'Sprint 15' },
]
const WEEK_MARKERS = [
  { day: 1,  label: 'W14' },
  { day: 7,  label: 'W15' },
  { day: 14, label: 'W16' },
  { day: 21, label: 'W17' },
  { day: 28, label: 'W18' },
]

interface BarState { startDay: number; endDay: number }

function initBarStates(): Record<string, BarState> {
  const result: Record<string, BarState> = {}
  ISSUES.forEach(issue => {
    const pts    = Math.max(1, issue.points)
    const endDay = Math.min(TOTAL_DAYS, Math.max(1, issue.dueDateDay))
    result[issue.key] = { startDay: Math.max(1, endDay - pts), endDay }
  })
  return result
}

function issueBarColor(issue: Issue): string {
  if (issue.blocked) return T.crit
  return STATUS_CFG[issue.status].color
}

function barLeft(startDay: number)                            { return (startDay - 1) * DAY_PX }
function barWidth(startDay: number, endDay: number)           { return Math.max(DAY_PX, (endDay - startDay) * DAY_PX) }

// ─── Project multi-select dropdown ───────────────────────────────────────────
interface EpicOption { id: string; label: string; color: string }

function ProjectDropdown({
  options, selected, onChange,
}: { options: EpicOption[]; selected: Set<string>; onChange: (s: Set<string>) => void }) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const allSelected = selected.size === options.length
  const filtered    = options.filter(o => o.label.toLowerCase().includes(search.toLowerCase()))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) {
      if (next.size === 1) return // keep at least one
      next.delete(id)
    } else {
      next.add(id)
    }
    onChange(next)
  }

  function toggleAll() {
    onChange(allSelected ? new Set([options[0].id]) : new Set(options.map(o => o.id)))
  }

  const label = allSelected
    ? `Todos (${options.length})`
    : selected.size === 1
      ? (options.find(o => selected.has(o.id))?.label ?? '1 projeto')
      : `${selected.size} projetos`

  const chkSt = (checked: boolean, color: string): React.CSSProperties => ({
    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
    border: `1.5px solid ${checked ? color : T.border2}`,
    background: checked ? color : 'transparent',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  })

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '5px 11px', borderRadius: 8, cursor: 'pointer',
          background: open ? T.bgSurface2 : T.bgPage,
          border: `1px solid ${open ? T.accent : T.border}`,
          color: T.text2, fontSize: 12, transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
      >
        <div style={{ display: 'flex', gap: 3 }}>
          {options.filter(o => selected.has(o.id)).map(o => (
            <span key={o.id} style={{ width: 7, height: 7, borderRadius: 2, background: o.color }} />
          ))}
        </div>
        <span>{label}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: T.text3 }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 300,
          background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10,
          boxShadow: T.shadowModal, minWidth: 260, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '9px 11px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: T.bgPage, borderRadius: 7, border: `1px solid ${T.border}`, padding: '5px 9px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: T.text3 }}>
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M9 9l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input autoFocus value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Buscar épico / projeto…"
                style={{ background: 'none', border: 'none', outline: 'none', color: T.text1, fontSize: 12, width: '100%' }} />
            </div>
          </div>

          {/* All toggle */}
          <div onClick={toggleAll}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
            <span style={chkSt(allSelected, T.accent)}>
              {allSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span style={{ fontSize: 12, color: T.text2, fontWeight: 500 }}>Todos os projetos</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: T.text3 }}>{options.length}</span>
          </div>

          {/* Options */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.map(o => {
              const checked = selected.has(o.id)
              return (
                <div key={o.id} onClick={() => toggle(o.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 13px', cursor: 'pointer', borderBottom: `1px solid ${T.border}` }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = T.bgSurface2 }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}>
                  <span style={chkSt(checked, o.color)}>
                    {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: o.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: T.text1, flex: 1 }}>{o.label}</span>
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: '12px 13px', fontSize: 12, color: T.text3, textAlign: 'center' }}>Nenhum resultado</div>
            )}
          </div>

          {!allSelected && (
            <div style={{ padding: '8px 13px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => { onChange(new Set(options.map(o => o.id))); setOpen(false) }}
                style={{ fontSize: 11, color: T.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                Limpar — mostrar todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function TimelinePage() {
  const [bars, setBars]       = useState<Record<string, BarState>>(initBarStates)
  const [dragging, setDragging] = useState<{ key: string; startX: number; origStart: number; origEnd: number } | null>(null)
  const [hovered, setHovered] = useState<string | null>(null)
  const [selectedEpics, setSelectedEpics] = useState<Set<string>>(new Set(EPICS.map(e => e.id)))

  // Build filtered groups from selected epics
  const allGroups = (() => {
    const result: { epicId: string | null; label: string; color: string; issues: Issue[] }[] = []
    EPICS.forEach(epic => {
      if (!selectedEpics.has(epic.id)) return
      const issues = ISSUES.filter(i => i.epic === epic.id)
      result.push({ epicId: epic.id, label: epic.label, color: epic.color, issues })
    })
    const noEpic = ISSUES.filter(i => !i.epic)
    if (noEpic.length > 0 && selectedEpics.has('__none__')) {
      result.push({ epicId: null, label: 'Sem épico', color: T.text3, issues: noEpic })
    }
    return result
  })()

  const epicOptions: EpicOption[] = EPICS.map(e => ({ id: e.id, label: e.label, color: e.color }))

  // Row map: computed from filtered groups — reacts to filter changes.
  // Also tracks each group's header row index.
  const { rowMap, groupHeaderRows } = (() => {
    const map: Record<string, number> = {}
    const headers: Record<string, number> = {}  // epicId (or '__none__') → row index
    let row = 0
    allGroups.forEach(group => {
      headers[group.epicId ?? '__none__'] = row
      row++ // group header row
      group.issues.forEach(issue => { map[issue.key] = row; row++ })
    })
    return { rowMap: map, groupHeaderRows: headers }
  })()

  const totalAbsRows = allGroups.reduce((s, g) => s + g.issues.length + 1, 0)
  const svgH         = totalAbsRows * ROW_H

  // Dependency curves — fully derived from bars + rowMap; recomputes on every drag
  const curves = DEPENDENCIES.map(dep => {
    const fromBar     = bars[dep.from]
    const toBar       = bars[dep.to]
    const fromAbsRow  = rowMap[dep.from]
    const toAbsRow    = rowMap[dep.to]
    if (!fromBar || !toBar || fromAbsRow == null || toAbsRow == null) return null

    const x1 = barLeft(fromBar.endDay) + barWidth(fromBar.startDay, fromBar.endDay)
    const x2 = barLeft(toBar.startDay)
    const y1 = fromAbsRow * ROW_H + ROW_H / 2
    const y2 = toAbsRow   * ROW_H + ROW_H / 2
    const cx = (x1 + x2) / 2

    return { key: `${dep.from}-${dep.to}`, x1, y1, x2, y2, cx }
  }).filter(Boolean) as { key: string; x1: number; y1: number; x2: number; y2: number; cx: number }[]

  const onMouseDown = useCallback((e: React.MouseEvent, issueKey: string) => {
    e.preventDefault()
    const bar = bars[issueKey]
    if (!bar) return
    setDragging({ key: issueKey, startX: e.clientX, origStart: bar.startDay, origEnd: bar.endDay })
  }, [bars])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return
    const dx       = e.clientX - dragging.startX
    const dayDelta = Math.round(dx / DAY_PX)
    if (dayDelta === 0) return
    const duration = dragging.origEnd - dragging.origStart
    let newStart   = Math.max(1, Math.min(TOTAL_DAYS - duration, dragging.origStart + dayDelta))
    setBars(prev => ({ ...prev, [dragging.key]: { startDay: newStart, endDay: newStart + duration } }))
  }, [dragging])

  const onMouseUp = useCallback(() => setDragging(null), [])

  const gridW = TOTAL_DAYS * DAY_PX

  return (
    <div style={{ background: T.bgPage, height: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'inherit', overflow: 'hidden' }}>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 20px', borderBottom: `1px solid ${T.border}`, background: T.bgSurface, flexShrink: 0 }}>
        <span style={{ color: T.text1, fontWeight: 700, fontSize: 15 }}>Roadmap — Abril 2025</span>
        <span style={{ color: T.text3, fontSize: 12 }}>Arraste as barras para reposicionar</span>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Legend — only visible epics */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {epicOptions.filter(o => selectedEpics.has(o.id)).map(o => (
              <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: o.color, display: 'inline-block' }} />
                <span style={{ color: T.text3, fontSize: 11 }}>{o.label}</span>
              </div>
            ))}
          </div>

          {/* Status legend */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', borderLeft: `1px solid ${T.border}`, paddingLeft: 12 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: T.accent, display: 'inline-block' }} />
            <span style={{ color: T.text3, fontSize: 11 }}>Em andamento</span>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: T.success, display: 'inline-block', marginLeft: 4 }} />
            <span style={{ color: T.text3, fontSize: 11 }}>Concluído</span>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: T.crit, display: 'inline-block', marginLeft: 4 }} />
            <span style={{ color: T.text3, fontSize: 11 }}>Bloqueado</span>
          </div>

          {/* Project dropdown */}
          <ProjectDropdown options={epicOptions} selected={selectedEpics} onChange={setSelectedEpics} />
        </div>
      </div>

      {/* Body */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Sidebar */}
        <div style={{ width: 180, flexShrink: 0, borderRight: `1px solid ${T.border}`, background: T.bgSurface, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ height: 48, borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', padding: '0 12px', flexShrink: 0 }}>
            <span style={{ color: T.text3, fontSize: 11, fontWeight: 700 }}>ÉPICO / ISSUE</span>
          </div>
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {allGroups.map(group => (
              <div key={group.epicId ?? 'none'}>
                <div style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${T.border}`, background: T.bgSurface2, flexShrink: 0 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: group.color, flexShrink: 0, marginRight: 7 }} />
                  <span style={{ color: group.color, fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.label}</span>
                </div>
                {group.issues.map(issue => (
                  <div key={issue.key} style={{ height: ROW_H, display: 'flex', alignItems: 'center', padding: '0 12px', borderBottom: `1px solid ${T.border}`, background: hovered === issue.key ? T.bgSurface2 : T.bgSurface }}
                    onMouseEnter={() => setHovered(issue.key)} onMouseLeave={() => setHovered(null)}>
                    <span style={{ color: T.accent, fontSize: 10, fontWeight: 700, marginRight: 5, flexShrink: 0 }}>{issue.key}</span>
                    <span style={{ color: T.text2, fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={issue.title}>{issue.title}</span>
                  </div>
                ))}
              </div>
            ))}
            {allGroups.length === 0 && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 120, color: T.text3, fontSize: 12 }}>
                Nenhum épico selecionado
              </div>
            )}
          </div>
        </div>

        {/* Timeline grid — single scroll container for bars + SVG overlay */}
        <div style={{ flex: 1, overflowX: 'auto', overflowY: 'auto', position: 'relative' }}>
          <div
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            style={{ width: gridW, minWidth: gridW, position: 'relative', userSelect: 'none' }}
          >
            {/* Time axis header */}
            <div style={{ height: 48, borderBottom: `1px solid ${T.border}`, position: 'relative', background: T.bgSurface, flexShrink: 0 }}>
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(day => (
                <div key={day} style={{ position: 'absolute', left: (day - 1) * DAY_PX, top: 0, width: DAY_PX, height: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', paddingBottom: 4 }}>
                  <span style={{ fontSize: 9, color: day === TODAY_DAY ? T.accent : T.text3, fontWeight: day === TODAY_DAY ? 700 : 400 }}>{day}</span>
                </div>
              ))}
              {WEEK_MARKERS.map(w => (
                <div key={w.label} style={{ position: 'absolute', left: (w.day - 1) * DAY_PX, top: 4, fontSize: 10, color: T.text2, fontWeight: 700, paddingLeft: 3 }}>{w.label}</div>
              ))}
            </div>

            {/* Grid + bars + SVG overlay in a single positioned container */}
            <div style={{ position: 'relative', height: svgH }}>

              {/* Vertical grid lines */}
              {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map(day => (
                <div key={day} style={{ position: 'absolute', left: (day - 1) * DAY_PX, top: 0, bottom: 0, width: 1, background: day === TODAY_DAY ? T.accent : T.border, opacity: day === TODAY_DAY ? 0.8 : 0.4, zIndex: day === TODAY_DAY ? 3 : 1 }} />
              ))}

              {/* Sprint markers */}
              {SPRINT_MARKERS.map(sm => (
                <div key={sm.label} style={{ position: 'absolute', left: (sm.day - 1) * DAY_PX, top: 0, bottom: 0, width: 1, zIndex: 2 }}>
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, borderLeft: `1.5px dashed ${T.accent}`, opacity: 0.4 }} />
                  <div style={{ position: 'absolute', top: 4, left: 3, fontSize: 9, color: T.accent, background: T.bgPage, padding: '0 3px', borderRadius: 2, fontWeight: 700, opacity: 0.8, whiteSpace: 'nowrap' }}>{sm.label}</div>
                </div>
              ))}

              {/* Today marker */}
              <div style={{ position: 'absolute', left: (TODAY_DAY - 1) * DAY_PX, top: 0, bottom: 0, width: 2, background: T.accent, opacity: 0.7, zIndex: 4 }} />

              {/* Horizontal row stripes */}
              {Array.from({ length: totalAbsRows }, (_, i) => i).map(row => (
                <div key={row} style={{ position: 'absolute', left: 0, right: 0, top: row * ROW_H, height: ROW_H, borderBottom: `1px solid ${T.border}`, background: row % 2 === 0 ? 'transparent' : `${T.bgSurface}44` }} />
              ))}

              {/* Issue bars — positioned using rowMap for correct index after filtering */}
              {allGroups.map(group => (
                <div key={group.epicId ?? 'none'}>
                  {/* Group header row (shaded, no bar) */}
                  <div style={{ position: 'absolute', top: (groupHeaderRows[group.epicId ?? '__none__'] ?? 0) * ROW_H, left: 0, right: 0, height: ROW_H, background: T.bgSurface2, borderBottom: `1px solid ${T.border}` }} />

                  {group.issues.map(issue => {
                    const rowAbs = rowMap[issue.key]
                    const bar    = bars[issue.key]
                    if (bar == null || rowAbs == null) return null
                    const color     = issueBarColor(issue)
                    const left      = barLeft(bar.startDay)
                    const width     = barWidth(bar.startDay, bar.endDay)
                    const isDragging = dragging?.key === issue.key
                    const isHov     = hovered === issue.key

                    return (
                      <div
                        key={issue.key}
                        onMouseDown={e => onMouseDown(e, issue.key)}
                        onMouseEnter={() => setHovered(issue.key)}
                        onMouseLeave={() => setHovered(null)}
                        style={{
                          position: 'absolute',
                          top: rowAbs * ROW_H + 10,
                          left, width,
                          height: ROW_H - 20,
                          background: `${color}28`,
                          border: `1.5px solid ${color}`,
                          borderRadius: 5,
                          cursor: 'grab',
                          display: 'flex', alignItems: 'center', padding: '0 6px', gap: 4, overflow: 'hidden',
                          zIndex: isDragging ? 10 : 2,
                          boxShadow: isDragging ? T.shadowModal : isHov ? '0 4px 18px rgba(0,0,0,0.4)' : 'none',
                          transform: isDragging ? 'scale(1.02)' : 'none',
                          transition: isDragging ? 'none' : 'box-shadow 0.15s, transform 0.15s',
                        }}
                      >
                        <span style={{ fontSize: 9, fontWeight: 700, color, flexShrink: 0 }}>{issue.key}</span>
                        {width > 60 && (
                          <span style={{ fontSize: 9, color: T.text2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                            {issue.title.slice(0, 18)}{issue.title.length > 18 ? '…' : ''}
                          </span>
                        )}
                        {width > 90 && (
                          <span style={{ fontSize: 8, fontWeight: 700, background: AV_COLOR[issue.assignee] ?? T.text3, color: '#fff', borderRadius: '50%', width: 14, height: 14, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            {issue.assignee[0]}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}

              {/* SVG dependency overlay — inside same positioned container as bars,
                  so coordinates are always relative to the same origin.
                  Recomputes on every render (bar drag state changes → new curves). */}
              <svg
                style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}
                width={gridW}
                height={svgH}
              >
                <defs>
                  <marker id="dep-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                    <path d="M0,0 L0,6 L6,3 z" fill={T.accent} opacity={0.6} />
                  </marker>
                </defs>
                {curves.map(c => {
                  const { key, x1, y1, x2, y2, cx } = c
                  return (
                    <path
                      key={key}
                      d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                      stroke={T.accent}
                      strokeWidth={1.5}
                      strokeDasharray="4 3"
                      fill="none"
                      opacity={0.45}
                      markerEnd="url(#dep-arrow)"
                    />
                  )
                })}
              </svg>

            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
