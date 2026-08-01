import React, { useState, useRef, useEffect } from 'react'
import { T } from '../components/ds/tokens'
import {
  ISSUES, EPICS, SPRINTS, STATUS_CFG, PRIORITY_CFG, TYPE_ICON, AV_COLOR,
  type Issue, type IssueStatus, type Priority,
} from '../data/issues'
import { WorkItemDetail, type WorkItemData } from '../components/WorkItemDetail'

type SortKey = 'key' | 'title' | 'status' | 'priority' | 'assignee' | 'points' | 'epic' | 'sprint' | 'dueDate'
type SortDir = 'asc' | 'desc'
type GroupBy = 'none' | 'sprint' | 'epic'

const ALL_COLS = ['key','type','title','status','priority','assignee','points','epic','sprint','labels','dueDate'] as const
type ColId = typeof ALL_COLS[number]

const DEFAULT_COLS: ColId[] = ['key','type','title','status','priority','assignee','points']
const COL_LABELS: Record<ColId, string> = {
  key:'Key', type:'Tipo', title:'Título', status:'Status', priority:'Prioridade',
  assignee:'Responsável', points:'Pts', epic:'Épico', sprint:'Sprint', labels:'Labels', dueDate:'Venc.',
}

const ASSIGNEES = ['AL','NM','JN','CS','RM','LF']

function Avatar({ name }: { name: string }) {
  return (
    <span style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center',
      width:22, height:22, borderRadius:'50%', fontSize:10, fontWeight:700,
      background: AV_COLOR[name] ?? T.text3, color:'#fff',
    }}>{name}</span>
  )
}

