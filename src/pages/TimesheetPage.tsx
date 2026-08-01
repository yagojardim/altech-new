import { useState, useRef, useEffect } from 'react'
import { T } from '../components/ds/tokens'
import { useSession } from '../data/SessionContext'
import { can } from '../data/permissions'
import {
  getMyEntries, addEntry, updateEntry, deleteEntry, submitPeriodEntries,
  getApproversForTenant, ALL_ITEMS,
  type TimesheetEntry, type TimesheetStatus,
} from '../data/timesheets'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtDate(d: string) {
  if (!d) return ''
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

function monthLabel(ym: string) {
  const months = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
  const [y, m] = ym.split('-')
  return `${months[parseInt(m, 10) - 1]} ${y}`
}

function today() {
  return new Date().toISOString().slice(0, 10)
}

const STATUS_LABELS: Record<TimesheetStatus, string> = {
  saved:     'Salvo',
  submitted: 'Aguardando',
  approved:  'Aprovado',
  rejected:  'Rejeitado',
}

const STATUS_COLORS: Record<TimesheetStatus, { bg: string; txt: string; dot: string }> = {
  saved:     { bg: `${T.border}22`,    txt: T.text3,    dot: T.border2   },
  submitted: { bg: `${T.warn}18`,      txt: T.warn,     dot: T.warn      },
  approved:  { bg: `${T.success}18`,   txt: T.success,  dot: T.success   },
  rejected:  { bg: `${T.danger}18`,    txt: T.danger,   dot: T.danger    },
}

const inputSt: React.CSSProperties = {
  padding: '7px 10px', borderRadius: 7,
  background: T.bgPage, border: `1px solid ${T.border}`,
  color: T.text1, fontSize: 13, outline: 'none',
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TimesheetStatus }) {
  const { bg, txt, dot } = STATUS_COLORS[status]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 99, background: bg, fontSize: 11, color: txt, fontWeight: 600 }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: dot, flexShrink: 0 }} />
      {STATUS_LABELS[status]}
    </span>
  )
}

// ─── ItemCombobox ─────────────────────────────────────────────────────────────
type ItemOption = { item_id: string; item_label: string; project_id: string; project_name: string }

function ItemCombobox({ value, onChange }: { value: ItemOption | null; onChange: (v: ItemOption) => void }) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function h(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [])

  const filtered = query.trim()
    ? ALL_ITEMS.filter(i => i.search.includes(query.toLowerCase())).slice(0, 12)
    : ALL_ITEMS.slice(0, 12)

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <input
        value={open ? query : (value?.item_label ?? '')}
        onFocus={() => { setQuery(''); setOpen(true) }}
        onChange={e => { setQuery(e.target.value); setOpen(true) }}
        placeholder="Buscar demanda ou projeto…"
        style={{ ...inputSt, width: '100%', boxSizing: 'border-box' }}
      />
      {open && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
          background: T.bgSurface, border: `1px solid ${T.border}`,
          borderRadius: 8, marginTop: 2, maxHeight: 240, overflowY: 'auto',
          boxShadow: T.shadowModal,
        }}>
          {filtered.length === 0
            ? <div style={{ padding: '12px 14px', color: T.text3, fontSize: 12 }}>Nenhum item encontrado.</div>
            : filtered.map(item => (
              <button key={item.item_id}
                onMouseDown={e => { e.preventDefault(); onChange(item); setOpen(false); setQuery('') }}
                style={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%', padding: '8px 14px', background: 'none', border: 'none', borderBottom: `1px solid ${T.border}`, cursor: 'pointer', textAlign: 'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = `${T.accent}12`)}
                onMouseLeave={e => (e.currentTarget.style.background = 'none')}>
                <span style={{ fontSize: 12, color: T.text1, fontWeight: 500 }}>{item.item_label}</span>
                <span style={{ fontSize: 10, color: T.text3 }}>{item.project_name}</span>
              </button>
            ))
          }
        </div>
      )}
    </div>
  )
}

// ─── EditModal ────────────────────────────────────────────────────────────────
interface EditState { entry: TimesheetEntry; date: string; item: ItemOption | null; hours: string; description: string }

