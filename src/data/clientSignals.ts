/**
 * Altech — Shared client signals store (Inspection Mode / mocked).
 * Holds client comments and approvals. Tenant-scoped. Never cross-tenant.
 * PO responsible_po field ensures routing is always to the correct Product Owner.
 */
import { MOCK_TENANT } from './session'

export type SignalType = 'approval' | 'comment'

export interface ClientSignal {
  id:             string
  type:           SignalType
  item_id:        string       // id of the portal item (validation, delivery, etc.)
  item_title:     string
  project:        string
  tenant_id:      string
  responsible_po: string       // user_id of the PO who owns this item
  body?:          string       // present for type='comment'
  author:         string       // client display name (or manager name for source='management')
  author_initials: string
  created_at:     string       // ISO 8601
  read_by_po:     boolean
  po_reply?:      string       // public reply from any manager, visible to client
  po_reply_by?:   string       // display name of the manager who replied (public)
  reply_read_by_client?: boolean  // false = client has unread reply; undefined = no reply yet
  source?: 'client' | 'management'  // undefined = 'client' for backward compat
}

export interface AuditEntry {
  id:         string
  action:     string
  item_title: string
  by:         string
  when:       string
  tenant_id:  string
}

// ─── Mutable in-memory store ─────────────────────────────────────────────────
let CLIENT_SIGNALS: ClientSignal[] = [
  // ── Website Relaunch ───────────────────────────────────────────────────────
  {
    id: 'cs_001', type: 'comment', source: 'client',
    item_id: 'v1', item_title: 'Identidade visual — aprovação do guia de marca',
    project: 'Website Relaunch', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'As cores estão ótimas, mas gostaria de revisar a tipografia do cabeçalho antes de aprovar.',
    author: 'João Silva', author_initials: 'JS',
    created_at: '2025-07-23T10:30:00Z', read_by_po: true,
    po_reply: 'Anotado! Vou preparar duas opções de tipografia para revisão amanhã.',
    po_reply_by: 'Equipe Altech', reply_read_by_client: false,
  },
  {
    id: 'cs_003', type: 'approval', source: 'client',
    item_id: 're1', item_title: 'Novo portal de autenticação',
    project: 'Website Relaunch', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    author: 'João Silva', author_initials: 'JS',
    created_at: '2025-07-22T16:00:00Z', read_by_po: true,
  },
  {
    id: 'cs_006', type: 'comment', source: 'management',
    item_id: 'mgmt-wr-1', item_title: 'Atualização de sprint',
    project: 'Website Relaunch', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'Olá João, a entrega da homepage está prevista para sexta. Passaremos o link de preview assim que estiver disponível.',
    author: 'Beatriz Alves', author_initials: 'BA',
    created_at: '2025-07-23T11:05:00Z', read_by_po: true,
  },
  {
    id: 'cs_007', type: 'comment', source: 'client',
    item_id: 'v1b', item_title: 'Homepage — feedback final',
    project: 'Website Relaunch', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'Perfeito! Aguardando o preview. O prazo de sexta está ótimo para nós.',
    author: 'João Silva', author_initials: 'JS',
    created_at: '2025-07-23T11:20:00Z', read_by_po: false,
  },
  // ── ERP Integration v2 ────────────────────────────────────────────────────
  {
    id: 'cs_002', type: 'comment', source: 'client',
    item_id: 'd3', item_title: 'Painel de importação de dados legados',
    project: 'ERP Integration v2', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'Precisamos que a importação suporte também o formato XLS além de CSV. É um requisito da equipe de operações.',
    author: 'Maria Fernanda', author_initials: 'MF',
    created_at: '2025-07-24T14:15:00Z', read_by_po: false,
  },
  {
    id: 'cs_008', type: 'comment', source: 'client',
    item_id: 'd4', item_title: 'Relatório de status consolidado',
    project: 'ERP Integration v2', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'O relatório de status está funcionando, mas os filtros de data não estão retornando os registros do mês anterior.',
    author: 'Maria Fernanda', author_initials: 'MF',
    created_at: '2025-07-25T09:00:00Z', read_by_po: false,
  },
  // ── Mobile App ────────────────────────────────────────────────────────────
  {
    id: 'cs_009', type: 'comment', source: 'client',
    item_id: 'mob1', item_title: 'Tela de onboarding',
    project: 'Mobile App', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'A animação de entrada está muito rápida no iPhone 13. Vocês conseguem ajustar para 400ms?',
    author: 'Carlos Mendes', author_initials: 'CM',
    created_at: '2025-07-25T10:30:00Z', read_by_po: false,
  },
  {
    id: 'cs_010', type: 'comment', source: 'management',
    item_id: 'mgmt-mob-1', item_title: 'Resposta sobre animação',
    project: 'Mobile App', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    body: 'Carlos, ajuste feito! Atualizamos para 420ms e também suavizamos o easing. Pode testar na build 0.9.3.',
    author: 'Lucas Ferreira', author_initials: 'LF',
    created_at: '2025-07-25T11:00:00Z', read_by_po: true,
  },
  {
    id: 'cs_011', type: 'approval', source: 'client',
    item_id: 'mob2', item_title: 'Tela de perfil e preferências',
    project: 'Mobile App', tenant_id: MOCK_TENANT.tenant_id, responsible_po: 'u_po',
    author: 'Carlos Mendes', author_initials: 'CM',
    created_at: '2025-07-25T14:00:00Z', read_by_po: true,
  },
]