export default function ListPage() {
  const [cols, setCols] = useState<ColId[]>(DEFAULT_COLS)
  const [colsOpen, setColsOpen] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('key')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [groupBy, setGroupBy] = useState<GroupBy>('none')
  const [search, setSearch] = useState('')
  const [editCell, setEditCell] = useState<{key:string;col:ColId}|null>(null)
  const [overrides, setOverrides] = useState<Record<string,Partial<Issue>>>({})
  const [selectedKey, setSelectedKey] = useState<string|null>(null)
  const colsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (colsRef.current && !colsRef.current.contains(e.target as Node)) setColsOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const issues = ISSUES.map(i => ({ ...i, ...(overrides[i.key] ?? {}) }))

  const filtered = issues.filter(i =>
    i.title.toLowerCase().includes(search.toLowerCase())
  )

  const sorted = [...filtered].sort((a, b) => {
    const av = String((a as Record<string,unknown>)[sortKey] ?? '')
    const bv = String((b as Record<string,unknown>)[sortKey] ?? '')
    return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
  })

  function toggleSort(k: SortKey) {
    if (sortKey === k) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(k); setSortDir('asc') }
  }

  function toggleCol(c: ColId) {
    setCols(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
  }

  function setOverride(key: string, field: string, val: unknown) {
    setOverrides(prev => ({ ...prev, [key]: { ...prev[key], [field]: val } }))
  }

  function issueToWID(issue: Issue): WorkItemData {
    const epic   = EPICS.find(e => e.id === issue.epic)
    const sprint = SPRINTS.find(s => s.id === issue.sprint)
    return {
      key:              issue.key,
      type:             issue.type,
      title:            issue.title,
      status:           issue.status,
      priority:         issue.priority,
      labels:           issue.labels,
      assigneeInitials: issue.assignee,
      assigneeName:     issue.assignee,
      points:           issue.points,
      dueDate:          issue.dueDate,
      blocked:          issue.blocked,
      delayed:          issue.delayed,
      epicKey:          epic?.id,
      epicLabel:        epic?.label,
      epicColor:        epic?.color,
      sprintId:         sprint?.id,
      sprintName:       sprint?.name,
      availableEpics:   EPICS.map(e => ({ id: e.id, label: e.label, color: e.color })),
      availableSprints: SPRINTS.map(s => ({ id: s.id, name: s.name })),
      availableMembers: ASSIGNEES.map(a => ({ id: a, name: a, initials: a })),
      availableLabels:  ['Design','Eng','Hero','Mobile','SEO','Auth','Backend','API','UX'],
    }
  }

  function handleDetailUpdate(updated: WorkItemData) {
    setOverrides(prev => ({
      ...prev,
      [updated.key]: {
        ...prev[updated.key],
        title:    updated.title,
        status:   updated.status   as IssueStatus,
        priority: updated.priority as Priority,
        labels:   updated.labels,
        assignee: updated.assigneeInitials,
        points:   updated.points ?? 0,
        epic:     updated.epicKey,
        sprint:   updated.sprintId,
      },
    }))
  }

  const selectedIssue = selectedKey
    ? issues.find(i => i.key === selectedKey) ?? null
    : null

  function groupIssues(): { label: string; items: Issue[] }[] {
    if (groupBy === 'none') return [{ label: '', items: sorted }]
    if (groupBy === 'sprint') {
      const groups: Record<string, Issue[]> = {}
      sorted.forEach(i => {
        const k = i.sprint ?? '__none__'
        if (!groups[k]) groups[k] = []
        groups[k].push(i)
      })
      return Object.entries(groups).map(([k, items]) => ({
        label: k === '__none__' ? 'Sem sprint' : (SPRINTS.find(s => s.id === k)?.name ?? k),
        items,
      }))
    }
    // epic
    const groups: Record<string, Issue[]> = {}
    sorted.forEach(i => {
      const k = i.epic ?? '__none__'
      if (!groups[k]) groups[k] = []
      groups[k].push(i)
    })
    return Object.entries(groups).map(([k, items]) => ({
      label: k === '__none__' ? 'Sem épico' : (EPICS.find(e => e.id === k)?.label ?? k),
      items,
    }))
  }

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})

  const groups = groupIssues()

  const colW: Record<ColId, number | string> = {
    key: 90, type: 44, title: 260, status: 130, priority: 110,
    assignee: 90, points: 56, epic: 130, sprint: 110, labels: 120, dueDate: 80,
  }

  function renderCell(issue: Issue, col: ColId) {
    const isEditing = editCell?.key === issue.key && editCell?.col === col
    const startEdit = () => setEditCell({ key: issue.key, col })
    const stopEdit = () => setEditCell(null)

    const cellStyle: React.CSSProperties = {
      padding:'0 10px', display:'flex', alignItems:'center',
      width: colW[col], minWidth: colW[col], maxWidth: colW[col],
      overflow:'hidden', whiteSpace:'nowrap',
      border: isEditing ? `1.5px solid ${T.accent}` : 'none',
      borderRadius: isEditing ? 4 : 0,
      background: isEditing ? T.accentDim : 'transparent',
      cursor: 'pointer',
    }

    if (col === 'key') return (
      <div style={{ ...cellStyle, cursor: 'default' }}>
        <button
          onClick={() => setSelectedKey(issue.key)}
          aria-label={`Abrir detalhe de ${issue.key}`}
          style={{
            background: 'none', border: 'none', padding: 0, cursor: 'pointer',
            color: T.accent, fontWeight: 600, fontSize: 12,
            textDecoration: 'underline', textDecorationColor: `${T.accent}55`,
            textUnderlineOffset: 3,
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.textDecorationColor = T.accent }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.textDecorationColor = `${T.accent}55` }}
          onFocus={e => { (e.currentTarget as HTMLButtonElement).style.outline = `2px solid ${T.accent}` }}
          onBlur={e => { (e.currentTarget as HTMLButtonElement).style.outline = 'none' }}
        >
          {issue.key}
        </button>
      </div>
    )
    if (col === 'type') {
      const t = TYPE_ICON[issue.type]
      return <div style={{...cellStyle,justifyContent:'center'}}><span style={{color:t.color,fontSize:14}}>{t.icon}</span></div>
    }
    if (col === 'title') {
      if (isEditing) return (
        <div style={cellStyle}>
          <input
            autoFocus
            defaultValue={issue.title}
            onBlur={e => { setOverride(issue.key,'title',e.target.value); stopEdit() }}
            onKeyDown={e => { if(e.key==='Enter'||e.key==='Escape') (e.target as HTMLInputElement).blur() }}
            style={{ background:'transparent', border:'none', outline:'none', color:T.text1, width:'100%', fontSize:13 }}
          />
        </div>
      )
      return (
        <div style={cellStyle} onClick={startEdit} title={issue.title}>
          {issue.blocked && <span style={{color:T.crit,marginRight:4,fontSize:10}}>⛔</span>}
          {issue.delayed && <span style={{color:T.warn,marginRight:4,fontSize:10}}>⚠</span>}
          <span style={{color:T.text1,fontSize:13,overflow:'hidden',textOverflow:'ellipsis'}}>{issue.title}</span>
        </div>
      )
    }
    if (col === 'status') {
      const cfg = STATUS_CFG[issue.status]
      if (isEditing) return (
        <div style={cellStyle}>
          <select
            autoFocus
            value={issue.status}
            onChange={e => { setOverride(issue.key,'status',e.target.value); stopEdit() }}
            onBlur={stopEdit}
            style={{ background:T.bgSurface2, border:`1px solid ${T.border}`, color:T.text1, borderRadius:4, fontSize:12, padding:'2px 4px' }}
          >
            {(Object.keys(STATUS_CFG) as IssueStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_CFG[s].label}</option>
            ))}
          </select>
        </div>
      )
      return (
        <div style={cellStyle} onClick={startEdit}>
          <span style={{ background:cfg.bg, color:cfg.color, borderRadius:4, padding:'2px 7px', fontSize:11, fontWeight:600 }}>{cfg.label}</span>
        </div>
      )
    }
    if (col === 'priority') {
      const cfg = PRIORITY_CFG[issue.priority]
      if (isEditing) return (
        <div style={cellStyle}>
          <select
            autoFocus
            value={issue.priority}
            onChange={e => { setOverride(issue.key,'priority',e.target.value); stopEdit() }}
            onBlur={stopEdit}
            style={{ background:T.bgSurface2, border:`1px solid ${T.border}`, color:T.text1, borderRadius:4, fontSize:12, padding:'2px 4px' }}
          >
            {(Object.keys(PRIORITY_CFG) as Priority[]).map(p => (
              <option key={p} value={p}>{PRIORITY_CFG[p].label}</option>
            ))}
          </select>
        </div>
      )
      return (
        <div style={cellStyle} onClick={startEdit}>
          <span style={{color:cfg.color,marginRight:4,fontWeight:700,fontSize:11}}>{cfg.icon}</span>
          <span style={{color:cfg.color,fontSize:11}}>{cfg.label}</span>
        </div>
      )
    }
    if (col === 'assignee') {
      if (isEditing) return (
        <div style={cellStyle}>
          <select
            autoFocus
            value={issue.assignee}
            onChange={e => { setOverride(issue.key,'assignee',e.target.value); stopEdit() }}
            onBlur={stopEdit}
            style={{ background:T.bgSurface2, border:`1px solid ${T.border}`, color:T.text1, borderRadius:4, fontSize:12, padding:'2px 4px' }}
          >
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      )
      return (
        <div style={cellStyle} onClick={startEdit}>
          <Avatar name={issue.assignee} />
          <span style={{color:T.text2,fontSize:12,marginLeft:6}}>{issue.assignee}</span>
        </div>
      )
    }
    if (col === 'points') return <div style={{...cellStyle,justifyContent:'center'}}><span style={{color:T.text2,fontSize:12}}>{issue.points}</span></div>
    if (col === 'epic') {
      const epic = EPICS.find(e => e.id === issue.epic)
      return <div style={cellStyle}><span style={{color: epic?.color ?? T.text3, fontSize:11}}>{epic?.label ?? '—'}</span></div>
    }
    if (col === 'sprint') {
      const sp = SPRINTS.find(s => s.id === issue.sprint)
      return <div style={cellStyle}><span style={{color:T.text2,fontSize:11}}>{sp?.name ?? '—'}</span></div>
    }
    if (col === 'labels') return (
      <div style={{...cellStyle,gap:4}}>
        {issue.labels.slice(0,2).map(l => (
          <span key={l} style={{background:T.neutralDim,color:T.text2,borderRadius:3,padding:'1px 5px',fontSize:10}}>{l}</span>
        ))}
      </div>
    )
    if (col === 'dueDate') return <div style={cellStyle}><span style={{color:T.text3,fontSize:12}}>{issue.dueDate}</span></div>
    return <div style={cellStyle} />
  }

  const sortableCols: Partial<Record<ColId, SortKey>> = {
    key:'key', title:'title', status:'status', priority:'priority',
    assignee:'assignee', points:'points', dueDate:'dueDate',
  }

  return (
    <>
    <div style={{ background:T.bgPage, minHeight:'100vh', display:'flex', flexDirection:'column' }}>
      {/* Toolbar */}
      <div style={{ display:'flex', alignItems:'center', gap:10, padding:'14px 20px', borderBottom:`1px solid ${T.border}`, background:T.bgSurface }}>
        <span style={{ color:T.text1, fontWeight:700, fontSize:15, marginRight:8 }}>Backlog</span>
        <input
          placeholder="Filtrar por título…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background:T.bgSurface2, border:`1px solid ${T.border}`, borderRadius:6, color:T.text1, padding:'5px 10px', fontSize:13, width:200, outline:'none' }}
        />
        <span style={{color:T.text3,fontSize:13,marginLeft:4}}>Agrupar:</span>
        {(['none','sprint','epic'] as GroupBy[]).map(g => (
          <button key={g} onClick={() => setGroupBy(g)} style={{
            padding:'4px 10px', borderRadius:5, fontSize:12, cursor:'pointer',
            background: groupBy===g ? T.accentDim : 'transparent',
            color: groupBy===g ? T.accent : T.text2,
            border: `1px solid ${groupBy===g ? T.accent : T.border}`,
          }}>
            {g==='none'?'Nenhum':g==='sprint'?'Sprint':'Épico'}
          </button>
        ))}
        <div style={{marginLeft:'auto',display:'flex',gap:8,position:'relative'}} ref={colsRef}>
          <button onClick={() => setColsOpen(o=>!o)} style={{
            padding:'5px 12px', borderRadius:5, fontSize:12, cursor:'pointer',
            background: colsOpen ? T.accentDim : T.bgSurface2,
            color: colsOpen ? T.accent : T.text2,
            border:`1px solid ${colsOpen ? T.accent : T.border}`,
          }}>Colunas ▾</button>
          {colsOpen && (
            <div style={{
              position:'absolute', top:34, right:0, zIndex:50,
              background:T.bgSurface2, border:`1px solid ${T.border2}`, borderRadius:8,
              padding:'10px 14px', minWidth:160, boxShadow:T.shadowModal,
            }}>
              {ALL_COLS.map(c => (
                <label key={c} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', cursor:'pointer', color:T.text2, fontSize:13 }}>
                  <input type="checkbox" checked={cols.includes(c)} onChange={()=>toggleCol(c)} style={{accentColor:T.accent}} />
                  {COL_LABELS[c]}
                </label>
              ))}
            </div>
          )}
          <button style={{
            padding:'5px 12px', borderRadius:5, fontSize:12, cursor:'pointer',
            background:T.bgSurface2, color:T.text2, border:`1px solid ${T.border}`,
          }}>Exportar CSV ↓</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ overflowX:'auto', flex:1 }}>
        <table style={{ borderCollapse:'collapse', width:'max-content', minWidth:'100%' }}>
          <thead>
            <tr style={{ background:T.bgSurface, borderBottom:`1px solid ${T.border}` }}>
              {cols.map(col => {
                const sk = sortableCols[col]
                const active = sk && sortKey === sk
                return (
                  <th
                    key={col}
                    onClick={sk ? () => toggleSort(sk) : undefined}
                    style={{
                      width: colW[col], minWidth: colW[col], maxWidth: colW[col],
                      padding:'8px 10px', textAlign:'left', fontSize:11, fontWeight:700,
                      color: active ? T.accent : T.text3,
                      cursor: sk ? 'pointer' : 'default',
                      userSelect:'none', whiteSpace:'nowrap',
                      borderBottom: active ? `2px solid ${T.accent}` : `2px solid transparent`,
                    }}
                  >
                    {COL_LABELS[col]}{active ? (sortDir==='asc'?' ↑':' ↓') : ''}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <React.Fragment key={group.label}>
                {groupBy !== 'none' && (
                  <tr key={`g-${group.label}`}>
                    <td colSpan={cols.length} style={{ padding:'8px 12px', background:T.bgSurface2, borderBottom:`1px solid ${T.border}` }}>
                      <button
                        onClick={() => setCollapsed(c => ({...c,[group.label]:!c[group.label]}))}
                        style={{ background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', gap:8 }}
                      >
                        <span style={{color:T.text3,fontSize:12}}>{collapsed[group.label]?'▶':'▼'}</span>
                        <span style={{color:T.text2,fontWeight:700,fontSize:13}}>{group.label}</span>
                        <span style={{color:T.text3,fontSize:11}}>{group.items.length} issues · {group.items.reduce((s,i)=>s+i.points,0)} pts</span>
                      </button>
                    </td>
                  </tr>
                )}
                {!collapsed[group.label] && group.items.map((issue, idx) => (
                  <tr
                    key={issue.key}
                    style={{
                      borderBottom:`1px solid ${T.border}`,
                      background: idx % 2 === 0 ? T.bgPage : T.bgSurface,
                      transition:'background 0.12s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = T.bgSurface2)}
                    onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0 ? T.bgPage : T.bgSurface)}
                  >
                    {cols.map(col => (
                      <td key={col} style={{ padding:0, height:38 }}>
                        {renderCell(issue, col)}
                      </td>
                    ))}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    {selectedIssue && (
      <WorkItemDetail
        data={issueToWID(selectedIssue)}
        onUpdate={handleDetailUpdate}
        onClose={() => setSelectedKey(null)}
        mode="drawer"
      />
    )}
    </>
  )
}
