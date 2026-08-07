/**
 * Altech — Client signals facade.
 * Reads/writes the real Supabase tables (client_signals / client_approvals)
 * through the portal store. Tenant + project scoped, never cross-tenant.
 */
import * as store from './clientPortalStore'

export type SignalType = 'approval' | 'comment'

export interface ClientSignal {
  id:             string
  type:           SignalType
  item_id:        string
  item_title:     string
  project:        string
  tenant_id:      string
  responsible_po: string
  body?:          string
  author:         string
  author_initials: string
  created_at:     string
  read_by_po:     boolean
  po_reply?:      string
  po_reply_by?:   string
  reply_read_by_client?: boolean
  source?: 'client' | 'management'
}

// ─── Write ────────────────────────────────────────────────────────────────────
export function addClientSignal(sig: Omit<ClientSignal, 'id'>): void {
  if (sig.type === 'approval') {
    store.writeClientApproval({
      project: sig.project, itemTitle: sig.item_title, author: sig.author, itemId: sig.item_id,
    })
  } else {
    store.writeClientComment({
      project: sig.project, body: sig.body ?? '', author: sig.author,
      itemId: sig.item_id, itemTitle: sig.item_title, source: sig.source ?? 'client',
    })
  }
}

export function markReadByPo(id: string): void {
  store.writeSignalRead(id)
}

export function markAllReadByPo(_po_id: string, _tenant_id: string): void {
  store.writeAllRead()
}

export function addPoReply(signal_id: string, reply: string, po_name: string): void {
  store.writePoReply(signal_id, reply, po_name)
}

export function markReplyReadByClient(id: string): void {
  store.writeReplyRead(id)
}

export function markAllClientRepliesRead(_tenant_id: string, client_author: string): void {
  store.writeAllRepliesRead(client_author)
}

export function markProjectReadByPo(project: string, _tenant_id: string): void {
  store.writeProjectRead(project)
}

export function addManagementMessage(
  project: string, _tenant_id: string, body: string, author_name: string, _author_initials: string,
): void {
  store.writeClientComment({ project, body, author: author_name, source: 'management' })
}

// ─── Read ─────────────────────────────────────────────────────────────────────
export function getAllSignals(): ClientSignal[] {
  return store.allSignals()
}

export function getUnreadForPo(po_id: string, tenant_id: string): ClientSignal[] {
  return getAllForPo(po_id, tenant_id).filter(s => s.source !== 'management' && !s.read_by_po)
}

export function getAllForPo(_po_id: string, _tenant_id: string): ClientSignal[] {
  return [...store.allSignals()]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
}

export function getSignalsForTenant(_tenant_id: string): ClientSignal[] {
  return getAllForPo('', '')
}

export function getSignalsForItem(item_id: string, _tenant_id: string): ClientSignal[] {
  return store.allSignals().filter(s => s.item_id === item_id)
}

export function getCommentsForProject(project: string, _tenant_id: string): ClientSignal[] {
  return getSignalsForProject(project, _tenant_id).filter(s => s.type === 'comment')
}

export function getSignalsForProject(project: string, _tenant_id: string): ClientSignal[] {
  return [...store.allSignals()]
    .filter(s => s.project === project)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

export function getClientUnreadReplies(_tenant_id: string, client_author: string): ClientSignal[] {
  return store.allSignals().filter(s =>
    s.author === client_author && s.po_reply !== undefined && s.reply_read_by_client === false)
}

export function getProjectsWithSignals(_tenant_id: string): {
  project: string
  unread: number
  latest: ClientSignal
}[] {
  const map = new Map<string, { unread: number; latest: ClientSignal }>()
  for (const s of store.allSignals()) {
    const entry = map.get(s.project)
    const isUnread = s.source !== 'management' && !s.read_by_po
    const latestDate = entry ? new Date(entry.latest.created_at).getTime() : 0
    const thisDate = new Date(s.created_at).getTime()
    map.set(s.project, {
      unread: (entry?.unread ?? 0) + (isUnread ? 1 : 0),
      latest: !entry || thisDate > latestDate ? s : entry.latest,
    })
  }
  return [...map.entries()]
    .map(([project, v]) => ({ project, ...v }))
    .sort((a, b) => new Date(b.latest.created_at).getTime() - new Date(a.latest.created_at).getTime())
}

export function getUnreadCountForTenant(_tenant_id: string): number {
  return store.allSignals().filter(s => s.source !== 'management' && !s.read_by_po).length
}
