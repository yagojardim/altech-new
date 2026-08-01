// ─── Módulos Portfolio Page ───────────────────────────────────────────────────
// Inspection Mode: mock only. No billing, no real activation.
import { useState } from 'react'
import { T } from '../components/ds/tokens'
import { useSession } from '../data/SessionContext'
import { can } from '../data/permissions'
import {
  MODULE_CATALOG, CATEGORY_LABELS, STATUS_META,
  type ModuleDef, type ModuleCategory, type ModuleStatus,
} from '../data/modules'
import {
  getTenantModules, setModuleStatus, type TenantModuleRecord,
} from '../data/tenantModules'
import {
  createActivationRequest, getAuditForModule, getRequestForModule,
  type RequestPriority, type ModuleAuditEvent,
} from '../data/moduleActivationRequests'

// ─── Design tokens (dark premium per spec) ────────────────────────────────────
const D = {
  card:    '#16161D',
  border:  '#262633',
  green:   '#10B981',
  amber:   '#F59E0B',
  red:     '#EF4444',
  blue:    '#3B82F6',
  indigo:  '#6366F1',
  violet:  '#8B5CF6',
  text1:   T.text1,
  text2:   T.text2,
  text3:   T.text3,
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmtRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 2) return 'agora mesmo'
  if (m < 60) return `há ${m} min`
  const h = Math.floor(m / 60)
  if (h < 24) return `há ${h}h`
  const d = Math.floor(h / 24)
  if (d === 1) return 'ontem'
  if (d < 7) return `há ${d} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
}

// ─── StatusBadge ──────────────────────────────────────────────────────────────
function ModuleStatusBadge({ status }: { status: ModuleStatus }) {
  const m = STATUS_META[status]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 99,
      background: m.bg, fontSize: 11, color: m.color, fontWeight: 700,
      border: `1px solid ${m.color}30`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: m.dot, flexShrink: 0 }} />
      {m.label}
    </span>
  )
}

// ─── TypeTag ──────────────────────────────────────────────────────────────────
function TypeTag({ mod }: { mod: ModuleDef }) {
  if (mod.is_preview)
    return <span style={{ fontSize: 10, fontWeight: 700, color: D.violet, background: `${D.violet}18`, border: `1px solid ${D.violet}33`, borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview</span>
  if (mod.is_future)
    return <span style={{ fontSize: 10, fontWeight: 700, color: D.amber, background: `${D.amber}18`, border: `1px solid ${D.amber}33`, borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Em breve</span>
  if (mod.is_premium)
    return <span style={{ fontSize: 10, fontWeight: 700, color: D.blue, background: `${D.blue}18`, border: `1px solid ${D.blue}33`, borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Premium</span>
  return null
}

// ─── CTA per status ───────────────────────────────────────────────────────────
function ctaMeta(status: ModuleStatus): { label: string; style: 'primary' | 'secondary' | 'ghost' | 'danger' | 'disabled'; color: string } {
  switch (status) {
    case 'operational':    return { label: 'Acessar módulo',             style: 'primary',   color: D.green  }
    case 'implemented':    return { label: 'Abrir / Configurar',         style: 'primary',   color: D.blue   }
    case 'contracted':     return { label: 'Acompanhar implantação',      style: 'secondary', color: D.indigo }
    case 'deploying':      return { label: 'Acompanhar implantação',      style: 'secondary', color: D.indigo }
    case 'pending':        return { label: 'Solicitado — Pendente',       style: 'disabled',  color: D.amber  }
    case 'not-contracted': return { label: 'Solicitar ativação',          style: 'secondary', color: D.amber  }
    case 'preview':        return { label: 'Ver preview',                 style: 'primary',   color: D.violet }
    case 'planned':        return { label: 'Ver detalhes',                style: 'ghost',     color: D.text2  }
    case 'coming-soon':    return { label: 'Acompanhar disponibilidade',  style: 'ghost',     color: D.amber  }
    case 'suspended':      return { label: 'Ver motivo',                  style: 'danger',    color: D.red    }
    case 'unavailable':    return { label: 'Indisponível',                style: 'disabled',  color: D.text3  }
  }
}

// ─── Audit Feed ───────────────────────────────────────────────────────────────
function ModuleAuditFeed({ events }: { events: ModuleAuditEvent[] }) {
  if (events.length === 0) return null
  return (
    <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${D.border}` }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Histórico</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {events.slice(0, 4).map(ev => (
          <div key={ev.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 6, height: 6, borderRadius: 99, background: D.indigo, marginTop: 5, flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <span style={{ fontSize: 12, color: D.text2 }}>{ev.event}</span>
              {ev.detail && <div style={{ fontSize: 11, color: D.text3, marginTop: 1 }}>{ev.detail}</div>}
            </div>
            <span style={{ fontSize: 10, color: D.text3, flexShrink: 0, marginTop: 1 }}>{fmtRelative(ev.at)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Activation Request Modal ─────────────────────────────────────────────────
interface ActivationModalProps {
  mod:        ModuleDef
  tenantId:   string
  userId:     string
  userName:   string
  onConfirm:  () => void
  onCancel:   () => void
}

function ModuleActivationRequestModal({ mod, tenantId, userId, userName, onConfirm, onCancel }: ActivationModalProps) {
  const [reason, setReason]    = useState('')
  const [usage, setUsage]      = useState('')
  const [priority, setPriority] = useState<RequestPriority>('medium')
  const [obs, setObs]          = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [err, setErr]          = useState('')

  const valid = reason.trim().length > 10 && usage.trim().length > 5

  function handleSubmit() {
    if (!valid) { setErr('Preencha o motivo (mín. 10 caracteres) e o uso esperado.'); return }
    setSubmitting(true)
    setTimeout(() => {
      createActivationRequest({
        tenant_id:         tenantId,
        module_id:         mod.id,
        module_name:       mod.name,
        requested_by:      userId,
        requested_by_name: userName,
        reason:            reason.trim(),
        expected_usage:    usage.trim(),
        priority,
        observations:      obs.trim() || undefined,
      })
      setModuleStatus(tenantId, mod.id, 'pending', { requested_by: userId, requested_by_name: userName, requested_at: new Date().toISOString() })
      setSubmitting(false)
      onConfirm()
    }, 600)
  }

  const inputSt: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '9px 11px',
    borderRadius: 8, background: T.bgPage, border: `1px solid ${D.border}`,
    color: D.text1, fontSize: 13, outline: 'none', fontFamily: 'inherit',
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(9,9,11,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, width: 520, maxHeight: '90vh', overflow: 'auto', padding: 28, boxShadow: T.shadowModal }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: D.text1 }}>Solicitar ativação</div>
            <div style={{ fontSize: 12, color: D.text3, marginTop: 3, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span>{mod.icon}</span>
              <span>{mod.name}</span>
            </div>
          </div>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, fontSize: 18 }}>✕</button>
        </div>

        {/* Prototype notice */}
        <div style={{ padding: '8px 12px', borderRadius: 8, background: `${D.amber}12`, border: `1px solid ${D.amber}33`, marginBottom: 18 }}>
          <span style={{ fontSize: 11, color: D.amber }}>
            ⓘ Inspection Mode — solicitação registrada como mock. Nenhuma ativação ou cobrança real ocorre.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 5 }}>Motivo da solicitação <span style={{ color: D.red }}>*</span></label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} rows={3}
              placeholder="Descreva por que o time precisa deste módulo…"
              style={{ ...inputSt, resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 5 }}>Uso esperado <span style={{ color: D.red }}>*</span></label>
            <textarea value={usage} onChange={e => setUsage(e.target.value)} rows={2}
              placeholder="Quem usaria? Com que frequência? Para qual processo?"
              style={{ ...inputSt, resize: 'vertical' }} />
          </div>

          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 5 }}>Prioridade</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['low', 'medium', 'high', 'critical'] as RequestPriority[]).map(p => {
                const pColor = p === 'critical' ? D.red : p === 'high' ? D.amber : p === 'medium' ? D.blue : D.text3
                return (
                  <button key={p} onClick={() => setPriority(p)} style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, cursor: 'pointer', fontSize: 11, fontWeight: 600,
                    background: priority === p ? `${pColor}20` : 'transparent',
                    border: `1px solid ${priority === p ? pColor : D.border}`,
                    color: priority === p ? pColor : D.text3,
                    transition: 'all 0.15s',
                  }}>
                    {p === 'low' ? 'Baixa' : p === 'medium' ? 'Média' : p === 'high' ? 'Alta' : 'Crítica'}
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <label style={{ fontSize: 11, color: D.text3, display: 'block', marginBottom: 5 }}>Observações (opcional)</label>
            <textarea value={obs} onChange={e => setObs(e.target.value)} rows={2}
              placeholder="Informações adicionais para a equipe Altech…"
              style={{ ...inputSt, resize: 'vertical' }} />
          </div>

          {err && <div style={{ fontSize: 11, color: D.red }}>{err}</div>}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 22 }}>
          <button onClick={onCancel} style={{ padding: '9px 18px', borderRadius: 9, background: 'transparent', border: `1px solid ${D.border}`, color: D.text2, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={!valid || submitting} style={{
            padding: '9px 20px', borderRadius: 9, border: 'none', fontSize: 13, fontWeight: 700, cursor: valid && !submitting ? 'pointer' : 'not-allowed',
            background: valid && !submitting ? D.amber : `${D.amber}40`,
            color: valid && !submitting ? '#fff' : `${D.amber}80`,
            transition: 'all 0.15s',
          }}>
            {submitting ? 'Enviando…' : 'Enviar solicitação'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail Modal (for planned / coming-soon / suspended) ─────────────────────
function ModuleDetailModal({ mod, tenantMod, onClose }: { mod: ModuleDef; tenantMod: TenantModuleRecord | undefined; onClose: () => void }) {
  const meta = STATUS_META[tenantMod?.status ?? 'planned']
  const audit = getAuditForModule(tenantMod?.tenant_id ?? '', mod.id)
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(9,9,11,0.82)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 14, width: 500, maxHeight: '85vh', overflow: 'auto', padding: 28, boxShadow: T.shadowModal }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span style={{ fontSize: 32 }}>{mod.icon}</span>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: D.text1 }}>{mod.name}</div>
              <div style={{ fontSize: 11, color: D.text3, marginTop: 2 }}>{CATEGORY_LABELS[mod.category]}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: D.text3, fontSize: 18 }}>✕</button>
        </div>
        <div style={{ fontSize: 13, color: D.text2, marginBottom: 16, lineHeight: 1.6 }}>{mod.description}</div>
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Funcionalidades</div>
          {mod.features.map(f => (
            <div key={f} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: meta.color, marginTop: 1 }}>✓</span>
              <span style={{ fontSize: 12, color: D.text2 }}>{f}</span>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, background: `${meta.color}10`, border: `1px solid ${meta.color}30` }}>
          <ModuleStatusBadge status={tenantMod?.status ?? 'planned'} />
          {tenantMod?.notes && <span style={{ fontSize: 11, color: D.text3 }}>{tenantMod.notes}</span>}
          {(tenantMod?.status === 'suspended') && <span style={{ fontSize: 11, color: D.red }}>Contacte o suporte para mais informações.</span>}
        </div>
        {audit.length > 0 && <ModuleAuditFeed events={audit} />}
      </div>
    </div>
  )
}

