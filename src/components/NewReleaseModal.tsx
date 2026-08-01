import { useState, useRef, useEffect } from 'react'
import { T } from './ds/tokens'
import { ISSUES, STATUS_CFG, TYPE_ICON } from '../data/issues'

// Issues pre-loaded into the "linkable" list (typical candidates without a release yet)
const INITIAL_LINKABLE = [
  { key:'PM-106', title:'Copywriting da página de preços v2' },
  { key:'PM-109', title:'Entrevistas com 5 clientes trial' },
  { key:'PM-110', title:'Auditoria de a11y nas páginas' },
  { key:'PM-114', title:'Auditoria de metadata SEO' },
  { key:'PM-116', title:'Sistema de busca do portal' },
]

const inputStyle: React.CSSProperties = {
  width:'100%', background:'#1e222c', border:'1px solid #262b37',
  borderRadius:8, padding:'8px 12px', color:'#e7eaf2', fontSize:13, outline:'none', boxSizing:'border-box',
}

interface LinkableItem { key: string; title: string }
interface Props { onClose:()=>void; onSave:(r:{version:string;name:string;date:string;notes:string})=>void }

// ─── Issue search for linkable section ───────────────────────────────────────
function IssueSearchDropdown({
  linkable, onAdd,
}: { linkable: LinkableItem[]; onAdd: (item: LinkableItem) => void }) {
  const [query,  setQuery]  = useState('')
  const [open,   setOpen]   = useState(false)
  const [cursor, setCursor] = useState(-1)
  const ref      = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const linkedKeys = new Set(linkable.map(l => l.key))

  const results = query.trim().length < 1 ? [] : ISSUES.filter(i => {
    if (linkedKeys.has(i.key)) return false
    const q = query.toLowerCase()
    return (
      i.key.toLowerCase().includes(q) ||
      i.title.toLowerCase().includes(q) ||
      i.labels.some(l => l.toLowerCase().includes(q)) ||
      (i.epic ?? '').toLowerCase().includes(q)
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
      const hit = results[cursor]
      onAdd({ key: hit.key, title: hit.title })
      setQuery(''); setOpen(false); setCursor(-1)
    } else if (e.key === 'Escape') { setOpen(false); setQuery(''); setCursor(-1) }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={ref} style={{ position: 'relative', marginBottom: 8 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        background: '#1e222c', border: `1px solid ${open ? T.accent : '#262b37'}`,
        borderRadius: 8, padding: '7px 12px', transition: 'border-color 0.15s',
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
          placeholder="Buscar issue por título, key, épico ou funcionalidade…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 12, color: '#e7eaf2' }}
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
          background: '#1e222c', border: `1px solid #262b37`,
          borderRadius: 8, boxShadow: T.shadowModal, overflow: 'hidden',
        }}>
          {results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 12, color: T.text3, textAlign: 'center' }}>
              Nenhuma issue encontrada para "{query}"
            </div>
          ) : (
            results.map((issue, idx) => {
              const sc = STATUS_CFG[issue.status]
              const ti = TYPE_ICON[issue.type]
              const isCursor = idx === cursor
              return (
                <div
                  key={issue.key}
                  onMouseDown={e => {
                    e.preventDefault()
                    onAdd({ key: issue.key, title: issue.title })
                    setQuery(''); setOpen(false); setCursor(-1)
                  }}
                  onMouseEnter={() => setCursor(idx)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
                    cursor: 'pointer',
                    background: isCursor ? `${T.accent}18` : 'transparent',
                    borderTop: idx > 0 ? `1px solid #262b37` : 'none',
                    transition: 'background 0.1s',
                  }}
                >
                  <span style={{ color: ti.color, fontSize: 13, flexShrink: 0 }}>{ti.icon}</span>
                  <span style={{ fontSize: 11, color: T.text3, fontFamily: 'monospace', width: 62, flexShrink: 0 }}>{issue.key}</span>
                  <span style={{ fontSize: 12, color: '#e7eaf2', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{issue.title}</span>
                  <span style={{ fontSize: 10, color: sc.color, background: sc.bg, borderRadius: 20, padding: '1px 7px', flexShrink: 0 }}>{sc.label}</span>
                  <span style={{ fontSize: 10, color: T.accent, background: T.accentDim, borderRadius: 4, padding: '1px 6px', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    + Adicionar
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

// ─── Modal ────────────────────────────────────────────────────────────────────
export function NewReleaseModal({ onClose, onSave }: Props) {
  const [version,  setVersion]  = useState('')
  const [name,     setName]     = useState('')
  const [date,     setDate]     = useState('')
  const [status,   setStatus]   = useState('planned')
  const [notes,    setNotes]    = useState('')
  const [linkable, setLinkable] = useState<LinkableItem[]>(INITIAL_LINKABLE)
  const [selected, setSelected] = useState<string[]>([])
  const [success,  setSuccess]  = useState(false)
  const canSubmit = version.trim().length > 0 && name.trim().length > 0

  function toggle(key: string) { setSelected(s => s.includes(key) ? s.filter(k=>k!==key) : [...s,key]) }

  function addFromSearch(item: LinkableItem) {
    // Guard against duplicates
    if (linkable.some(l => l.key === item.key)) return
    setLinkable(prev => [item, ...prev])
    // Auto-check when added via search
    setSelected(prev => prev.includes(item.key) ? prev : [...prev, item.key])
  }

  if (success) return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
      <div style={{ background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:16,padding:40,boxShadow:T.shadowModal,width:400,textAlign:'center' }}>
        <div style={{ fontSize:48,marginBottom:12 }}>✅</div>
        <p style={{ fontSize:16,fontWeight:700,color:T.text1,marginBottom:6 }}>Release criada!</p>
        <p style={{ fontSize:22,fontWeight:800,color:T.accent,marginBottom:4 }}>{version} — {name}</p>
        {selected.length > 0 && (
          <p style={{ fontSize:12,color:T.text3,marginBottom:20 }}>{selected.length} issue{selected.length!==1?'s':''} vinculada{selected.length!==1?'s':''}</p>
        )}
        <div style={{ display:'flex',gap:10,justifyContent:'center' }}>
          <button onClick={()=>{onSave({version,name,date,notes});onClose()}} style={{ padding:'8px 20px',borderRadius:8,background:T.accent,color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer' }}>Ver releases →</button>
          <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:8,background:'transparent',color:T.text2,border:`1px solid ${T.border}`,fontSize:13,cursor:'pointer' }}>Fechar</button>
        </div>
      </div>
    </div>
  )

  return (
    <div onClick={e=>{if(e.target===e.currentTarget)onClose()}} style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000 }}>
      <div style={{ background:T.bgSurface,border:`1px solid ${T.border}`,borderRadius:16,padding:28,boxShadow:T.shadowModal,width:520,maxHeight:'90vh',overflowY:'auto' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <h2 style={{ margin:0,fontSize:18,fontWeight:700,color:T.text1 }}>Nova Release</h2>
          <button onClick={onClose} style={{ background:'none',border:'none',color:T.text3,fontSize:20,cursor:'pointer',lineHeight:1 }}>×</button>
        </div>

        <div style={{ display:'flex',flexDirection:'column',gap:16 }}>
          <div>
            <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'.04em' }}>Versão *</label>
            <input value={version} onChange={e=>setVersion(e.target.value)} placeholder="v1.3.0" style={inputStyle} />
            <p style={{ fontSize:11,color:T.text3,marginTop:4,marginBottom:0 }}>Próxima sugerida: <span style={{ color:T.accent }}>v1.2.0</span></p>
          </div>

          <div>
            <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'.04em' }}>Nome da release *</label>
            <input value={name} onChange={e=>setName(e.target.value)} placeholder="Ex: Pesquisa & SEO" style={inputStyle} />
          </div>

          <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:12 }}>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'.04em' }}>Data planejada</label>
              <input type="date" value={date} onChange={e=>setDate(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'.04em' }}>Status</label>
              <select value={status} onChange={e=>setStatus(e.target.value)} style={inputStyle}>
                <option value="planned">Planejada</option>
                <option value="in-progress">Em andamento</option>
                <option value="released">Lançada</option>
              </select>
            </div>
          </div>

          {/* Issues vinculadas */}
          <div>
            <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:8,display:'flex',alignItems:'center',gap:6,textTransform:'uppercase',letterSpacing:'.04em' }}>
              Issues vinculadas
              {selected.length > 0 && (
                <span style={{ color:T.accent, textTransform:'none', letterSpacing:0, fontWeight:700 }}>
                  · {selected.length} selecionada{selected.length!==1?'s':''}
                </span>
              )}
            </label>

            {/* Search field */}
            <IssueSearchDropdown linkable={linkable} onAdd={addFromSearch} />

            {/* Checkbox list */}
            <div style={{ border:`1px solid ${T.border}`,borderRadius:8,overflow:'hidden',maxHeight:240,overflowY:'auto' }}>
              {linkable.map((issue, i) => {
                const isSelected = selected.includes(issue.key)
                const fullIssue  = ISSUES.find(x => x.key === issue.key)
                const sc = fullIssue ? STATUS_CFG[fullIssue.status] : null
                return (
                  <label key={issue.key} style={{
                    display:'flex', alignItems:'center', gap:10, padding:'8px 12px', cursor:'pointer',
                    background: isSelected ? T.accentDim : 'transparent',
                    borderTop: i > 0 ? `1px solid ${T.border}` : 'none',
                    transition: 'background 0.1s',
                  }}>
                    <input type="checkbox" checked={isSelected} onChange={()=>toggle(issue.key)} style={{ accentColor:T.accent, flexShrink:0 }} />
                    <span style={{ fontSize:11,fontWeight:700,color:T.accent,flexShrink:0,fontFamily:'monospace' }}>{issue.key}</span>
                    <span style={{ fontSize:12,color:T.text2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',flex:1 }}>{issue.title}</span>
                    {sc && (
                      <span style={{ fontSize:10,color:sc.color,background:sc.bg,borderRadius:20,padding:'1px 7px',flexShrink:0 }}>{sc.label}</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize:11,fontWeight:600,color:T.text3,marginBottom:5,display:'block',textTransform:'uppercase',letterSpacing:'.04em' }}>Notas de release</label>
            <textarea value={notes} onChange={e=>setNotes(e.target.value)} rows={3} placeholder="O que muda nesta release…" style={{ ...inputStyle,resize:'vertical',fontFamily:'inherit' }} />
          </div>
        </div>

        <div style={{ display:'flex',justifyContent:'flex-end',gap:10,marginTop:24,paddingTop:20,borderTop:`1px solid ${T.border}` }}>
          <button onClick={onClose} style={{ padding:'8px 18px',borderRadius:8,background:'transparent',color:T.text2,border:`1px solid ${T.border}`,fontSize:13,cursor:'pointer' }}>Cancelar</button>
          <button onClick={()=>canSubmit&&setSuccess(true)} disabled={!canSubmit} style={{ padding:'8px 20px',borderRadius:8,background:canSubmit?T.accent:T.border,color:canSubmit?'#fff':T.text3,border:'none',fontSize:13,fontWeight:600,cursor:canSubmit?'pointer':'not-allowed',opacity:canSubmit?1:.55 }}>
            Criar release
          </button>
        </div>
      </div>
    </div>
  )
}
