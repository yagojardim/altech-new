import { useState, useRef, useEffect } from 'react'
import { Avatar } from '../components/ds/Avatar'
import { WorkItemDetail, type WorkItemData } from '../components/WorkItemDetail'

// ─── Color helpers ────────────────────────────────────────────────────────────
const STATUS = {
  healthy:  { color: '#06C18A', tint: 'rgba(6,193,138,0.12)',  border: 'rgba(6,193,138,0.3)',  label: 'Saudável'   },
  'at-risk':{ color: '#F5A524', tint: 'rgba(245,165,36,0.12)', border: 'rgba(245,165,36,0.3)', label: 'Em risco'   },
  blocked:  { color: '#F0455A', tint: 'rgba(240,69,90,0.12)',  border: 'rgba(240,69,90,0.3)',  label: 'Bloqueado'  },
}
const DELIVERY_STATUS = {
  'in-progress': { color: '#4d82ff', tint: 'rgba(77,130,255,0.12)', label: 'Em andamento' },
  'in-review':   { color: '#F5A524', tint: 'rgba(245,165,36,0.12)', label: 'Em revisão'   },
  done:          { color: '#06C18A', tint: 'rgba(6,193,138,0.12)',  label: 'Concluído'    },
  blocked:       { color: '#F0455A', tint: 'rgba(240,69,90,0.12)',  label: 'Bloqueado'    },
  backlog:       { color: '#546278', tint: 'rgba(84,98,120,0.15)',  label: 'Backlog'      },
}

// ─── Mock data (project-aware) ────────────────────────────────────────────────
interface HealthProject {
  id: string; name: string; squad: string
  status: keyof typeof STATUS; reason: string; progress: number; daysLeft: number
  sprintPct: number; sprintLabel: string
}

const HEALTH_PROJECTS: HealthProject[] = [
  { id:'p1', name:'Payments API v3',         squad:'squad-payments', status:'healthy',  reason:'No prazo — 3 dias adiantado',         progress:72, daysLeft: 7, sprintPct:72, sprintLabel:'Sprint 14' },
  { id:'p2', name:'Mobile App Rebrand',      squad:'squad-mobile',   status:'at-risk',  reason:'Sign-off do design atrasado 4 dias',  progress:48, daysLeft: 3, sprintPct:48, sprintLabel:'Sprint 14' },
  { id:'p3', name:'Data Pipeline Migration', squad:'squad-data',     status:'blocked',  reason:'Aguardando credenciais de infra',      progress:31, daysLeft:-1, sprintPct:31, sprintLabel:'Sprint 14' },
]

interface Blocker {
  id: string; title: string; owner: string; days: number
  level: 'blocked' | 'at-risk'; projectId: string
}

const BLOCKERS: Blocker[] = [
  { id:'PM-142', title:'Credenciais de produção ausentes (OAuth2)',  owner:'Rafael Mendes',  days:3, level:'blocked',  projectId:'p1' },
  { id:'PM-089', title:'Aprovação legal do contrato de API externa', owner:'Juliana Neves',  days:5, level:'blocked',  projectId:'p3' },
  { id:'PM-201', title:'Sign-off do design da tela de onboarding',   owner:'Carla Souza',    days:2, level:'at-risk',  projectId:'p2' },
  { id:'PM-178', title:'Acesso ao ambiente de staging negado',        owner:'Lucas Ferreira', days:1, level:'at-risk',  projectId:'p3' },
]

interface Delivery {
  id: string; title: string; due: string; assignee: string
  status: keyof typeof DELIVERY_STATUS; projectId: string
}