let AUDIT_LOG: AuditEntry[] = [
  { id: 'al_001', action: 'Comentário do cliente registrado',    item_title: 'Identidade visual — aprovação do guia de marca', by: 'Sistema',        when: '23 jul · 10:30', tenant_id: MOCK_TENANT.tenant_id },
  { id: 'al_002', action: 'Resposta pública do P.O publicada',  item_title: 'Identidade visual — aprovação do guia de marca', by: 'Beatriz Alves',  when: '23 jul · 11:00', tenant_id: MOCK_TENANT.tenant_id },
  { id: 'al_003', action: 'Comentário do cliente registrado',    item_title: 'Painel de importação de dados legados',          by: 'Sistema',        when: '24 jul · 14:15', tenant_id: MOCK_TENANT.tenant_id },
  { id: 'al_004', action: 'Aprovação do cliente registrada',     item_title: 'Novo portal de autenticação',                    by: 'Sistema',        when: '22 jul · 16:00', tenant_id: MOCK_TENANT.tenant_id },
]

let _sigCounter = 12
let _logCounter = 5

// ─── Write ────────────────────────────────────────────────────────────────────
export function addClientSignal(sig: Omit<ClientSignal, 'id'>): ClientSignal {
  const newSig: ClientSignal = { ...sig, id: `cs_${String(_sigCounter++).padStart(3, '0')}` }
  CLIENT_SIGNALS = [...CLIENT_SIGNALS, newSig]
  _addAuditEntry({
    action:     sig.type === 'comment' ? 'Comentário do cliente registrado' : 'Aprovação do cliente registrada',
    item_title: sig.item_title,
    by:         'Sistema',
    tenant_id:  sig.tenant_id,
  })
  return newSig
}

export function markReadByPo(id: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s => s.id === id ? { ...s, read_by_po: true } : s)
}

export function markAllReadByPo(po_id: string, tenant_id: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s =>
    s.responsible_po === po_id && s.tenant_id === tenant_id ? { ...s, read_by_po: true } : s
  )
}

export function addPoReply(signal_id: string, reply: string, po_name: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s =>
    s.id === signal_id
      ? { ...s, po_reply: reply, po_reply_by: po_name, read_by_po: true, reply_read_by_client: false }
      : s
  )
  const sig = CLIENT_SIGNALS.find(s => s.id === signal_id)
  if (sig) {
    _addAuditEntry({
      action:     'Resposta pública do P.O publicada',
      item_title: sig.item_title,
      by:         po_name,
      tenant_id:  sig.tenant_id,
    })
  }
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export function getAllSignals(): ClientSignal[] {
  return CLIENT_SIGNALS
}

export function getUnreadForPo(po_id: string, tenant_id: string): ClientSignal[] {
  return CLIENT_SIGNALS.filter(s =>
    s.responsible_po === po_id &&
    s.tenant_id === tenant_id &&
    !s.read_by_po
  )
}

export function getAllForPo(po_id: string, tenant_id: string): ClientSignal[] {
  return [...CLIENT_SIGNALS]
    .filter(s => s.responsible_po === po_id && s.tenant_id === tenant_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function markReplyReadByClient(id: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s =>
    s.id === id ? { ...s, reply_read_by_client: true } : s
  )
}

export function markAllClientRepliesRead(tenant_id: string, client_author: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s =>
    s.tenant_id === tenant_id && s.author === client_author && s.reply_read_by_client === false
      ? { ...s, reply_read_by_client: true }
      : s
  )
}

