// ─── Pending invites store — mock only, filtered by tenant_id ─────────────────
import { MOCK_TENANT } from './session'
import type { RoleContext } from './session'

export type InviteStatus = 'pending' | 'expired' | 'accepted'

export interface Invite {
  id:           string
  tenant_id:    string
  name:         string
  email:        string
  role_context: RoleContext
  squad:        string
  invited_by:   string   // name of inviting user
  invited_at:   string   // ISO
  expires_at:   string   // ISO
  status:       InviteStatus
  link_token:   string   // mock token for "copy link"
}

export interface InviteAuditEntry {
  id:       string
  invite_id: string
  event:    string
  by:       string
  at:       string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

const T = MOCK_TENANT.tenant_id

// ─── Seeds ────────────────────────────────────────────────────────────────────
let _invites: Invite[] = [
  {
    id: 'inv_001', tenant_id: T,
    name: 'Caio Ribeiro', email: 'caio.ribeiro@startup.io',
    role_context: 'Dev', squad: 'squad_platform',
    invited_by: 'Diana Costa', invited_at: iso(-5), expires_at: iso(2),
    status: 'pending', link_token: 'tok_a1b2c3',
  },
  {
    id: 'inv_002', tenant_id: T,
    name: 'Renata Melo', email: 'renata.melo@agency.com',
    role_context: 'UX', squad: 'squad_design',
    invited_by: 'Diana Costa', invited_at: iso(-3), expires_at: iso(4),
    status: 'pending', link_token: 'tok_d4e5f6',
  },
  {
    id: 'inv_003', tenant_id: T,
    name: 'Tiago Lopes', email: 'tiago.lopes@corp.com',
    role_context: 'QA', squad: 'squad_growth',
    invited_by: 'Lucas Ferreira', invited_at: iso(-8), expires_at: iso(-1),
    status: 'expired', link_token: 'tok_g7h8i9',
  },
  {
    id: 'inv_004', tenant_id: T,
    name: 'Marina Dias', email: 'marina.dias@tech.io',
    role_context: 'ScrumMaster', squad: 'squad_ops',
    invited_by: 'Diana Costa', invited_at: iso(-1), expires_at: iso(6),
    status: 'pending', link_token: 'tok_j1k2l3',
  },
  {
    id: 'inv_005', tenant_id: T,
    name: 'André Costa', email: 'andre.costa@dev.io',
    role_context: 'TechLead', squad: 'squad_platform',
    invited_by: 'Diana Costa', invited_at: iso(-12), expires_at: iso(-5),
    status: 'accepted', link_token: 'tok_m4n5o6',
  },
]

let _audit: InviteAuditEntry[] = [
  { id: 'ia_001', invite_id: 'inv_005', event: 'Convite aceito', by: 'André Costa', at: iso(-5) },
  { id: 'ia_002', invite_id: 'inv_003', event: 'Convite expirado automaticamente', by: 'Sistema', at: iso(-1) },
]

let _counter = 10

// ─── Queries ─────────────────────────────────────────────────────────────────
export function getInvitesForTenant(tenant_id: string): Invite[] {
  return _invites.filter(i => i.tenant_id === tenant_id)
}

export function getPendingInvitesForTenant(tenant_id: string): Invite[] {
  return _invites.filter(i => i.tenant_id === tenant_id && i.status === 'pending')
}

export function countPendingInvites(tenant_id: string): number {
  return getPendingInvitesForTenant(tenant_id).length
}

export function nearestExpiry(tenant_id: string): Invite | undefined {
  return getPendingInvitesForTenant(tenant_id)
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at))[0]
}

export function getAuditForInvite(invite_id: string): InviteAuditEntry[] {
  return _audit.filter(e => e.invite_id === invite_id).sort((a,b) => b.at.localeCompare(a.at))
}

// ─── Mutations ────────────────────────────────────────────────────────────────
function addAudit(invite_id: string, event: string, by: string) {
  _audit = [{ id: `ia_${_counter++}`, invite_id, event, by, at: new Date().toISOString() }, ..._audit]
}

export function cancelInvite(id: string, by: string): void {
  _invites = _invites.map(i => i.id === id ? { ...i, status: 'expired' } : i)
  addAudit(id, 'Convite cancelado', by)
}

export function resendInvite(id: string, by: string): void {
  _invites = _invites.map(i =>
    i.id === id ? { ...i, status: 'pending', expires_at: iso(7), invited_at: new Date().toISOString() } : i
  )
  addAudit(id, 'Convite reenviado (expira em 7d)', by)
}

export function addInvite(invite: Omit<Invite, 'id' | 'link_token'>): Invite {
  const record: Invite = {
    ...invite,
    id: `inv_${String(_counter).padStart(3, '0')}`,
    link_token: `tok_${Math.random().toString(36).slice(2, 8)}`,
  }
  _counter++
  _invites = [record, ..._invites]
  addAudit(record.id, 'Convite enviado', invite.invited_by)
  return record
}