function EditModal({ state, onSave, onCancel }: { state: EditState; onSave: (s: EditState) => void; onCancel: () => void }) {
  const [s, setS] = useState(state)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(9,9,11,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 12, width: 480, padding: 24, boxShadow: T.shadowModal }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: T.text1, marginBottom: 20 }}>Editar lançamento</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Data</div>
              <input type="date" value={s.date} onChange={e => setS(p => ({ ...p, date: e.target.value }))}
                style={{ ...inputSt, width: 140 }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Horas</div>
              <input type="number" min="0.5" max="24" step="0.5" value={s.hours} onChange={e => setS(p => ({ ...p, hours: e.target.value }))}
                style={{ ...inputSt, width: 80 }} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Demanda</div>
            <ItemCombobox value={s.item} onChange={item => setS(p => ({ ...p, item }))} />
          </div>
          <div>
            <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Descrição</div>
            <textarea value={s.description} onChange={e => setS(p => ({ ...p, description: e.target.value }))} rows={3}
              style={{ ...inputSt, width: '100%', boxSizing: 'border-box', resize: 'vertical', fontFamily: 'inherit' }} />
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button onClick={onCancel} style={{ padding: '8px 16px', borderRadius: 8, background: T.bgPage, border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(s)} style={{ padding: '8px 16px', borderRadius: 8, background: T.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TimesheetPage() {
  const { activeUser } = useSession()
  const { permissions, user_id: userId, name: userName, avatar_initials: userInitials, tenant_id: tenantId, squad_id: squadId } = activeUser

  const [tick, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [formDate, setFormDate] = useState(today())
  const [formItem, setFormItem] = useState<ItemOption | null>(null)
  const [formHours, setFormHours] = useState('1')
  const [formDesc, setFormDesc] = useState('')
  const [formErr, setFormErr] = useState('')

  // Filter state
  const [filterStatus, setFilterStatus] = useState<TimesheetStatus | 'all'>('all')
  const [filterMonth, setFilterMonth] = useState('all')

  // Approval flow
  const [approvalPeriod, setApprovalPeriod] = useState(() => today().slice(0, 7))
  const [approvalApproverId, setApprovalApproverId] = useState('')
  const [approvalStep, setApprovalStep] = useState<'idle' | 'choose' | 'done'>('idle')
  const [approvalMsg, setApprovalMsg] = useState('')

  // Edit
  const [editing, setEditing] = useState<EditState | null>(null)
  const [toast, setToast] = useState('')

  if (!can(permissions, 'log:hours')) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: T.text3, fontSize: 14 }}>Sem permissão para lançar horas.</div>
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks — permission gate above doesn't call hooks conditionally; this is safe
  const allEntries = getMyEntries(userId, tenantId)
  void tick

  const months = Array.from(new Set(allEntries.map(e => e.date.slice(0, 7)))).sort().reverse()

  const filtered = allEntries.filter(e => {
    if (filterStatus !== 'all' && e.status !== filterStatus) return false
    if (filterMonth !== 'all' && !e.date.startsWith(filterMonth)) return false
    return true
  })

  const savedInPeriod = allEntries.filter(e => e.status === 'saved' && e.date.startsWith(approvalPeriod))
  const approvers = getApproversForTenant(tenantId)
  const totalHours = filtered.reduce((s, e) => s + e.hours, 0)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleAddOk() {
    if (!formItem) { setFormErr('Selecione uma demanda.'); return }
    const h = parseFloat(formHours)
    if (!h || h <= 0) { setFormErr('Informe um número de horas válido.'); return }
    setFormErr('')
    addEntry({
      tenant_id: tenantId, user_id: userId, user_name: userName, user_initials: userInitials,
      date: formDate, project_id: formItem.project_id, project_name: formItem.project_name,
      item_id: formItem.item_id, item_label: formItem.item_label,
      hours: h, description: formDesc, status: 'saved',
      squad_id: squadId !== '*' ? squadId : undefined,
    })
    setFormItem(null); setFormHours('1'); setFormDesc(''); setFormDate(today())
    setShowForm(false); refresh(); showToast('Lançamento salvo.')
  }

  function handleDelete(e: TimesheetEntry) {
    deleteEntry(e.id); refresh(); showToast('Lançamento excluído.')
  }

  function handleEditOpen(e: TimesheetEntry) {
    const item = ALL_ITEMS.find(i => i.item_id === e.item_id) ?? { item_id: e.item_id, item_label: e.item_label, project_id: e.project_id, project_name: e.project_name, search: '' }
    setEditing({ entry: e, date: e.date, item, hours: String(e.hours), description: e.description })
  }

  function handleEditSave(s: EditState) {
    if (!s.item) return
    updateEntry(s.entry.id, { date: s.date, item_id: s.item.item_id, item_label: s.item.item_label, project_id: s.item.project_id, project_name: s.item.project_name, hours: parseFloat(s.hours), description: s.description })
    setEditing(null); refresh(); showToast('Lançamento atualizado.')
  }

  function handleSendApproval() {
    if (savedInPeriod.length === 0) { showToast('Nenhum lançamento salvo neste período.'); return }
    if (approvers.length === 0) { showToast('Nenhum aprovador disponível.'); return }
    if (approvers.length === 1) {
      const a = approvers[0]
      const n = submitPeriodEntries(userId, tenantId, approvalPeriod, a.user_id, a.name)
      refresh(); setApprovalMsg(`${n} lançamento(s) enviado(s) para ${a.name}.`); setApprovalStep('done')
    } else {
      setApprovalStep('choose')
    }
  }

  function handleFinalizar() {
    if (!approvalApproverId) return
    const a = approvers.find(x => x.user_id === approvalApproverId)!
    const n = submitPeriodEntries(userId, tenantId, approvalPeriod, a.user_id, a.name)
    refresh(); setApprovalMsg(`${n} lançamento(s) enviado(s) para ${a.name}.`); setApprovalStep('done'); setApprovalApproverId('')
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 960, margin: '0 auto', position: 'relative' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '10px 18px', color: T.text1, fontSize: 13, boxShadow: T.shadowModal }}>
          {toast}
        </div>
      )}

      {editing && <EditModal state={editing} onSave={handleEditSave} onCancel={() => setEditing(null)} />}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: T.text1 }}>Lançar Horas</div>
          <div style={{ fontSize: 12, color: T.text3, marginTop: 2 }}>Registre as horas trabalhadas por demanda</div>
        </div>
        <button onClick={() => setShowForm(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', borderRadius: 9, background: T.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <span style={{ fontSize: 16, lineHeight: 1 }}>+</span> Novo lançamento
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div style={{ background: T.bgSurface, border: `1px solid ${T.accent}55`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 14 }}>Novo lançamento</div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Data</div>
              <input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} style={{ ...inputSt, width: 140 }} />
            </div>
            <div style={{ flex: 1, minWidth: 240 }}>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Demanda</div>
              <ItemCombobox value={formItem} onChange={setFormItem} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Horas</div>
              <input type="number" min="0.5" max="24" step="0.5" value={formHours} onChange={e => setFormHours(e.target.value)} style={{ ...inputSt, width: 80 }} />
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Descrição (opcional)</div>
              <input value={formDesc} onChange={e => setFormDesc(e.target.value)} placeholder="O que foi feito…" style={{ ...inputSt, width: '100%', boxSizing: 'border-box' }} />
            </div>
            <button onClick={handleAddOk} style={{ padding: '7px 22px', borderRadius: 8, background: T.accent, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>OK</button>
          </div>
          {formErr && <div style={{ marginTop: 8, fontSize: 11, color: T.danger }}>{formErr}</div>}
        </div>
      )}

      {/* History */}
      <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
        {/* Filters */}
        <div style={{ padding: '12px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {(['all', 'saved', 'submitted', 'approved', 'rejected'] as const).map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} style={{
              padding: '4px 11px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
              background: filterStatus === s ? T.accent : T.bgPage,
              color: filterStatus === s ? '#fff' : T.text2,
              border: `1px solid ${filterStatus === s ? T.accent : T.border}`,
              transition: 'all 0.15s',
            }}>
              {s === 'all' ? 'Todos' : STATUS_LABELS[s]}
            </button>
          ))}
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            style={{ ...inputSt, fontSize: 12, padding: '4px 10px', marginLeft: 'auto' }}>
            <option value="all">Todos os meses</option>
            {months.map(m => <option key={m} value={m}>{monthLabel(m)}</option>)}
          </select>
        </div>

        {filtered.length === 0
          ? <div style={{ padding: '40px 20px', textAlign: 'center', color: T.text3, fontSize: 13 }}>Nenhum lançamento para os filtros selecionados.</div>
          : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                  {['Data','Demanda','Projeto','Horas','Descrição','Status',''].map(h => (
                    <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: T.text3, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const editable = entry.status === 'saved' || entry.status === 'rejected'
                  return (
                    <tr key={entry.id} style={{ borderBottom: `1px solid ${T.border}`, transition: 'background 0.1s' }}
                      onMouseEnter={e => (e.currentTarget.style.background = `${T.accent}08`)}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text2, whiteSpace: 'nowrap' }}>{fmtDate(entry.date)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text1 }}>
                        <span style={{ fontFamily: 'monospace', fontSize: 11, color: T.accent, marginRight: 4 }}>{entry.item_id}</span>
                        {entry.item_label.split('·').slice(1).join('·').trim() || entry.item_label}
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: 11, color: T.text3, whiteSpace: 'nowrap' }}>{entry.project_name}</td>
                      <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 600, color: T.text1, whiteSpace: 'nowrap' }}>{entry.hours}h</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: T.text2, maxWidth: 200 }}>
                        <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.description || '—'}</span>
                        {entry.reject_reason && <span style={{ display: 'block', fontSize: 10, color: T.danger, marginTop: 2 }}>✕ {entry.reject_reason}</span>}
                      </td>
                      <td style={{ padding: '10px 14px' }}><StatusBadge status={entry.status} /></td>
                      <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                        {editable && (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button onClick={() => handleEditOpen(entry)} title="Editar" style={{ padding: '4px 8px', borderRadius: 6, background: T.bgPage, border: `1px solid ${T.border}`, color: T.text2, fontSize: 11, cursor: 'pointer' }}>✏</button>
                            <button onClick={() => handleDelete(entry)} title="Excluir" style={{ padding: '4px 8px', borderRadius: 6, background: T.bgPage, border: `1px solid ${T.border}`, color: T.danger, fontSize: 11, cursor: 'pointer' }}>✕</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
              <tfoot>
                <tr style={{ background: T.bgPage }}>
                  <td colSpan={3} style={{ padding: '9px 14px', fontSize: 11, color: T.text3 }}>{filtered.length} lançamento{filtered.length !== 1 ? 's' : ''}</td>
                  <td style={{ padding: '9px 14px', fontSize: 13, fontWeight: 700, color: T.text1 }}>{totalHours}h</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          )
        }
      </div>

      {/* Send for approval */}
      <div style={{ background: T.bgSurface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: T.text1, marginBottom: 12 }}>Enviar lançamentos para aprovação</div>
        {approvalStep === 'done' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: T.success }}>✓ {approvalMsg}</span>
            <button onClick={() => setApprovalStep('idle')} style={{ padding: '5px 12px', borderRadius: 7, background: T.bgPage, border: `1px solid ${T.border}`, color: T.text2, fontSize: 12, cursor: 'pointer' }}>Novo envio</button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Período</div>
              <input type="month" value={approvalPeriod} onChange={e => { setApprovalPeriod(e.target.value); setApprovalStep('idle') }} style={{ ...inputSt }} />
            </div>
            <span style={{ fontSize: 11, color: savedInPeriod.length > 0 ? T.text3 : T.border2, paddingBottom: 9 }}>
              {savedInPeriod.length > 0 ? `${savedInPeriod.length} salvo(s) neste período` : 'Nenhum lançamento salvo neste período'}
            </span>
            {approvalStep === 'choose' && (
              <div>
                <div style={{ fontSize: 11, color: T.text3, marginBottom: 4 }}>Aprovador</div>
                <select value={approvalApproverId} onChange={e => setApprovalApproverId(e.target.value)} style={{ ...inputSt, minWidth: 180 }}>
                  <option value="">Selecione…</option>
                  {approvers.map(a => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
                </select>
              </div>
            )}
            {approvalStep === 'choose' ? (
              <button onClick={handleFinalizar} disabled={!approvalApproverId} style={{ padding: '7px 18px', borderRadius: 8, background: approvalApproverId ? T.accent : T.border2, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: approvalApproverId ? 'pointer' : 'not-allowed' }}>
                Finalizar
              </button>
            ) : (
              <button onClick={handleSendApproval} disabled={savedInPeriod.length === 0} style={{ padding: '7px 18px', borderRadius: 8, background: savedInPeriod.length > 0 ? T.accent : T.border2, border: 'none', color: '#fff', fontSize: 13, fontWeight: 600, cursor: savedInPeriod.length > 0 ? 'pointer' : 'not-allowed' }}>
                Enviar para aprovação →
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