export function getClientUnreadReplies(tenant_id: string, client_author: string): ClientSignal[] {
  return CLIENT_SIGNALS.filter(s =>
    s.tenant_id === tenant_id &&
    s.author === client_author &&
    s.po_reply !== undefined &&
    s.reply_read_by_client === false
  )
}

export function getSignalsForTenant(tenant_id: string): ClientSignal[] {
  return [...CLIENT_SIGNALS]
    .filter(s => s.tenant_id === tenant_id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getSignalsForItem(item_id: string, tenant_id: string): ClientSignal[] {
  return CLIENT_SIGNALS.filter(s => s.item_id === item_id && s.tenant_id === tenant_id)
}

export function getCommentsForProject(project: string, tenant_id: string): ClientSignal[] {
  return [...CLIENT_SIGNALS]
    .filter(s => s.type === 'comment' && s.project === project && s.tenant_id === tenant_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function getAuditLog(tenant_id: string): AuditEntry[] {
  return [...AUDIT_LOG]
    .filter(e => e.tenant_id === tenant_id)
    .reverse()
    .slice(0, 20)
}

// ─── Chat-centric helpers ─────────────────────────────────────────────────────

/** All signals for a project, sorted oldest-first for chat display. */
export function getSignalsForProject(project: string, tenant_id: string): ClientSignal[] {
  return [...CLIENT_SIGNALS]
    .filter(s => s.project === project && s.tenant_id === tenant_id)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/** Distinct projects that have signals for this tenant, with unread count and latest signal. */
export function getProjectsWithSignals(tenant_id: string): {
  project: string
  unread: number
  latest: ClientSignal
}[] {
  const map = new Map<string, { unread: number; latest: ClientSignal }>()
  for (const s of CLIENT_SIGNALS) {
    if (s.tenant_id !== tenant_id) continue
    const entry = map.get(s.project)
    const isUnread = s.source !== 'management' && !s.read_by_po
    const latestDate = entry ? new Date(entry.latest.created_at).getTime() : 0
    const thisDate   = new Date(s.created_at).getTime()
    map.set(s.project, {
      unread:  (entry?.unread ?? 0) + (isUnread ? 1 : 0),
      latest:  !entry || thisDate > latestDate ? s : entry.latest,
    })
  }
  return [...map.entries()]
    .map(([project, v]) => ({ project, ...v }))
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime())
}

/** Add a management-originated message to a project thread (visible to client via portal). */
export function addManagementMessage(
  project: string, tenant_id: string, body: string, author_name: string, author_initials: string,
): ClientSignal {
  const sig: Omit<ClientSignal, 'id'> = {
    type:            'comment',
    source:          'management',
    item_id:         `mgmt-${Date.now()}`,
    item_title:      'Mensagem da equipe',
    project,
    tenant_id,
    responsible_po:  'u_po',
    body,
    author:          author_name,
    author_initials: author_initials,
    created_at:      new Date().toISOString(),
    read_by_po:      true,
    reply_read_by_client: false,
  }
  return addClientSignal(sig)
}

/** Mark all client-originated signals in a project as read by PO. */
export function markProjectReadByPo(project: string, tenant_id: string): void {
  CLIENT_SIGNALS = CLIENT_SIGNALS.map(s =>
    s.project === project && s.tenant_id === tenant_id && s.source !== 'management'
      ? { ...s, read_by_po: true }
      : s
  )
}

/** Total unread client messages across all projects for a tenant (for KPI badge). */
export function getUnreadCountForTenant(tenant_id: string): number {
  return CLIENT_SIGNALS.filter(s => s.tenant_id === tenant_id && s.source !== 'management' && !s.read_by_po).length
}

// ─── Internal ─────────────────────────────────────────────────────────────────
function _addAuditEntry(entry: Omit<AuditEntry, 'id' | 'when'>): void {
  const now = new Date()
  const months = ['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez']
  const when = `${now.getDate()} ${months[now.getMonth()]} · ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`
  AUDIT_LOG = [...AUDIT_LOG, { ...entry, id: `al_${String(_logCounter++).padStart(3,'0')}`, when }]
}
