import { useState, useEffect, useCallback, useRef } from 'react'
import { T } from './ds/tokens'
import { AddRelationModal } from './AddRelationModal'
import { useSession } from '../data/SessionContext'
import { can } from '../data/permissions'

// ─── Exported data interfaces ──────────────────────────────────────────────────
export interface WIComment      { author: string; authorName?: string; body: string; time: string }
export interface WILinkedIssue  { relType: string; key: string; title: string; status: string; priority: string; assigneeInitials?: string }
export interface WIChild        { key: string; title: string; type: string; status: string; assigneeInitials?: string }
export interface WIAcItem       { id: string; text: string; done: boolean }
export interface WIMember       { id: string; name: string; initials: string }
export interface WISprint       { id: string; name: string }
export interface WIHistoryEntry { authorInitials: string; authorName: string; field: string; from: string; to: string; time: string }

export interface WorkItemData {
  key:               string
  type:              string
  title:             string
  status:            string
  priority:          string
  labels:            string[]
  assigneeInitials:  string
  assigneeName?:     string
  reporterInitials?: string
  reporterName?:     string
  epicKey?:          string
  epicLabel?:        string
  epicColor?:        string
  sprintId?:         string
  sprintName?:       string
  blocked?:          boolean
  blockedReason?:    string
  delayed?:          boolean
  severity?:         string
  description?:      string
  dueDate?:          string
  points?:           number
  fixVersions?:      string[]
  acItems?:          WIAcItem[]
  children?:         WIChild[]
  linkedIssues?:     WILinkedIssue[]
  comments?:         WIComment[]
  history?:          WIHistoryEntry[]
  createdAt?:        string
  updatedAt?:        string
  evidenceCount?:    number
  attachmentCount?:  number
  parentId?:         string
  // Catalogues passed from project context
  availableEpics?:    { id: string; label: string; color: string }[]
  availableMembers?:  WIMember[]
  availableSprints?:  WISprint[]
  availableLabels?:   string[]
  availableVersions?: string[]
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  backlog:'Backlog', todo:'A fazer', 'in-progress':'Em andamento', 'in-review':'Em revisão', done:'Concluído',
}
const STATUS_COLOR: Record<string, string> = {
  backlog:T.text3, todo:T.text2, 'in-progress':T.accent, 'in-review':T.warn, done:T.success,
}
const STATUS_BG: Record<string, string> = {
  backlog:T.neutralDim, todo:`${T.text3}18`, 'in-progress':T.accentDim, 'in-review':T.warnDim, done:T.successDim,
}
const PRIORITY_LABEL: Record<string, string> = {
  critical:'Crítica', high:'Alta', medium:'Média', low:'Baixa',
}
const PRIORITY_COLOR: Record<string, string> = {
  critical:T.crit, high:T.warn, medium:T.accent, low:T.text3,
}
const TYPE_CFG: Record<string, { icon: string; color: string; label: string }> = {
  bug:     { icon:'⬟', color:T.crit,    label:'Bug'       },
  story:   { icon:'◇', color:T.accent,  label:'História'  },
  task:    { icon:'☑', color:T.text2,   label:'Tarefa'    },
  subtask: { icon:'◻', color:T.text3,   label:'Sub-tarefa'},
  epic:    { icon:'⚡', color:T.warn,   label:'Épico'     },
  feature: { icon:'◈', color:T.purple,  label:'Feature'   },
}
const AV_COLORS: Record<string, string> = {
  AL:T.accent, NM:T.purple, JN:T.warn, CS:T.success, RM:T.crit, LF:'#f97316',
}
const STATUSES = ['backlog','todo','in-progress','in-review','done']
const PRIORITIES = ['critical','high','medium','low']

// ─── Atoms ────────────────────────────────────────────────────────────────────
function Av({ i, size = 24 }: { i: string; size?: number }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:size, height:size, borderRadius:'50%', fontSize:size*0.38,
      fontWeight:700, color:'white', flexShrink:0, background:AV_COLORS[i] ?? T.text3,
    }}>{i}</span>
  )
}

function SecHeader({ title, count, action }: { title: string; count?: number; action?: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:8, paddingBottom:8, marginBottom:10, borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:T.text3 }}>{title}</span>
      {count != null && (
        <span style={{ fontSize:9, fontWeight:700, padding:'1px 6px', borderRadius:20, background:T.accentDim, color:T.accent }}>{count}</span>
      )}
      {action && <div style={{ marginLeft:'auto' }}>{action}</div>}
    </div>
  )
}

function StatusPill({ status, size='sm' }: { status: string; size?: 'sm' | 'xs' }) {
  const c = STATUS_COLOR[status] ?? T.text3
  const bg = STATUS_BG[status] ?? T.neutralDim
  const fs = size === 'xs' ? 9 : 11
  const px = size === 'xs' ? 6 : 10
  return (
    <span style={{ fontSize:fs, fontWeight:600, padding:`2px ${px}px`, borderRadius:20, background:bg, color:c, border:`1px solid ${c}30` }}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

// ─── Done Transition Modal ─────────────────────────────────────────────────────
const RESOLUTIONS = ['Corrigido','Não vai corrigir','Duplicado','Não reproduzível','Inválido']

function DoneTransitionModal({ onConfirm, onClose }: {
  onConfirm: () => void
  onClose:   () => void
}) {
  const [resolution, setResolution] = useState(RESOLUTIONS[0])
  const [evidence,   setEvidence]   = useState('')
  const [comment,    setComment]    = useState('')
  return (
    <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(9,9,11,0.85)', backdropFilter:'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div style={{ width:480, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:18, overflow:'hidden', boxShadow:T.shadowModal }}>
        <div style={{ padding:'16px 20px', borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ margin:0, fontSize:15, fontWeight:700, color:T.text1 }}>Mover para Concluído</p>
            <p style={{ margin:'2px 0 0', fontSize:11, color:T.text3 }}>Esta ação registra a resolução da issue</p>
          </div>
          <button onClick={onClose} style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:'none', background:'transparent', color:T.text3, cursor:'pointer', fontSize:16 }}>×</button>
        </div>
        <div style={{ padding:'16px 20px', display:'flex', flexDirection:'column', gap:14 }}>
          <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.text3 }}>Resolução <span style={{ color:T.crit }}>*</span></span>
            <select value={resolution} onChange={e=>setResolution(e.target.value)}
              style={{ height:36, padding:'0 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.bgSurface2, color:T.text1, fontSize:13, colorScheme:'dark', fontFamily:'inherit' }}>
              {RESOLUTIONS.map(r=><option key={r} value={r} style={{ background:T.bgSurface2 }}>{r}</option>)}
            </select>
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.text3 }}>Evidência (link ou referência)</span>
            <input value={evidence} onChange={e=>setEvidence(e.target.value)} placeholder="https://... ou número de teste"
              style={{ height:36, padding:'0 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.bgSurface2, color:T.text1, fontSize:13, fontFamily:'inherit' }}
              onFocus={e=>{e.currentTarget.style.borderColor=T.accent}}
              onBlur={e=>{e.currentTarget.style.borderColor=T.border}} />
          </label>
          <label style={{ display:'flex', flexDirection:'column', gap:5 }}>
            <span style={{ fontSize:11, fontWeight:600, color:T.text3 }}>Comentário de fechamento</span>
            <textarea value={comment} onChange={e=>setComment(e.target.value)} rows={3} placeholder="Descreva como foi resolvida..."
              style={{ padding:'8px 12px', borderRadius:8, border:`1px solid ${T.border}`, background:T.bgSurface2, color:T.text1, fontSize:13, resize:'none', fontFamily:'inherit', colorScheme:'dark' }}
              onFocus={e=>{e.currentTarget.style.borderColor=T.accent}}
              onBlur={e=>{e.currentTarget.style.borderColor=T.border}} />
          </label>
        </div>
        <div style={{ padding:'12px 20px', borderTop:`1px solid ${T.border}`, display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ height:32, padding:'0 16px', borderRadius:8, border:'none', background:'transparent', color:T.text2, cursor:'pointer', fontSize:13 }}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>Cancelar</button>
          <button onClick={onConfirm} style={{ height:32, padding:'0 16px', borderRadius:8, border:'none', background:T.success, color:'white', cursor:'pointer', fontSize:13, fontWeight:600 }}
            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.filter='brightness(1.15)'}}
            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.filter='none'}}>Confirmar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail row in right panel ────────────────────────────────────────────────