const DELIVERIES: Delivery[] = [
  { id:'PM-210', title:'Fluxo de autenticação OAuth2',     due:'24 jul', assignee:'Ana Lima',       status:'in-progress', projectId:'p1' },
  { id:'PM-211', title:'API de métricas executivas',       due:'25 jul', assignee:'Lucas Ferreira', status:'in-review',   projectId:'p1' },
  { id:'PM-212', title:'Componentes do design system v1',  due:'26 jul', assignee:'Carla Souza',    status:'done',        projectId:'p2' },
  { id:'PM-213', title:'Gateway de pagamento — fallback',  due:'28 jul', assignee:'Rafael Mendes',  status:'blocked',     projectId:'p1' },
  { id:'PM-214', title:'Dashboard do cliente (read-only)', due:'28 jul', assignee:'Beatriz Costa',  status:'backlog',     projectId:'p3' },
]

// ─── WorkItemData mappers ─────────────────────────────────────────────────────
function blockerToWID(b: Blocker, p: HealthProject | undefined): WorkItemData {
  return {
    key:             b.id,
    type:            'bug',
    title:           b.title,
    status:          b.level === 'blocked' ? 'blocked' : 'in-progress',
    priority:        b.level === 'blocked' ? 'critical' : 'high',
    labels:          [b.level === 'blocked' ? 'bloqueio' : 'risco'],
    assigneeInitials:b.owner.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase(),
    assigneeName:    b.owner,
    blocked:         b.level === 'blocked',
    blockedReason:   (b as { reason?: string }).reason ?? `Bloqueado há ${b.days}d`,
    description:     `Impedimento ativo no projeto ${p?.name ?? ''}. Responsável: ${b.owner}. Em aberto há ${b.days} dia(s).`,
    comments: [], history: [],
  }
}

function deliveryToWID(d: Delivery, p: HealthProject | undefined): WorkItemData {
  return {
    key:             d.id,
    type:            'story',
    title:           d.title,
    status:          d.status,
    priority:        d.status === 'blocked' ? 'high' : 'medium',
    labels:          ['entrega'],
    assigneeInitials:d.assignee.split(' ').slice(0,2).map(s=>s[0]).join('').toUpperCase(),
    assigneeName:    d.assignee,
    dueDate:         d.due,
    description:     `Entrega imediata do projeto ${p?.name ?? ''}. Prazo: ${d.due}. Responsável: ${d.assignee}.`,
    blocked:         d.status === 'blocked',
    comments: [], history: [],
  }
}

// ─── Project multi-select dropdown ───────────────────────────────────────────
interface ProjectOption { id: string; name: string; color: string }