// ─── Module Card ──────────────────────────────────────────────────────────────
interface CardProps {
  mod:        ModuleDef
  tenantMod:  TenantModuleRecord | undefined
  canRequest: boolean
  onAction:   (mod: ModuleDef, status: ModuleStatus) => void
}

function ModulePortfolioCard({ mod, tenantMod, canRequest, onAction }: CardProps) {
  const [hovered, setHovered] = useState(false)
  const status = tenantMod?.status ?? 'not-contracted'
  const { label, style, color } = ctaMeta(status)
  const isDisabled = style === 'disabled' || (!canRequest && status === 'not-contracted')
  const audit = getAuditForModule(tenantMod?.tenant_id ?? '', mod.id)

  const btnSt: React.CSSProperties = (() => {
    const base: React.CSSProperties = {
      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: 700,
      cursor: isDisabled ? 'not-allowed' : 'pointer', transition: 'all 0.15s',
      opacity: isDisabled ? 0.5 : 1,
    }
    if (isDisabled) return { ...base, background: `${color}18`, border: `1px solid ${color}22`, color }
    switch (style) {
      case 'primary':   return { ...base, background: color, border: 'none', color: '#fff' }
      case 'secondary': return { ...base, background: `${color}18`, border: `1px solid ${color}44`, color }
      case 'ghost':     return { ...base, background: 'transparent', border: `1px solid ${D.border}`, color: D.text2 }
      case 'danger':    return { ...base, background: `${D.red}14`, border: `1px solid ${D.red}44`, color: D.red }
      default:          return { ...base, background: `${color}18`, border: `1px solid ${color}22`, color }
    }
  })()

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? `#1e1e2a` : D.card,
        border: `1px solid ${hovered ? '#363650' : D.border}`,
        borderRadius: 12, padding: '20px 22px',
        display: 'flex', flexDirection: 'column', gap: 0,
        transition: 'all 0.15s',
        position: 'relative', overflow: 'hidden',
      }}
    >
      {/* Subtle glow line at top for operational/implemented */}
      {(status === 'operational' || status === 'implemented') && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${D.green}00, ${D.green}, ${D.green}00)` }} />
      )}
      {status === 'preview' && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${D.violet}00, ${D.violet}, ${D.violet}00)` }} />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: `${D.border}`, border: `1px solid #303040`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0,
        }}>
          {mod.icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 3 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: D.text1 }}>{mod.name}</span>
            <TypeTag mod={mod} />
          </div>
          <div style={{ fontSize: 11, color: D.text3 }}>{mod.tagline}</div>
        </div>
        <ModuleStatusBadge status={status} />
      </div>

      {/* Description */}
      <p style={{ fontSize: 12, color: D.text2, lineHeight: 1.6, margin: '0 0 14px' }}>
        {mod.description.length > 140 ? mod.description.slice(0, 140) + '…' : mod.description}
      </p>

      {/* Features */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginBottom: 18, flex: 1 }}>
        {mod.features.slice(0, 4).map(f => (
          <div key={f} style={{ display: 'flex', gap: 7, alignItems: 'flex-start' }}>
            <span style={{ fontSize: 11, color: STATUS_META[status].color, marginTop: 1, flexShrink: 0 }}>✓</span>
            <span style={{ fontSize: 11, color: D.text3, lineHeight: 1.4 }}>{f}</span>
          </div>
        ))}
        {mod.features.length > 4 && (
          <span style={{ fontSize: 11, color: D.text3, opacity: 0.6, paddingLeft: 18 }}>+{mod.features.length - 4} funcionalidades</span>
        )}
      </div>

      {/* Audit (last event) */}
      {audit.length > 0 && (
        <div style={{ fontSize: 10, color: D.text3, marginBottom: 12, padding: '6px 10px', background: `${D.border}60`, borderRadius: 6 }}>
          <span style={{ color: D.indigo, marginRight: 4 }}>◎</span>
          {audit[0].event} · {fmtRelative(audit[0].at)}
        </div>
      )}

      {/* CTA */}
      {!isDisabled ? (
        <button onClick={() => onAction(mod, status)} style={btnSt}>
          {label}
        </button>
      ) : (
        <div style={btnSt as React.CSSProperties}>{label}</div>
      )}

      {/* No-permission note */}
      {!canRequest && status === 'not-contracted' && (
        <div style={{ fontSize: 10, color: D.text3, marginTop: 8, textAlign: 'center' }}>
          Sem permissão para solicitar ativação
        </div>
      )}
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
interface Props {
  onNav?: (v: string) => void
}