function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display:'flex', alignItems:'flex-start', gap:10, padding:'8px 0', borderBottom:`1px solid ${T.border}` }}>
      <span style={{ fontSize:11, color:T.text3, width:90, flexShrink:0, paddingTop:1 }}>{label}</span>
      <div style={{ flex:1, fontSize:12, color:T.text1 }}>{children}</div>
    </div>
  )
}

// ─── Inline dropdown used in right panel ──────────────────────────────────────
function InlineSelect({ value, options, onChange, getLabel, getColor }: {
  value: string
  options: string[]
  onChange: (v: string) => void
  getLabel?: (v: string) => string
  getColor?: (v: string) => string
}) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ position:'relative' }}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{ display:'flex', alignItems:'center', gap:4, fontSize:12, padding:'2px 6px', borderRadius:6, border:'none', background:'transparent', color:getColor?.(value) ?? T.text1, cursor:'pointer' }}
        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>
        {getLabel?.(value) ?? value}
        <span style={{ opacity:0.5, fontSize:9 }}>▾</span>
      </button>
      {open && (
        <div style={{ position:'absolute', top:'100%', left:0, zIndex:200, minWidth:140, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:10, boxShadow:T.shadowModal, padding:'4px 0', overflow:'hidden' }}
          onClick={e=>e.stopPropagation()}>
          {options.map(o=>(
            <button key={o} onClick={()=>{onChange(o);setOpen(false)}}
              style={{ width:'100%', textAlign:'left', padding:'6px 12px', border:'none', background: o===value?T.bgSurface2:'transparent', color:getColor?.(o) ?? (o===value?T.accent:T.text1), fontSize:12, cursor:'pointer', fontWeight: o===value?700:400 }}
              onMouseEnter={e=>{if(o!==value)(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
              onMouseLeave={e=>{if(o!==value)(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>
              {getLabel?.(o) ?? o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Member selector (Assignee / Reporter) ───────────────────────────────────
function MemberSelector({ value, members, onChange, allowNone }: {
  value?:     string  // initials
  members:    WIMember[]
  onChange:   (m: WIMember | null) => void
  allowNone?: boolean
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [hi,    setHi]    = useState(-1)
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const AV_COLORS: Record<string, string> = {
    AL:T.accent, NM:T.purple, JN:T.warn, CS:T.success, RM:T.crit, LF:'#f97316',
  }
  const selected = members.find(m => m.initials === value)

  const filtered = [
    ...(allowNone ? [{ id:'__none__', name:'Nenhum / Remover', initials:'' }] : []),
    ...members.filter(m => m.name.toLowerCase().includes(query.toLowerCase()) || m.initials.toLowerCase().includes(query.toLowerCase())),
  ]

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t) }
    else { setQuery(''); setHi(-1) }
  }, [open])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h+1, filtered.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h-1, 0)) }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); select(filtered[hi]) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  function select(m: { id: string; name: string; initials: string }) {
    onChange(m.id === '__none__' ? null : { id: m.id, name: m.name, initials: m.initials })
    setOpen(false); setQuery(''); setHi(-1)
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, padding:'2px 6px', borderRadius:6, border:'none', background:'transparent', color:T.text1, cursor:'pointer', fontFamily:'inherit' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        {selected
          ? <><span style={{ width:18, height:18, borderRadius:'50%', background:AV_COLORS[selected.initials]??T.text3, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:7, fontWeight:700, color:'white', flexShrink:0 }}>{selected.initials}</span>{selected.name}</>
          : <span style={{ color:T.text3, fontStyle:'italic' }}>Nenhum</span>}
        <span style={{ opacity:0.45, fontSize:9, color:T.text3 }}>▾</span>
      </button>
      {open && (
        <div onKeyDown={handleKey} style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, width:220, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:12, boxShadow:T.shadowModal, overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.border}` }}>
            <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setHi(-1) }}
              placeholder="Buscar membro…"
              style={{ width:'100%', background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 10px', color:T.text1, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = T.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border }} />
          </div>
          <div style={{ maxHeight:200, overflowY:'auto', padding:'4px 0' }}>
            {filtered.map((m, i) => {
              const isCur = m.initials === (value ?? '')
              return (
                <button key={m.id} onClick={() => select(m)} onMouseEnter={() => setHi(i)}
                  style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:8, padding:'7px 12px', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:isCur?700:400, background:i===hi?T.bgSurface2:'transparent', color:T.text1 }}>
                  {m.initials
                    ? <span style={{ width:20, height:20, borderRadius:'50%', background:AV_COLORS[m.initials]??T.text3, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:'white', flexShrink:0 }}>{m.initials}</span>
                    : <span style={{ width:20, height:20, borderRadius:'50%', background:T.bgSurface2, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:12, flexShrink:0, color:T.text3 }}>—</span>}
                  <span style={{ flex:1 }}>{m.name}</span>
                  {isCur && m.initials && <span style={{ fontSize:10, color:T.accent }}>✓</span>}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Label editor (multi-select chips) ────────────────────────────────────────
function LabelEditor({ selected, available, onChange }: {
  selected:  string[]
  available: string[]
  onChange:  (labels: string[]) => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const LABEL_COLOR: Record<string, string> = {
    Design:'#3B82F6', Web:'#9898AD', Research:'#A78BFA', Content:'#F59E0B',
    Hero:'#9898AD', Mobile:'#38bdf8', Eng:'#10B981', UX:'#14b8a6', SEO:'#EF4444', Brand:'#A78BFA',
  }
  const LABEL_BG: Record<string, string> = {
    Design:'rgba(59,130,246,0.12)', Web:'rgba(92,92,122,0.12)', Research:'rgba(167,139,250,0.12)',
    Content:'rgba(245,158,11,0.12)', Hero:'rgba(92,92,122,0.12)', Mobile:'rgba(56,189,248,0.12)',
    Eng:'rgba(16,185,129,0.12)', UX:'rgba(20,184,166,0.12)', SEO:'rgba(239,68,68,0.12)', Brand:'rgba(167,139,250,0.12)',
  }

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  function toggle(label: string) {
    onChange(selected.includes(label) ? selected.filter(l => l !== label) : [...selected, label])
  }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, alignItems:'center' }}>
        {selected.map(l => (
          <span key={l} style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, padding:'2px 6px', borderRadius:20, background:LABEL_BG[l]??T.neutralDim, color:LABEL_COLOR[l]??T.text2, border:`1px solid ${(LABEL_COLOR[l]??T.text3)}30` }}>
            {l}
            <button onClick={() => toggle(l)} style={{ border:'none', background:'transparent', color:'inherit', cursor:'pointer', padding:0, lineHeight:1, fontSize:12 }}>×</button>
          </span>
        ))}
        <button onClick={() => setOpen(o => !o)}
          style={{ fontSize:11, padding:'2px 7px', borderRadius:20, border:`1px dashed ${T.border}`, background:'transparent', color:T.text3, cursor:'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=T.accent; (e.currentTarget as HTMLButtonElement).style.color=T.accent }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.borderColor=T.border;  (e.currentTarget as HTMLButtonElement).style.color=T.text3 }}>
          + Label
        </button>
      </div>
      {open && (
        <div style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, width:180, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:12, boxShadow:T.shadowModal, padding:'4px 0', overflow:'hidden' }}>
          {available.map(l => (
            <button key={l} onClick={() => toggle(l)}
              style={{ width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:8, padding:'6px 12px', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', background:'transparent', color:LABEL_COLOR[l]??T.text2 }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
              <span style={{ width:14, height:14, borderRadius:3, border:`1.5px solid ${(LABEL_COLOR[l]??T.text3)}60`, background:selected.includes(l)?LABEL_BG[l]??T.neutralDim:'transparent', display:'inline-flex', alignItems:'center', justifyContent:'center' }}>
                {selected.includes(l) && <span style={{ fontSize:9, color:LABEL_COLOR[l]??T.text2 }}>✓</span>}
              </span>
              {l}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Generic searchable selector (sprints, versions) ─────────────────────────
function SearchableSelect({ value, options, onChange, placeholder = 'Buscar…', noneLabel = 'Nenhum' }: {
  value?:      string
  options:     { id: string; label: string }[]
  onChange:    (id: string | null) => void
  placeholder?: string
  noneLabel?:   string
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [hi,    setHi]    = useState(-1)
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selected = options.find(o => o.id === value)
  const filtered = [
    { id: null as string | null, label: `— ${noneLabel}` },
    ...options.filter(o => o.label.toLowerCase().includes(query.toLowerCase())).map(o => ({ ...o, id: o.id as string | null })),
  ]

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setQuery('') }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t) }
    else { setQuery(''); setHi(-1) }
  }, [open])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h+1, filtered.length-1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h-1, 0)) }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); select(filtered[hi].id) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  function select(id: string | null) { onChange(id); setOpen(false); setQuery(''); setHi(-1) }

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'2px 6px', borderRadius:6, border:'none', background:'transparent', color:T.text1, cursor:'pointer', fontFamily:'inherit' }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
        {selected ? selected.label : <span style={{ color:T.text3, fontStyle:'italic' }}>{noneLabel}</span>}
        <span style={{ opacity:0.45, fontSize:9, color:T.text3 }}>▾</span>
      </button>
      {open && (
        <div onKeyDown={handleKey} style={{ position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, width:220, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:12, boxShadow:T.shadowModal, overflow:'hidden' }}>
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.border}` }}>
            <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setHi(-1) }}
              placeholder={placeholder}
              style={{ width:'100%', background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:8, padding:'5px 10px', color:T.text1, fontSize:12, outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = T.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border }} />
          </div>
          <div style={{ maxHeight:200, overflowY:'auto', padding:'4px 0' }}>
            {filtered.map((o, i) => (
              <button key={o.id ?? '__none__'} onClick={() => select(o.id)} onMouseEnter={() => setHi(i)}
                style={{ width:'100%', textAlign:'left', padding:'7px 12px', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', fontWeight:o.id===value?700:400, background:i===hi?T.bgSurface2:'transparent', color:o.id===null?T.text3:T.text1, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                {o.label}
                {o.id === value && <span style={{ fontSize:10, color:T.accent }}>✓</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Inline number edit ───────────────────────────────────────────────────────
function InlineNumber({ value, onChange }: { value?: number; onChange: (v: number | undefined) => void }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState(String(value ?? ''))

  function commit() {
    const n = draft === '' ? undefined : Math.max(0, parseInt(draft, 10) || 0)
    onChange(n); setEditing(false)
  }

  if (editing) {
    return (
      <input autoFocus type="number" min={0} value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ width:60, height:24, padding:'0 6px', borderRadius:6, border:`1px solid ${T.accent}`, background:T.bgSurface2, color:T.text1, fontSize:12, outline:'none', fontFamily:'inherit' }} />
    )
  }
  return (
    <button onClick={() => { setDraft(String(value ?? '')); setEditing(true) }}
      style={{ fontSize:12, padding:'2px 6px', borderRadius:6, border:'none', background:'transparent', color:T.text1, cursor:'pointer', fontFamily:'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
      {value != null && value > 0 ? `${value} pt` : <span style={{ color:T.text3, fontStyle:'italic' }}>—</span>}
    </button>
  )
}

// ─── Inline date edit ─────────────────────────────────────────────────────────
function InlineDate({ value, onChange, delayed }: { value?: string; onChange: (v: string) => void; delayed?: boolean }) {
  const [editing, setEditing] = useState(false)
  const [draft,   setDraft]   = useState('')

  function commit() { if (draft) onChange(draft); setEditing(false) }

  if (editing) {
    return (
      <input autoFocus type="date" value={draft} onChange={e => setDraft(e.target.value)}
        onBlur={commit} onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        style={{ height:24, padding:'0 6px', borderRadius:6, border:`1px solid ${T.accent}`, background:T.bgSurface2, color:T.text1, fontSize:12, outline:'none', fontFamily:'inherit', colorScheme:'dark' }} />
    )
  }
  return (
    <button onClick={() => { setDraft(''); setEditing(true) }}
      style={{ fontSize:12, padding:'2px 6px', borderRadius:6, border:'none', background:'transparent', color:delayed?T.warn:T.text1, cursor:'pointer', fontFamily:'inherit' }}
      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}>
      {value || <span style={{ color:T.text3, fontStyle:'italic' }}>—</span>}
    </button>
  )
}

// ─── Epic selector ────────────────────────────────────────────────────────────
function EpicSelector({ value, epics, onChange }: {
  value?:  string
  epics:   { id: string; label: string; color: string }[]
  onChange:(id: string | null) => void
}) {
  const [open,  setOpen]  = useState(false)
  const [query, setQuery] = useState('')
  const [hi,    setHi]    = useState(-1)
  const containerRef      = useRef<HTMLDivElement>(null)
  const inputRef          = useRef<HTMLInputElement>(null)

  const selected = epics.find(e => e.id === value)

  const NONE = { id: null as string | null, label: 'Nenhum / Remover épico', color: T.text3 }
  const filtered = [
    NONE,
    ...epics
      .filter(e =>
        e.label.toLowerCase().includes(query.toLowerCase()) ||
        e.id.toLowerCase().includes(query.toLowerCase())
      )
      .map(e => ({ ...e, id: e.id as string | null })),
  ]

  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  useEffect(() => {
    if (open) { const t = setTimeout(() => inputRef.current?.focus(), 30); return () => clearTimeout(t) }
    else { setQuery(''); setHi(-1) }
  }, [open])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, filtered.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter' && hi >= 0) { e.preventDefault(); select(filtered[hi].id) }
    else if (e.key === 'Escape') { setOpen(false) }
  }

  function select(id: string | null) {
    onChange(id); setOpen(false); setQuery(''); setHi(-1)
  }

  return (
    <div ref={containerRef} style={{ position:'relative' }}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          display:'flex', alignItems:'center', gap:5, fontSize:12, padding:'2px 6px',
          borderRadius:6, border:'none', background:'transparent', fontFamily:'inherit',
          color: selected?.color ?? T.text3, cursor:'pointer',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        {selected
          ? <><span style={{ fontSize:10 }}>⚡</span>{selected.label}</>
          : <span style={{ color:T.text3, fontStyle:'italic' }}>Nenhum</span>}
        <span style={{ opacity:0.45, fontSize:9, color:T.text3 }}>▾</span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          onKeyDown={handleKey}
          style={{
            position:'absolute', top:'calc(100% + 4px)', left:0, zIndex:300, width:230,
            background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:12,
            boxShadow:T.shadowModal, overflow:'hidden',
          }}
        >
          {/* Search */}
          <div style={{ padding:'8px 10px', borderBottom:`1px solid ${T.border}` }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => { setQuery(e.target.value); setHi(-1) }}
              placeholder="Buscar épico…"
              style={{
                width:'100%', background:T.bgSurface2, border:`1px solid ${T.border}`,
                borderRadius:8, padding:'5px 10px', color:T.text1, fontSize:12,
                outline:'none', fontFamily:'inherit', boxSizing:'border-box',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = T.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = T.border }}
            />
          </div>

          {/* Options */}
          <div style={{ maxHeight:200, overflowY:'auto', padding:'4px 0' }}>
            {filtered.map((ep, i) => {
              const isCurrent = ep.id === (value ?? null)
              const isHi = i === hi
              return (
                <button
                  key={ep.id ?? '__none__'}
                  onClick={() => select(ep.id)}
                  onMouseEnter={() => setHi(i)}
                  style={{
                    width:'100%', textAlign:'left', display:'flex', alignItems:'center', gap:8,
                    padding:'7px 12px', border:'none', cursor:'pointer', fontSize:12,
                    fontFamily:'inherit', fontWeight: isCurrent ? 700 : 400,
                    background: isHi ? T.bgSurface2 : 'transparent',
                    color: ep.id === null ? T.text3 : ep.color,
                  }}
                >
                  {ep.id === null
                    ? <span style={{ color:T.text3 }}>— {ep.label}</span>
                    : <>
                        <span style={{ fontSize:10 }}>⚡</span>
                        <span style={{ flex:1 }}>{ep.label}</span>
                        <span style={{ fontFamily:'monospace', fontSize:9, color:T.text3, opacity:0.7 }}>{ep.id}</span>
                        {isCurrent && <span style={{ fontSize:10, color:T.accent }}>✓</span>}
                      </>
                  }
                </button>
              )
            })}
            {filtered.length === 1 && query && (
              <p style={{ margin:0, fontSize:11, color:T.text3, padding:'8px 12px', fontStyle:'italic' }}>
                Nenhum épico encontrado
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export function WorkItemDetail({ data, onUpdate, onClose, mode = 'drawer' }: {
  data:      WorkItemData
  onUpdate:  (updated: WorkItemData) => void
  onClose?:  () => void
  mode?:     'drawer' | 'page'
}) {
  const { activeUser } = useSession()
  const canEdit = can(activeUser.permissions, 'edit:workitem')

  // ── Local state (all mutable fields) ────────────────────────────────────────
  const [local,       setLocal]      = useState<WorkItemData>(data)
  const [editTitle,   setEditTitle]  = useState(false)
  const [statusOpen,  setStatusOpen] = useState(false)
  const [addRelOpen,  setAddRelOpen] = useState(false)
  const [showDone,    setShowDone]   = useState(false)
  const [acItems,     setAcItems]    = useState<WIAcItem[]>(data.acItems ?? [])
  const [newAc,       setNewAc]      = useState('')
  const [comments,    setComments]   = useState<WIComment[]>(data.comments ?? [])
  const [commentText, setCommentText]= useState('')
  const [children,    setChildren]   = useState<WIChild[]>(data.children ?? [])
  const [linkedIssues,setLinkedIssues]=useState<WILinkedIssue[]>(data.linkedIssues ?? [])
  const [loading,     setLoading]    = useState(mode === 'drawer')
  const [toast,       setToast]      = useState<string | null>(null)
  const [history,     setHistory]    = useState<WIHistoryEntry[]>(data.history ?? [])

  useEffect(() => {
    if (mode === 'drawer') {
      const t = setTimeout(() => setLoading(false), 260)
      return () => clearTimeout(t)
    }
  }, [mode])

  // ── Update helper ────────────────────────────────────────────────────────────
  const update = useCallback((patch: Partial<WorkItemData>) => {
    setLocal(prev => {
      const next = { ...prev, ...patch }
      onUpdate(next)
      return next
    })
  }, [onUpdate])

  // ── Handlers ─────────────────────────────────────────────────────────────────
  function handleStatusChange(s: string) {
    if (s === 'done') { setShowDone(true) }
    else { update({ status: s }); setStatusOpen(false) }
  }

  function handleDoneConfirm() {
    update({ status: 'done' })
    setShowDone(false)
    setStatusOpen(false)
  }

  function handleAddComment() {
    const t = commentText.trim()
    if (!t) return
    const initials = activeUser.name.split(' ').slice(0,2).map((p: string)=>p[0]).join('')
    const c: WIComment = { author: initials, authorName: activeUser.name, body: t, time: 'agora' }
    const next = [...comments, c]
    setComments(next)
    update({ comments: next })
    setCommentText('')
  }

  function toggleAc(id: string) {
    const next = acItems.map(a => a.id===id ? {...a,done:!a.done} : a)
    setAcItems(next); update({ acItems: next })
  }

  function addAcItem() {
    const t = newAc.trim(); if (!t) return
    const next = [...acItems, { id:`ac-${Date.now()}`, text:t, done:false }]
    setAcItems(next); update({ acItems: next }); setNewAc('')
  }

  function removeAcItem(id: string) {
    const next = acItems.filter(a => a.id !== id)
    setAcItems(next); update({ acItems: next })
  }

  function handleAddRelation({ type, targetKey }: { type: string; targetKey: string }) {
    const link: WILinkedIssue = { relType: type, key: targetKey, title: `Issue ${targetKey}`, status: 'todo', priority: 'medium' }
    const next = [...linkedIssues, link]
    setLinkedIssues(next); update({ linkedIssues: next }); setAddRelOpen(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2500)
  }

  function trackChange(field: string, from: string, to: string, patch: Partial<WorkItemData>) {
    const initials = activeUser.name.split(' ').slice(0, 2).map((p: string) => p[0]).join('')
    const entry: WIHistoryEntry = {
      authorInitials: initials,
      authorName:     activeUser.name,
      field, from, to,
      time: new Date().toLocaleString('pt-BR', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }),
    }
    const nextHistory = [entry, ...history]
    setHistory(nextHistory)
    update({ ...patch, history: nextHistory, updatedAt: 'agora' })
    showToast(`${field} atualizado`)
  }

  function handleEpicChange(id: string | null) {
    const epic = (data.availableEpics ?? []).find(e => e.id === id)
    const from = local.epicLabel ?? 'Nenhum'
    const to   = epic?.label ?? 'Nenhum'
    trackChange('Épico', from, to, { epicKey: id ?? undefined, epicLabel: epic?.label, epicColor: epic?.color })
  }

  function handleAssignToMe() {
    const initials = activeUser.name.split(' ').slice(0,2).map((p: string)=>p[0]).join('')
    const from = (local.assigneeName ?? local.assigneeInitials) || 'Nenhum'
    const to   = activeUser.name
    trackChange('Responsável', from, to, { assigneeInitials: initials, assigneeName: activeUser.name })
  }

  // ── Derived ───────────────────────────────────────────────────────────────────
  const acDone = acItems.filter(a=>a.done).length
  const childDone = children.filter(c=>c.status==='done').length
  const childPct = children.length > 0 ? Math.round(childDone/children.length*100) : 0

  const linkedByType: Record<string,WILinkedIssue[]> = {}
  for (const li of linkedIssues) {
    if (!linkedByType[li.relType]) linkedByType[li.relType] = []
    linkedByType[li.relType].push(li)
  }

  const typeCfg = TYPE_CFG[local.type] ?? TYPE_CFG.task

  // ── Shell variables ───────────────────────────────────────────────────────────
  const panelStyle: React.CSSProperties = mode === 'drawer'
    ? { position:'fixed', top:0, right:0, bottom:0, width:560, background:T.bgSurface, borderLeft:`1px solid ${T.border}`, boxShadow:'-12px 0 48px rgba(0,0,0,0.55)', zIndex:301, display:'flex', flexDirection:'column', overflow:'hidden' }
    : { position:'relative', display:'flex', flexDirection:'column', flex:1, overflow:'hidden', background:T.bgSurface }

  return (
    <>
      {showDone && <DoneTransitionModal onConfirm={handleDoneConfirm} onClose={()=>setShowDone(false)} />}
      {addRelOpen && <AddRelationModal currentIssueKey={local.key} onClose={()=>setAddRelOpen(false)} onAdd={handleAddRelation} />}

      {mode === 'drawer' && (
        <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:300 }} />
      )}

      <div style={panelStyle}>
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div style={{ flexShrink:0, borderBottom:`1px solid ${T.border}` }}>
          {/* Breadcrumb */}
          <div style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 18px 0', fontSize:11, color:T.text3 }}>
            {local.epicLabel ? (
              <>
                <span style={{ color:local.epicColor ?? T.warn }}>{local.epicLabel}</span>
                <span>›</span>
              </>
            ) : null}
            <span style={{ fontFamily:'monospace', color:T.text2 }}>{local.key}</span>
          </div>

          {/* Type + key + status row */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 18px 10px', flexWrap:'wrap' }}>
            <span style={{ fontSize:14, color:typeCfg.color }}>{typeCfg.icon}</span>
            <span style={{ fontFamily:'monospace', fontSize:10, color:T.text3, background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:4, padding:'1px 6px' }}>{local.key}</span>
            <span style={{ fontSize:11, color:T.text3 }}>{typeCfg.label}</span>

            {/* Status dropdown */}
            <div style={{ position:'relative' }}>
              <button
                onClick={()=>canEdit && setStatusOpen(o=>!o)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'3px 10px', borderRadius:20, background:STATUS_BG[local.status]??T.neutralDim, border:`1px solid ${STATUS_COLOR[local.status]??T.text3}40`, color:STATUS_COLOR[local.status]??T.text3, fontSize:11, fontWeight:600, cursor:canEdit?'pointer':'default' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:STATUS_COLOR[local.status], flexShrink:0 }} />
                {STATUS_LABEL[local.status] ?? local.status}
                {canEdit && <span style={{ opacity:0.5, fontSize:9 }}>▾</span>}
              </button>
              {statusOpen && (
                <div onClick={e=>e.stopPropagation()} style={{ position:'absolute', top:'110%', left:0, zIndex:200, minWidth:160, background:T.bgSurface, border:`1px solid ${T.border2}`, borderRadius:10, boxShadow:T.shadowModal, padding:'4px 0', overflow:'hidden' }}>
                  {STATUSES.map(s=>(
                    <button key={s} onClick={()=>handleStatusChange(s)}
                      style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'7px 12px', border:'none', background: s===local.status?T.bgSurface2:'transparent', color: s===local.status?STATUS_COLOR[s]:T.text2, fontSize:12, fontWeight: s===local.status?700:400, cursor:'pointer', textAlign:'left' }}
                      onMouseEnter={e=>{if(s!==local.status)(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
                      onMouseLeave={e=>{if(s!==local.status)(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>
                      <span style={{ width:6, height:6, borderRadius:'50%', background:STATUS_COLOR[s], flexShrink:0 }} />
                      {STATUS_LABEL[s]}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {!canEdit && (
              <span style={{ fontSize:10, color:T.text3, background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:6, padding:'2px 8px' }}>Somente leitura</span>
            )}

            {/* Right-side actions */}
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:6 }}>
              <ActionBtn title="Observar">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 2C3.5 2 1 6.5 1 6.5S3.5 11 6.5 11 12 6.5 12 6.5 9.5 2 6.5 2z" stroke="currentColor" strokeWidth="1.2"/><circle cx="6.5" cy="6.5" r="1.5" fill="currentColor"/></svg>
              </ActionBtn>
              <ActionBtn title="Compartilhar">
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 4.5 10 3m0 0 1.5 1.5M10 3v4a3 3 0 0 1-3 3H3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              </ActionBtn>
              {onClose && (
                <button onClick={onClose}
                  style={{ width:26, height:26, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:'none', background:'transparent', color:T.text3, cursor:'pointer', fontSize:16 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>✕</button>
              )}
            </div>
          </div>
        </div>

        {/* ── Body ───────────────────────────────────────────────────────────── */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' }}>

          {/* Loading skeleton (drawer only) */}
          {loading && (
            <div style={{ flex:1, padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
              {[72,40,100,55,80,60].map((w,i) => (
                <div key={i} style={{ height: i===2?90:14, width:`${w}%`, borderRadius:8, background:T.bgSurface2, animation:'pulse 1.5s ease-in-out infinite' }} />
              ))}
            </div>
          )}

          {!loading && <>
            {/* ── Main left column ─────────────────────────────────────────── */}
            <div style={{ flex:1, overflowY:'auto', padding:'18px 20px', minWidth:0 }}>

              {/* Editable title */}
              {editTitle ? (
                <input autoFocus value={local.title}
                  onChange={e=>setLocal(p=>({...p,title:e.target.value}))}
                  onBlur={()=>{ setEditTitle(false); update({ title: local.title }) }}
                  onKeyDown={e=>{ if(e.key==='Enter') { setEditTitle(false); update({ title: local.title }) } }}
                  style={{ width:'100%', fontSize:17, fontWeight:700, color:T.text1, background:T.bgSurface2, border:`1px solid ${T.accent}`, borderRadius:8, padding:'4px 8px', marginBottom:12, outline:'none', fontFamily:'inherit' }} />
              ) : (
                <h2
                  onClick={()=>canEdit && setEditTitle(true)}
                  style={{ margin:'0 0 12px', fontSize:17, fontWeight:700, color:T.text1, lineHeight:1.35, cursor:canEdit?'text':'default', padding:'4px 8px', borderRadius:8, marginLeft:-8, transition:'background 0.12s' }}
                  onMouseEnter={e=>{ if(canEdit)(e.currentTarget as HTMLHeadingElement).style.background=T.bgSurface2 }}
                  onMouseLeave={e=>{ (e.currentTarget as HTMLHeadingElement).style.background='transparent' }}
                >{local.title}</h2>
              )}

              {/* Action bar */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:18, flexWrap:'wrap' }}>
                {[
                  { label:'Anexar', icon:'📎' },
                  { label:'+ Child issue', icon:null },
                  { label:'Vincular issue', icon:null, onClick:()=>setAddRelOpen(true) },
                ].map(btn => (
                  <button key={btn.label} onClick={btn.onClick}
                    style={{ display:'flex', alignItems:'center', gap:4, height:28, padding:'0 10px', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.text2, fontSize:11, cursor:'pointer', fontFamily:'inherit' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.accent;(e.currentTarget as HTMLButtonElement).style.color=T.accent}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.border;(e.currentTarget as HTMLButtonElement).style.color=T.text2}}>
                    {btn.icon && <span>{btn.icon}</span>}{btn.label}
                  </button>
                ))}
                <button style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:8, border:`1px solid ${T.border}`, background:'transparent', color:T.text3, cursor:'pointer', fontSize:14 }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.border2;(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=T.border;(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>···</button>
              </div>

              {/* Blocked banner */}
              {local.blocked && (
                <div style={{ marginBottom:16, padding:'10px 14px', background:T.critDim, border:`1px solid ${T.crit}30`, borderRadius:8, display:'flex', gap:8 }}>
                  <span style={{ color:T.crit, flexShrink:0 }}>⛔</span>
                  <div>
                    <p style={{ margin:'0 0 2px', fontSize:11, fontWeight:700, color:T.crit }}>Bloqueado</p>
                    <p style={{ margin:0, fontSize:12, color:T.text2 }}>{local.blockedReason || 'Motivo não especificado.'}</p>
                  </div>
                </div>
              )}

              {/* Description */}
              <section style={{ marginBottom:22 }}>
                <SecHeader title="Descrição" />
                {local.description?.trim() ? (
                  <p style={{ margin:0, fontSize:13, color:T.text2, lineHeight:1.7, whiteSpace:'pre-wrap' }}>{local.description}</p>
                ) : (
                  <div style={{ fontSize:12, color:T.text3, fontStyle:'italic', padding:'10px 12px', background:T.bgSurface2, borderRadius:8, border:`1px dashed ${T.border}` }}>
                    Sem descrição.{canEdit ? ' Clique para adicionar...' : ''}
                  </div>
                )}
              </section>

              {/* Child issues */}
              {children.length > 0 && (
                <section style={{ marginBottom:22 }}>
                  <SecHeader title="Child Issues" count={children.length} />
                  {/* Progress bar */}
                  <div style={{ marginBottom:10 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:11, color:T.text3 }}>{childPct}% concluído</span>
                      <span style={{ fontSize:11, color:T.text3 }}>{childDone}/{children.length}</span>
                    </div>
                    <div style={{ height:4, borderRadius:2, background:T.bgSurface2, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${childPct}%`, background:T.success, borderRadius:2, transition:'width 0.3s' }} />
                    </div>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                    {children.map(ch => {
                      const ct = TYPE_CFG[ch.type] ?? TYPE_CFG.task
                      return (
                        <div key={ch.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:8, cursor:'default' }}
                          onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=T.bgSurface2}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                          <span style={{ fontSize:12, color:ct.color, flexShrink:0 }}>{ct.icon}</span>
                          <span style={{ fontFamily:'monospace', fontSize:10, color:T.text3, flexShrink:0, minWidth:52 }}>{ch.key}</span>
                          <span style={{ flex:1, fontSize:12, color:T.text1, textDecoration:ch.status==='done'?'line-through':'none', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{ch.title}</span>
                          {ch.assigneeInitials && <Av i={ch.assigneeInitials} size={18} />}
                          <StatusPill status={ch.status} size="xs" />
                        </div>
                      )
                    })}
                  </div>
                  <button style={{ marginTop:6, fontSize:11, border:'none', background:'transparent', color:T.text3, cursor:'pointer', padding:'2px 4px', borderRadius:4 }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color=T.accent}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color=T.text3}}>+ Adicionar child issue</button>
                </section>
              )}

              {/* Linked issues */}
              {(linkedIssues.length > 0 || canEdit) && (
                <section style={{ marginBottom:22 }}>
                  <SecHeader title="Relações" count={linkedIssues.length}
                    action={
                      <button onClick={()=>setAddRelOpen(true)}
                        style={{ fontSize:11, border:'none', background:'transparent', color:T.text3, cursor:'pointer', padding:'2px 8px', borderRadius:6 }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.color=T.accent;(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.color=T.text3;(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>
                        + Vincular issue
                      </button>
                    }
                  />
                  {linkedIssues.length === 0 ? (
                    <div style={{ fontSize:12, color:T.text3, fontStyle:'italic' }}>Nenhuma relação. Clique em "+ Vincular issue" para adicionar.</div>
                  ) : (
                    Object.entries(linkedByType).map(([relType, items]) => (
                      <div key={relType} style={{ marginBottom:10 }}>
                        <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.05em', color:T.text3, display:'block', marginBottom:4 }}>{relType}</span>
                        {items.map(li => (
                          <div key={li.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 8px', borderRadius:8 }}
                            onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=T.bgSurface2}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                            <span style={{ fontFamily:'monospace', fontSize:10, color:T.accent, flexShrink:0, minWidth:52 }}>{li.key}</span>
                            <span style={{ flex:1, fontSize:12, color:T.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{li.title}</span>
                            {li.assigneeInitials && <Av i={li.assigneeInitials} size={18} />}
                            <span style={{ fontSize:10, color:PRIORITY_COLOR[li.priority], flexShrink:0 }}>●</span>
                            <StatusPill status={li.status} size="xs" />
                          </div>
                        ))}
                      </div>
                    ))
                  )}
                </section>
              )}

              {/* Acceptance criteria (story / task) */}
              {(local.type === 'story' || local.type === 'task' || acItems.length > 0) && (
                <section style={{ marginBottom:22 }}>
                  <SecHeader title="Critérios de aceite" count={acDone} />
                  <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                    {acItems.map(item => (
                      <div key={item.id} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'5px 8px', borderRadius:8, cursor:'default' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=T.bgSurface2}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}>
                        <button onClick={()=>toggleAc(item.id)}
                          style={{ width:16, height:16, borderRadius:4, border:`1.5px solid ${item.done?T.success:T.border2}`, background:item.done?T.success:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', flexShrink:0, marginTop:1 }}>
                          {item.done && <svg width="9" height="9" viewBox="0 0 9 9" fill="none"><path d="M1.5 4.5L3.5 6.5L7.5 2.5" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>}
                        </button>
                        <span style={{ flex:1, fontSize:12, color:item.done?T.text3:T.text1, textDecoration:item.done?'line-through':'none', lineHeight:1.45 }}>{item.text}</span>
                        {canEdit && (
                          <button onClick={()=>removeAcItem(item.id)}
                            style={{ width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', border:'none', background:'transparent', color:T.text3, cursor:'pointer', fontSize:14, opacity:0, transition:'opacity 0.12s', borderRadius:4 }}
                            onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2}}
                            onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent'}}
                            className="group-hover:opacity-100">×</button>
                        )}
                      </div>
                    ))}
                    {canEdit && (
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:4 }}>
                        <input value={newAc} onChange={e=>setNewAc(e.target.value)}
                          onKeyDown={e=>{ if(e.key==='Enter') addAcItem() }}
                          placeholder="+ Adicionar critério..."
                          style={{ flex:1, height:28, padding:'0 10px', borderRadius:8, border:`1px dashed ${T.border}`, background:'transparent', color:T.text1, fontSize:12, fontFamily:'inherit', outline:'none' }}
                          onFocus={e=>{e.currentTarget.style.borderColor=T.accent}}
                          onBlur={e=>{e.currentTarget.style.borderColor=T.border}} />
                        {newAc && (
                          <button onClick={addAcItem} style={{ height:28, padding:'0 10px', borderRadius:8, border:'none', background:T.accent, color:'white', fontSize:11, fontWeight:600, cursor:'pointer' }}>OK</button>
                        )}
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* Activity: history + comments */}
              <section style={{ marginBottom:22 }}>
                <SecHeader title="Atividade" />
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {/* History entries — most recent first */}
                  {history.map((h, i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 10px', borderRadius:8, background:T.bgSurface2, border:`1px solid ${T.border}` }}>
                      <span style={{ width:22, height:22, borderRadius:'50%', background:T.neutralDim, display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:8, fontWeight:700, color:T.text3, flexShrink:0, marginTop:1 }}>{h.authorInitials}</span>
                      <div style={{ flex:1, minWidth:0 }}>
                        <span style={{ fontSize:11, color:T.text2 }}>
                          <span style={{ fontWeight:600, color:T.text1 }}>{h.authorName}</span>
                          {' alterou '}<span style={{ color:T.accent }}>{h.field}</span>
                          {': '}
                          <span style={{ color:T.text3, textDecoration:'line-through' }}>{h.from}</span>
                          {' → '}
                          <span style={{ color:T.success }}>{h.to}</span>
                        </span>
                        <span style={{ display:'block', fontSize:10, color:T.text3, marginTop:2 }}>{h.time}</span>
                      </div>
                    </div>
                  ))}
                  {/* Comments */}
                  {comments.map((c,i) => (
                    <div key={i} style={{ display:'flex', gap:10 }}>
                      <Av i={c.author} size={28} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6 }}>
                          <span style={{ fontSize:12, fontWeight:600, color:T.text1 }}>{c.authorName ?? c.author}</span>
                          <span style={{ fontSize:10, color:T.text3 }}>{c.time}</span>
                        </div>
                        <p style={{ margin:0, fontSize:12, color:T.text2, lineHeight:1.6, padding:'8px 12px', background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:10 }}>{c.body}</p>
                      </div>
                    </div>
                  ))}
                  {/* Compose */}
                  <div style={{ display:'flex', gap:10 }}>
                    <Av i={activeUser.name.split(' ').slice(0,2).map((p: string)=>p[0]).join('')} size={28} />
                    <div style={{ flex:1 }}>
                      <textarea value={commentText} onChange={e=>setCommentText(e.target.value)}
                        rows={2} placeholder="Adicionar comentário..."
                        style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:`1px solid ${T.border}`, background:T.bgSurface2, color:T.text1, fontSize:12, resize:'none', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                        onFocus={e=>{e.currentTarget.style.borderColor=T.accent}}
                        onBlur={e=>{e.currentTarget.style.borderColor=T.border}} />
                      {commentText && (
                        <button onClick={handleAddComment} style={{ marginTop:6, height:28, padding:'0 12px', borderRadius:8, border:'none', background:T.accent, color:'white', fontSize:12, fontWeight:600, cursor:'pointer' }}>Salvar</button>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* ── Right details panel ───────────────────────────────────────── */}
            <div style={{ width:220, flexShrink:0, borderLeft:`1px solid ${T.border}`, overflowY:'auto', padding:'14px 16px' }}>
              <p style={{ margin:'0 0 6px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.06em', color:T.text3 }}>Detalhes</p>

              {/* Assignee */}
              <DetailRow label="Responsável">
                {canEdit && (data.availableMembers?.length ?? 0) > 0 ? (
                  <div>
                    <MemberSelector
                      value={local.assigneeInitials}
                      members={data.availableMembers!}
                      allowNone
                      onChange={m => {
                        const from = (local.assigneeName ?? local.assigneeInitials) || 'Nenhum'
                        const to   = m ? m.name : 'Nenhum'
                        trackChange('Responsável', from, to, { assigneeInitials: m?.initials ?? '', assigneeName: m?.name })
                      }}
                    />
                    <button onClick={handleAssignToMe}
                      style={{ marginTop:4, fontSize:10, color:T.accent, border:'none', background:'transparent', cursor:'pointer', padding:0, fontFamily:'inherit' }}
                      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.textDecoration='underline'}}
                      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.textDecoration='none'}}>Atribuir a mim</button>
                  </div>
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {local.assigneeInitials ? <Av i={local.assigneeInitials} size={20} /> : null}
                    <span style={{ fontSize:12, color:T.text1 }}>{(local.assigneeName ?? local.assigneeInitials) || '—'}</span>
                  </div>
                )}
              </DetailRow>

              {/* Labels */}
              <DetailRow label="Labels">
                {canEdit && (data.availableLabels?.length ?? 0) > 0 ? (
                  <LabelEditor
                    selected={local.labels}
                    available={data.availableLabels!}
                    onChange={labels => {
                      const from = local.labels.join(', ') || 'Nenhum'
                      const to   = labels.join(', ') || 'Nenhum'
                      trackChange('Labels', from, to, { labels })
                    }}
                  />
                ) : local.labels.length > 0 ? (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {local.labels.map(l => (
                      <span key={l} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:T.indigoDim, color:T.indigo, border:`1px solid ${T.indigo}30` }}>{l}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:T.text3, fontStyle:'italic' }}>—</span>
                )}
              </DetailRow>

              {/* Priority */}
              <DetailRow label="Prioridade">
                {canEdit ? (
                  <InlineSelect
                    value={local.priority}
                    options={PRIORITIES}
                    onChange={v => {
                      const from = PRIORITY_LABEL[local.priority] ?? local.priority
                      const to   = PRIORITY_LABEL[v] ?? v
                      trackChange('Prioridade', from, to, { priority: v })
                    }}
                    getLabel={v=>PRIORITY_LABEL[v]}
                    getColor={v=>PRIORITY_COLOR[v]}
                  />
                ) : (
                  <span style={{ color:PRIORITY_COLOR[local.priority], fontSize:12 }}>{PRIORITY_LABEL[local.priority]}</span>
                )}
              </DetailRow>

              {/* Fix versions */}
              <DetailRow label="Fix versions">
                {canEdit && (data.availableVersions?.length ?? 0) > 0 ? (
                  <SearchableSelect
                    value={local.fixVersions?.[0]}
                    options={(data.availableVersions ?? []).map(v => ({ id:v, label:v }))}
                    onChange={id => {
                      const from = local.fixVersions?.join(', ') || 'Nenhuma'
                      const to   = id ?? 'Nenhuma'
                      trackChange('Fix version', from, to, { fixVersions: id ? [id] : [] })
                    }}
                    placeholder="Buscar versão…"
                    noneLabel="Nenhuma versão"
                  />
                ) : (local.fixVersions?.length ?? 0) > 0 ? (
                  <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                    {local.fixVersions!.map(v=>(
                      <span key={v} style={{ fontSize:10, padding:'2px 8px', borderRadius:20, background:T.successDim, color:T.success, border:`1px solid ${T.success}30` }}>{v}</span>
                    ))}
                  </div>
                ) : (
                  <span style={{ fontSize:11, color:T.text3, fontStyle:'italic' }}>—</span>
                )}
              </DetailRow>

              {/* Reporter */}
              <DetailRow label="Relator">
                {canEdit && (data.availableMembers?.length ?? 0) > 0 ? (
                  <MemberSelector
                    value={local.reporterInitials}
                    members={data.availableMembers!}
                    allowNone
                    onChange={m => {
                      const from = local.reporterName ?? local.reporterInitials ?? 'Nenhum'
                      const to   = m ? m.name : 'Nenhum'
                      trackChange('Relator', from, to, { reporterInitials: m?.initials, reporterName: m?.name })
                    }}
                  />
                ) : (
                  <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                    {local.reporterInitials && <Av i={local.reporterInitials} size={18} />}
                    <span style={{ fontSize:12 }}>{local.reporterName ?? local.reporterInitials ?? '—'}</span>
                  </div>
                )}
              </DetailRow>

              {/* Points */}
              <DetailRow label="Story pts">
                {canEdit ? (
                  <InlineNumber
                    value={local.points}
                    onChange={n => {
                      const from = local.points != null ? `${local.points} pt` : '—'
                      const to   = n != null ? `${n} pt` : '—'
                      trackChange('Story pts', from, to, { points: n })
                    }}
                  />
                ) : (
                  <span style={{ fontSize:12 }}>{(local.points ?? 0) > 0 ? `${local.points} pt` : '—'}</span>
                )}
              </DetailRow>

              {/* Due date */}
              <DetailRow label="Prazo">
                {canEdit ? (
                  <InlineDate
                    value={local.dueDate}
                    delayed={local.delayed}
                    onChange={d => {
                      const from = local.dueDate ?? '—'
                      trackChange('Prazo', from, d, { dueDate: d })
                    }}
                  />
                ) : (
                  <span style={{ fontSize:12, color:local.delayed?T.warn:T.text1 }}>{local.dueDate ?? '—'}</span>
                )}
              </DetailRow>

              {/* Sprint */}
              <DetailRow label="Sprint">
                {canEdit && (data.availableSprints?.length ?? 0) > 0 ? (
                  <SearchableSelect
                    value={local.sprintId}
                    options={(data.availableSprints ?? []).map(s => ({ id:s.id, label:s.name }))}
                    onChange={id => {
                      const sprint = (data.availableSprints ?? []).find(s => s.id === id)
                      const from   = local.sprintName ?? 'Backlog'
                      const to     = sprint?.name ?? 'Backlog'
                      trackChange('Sprint', from, to, { sprintId: id ?? undefined, sprintName: sprint?.name })
                    }}
                    placeholder="Buscar sprint…"
                    noneLabel="Backlog"
                  />
                ) : (
                  <span style={{ fontSize:12 }}>{local.sprintName ?? '—'}</span>
                )}
              </DetailRow>

              {/* Epic */}
              {((data.availableEpics?.length ?? 0) > 0 || local.epicLabel) && (
                <DetailRow label="Épico">
                  {canEdit && (data.availableEpics?.length ?? 0) > 0 ? (
                    <EpicSelector
                      value={local.epicKey}
                      epics={data.availableEpics!}
                      onChange={handleEpicChange}
                    />
                  ) : (
                    <span style={{ fontSize:12, color:local.epicColor ?? T.warn }}>
                      {local.epicLabel ?? <span style={{ color:T.text3, fontStyle:'italic' }}>Nenhum</span>}
                    </span>
                  )}
                </DetailRow>
              )}

              {/* Bug severity */}
              {local.type === 'bug' && (
                <DetailRow label="Severidade">
                  {canEdit ? (
                    <InlineSelect
                      value={local.severity ?? 'medium'}
                      options={['critical','high','medium','low']}
                      onChange={v => {
                        const from = local.severity ?? '—'
                        trackChange('Severidade', from, v, { severity: v })
                      }}
                      getLabel={v => v.charAt(0).toUpperCase()+v.slice(1)}
                      getColor={v => v==='critical'?T.crit:v==='high'?T.warn:v==='low'?T.text3:T.accent}
                    />
                  ) : (
                    <span style={{ fontSize:12, fontWeight:600, color:local.severity==='critical'?T.crit:local.severity==='high'?T.warn:T.accent }}>
                      {local.severity ? local.severity.charAt(0).toUpperCase()+local.severity.slice(1) : '—'}
                    </span>
                  )}
                </DetailRow>
              )}

              {/* Timestamps */}
              {local.createdAt && (
                <DetailRow label="Criado em">
                  <span style={{ fontSize:11, color:T.text3 }}>{local.createdAt}</span>
                </DetailRow>
              )}
              {local.updatedAt && (
                <DetailRow label="Atualizado">
                  <span style={{ fontSize:11, color:T.text3 }}>{local.updatedAt}</span>
                </DetailRow>
              )}
            </div>
          </>}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position:'absolute', bottom:18, left:'50%', transform:'translateX(-50%)',
          background:T.bgSurface2, border:`1px solid ${T.border2}`, borderRadius:10,
          padding:'8px 18px', fontSize:12, fontWeight:600, color:T.text1,
          boxShadow:T.shadow2, zIndex:400, whiteSpace:'nowrap',
          display:'flex', alignItems:'center', gap:8,
          animation:'slideUp 0.2s ease',
        }}>
          <span style={{ fontSize:14, color:T.success }}>✓</span>
          {toast}
        </div>
      )}
    </>
  )
}

function ActionBtn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <button title={title}
      style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:'none', background:'transparent', color:T.text3, cursor:'pointer' }}
      onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=T.bgSurface2;(e.currentTarget as HTMLButtonElement).style.color=T.text2}}
      onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color=T.text3}}>
      {children}
    </button>
  )
}
