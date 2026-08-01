import { useState, useRef, useEffect } from 'react'

// ─── Data ─────────────────────────────────────────────────────────────────────
const MONTHS = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET']
const MONTH_W = 60
const TODAY_MONTH = 5.5 // mid-June

interface GRow {
  id:         string
  name:       string
  isProject?: boolean
  color:      string
  start:      number
  end:        number
  pct?:       number
  projectId:  string
}

interface GProject {
  id:    string
  name:  string
  short: string
  color: string
}

const PROJECTS: GProject[] = [
  { id: 'galpao',  name: 'Construção do Galpão Industrial', short: 'Galpão Industrial', color: '#4d82ff' },
  { id: 'erp',     name: 'Sistema ERP Corporativo',         short: 'ERP Corporativo',   color: '#7C3AED' },
  { id: 'reforma', name: 'Reforma da Sede Corporativa',     short: 'Reforma da Sede',   color: '#06C18A' },
]

const ALL_ROWS: GRow[] = [
  // ── Galpão Industrial ─────────────────────────────────────────────────────
  { id: 'galpao',  projectId: 'galpao',  name: 'Construção do Galpão Industrial', isProject: true,  color: '#4d82ff', start: 0,   end: 4.5, pct: 9  },
  { id: 'g1',      projectId: 'galpao',  name: 'Fundação e Estrutura',                               color: '#4d82ff', start: 0,   end: 3               },
  { id: 'g2',      projectId: 'galpao',  name: 'Instalações Elétricas',                              color: '#5a8eff', start: 0.1, end: 3.2             },
  { id: 'g3',      projectId: 'galpao',  name: 'Cobertura e Vedação',                                color: '#4d82ff', start: 3.8, end: 5.2             },
  { id: 'g4',      projectId: 'galpao',  name: 'Instalações Hidráulicas',                            color: '#6a9eff', start: 4,   end: 6               },
  { id: 'g5',      projectId: 'galpao',  name: 'Acabamentos e Entrega',                              color: '#324060', start: 5.5, end: 8               },
  // ── ERP Corporativo ───────────────────────────────────────────────────────
  { id: 'erp',     projectId: 'erp',     name: 'Sistema ERP Corporativo',         isProject: true,  color: '#7C3AED', start: 1,   end: 6.5, pct: 48 },
  { id: 'e1',      projectId: 'erp',     name: 'Levantamento de Requisitos',                         color: '#06C18A', start: 1,   end: 3               },
  { id: 'e2',      projectId: 'erp',     name: 'Desenvolvimento do Sistema',                         color: '#4d82ff', start: 2.5, end: 7               },
  { id: 'e3',      projectId: 'erp',     name: 'Testes e Homologação',                               color: '#324060', start: 5.5, end: 9               },
  // ── Reforma da Sede ───────────────────────────────────────────────────────
  { id: 'reforma', projectId: 'reforma', name: 'Reforma da Sede Corporativa',     isProject: true,  color: '#06C18A', start: 5,   end: 8.5, pct: 5  },
  { id: 'r1',      projectId: 'reforma', name: 'Projeto Arquitetônico',                              color: '#06C18A', start: 5,   end: 8               },
  { id: 'r2',      projectId: 'reforma', name: 'Obras Civis',                                        color: '#324060', start: 7,   end: 9               },
  { id: 'r3',      projectId: 'reforma', name: 'Mobiliário e Acabamentos',                           color: '#2a3550', start: 8,   end: 9               },
]

// ─── Gantt bar ────────────────────────────────────────────────────────────────
function GanttBar({ row }: { row: GRow }) {
  const left  = row.start * MONTH_W
  const width = Math.max((row.end - row.start) * MONTH_W, 4)
  return (
    <div
      className="absolute top-1/2 -translate-y-1/2 rounded flex items-center px-2 overflow-hidden"
      style={{
        left, width,
        height: row.isProject ? 24 : 16,
        background: row.color,
        opacity: row.color === '#324060' || row.color === '#2a3550' ? 0.6 : 1,
      }}
    >
      {row.pct !== undefined && width > 50 && (
        <span className="text-[10px] font-semibold text-white truncate">{row.pct}%</span>
      )}
    </div>
  )
}

// ─── Multi-select dropdown ────────────────────────────────────────────────────
interface ProjectDropdownProps {
  projects:  GProject[]
  selected:  Set<string>
  onChange:  (next: Set<string>) => void
}