function ProjectDropdown({ options, selected, onChange }: {
  options: ProjectOption[]; selected: Set<string>; onChange: (s: Set<string>) => void
}) {
  const [open, setOpen]     = useState(false)
  const [search, setSearch] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [open])

  const allSelected = selected.size === options.length
  const filtered    = options.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))

  function toggle(id: string) {
    const next = new Set(selected)
    if (next.has(id)) { if (next.size === 1) return; next.delete(id) } else { next.add(id) }
    onChange(next)
  }

  const triggerLabel = allSelected
    ? `Todos (${options.length})`
    : selected.size === 1 ? (options.find(o => selected.has(o.id))?.name ?? '1 projeto')
    : `${selected.size} projetos`

  const S: React.CSSProperties = { background: 'var(--bg-surface,#111d33)', border: '1px solid var(--border-subtle,#1c2c45)' }
  const chk = (on: boolean, c: string): React.CSSProperties => ({ width:14, height:14, borderRadius:4, flexShrink:0, border:`1.5px solid ${on?c:'#2d4060'}`, background:on?c:'transparent', display:'flex', alignItems:'center', justifyContent:'center' })

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(v=>!v)} style={{ display:'flex', alignItems:'center', gap:7, padding:'5px 12px', borderRadius:8, cursor:'pointer', ...S, color:'var(--text-secondary,#8a9ab8)', fontSize:12, transition:'all 0.15s', whiteSpace:'nowrap' }}>
        <div style={{ display:'flex', gap:3 }}>
          {options.filter(o=>selected.has(o.id)).map(o=><span key={o.id} style={{ width:7,height:7,borderRadius:2,background:o.color }} />)}
        </div>
        <span>{triggerLabel}</span>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ transform:open?'rotate(180deg)':'none', transition:'transform 0.15s', color:'#546278' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 6px)', right:0, zIndex:300, background:'var(--bg-surface,#111d33)', border:'1px solid var(--border-subtle,#1c2c45)', borderRadius:10, boxShadow:'0 12px 40px rgba(0,0,0,0.5)', minWidth:280, overflow:'hidden' }}>
          <div style={{ padding:'9px 11px', borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:7, background:'rgba(0,0,0,0.3)', borderRadius:7, border:'1px solid #1c2c45', padding:'5px 9px' }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ color:'#546278' }}><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M9 9l1.5 1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              <input autoFocus value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar projeto…" style={{ background:'none', border:'none', outline:'none', color:'var(--text-primary,#e8ecf4)', fontSize:12, width:'100%' }} />
            </div>
          </div>

          <div onClick={() => onChange(allSelected ? new Set([options[0].id]) : new Set(options.map(o=>o.id)))}
            style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', cursor:'pointer', borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}
            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
            <span style={chk(allSelected,'#4d82ff')}>
              {allSelected && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            </span>
            <span style={{ fontSize:12, color:'var(--text-secondary,#8a9ab8)', fontWeight:500 }}>Todos os projetos</span>
            <span style={{ marginLeft:'auto', fontSize:11, color:'#546278' }}>{options.length}</span>
          </div>

          <div style={{ maxHeight:220, overflowY:'auto' }}>
            {filtered.map(o => {
              const on = selected.has(o.id)
              return (
                <div key={o.id} onClick={()=>toggle(o.id)}
                  style={{ display:'flex', alignItems:'center', gap:9, padding:'9px 13px', cursor:'pointer', borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.03)'}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                  <span style={chk(on,o.color)}>
                    {on && <svg width="8" height="8" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.5 6L6.5 2" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </span>
                  <span style={{ width:8,height:8,borderRadius:2,background:o.color,flexShrink:0 }} />
                  <span style={{ fontSize:12, color:'var(--text-primary,#e8ecf4)', flex:1 }}>{o.name}</span>
                </div>
              )
            })}
            {filtered.length===0 && <div style={{ padding:'12px 13px', fontSize:12, color:'#546278', textAlign:'center' }}>Nenhum resultado</div>}
          </div>

          {!allSelected && (
            <div style={{ padding:'8px 13px', borderTop:'1px solid var(--border-subtle,#1c2c45)', display:'flex', justifyContent:'flex-end' }}>
              <button onClick={()=>{onChange(new Set(options.map(o=>o.id)));setOpen(false)}} style={{ fontSize:11, color:'#4d82ff', background:'none', border:'none', cursor:'pointer' }}>
                Limpar — mostrar todos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function Pill({ children, color, tint, border }: { children: React.ReactNode; color:string; tint:string; border:string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ color, background:tint, border:`1px solid ${border}` }}>
      {children}
    </span>
  )
}

function SmallDonut({ pct, color, size=48 }: { pct:number; color:string; size?:number }) {
  const r=14, cx=size/2, cy=size/2, sw=4, circ=2*Math.PI*r
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={sw}/>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(pct/100)*circ} ${circ-(pct/100)*circ}`}
        strokeLinecap="round" transform={`rotate(-90 ${cx} ${cy})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle" fontSize="9" fontWeight="700" fill="#e8ecf4">{pct}%</text>
    </svg>
  )
}

function Sparkline() {
  const points=[12,18,22,31,38,45,52,67], max=67, W=140, H=40
  const coords=points.map((v,i)=>[(i/(points.length-1)*W).toFixed(1),(H-(v/max)*H).toFixed(1)])
  const linePath=coords.map(([x,y],i)=>`${i===0?'M':'L'}${x},${y}`).join('')
  const [lx,ly]=coords[coords.length-1]
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none">
      <defs><linearGradient id="spark-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#4d82ff" stopOpacity="0.25"/><stop offset="100%" stopColor="#4d82ff" stopOpacity="0"/></linearGradient></defs>
      <path d={`${linePath}L${W},${H}L0,${H}Z`} fill="url(#spark-g)"/>
      <path d={linePath} stroke="#4d82ff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx={lx} cy={ly} r="3.5" fill="#4d82ff"/>
      <circle cx={lx} cy={ly} r="5.5" fill="#4d82ff" fillOpacity="0.2"/>
    </svg>
  )
}