type ModalState =
  | { type: 'none' }
  | { type: 'activate'; mod: ModuleDef }
  | { type: 'detail';   mod: ModuleDef; tenantMod: TenantModuleRecord | undefined }

export default function ModulesPortfolioPage({ onNav }: Props) {
  const { activeUser } = useSession()
  const { permissions, user_id: userId, name: userName, tenant_id: tenantId } = activeUser

  const canView    = can(permissions, 'module:request') || can(permissions, 'users:manage')
  const canRequest = can(permissions, 'module:request')

  const [tick, setTick] = useState(0)
  const refresh = () => setTick(t => t + 1)
  void tick

  const [modal, setModal]         = useState<ModalState>({ type: 'none' })
  const [filterCat, setFilterCat] = useState<ModuleCategory | 'all'>('all')
  const [toastMsg, setToastMsg]   = useState('')

  function showToast(msg: string) { setToastMsg(msg); setTimeout(() => setToastMsg(''), 4000) }

  if (!canView) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flexDirection: 'column', gap: 12 }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 14, color: D.text2, fontWeight: 600 }}>Acesso restrito</div>
        <div style={{ fontSize: 12, color: D.text3 }}>Permissão necessária: configuração de módulos</div>
      </div>
    )
  }

  const tenantMods    = getTenantModules(tenantId)
  const activeCount   = tenantMods.filter(m => ['operational','implemented','preview'].includes(m.status)).length
  const contractedCount = tenantMods.filter(m => ['operational','implemented','contracted','deploying','preview'].includes(m.status)).length

  function handleAction(mod: ModuleDef, status: ModuleStatus) {
    switch (status) {
      case 'operational':
        // navigate to module — for Client Portal, go to client view
        if (mod.id === 'mod_client_portal') { onNav?.('client'); return }
        onNav?.('config'); return
      case 'implemented':
        if (mod.id === 'mod_client_portal') { onNav?.('client'); return }
        onNav?.('config'); return
      case 'preview':
        if (mod.id === 'mod_calendar') { onNav?.('calendar'); return }
        setModal({ type: 'detail', mod, tenantMod: tenantMods.find(m => m.module_id === mod.id) }); return
      case 'not-contracted':
        if (canRequest) { setModal({ type: 'activate', mod }); return }
        return
      case 'planned':
      case 'coming-soon':
      case 'suspended':
      case 'contracted':
      case 'deploying':
        setModal({ type: 'detail', mod, tenantMod: tenantMods.find(m => m.module_id === mod.id) }); return
      default: return
    }
  }

  // Group by category in defined order
  const categoryOrder: ModuleCategory[] = ['intelligence','integration','external','community','governance','security']
  const displayedCats = filterCat === 'all' ? categoryOrder : [filterCat]

  function getModsForCategory(cat: ModuleCategory) {
    return MODULE_CATALOG.filter(m => m.category === cat)
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto', position: 'relative' }}>
      {/* Toast */}
      {toastMsg && (
        <div style={{ position: 'fixed', bottom: 28, right: 28, zIndex: 9999, background: T.bgSurface, border: `1px solid ${D.border}`, borderRadius: 10, padding: '11px 18px', color: D.text1, fontSize: 13, boxShadow: T.shadowModal }}>
          {toastMsg}
        </div>
      )}

      {/* Modals */}
      {modal.type === 'activate' && (
        <ModuleActivationRequestModal
          mod={modal.mod}
          tenantId={tenantId}
          userId={userId}
          userName={userName}
          onConfirm={() => { setModal({ type: 'none' }); refresh(); showToast(`Solicitação de "${modal.mod.name}" enviada. Status: Pendente.`) }}
          onCancel={() => setModal({ type: 'none' })}
        />
      )}
      {modal.type === 'detail' && (
        <ModuleDetailModal
          mod={modal.mod}
          tenantMod={modal.tenantMod}
          onClose={() => setModal({ type: 'none' })}
        />
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: D.text1 }}>Módulos da Plataforma</div>
          <div style={{ fontSize: 12, color: D.text3, marginTop: 4, display: 'flex', gap: 16 }}>
            <span><span style={{ color: D.green, fontWeight: 700 }}>●</span> {activeCount} ativo{activeCount !== 1 ? 's' : ''}</span>
            <span style={{ color: D.text3 }}>{contractedCount} contratado{contractedCount !== 1 ? 's' : ''}</span>
            <span style={{ color: D.text3 }}>{MODULE_CATALOG.length} no catálogo</span>
          </div>
        </div>

        {/* Inspection mode badge */}
        <div style={{ padding: '5px 12px', borderRadius: 8, background: `${D.amber}12`, border: `1px solid ${D.amber}30`, fontSize: 11, color: D.amber }}>
          ⓘ Inspection Mode — sem cobrança real
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Implementados', value: tenantMods.filter(m => m.status === 'implemented').length, color: D.blue },
          { label: 'Em preview',    value: tenantMods.filter(m => m.status === 'preview').length,      color: D.violet },
          { label: 'Pendentes',     value: tenantMods.filter(m => m.status === 'pending').length,       color: D.amber },
          { label: 'Disponíveis',   value: tenantMods.filter(m => m.status === 'not-contracted').length,color: D.text3 },
        ].map(k => (
          <div key={k.label} style={{ background: D.card, border: `1px solid ${D.border}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
            <span style={{ fontSize: 24, fontWeight: 800, color: k.color }}>{k.value}</span>
            <span style={{ fontSize: 11, color: D.text3, lineHeight: 1.3 }}>{k.label}</span>
          </div>
        ))}
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {(['all', ...categoryOrder] as const).map(cat => (
          <button key={cat} onClick={() => setFilterCat(cat)} style={{
            padding: '5px 14px', borderRadius: 99, fontSize: 11, fontWeight: 600, cursor: 'pointer',
            background: filterCat === cat ? T.accent : 'transparent',
            color: filterCat === cat ? '#fff' : D.text2,
            border: `1px solid ${filterCat === cat ? T.accent : D.border}`,
            transition: 'all 0.15s',
          }}>
            {cat === 'all' ? 'Todos' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Grid by category */}
      {displayedCats.map(cat => {
        const mods = getModsForCategory(cat)
        if (mods.length === 0) return null
        return (
          <div key={cat} style={{ marginBottom: 32 }}>
            {/* Category header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <div style={{ flex: 1, height: 1, background: D.border }} />
              <span style={{ fontSize: 10, fontWeight: 700, color: D.text3, textTransform: 'uppercase', letterSpacing: '0.1em', whiteSpace: 'nowrap' }}>
                {CATEGORY_LABELS[cat]}
              </span>
              <div style={{ flex: 1, height: 1, background: D.border }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
              {mods.map(mod => {
                const tenantMod = tenantMods.find(m => m.module_id === mod.id)
                return (
                  <ModulePortfolioCard
                    key={mod.id}
                    mod={mod}
                    tenantMod={tenantMod}
                    canRequest={canRequest}
                    onAction={handleAction}
                  />
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