function ProjectDropdown({ projects, selected, onChange }: ProjectDropdownProps) {
  const [open, setOpen]       = useState(false)
  const [search, setSearch]   = useState('')
  const containerRef          = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const allSelected = selected.size === projects.length
  const filtered    = projects.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  function toggleProject(id: string) {
    const next = new Set(selected)
    next.has(id) ? next.delete(id) : next.add(id)
    if (next.size === 0) return // always keep at least one
    onChange(next)
  }

  function toggleAll() {
    onChange(allSelected ? new Set([projects[0].id]) : new Set(projects.map(p => p.id)))
  }

  // Button label
  let triggerLabel: string
  if (allSelected) {
    triggerLabel = `Todos os projetos (${projects.length})`
  } else if (selected.size === 1) {
    triggerLabel = projects.find(p => selected.has(p.id))?.short ?? '1 projeto'
  } else {
    triggerLabel = `${selected.size} projetos`
  }

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '5px 12px', borderRadius: 8,
          background: open ? '#1e2d45' : '#111d30',
          border: `1px solid ${open ? '#2d4870' : '#1c2c45'}`,
          color: '#c8d4e8', fontSize: 12, cursor: 'pointer',
          transition: 'all 0.15s', whiteSpace: 'nowrap',
        }}
      >
        {/* Color dots for selected */}
        <div style={{ display: 'flex', gap: 3 }}>
          {projects.filter(p => selected.has(p.id)).map(p => (
            <span key={p.id} style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          ))}
        </div>
        <span>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s', color: '#546278' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 200,
          background: '#0d1829', border: '1px solid #1c2c45', borderRadius: 10,
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)', minWidth: 280, overflow: 'hidden',
        }}>
          {/* Search */}
          <div style={{ padding: '10px 12px', borderBottom: '1px solid #162032' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: '#0a1525', borderRadius: 7, border: '1px solid #1c2c45', padding: '5px 10px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color: '#546278', flexShrink: 0 }}>
                <circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/>
                <path d="M9 9l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
              </svg>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar projeto…"
                style={{ background: 'none', border: 'none', outline: 'none', color: '#c8d4e8', fontSize: 12, width: '100%' }}
              />
            </div>
          </div>

          {/* Todos toggle */}
          <div
            onClick={toggleAll}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 14px', cursor: 'pointer',
              borderBottom: '1px solid #162032',
              background: 'transparent',
              transition: 'background 0.1s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
          >
            <span style={{
              width: 14, height: 14, borderRadius: 4, flexShrink: 0,
              border: `1.5px solid ${allSelected ? '#4d82ff' : '#2d4060'}`,
              background: allSelected ? '#4d82ff' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {allSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span style={{ fontSize: 12, color: '#8a9ab8', fontWeight: 500 }}>Todos os projetos</span>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: '#3a4d65' }}>{projects.length}</span>
          </div>

          {/* Project list */}
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
            {filtered.length === 0 && (
              <div style={{ padding: '12px 14px', fontSize: 12, color: '#3a4d65', textAlign: 'center' }}>Nenhum projeto encontrado</div>
            )}
            {filtered.map(p => {
              const checked = selected.has(p.id)
              return (
                <div
                  key={p.id}
                  onClick={() => toggleProject(p.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 14px', cursor: 'pointer',
                    borderBottom: '1px solid #0d1525',
                    background: 'transparent', transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.03)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = 'transparent' }}
                >
                  <span style={{
                    width: 14, height: 14, borderRadius: 4, flexShrink: 0,
                    border: `1.5px solid ${checked ? p.color : '#2d4060'}`,
                    background: checked ? p.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {checked && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#c8d4e8', flex: 1 }}>{p.name}</span>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          {!allSelected && (
            <div style={{ padding: '8px 14px', borderTop: '1px solid #162032', display: 'flex', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { onChange(new Set(projects.map(p => p.id))); setOpen(false) }}
                style={{ fontSize: 11, color: '#4d82ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Limpar filtro — mostrar todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function GanttPage() {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(new Set())
  const [selectedProjects,  setSelectedProjects]  = useState<Set<string>>(new Set(PROJECTS.map(p => p.id)))

  function toggleProject(id: string) {
    setCollapsedProjects(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Filter rows by selected projects, then by collapse state
  const visibleRows = ALL_ROWS.filter(r =>
    selectedProjects.has(r.projectId) &&
    (r.isProject || !collapsedProjects.has(r.projectId))
  )

  const visibleProjects = PROJECTS.filter(p => selectedProjects.has(p.id))
  const totalW = MONTHS.length * MONTH_W

  return (
    <div className="flex flex-col h-full overflow-hidden" style={{ background: '#080f1c' }}>
      {/* Sub-header */}
      <div
        className="flex items-center justify-between px-5 py-3 flex-shrink-0 gap-4"
        style={{ borderBottom: '1px solid #162032' }}
      >
        {/* Left: legend */}
        <div className="flex items-center gap-4 flex-wrap">
          {visibleProjects.map(p => (
            <div key={p.id} className="flex items-center gap-1.5 text-[11px]" style={{ color: '#546278' }}>
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: p.color }} />
              {p.short}
            </div>
          ))}
        </div>

        {/* Right: controls */}
        <div className="flex items-center gap-4 flex-shrink-0">
          <ProjectDropdown
            projects={PROJECTS}
            selected={selectedProjects}
            onChange={setSelectedProjects}
          />
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: '#546278' }}>
            <span style={{ display: 'inline-block', width: 20, borderTop: '1px dashed #F0455A', opacity: 0.7 }} />
            Hoje (Jun 2025)
          </div>
        </div>
      </div>

      {/* Scrollable gantt body */}
      <div className="flex-1 overflow-auto">
        <div style={{ minWidth: 200 + totalW }}>
          {/* Month headers */}
          <div className="flex sticky top-0 z-10" style={{ background: '#0a1525', borderBottom: '1px solid #162032' }}>
            <div
              className="flex-shrink-0 flex items-center px-4 py-2.5"
              style={{ width: 200, borderRight: '1px solid #162032' }}
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#3a4d65' }}>
                Tarefa / Projeto
              </span>
            </div>
            <div className="flex relative" style={{ width: totalW }}>
              {MONTHS.map((m, i) => (
                <div
                  key={m}
                  className="flex-shrink-0 text-center py-2.5 text-[11px] font-semibold uppercase tracking-wider"
                  style={{ width: MONTH_W, color: i === 5 ? '#4d82ff' : '#3a4d65', borderRight: '1px solid #162032' }}
                >
                  {m}
                </div>
              ))}
            </div>
          </div>

          {/* Empty state */}
          {visibleRows.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#3a4d65', fontSize: 13 }}>
              Nenhum projeto selecionado
            </div>
          )}

          {/* Rows */}
          {visibleRows.map((row, i) => {
            const isProj = row.isProject
            const isCollapsed = isProj && collapsedProjects.has(row.id)

            return (
              <div
                key={row.id}
                className="flex items-center transition-colors"
                style={{
                  height: isProj ? 40 : 32,
                  borderBottom: '1px solid #0d1a2d',
                  background: isProj ? (i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent') : 'transparent',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = 'rgba(255,255,255,0.025)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = isProj ? (i % 2 === 0 ? 'rgba(255,255,255,0.015)' : 'transparent') : 'transparent' }}
              >
                {/* Label */}
                <div
                  className="flex-shrink-0 flex items-center gap-2 px-4"
                  style={{ width: 200, borderRight: '1px solid #162032', height: '100%' }}
                >
                  {isProj ? (
                    <>
                      <button
                        onClick={() => toggleProject(row.id)}
                        className="w-4 h-4 flex items-center justify-center flex-shrink-0 transition-transform"
                        style={{ color: '#3a4d65', transform: isCollapsed ? 'rotate(0deg)' : 'rotate(90deg)' }}
                        aria-label={isCollapsed ? 'Expandir' : 'Ocultar'}
                      >
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M2 1.5L5.5 4L2 6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: row.color }} />
                      <span className="text-xs font-semibold truncate" style={{ color: '#c8d4e8' }}>{row.name}</span>
                    </>
                  ) : (
                    <>
                      <span className="flex-shrink-0" style={{ width: 16 }} />
                      <span className="w-1 h-1 rounded-full flex-shrink-0 ml-2" style={{ background: row.color, opacity: 0.6 }} />
                      <span className="text-xs truncate ml-1" style={{ color: '#546278' }}>{row.name}</span>
                    </>
                  )}
                </div>

                {/* Bar area */}
                <div className="relative flex-1" style={{ height: '100%', width: totalW }}>
                  {MONTHS.map((_, mi) => (
                    <div
                      key={mi}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: mi * MONTH_W, width: MONTH_W,
                        borderRight: '1px solid #0d1a2d',
                        background: mi === 5 ? 'rgba(77,130,255,0.03)' : 'transparent',
                      }}
                    />
                  ))}
                  <div
                    className="absolute top-0 bottom-0 z-10"
                    style={{ left: TODAY_MONTH * MONTH_W, width: 1, background: '#F0455A', opacity: 0.8 }}
                  />
                  <GanttBar row={row} />
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