function Section({ title, action, children }: { title:React.ReactNode; action?:React.ReactNode; children:React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background:'var(--bg-surface,#111d33)', border:'1px solid var(--border-subtle,#1c2c45)' }}>
      <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}>
        {title}{action}
      </div>
      {children}
    </div>
  )
}

// ─── Health card ──────────────────────────────────────────────────────────────
function HealthCard({ p, onNav }: { p:HealthProject; onNav:(v:string)=>void }) {
  const s = STATUS[p.status]
  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl min-w-0" style={{ background:'var(--bg-surface,#111d33)', borderTop:`1px solid var(--border-subtle,#1c2c45)`, borderRight:`1px solid var(--border-subtle,#1c2c45)`, borderBottom:`1px solid var(--border-subtle,#1c2c45)`, borderLeft:`3px solid ${s.color}` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-mono mb-1" style={{ color:'var(--text-muted,#546278)' }}>{p.squad}</p>
          <p className="text-sm font-semibold leading-tight truncate" style={{ color:'var(--text-primary,#e8ecf4)' }}>{p.name}</p>
        </div>
        <Pill color={s.color} tint={s.tint} border={s.border}>
          <span className="w-1.5 h-1.5 rounded-full" style={{ background:s.color }} />{s.label}
        </Pill>
      </div>
      <p className="text-xs px-3 py-1.5 rounded-lg" style={{ color:s.color, background:s.tint, border:`1px solid ${s.border}` }}>{p.reason}</p>
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[10px]" style={{ color:'var(--text-muted,#546278)' }}>Progresso</span>
          <span className="text-[10px] font-semibold" style={{ color:'var(--text-secondary,#8a9ab8)' }}>{p.progress}%</span>
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--border-subtle,#1c2c45)' }}>
          <div className="h-full rounded-full" style={{ width:`${p.progress}%`, background:s.color }}/>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px]" style={{ color:'var(--text-muted,#546278)' }}>
          {p.daysLeft>0?`${p.daysLeft} dias restantes`:`${Math.abs(p.daysLeft)} dia(s) atrasado`}
        </span>
        <button className="text-xs transition-opacity hover:opacity-70" style={{ color:'var(--primary,#4d82ff)' }}
          onClick={() => onNav('project')}>
          Ver projeto →
        </button>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function DashboardPage({ onNav }: { onNav?: (v:string)=>void }) {
  const projectOptions: ProjectOption[] = HEALTH_PROJECTS.map(p => ({
    id:    p.id,
    name:  p.name,
    color: STATUS[p.status].color,
  }))

  const [selected, setSelected] = useState<Set<string>>(new Set(HEALTH_PROJECTS.map(p=>p.id)))
  const [openItem, setOpenItem] = useState<WorkItemData | null>(null)

  const visProjects  = HEALTH_PROJECTS.filter(p => selected.has(p.id))
  const visBlockers  = BLOCKERS.filter(b  => selected.has(b.projectId))
  const visDeliveries= DELIVERIES.filter(d => selected.has(d.projectId))

  // Consolidated progress
  const consolidatedPct = visProjects.length
    ? Math.round(visProjects.reduce((s,p)=>s+p.progress,0)/visProjects.length)
    : 0

  function openWID(item: WorkItemData) { setOpenItem(item) }

  return (
    <div className="p-5 space-y-5 overflow-y-auto h-full" style={{ maxWidth:1280, margin:'0 auto' }}>
      {/* WorkItemDetail drawer */}
      {openItem && (
        <WorkItemDetail
          data={openItem}
          mode="drawer"
          onUpdate={updated => setOpenItem(updated)}
          onClose={() => setOpenItem(null)}
        />
      )}

      {/* Page title + filter */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold tracking-tight" style={{ color:'var(--text-primary,#e8ecf4)' }}>Dashboard executivo</h1>
          <p className="text-xs mt-0.5" style={{ color:'var(--text-muted,#546278)' }}>
            Visão geral de saúde · Sprint 14 · 21–28 jul 2025
            {!( selected.size===HEALTH_PROJECTS.length) && (
              <span style={{ marginLeft:8, color:'#4d82ff' }}>· {selected.size} projeto{selected.size!==1?'s':''} selecionado{selected.size!==1?'s':''}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <span className="text-[11px] font-medium px-3 py-1 rounded-full" style={{ color:'#06C18A', background:'rgba(6,193,138,0.12)', border:'1px solid rgba(6,193,138,0.25)' }}>
            ● Atualizado há 12 min
          </span>
          <ProjectDropdown options={projectOptions} selected={selected} onChange={setSelected} />
        </div>
      </div>

      {/* Empty state */}
      {visProjects.length === 0 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:200, color:'#546278', fontSize:13, border:'1px dashed #1c2c45', borderRadius:12 }}>
          Nenhum projeto selecionado — use o filtro acima
        </div>
      )}

      {visProjects.length > 0 && (
        <>
          {/* 1. Health row */}
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{ color:'var(--text-muted,#546278)' }}>
              Saúde dos projetos
            </p>
            <div style={{ display:'grid', gridTemplateColumns:`repeat(${visProjects.length},1fr)`, gap:12 }}>
              {visProjects.map(p => <HealthCard key={p.id} p={p} onNav={v=>onNav?.(v)} />)}
            </div>
          </div>

          {/* 2. Main grid */}
          <div className="grid grid-cols-3 gap-4">
            {/* Left: progress + blockers */}
            <div className="col-span-2 space-y-4 min-w-0">

              {/* Progress section */}
              <Section title={
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold" style={{ color:'var(--text-primary,#e8ecf4)' }}>Progresso geral — Q3</span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ color:'#06C18A', background:'rgba(6,193,138,0.12)' }}>↑ No prazo</span>
                </div>
              }>
                <div className="px-5 py-4">
                  {/* If single project: original big metric */}
                  {visProjects.length === 1 ? (
                    <div className="flex items-center gap-8">
                      <div className="flex-shrink-0 text-center">
                        <p className="text-5xl font-bold leading-none tracking-tight" style={{ color:'var(--text-primary,#e8ecf4)' }}>{visProjects[0].progress}%</p>
                        <p className="text-[11px] mt-1.5" style={{ color:'var(--text-muted,#546278)' }}>{visProjects[0].name}</p>
                      </div>
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--border-subtle,#1c2c45)' }}>
                            <div className="h-full rounded-full" style={{ width:`${visProjects[0].progress}%`, background:STATUS[visProjects[0].status].color }}/>
                          </div>
                          <div className="flex justify-between mt-1.5">
                            {['Sprint 11','Sprint 12','Sprint 13','Sprint 14 ←'].map((s,i)=>(
                              <span key={s} className="text-[10px]" style={{ color:i===3?'var(--primary,#4d82ff)':'var(--text-muted,#546278)', fontWeight:i===3?600:400 }}>{s}</span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-end justify-between pt-1" style={{ borderTop:'1px solid var(--border-subtle,#1c2c45)' }}>
                          <div>
                            <p className="text-[10px] mb-1" style={{ color:'var(--text-muted,#546278)' }}>Curva de entrega (últ. 8 sprints)</p>
                            <Sparkline />
                          </div>
                          <div className="text-right">
                            <p className="text-[10px]" style={{ color:'var(--text-muted,#546278)' }}>Velocidade média</p>
                            <p className="text-sm font-bold" style={{ color:'#06C18A' }}>8.4 pts/sprint</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Multiple projects: consolidated + per-project mini bars */
                    <div className="space-y-4">
                      {/* Consolidated */}
                      <div className="flex items-center gap-6">
                        <div className="flex-shrink-0 text-center" style={{ minWidth:70 }}>
                          <p className="text-4xl font-bold leading-none tracking-tight" style={{ color:'var(--text-primary,#e8ecf4)' }}>{consolidatedPct}%</p>
                          <p className="text-[10px] mt-1" style={{ color:'var(--text-muted,#546278)' }}>Consolidado</p>
                        </div>
                        <div className="flex-1">
                          <div className="h-2 rounded-full overflow-hidden" style={{ background:'var(--border-subtle,#1c2c45)' }}>
                            <div className="h-full rounded-full" style={{ width:`${consolidatedPct}%`, background:'#4d82ff' }}/>
                          </div>
                        </div>
                      </div>
                      {/* Per-project mini bars */}
                      <div style={{ borderTop:'1px solid var(--border-subtle,#1c2c45)', paddingTop:14, display:'flex', flexDirection:'column', gap:10 }}>
                        <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color:'var(--text-muted,#546278)' }}>Por projeto</p>
                        {visProjects.map(p=>{
                          const sc=STATUS[p.status]
                          return (
                            <div key={p.id} style={{ display:'flex', alignItems:'center', gap:10 }}>
                              <SmallDonut pct={p.progress} color={sc.color} size={40} />
                              <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                                  <span style={{ fontSize:11, color:'var(--text-primary,#e8ecf4)', fontWeight:600, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.name}</span>
                                  <span style={{ fontSize:11, color:sc.color, fontWeight:700, flexShrink:0, marginLeft:8 }}>{p.progress}%</span>
                                </div>
                                <div className="h-1.5 rounded-full overflow-hidden" style={{ background:'var(--border-subtle,#1c2c45)' }}>
                                  <div className="h-full rounded-full" style={{ width:`${p.progress}%`, background:sc.color }}/>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </Section>

              {/* Blockers */}
              <Section
                title={
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full flex items-center justify-center" style={{ background:'rgba(240,69,90,0.15)' }}>
                      <svg width="11" height="11" viewBox="0 0 11 11" fill="none"><path d="M5.5 3.5v3M5.5 8v.5" stroke="#F0455A" strokeWidth="1.3" strokeLinecap="round"/><circle cx="5.5" cy="5.5" r="4.5" stroke="#F0455A" strokeWidth="1"/></svg>
                    </span>
                    <span className="text-sm font-semibold" style={{ color:'var(--text-primary,#e8ecf4)' }}>Impedimentos & bloqueios ativos</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ color:'#F0455A', background:'rgba(240,69,90,0.15)' }}>{visBlockers.length}</span>
                  </div>
                }
                action={
                  <button className="text-xs transition-opacity hover:opacity-70" style={{ color:'var(--primary,#4d82ff)' }}
                    onClick={()=>onNav?.('list')}>
                    Ver todos
                  </button>
                }
              >
                <div>
                  {visBlockers.length === 0 && (
                    <p style={{ padding:'20px 16px', textAlign:'center', fontSize:12, color:'#546278' }}>Sem impedimentos nos projetos selecionados.</p>
                  )}
                  {visBlockers.map((b,i) => {
                    const isBlocked = b.level==='blocked'
                    const dc = isBlocked?'#F0455A':'#F5A524'
                    const db = isBlocked?'rgba(240,69,90,0.12)':'rgba(245,165,36,0.12)'
                    const proj = HEALTH_PROJECTS.find(p=>p.id===b.projectId)
                    return (
                      <div key={b.id}
                        role="button" tabIndex={0}
                        className="flex items-center gap-3 px-4 py-3 transition-colors cursor-pointer"
                        style={{ borderBottom:i<visBlockers.length-1?'1px solid var(--border-subtle,#1c2c45)':'none' }}
                        onClick={() => openWID(blockerToWID(b,proj))}
                        onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openWID(blockerToWID(b,proj))}}}
                        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.025)'}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
                          style={{ color:dc, background:db, border:`1px solid ${dc}33` }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background:dc }}/>
                          {isBlocked?'Bloqueado':'Em risco'}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-mono text-[10px] flex-shrink-0" style={{ color:'var(--text-muted,#546278)' }}>{b.id}</span>
                            <span className="text-sm truncate" style={{ color:'var(--text-primary,#e8ecf4)' }}>{b.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Avatar name={b.owner} size="xs"/>
                            <span className="text-xs" style={{ color:'var(--text-secondary,#8a9ab8)' }}>{b.owner}</span>
                            {proj && <span className="text-[10px]" style={{ color:'#546278', marginLeft:4 }}>· {proj.name}</span>}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-lg flex-shrink-0" style={{ color:dc, background:db }}>{b.days}d bloqueado</span>
                      </div>
                    )
                  })}
                </div>
              </Section>
            </div>

            {/* Right: sprint per project */}
            <div className="min-w-0">
              <Section title={
                <div>
                  <p className="text-sm font-semibold" style={{ color:'var(--text-primary,#e8ecf4)' }}>Sprint 14</p>
                  <p className="text-[11px]" style={{ color:'var(--text-muted,#546278)' }}>Termina em 28 jul</p>
                </div>
              }>
                {/* Donut(s) per project */}
                <div style={{ padding:'14px 16px', borderBottom:'1px solid var(--border-subtle,#1c2c45)', display:'flex', flexWrap:'wrap', gap:12, justifyContent: visProjects.length===1?'center':'flex-start' }}>
                  {visProjects.map(p=>{
                    const sc=STATUS[p.status]
                    return (
                      <div key={p.id} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, minWidth:64 }}>
                        <SmallDonut pct={p.sprintPct} color={sc.color} size={56}/>
                        <span style={{ fontSize:10, color:'var(--text-muted,#546278)', textAlign:'center', maxWidth:72, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {p.name.split(' ')[0]}
                        </span>
                      </div>
                    )
                  })}
                </div>

                {/* Deliveries grouped by project */}
                <div className="px-4 py-2" style={{ borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}>
                  <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color:'var(--text-muted,#546278)' }}>Entregas imediatas</p>
                </div>

                {visDeliveries.length === 0 && (
                  <p style={{ padding:'16px', textAlign:'center', fontSize:12, color:'#546278' }}>Sem entregas nos projetos selecionados.</p>
                )}

                {visProjects.map(proj => {
                  const projDeliveries = visDeliveries.filter(d=>d.projectId===proj.id)
                  if (projDeliveries.length===0) return null
                  return (
                    <div key={proj.id}>
                      {visProjects.length>1 && (
                        <div style={{ padding:'6px 16px', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid var(--border-subtle,#1c2c45)' }}>
                          <span style={{ fontSize:10, fontWeight:700, color:STATUS[proj.status].color }}>{proj.name}</span>
                        </div>
                      )}
                      {projDeliveries.map((d,i)=>{
                        const st=DELIVERY_STATUS[d.status]
                        const isLast = i===projDeliveries.length-1 && proj.id===visProjects[visProjects.length-1]?.id
                        return (
                          <div key={d.id}
                            role="button" tabIndex={0}
                            className="flex items-center gap-2.5 px-4 py-3 transition-colors cursor-pointer"
                            style={{ borderBottom:isLast?'none':'1px solid var(--border-subtle,#1c2c45)' }}
                            onClick={() => openWID(deliveryToWID(d,proj))}
                            onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openWID(deliveryToWID(d,proj))}}}
                            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,0.025)'}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                            <Avatar name={d.assignee} size="xs"/>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs truncate font-medium" style={{ color:'var(--text-primary,#e8ecf4)' }}>{d.title}</p>
                              <p className="text-[10px] mt-0.5" style={{ color:'var(--text-muted,#546278)' }}>
                                {d.assignee.split(' ')[0]} · {d.due}
                              </p>
                            </div>
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md flex-shrink-0" style={{ color:st.color, background:st.tint }}>
                              {st.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </Section>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
