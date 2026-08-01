import { MOCK_TENANT, MOCK_USERS } from './session'

export type TimesheetStatus = 'saved' | 'submitted' | 'approved' | 'rejected'

export interface TimesheetEntry {
  id:            string
  tenant_id:     string
  user_id:       string
  user_name:     string
  user_initials: string
  date:          string         // YYYY-MM-DD
  project_id:    string
  project_name:  string
  item_id:       string
  item_label:    string         // "PM-142 · Login refactor"
  hours:         number
  description:   string
  status:        TimesheetStatus
  squad_id?:     string
  approver_id?:  string
  submitted_at?:  string
  reviewed_by?:   string
  reviewed_at?:   string
  reject_reason?: string
  created_at:    string
}

export interface AuditEntry {
  id:       string
  entry_id: string
  action:   'submitted' | 'approved' | 'rejected'
  by:       string
  at:       string
  reason?:  string
}

export const SQUADS = [
  { id: 'squad_growth',   name: 'Growth'   },
  { id: 'squad_platform', name: 'Platform' },
  { id: 'squad_design',   name: 'Design'   },
]

// ─── Mutable store ────────────────────────────────────────────────────────────
let ENTRIES: TimesheetEntry[] = [
  {
    id: 'ts_001', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_dev', user_name: 'Ana Lima', user_initials: 'AL',
    date: '2025-07-21', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-101', item_label: 'PM-101 · Login page refactor',
    hours: 4, description: 'Refatoração da tela de login com novos tokens de design.',
    status: 'submitted', submitted_at: '2025-07-21T18:00:00Z', created_at: '2025-07-21T09:00:00Z',
    squad_id: 'squad_platform', approver_id: 'u_admin',
  },
  {
    id: 'ts_002', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_dev', user_name: 'Ana Lima', user_initials: 'AL',
    date: '2025-07-22', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-103', item_label: 'PM-103 · Unit tests auth module',
    hours: 3, description: 'Testes unitários do módulo de autenticação JWT.',
    status: 'approved', submitted_at: '2025-07-22T18:00:00Z',
    reviewed_by: 'Diana Costa', reviewed_at: '2025-07-23T09:30:00Z',
    created_at: '2025-07-22T09:00:00Z',
    squad_id: 'squad_platform', approver_id: 'u_admin',
  },
  {
    id: 'ts_003', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_tl', user_name: 'Lucas Ferreira', user_initials: 'LF',
    date: '2025-07-22', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-110', item_label: 'PM-110 · Code review sprint 14',
    hours: 2, description: 'Revisão dos PRs da sprint 14, feedback para o time.',
    status: 'submitted', submitted_at: '2025-07-22T17:00:00Z', created_at: '2025-07-22T14:00:00Z',
    squad_id: 'squad_platform', approver_id: 'u_admin',
  },
  {
    id: 'ts_004', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_po', user_name: 'Beatriz Alves', user_initials: 'BA',
    date: '2025-07-23', project_id: 'proj_002', project_name: 'Infra Migration',
    item_id: 'IM-022', item_label: 'IM-022 · Backlog grooming session',
    hours: 1.5, description: 'Sessão de refinamento do backlog com stakeholders.',
    status: 'submitted', submitted_at: '2025-07-23T16:00:00Z', created_at: '2025-07-23T10:00:00Z',
    squad_id: 'squad_growth', approver_id: 'u_pm',
  },
  {
    id: 'ts_005', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_dev', user_name: 'Ana Lima', user_initials: 'AL',
    date: '2025-07-23', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-115', item_label: 'PM-115 · Fix CORS policy',
    hours: 2.5, description: 'Investigação e correção do problema de CORS na API gateway.',
    status: 'saved', created_at: '2025-07-23T15:00:00Z',
    squad_id: 'squad_platform',
  },
  {
    id: 'ts_006', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_sm', user_name: 'Rafael Mendes', user_initials: 'RM',
    date: '2025-07-21', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-100', item_label: 'PM-100 · Sprint planning',
    hours: 2, description: 'Planejamento da sprint 14, estimativas e goal definition.',
    status: 'rejected', submitted_at: '2025-07-21T19:00:00Z',
    reviewed_by: 'Diana Costa', reviewed_at: '2025-07-22T08:00:00Z',
    reject_reason: 'Horas insuficientes para o escopo descrito. Por favor detalhe melhor.',
    created_at: '2025-07-21T09:00:00Z',
    squad_id: 'squad_growth', approver_id: 'u_pm',
  },
  {
    id: 'ts_007', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_ux', user_name: 'Camila Torres', user_initials: 'CT',
    date: '2025-07-24', project_id: 'proj_001', project_name: 'Website Relaunch',
    item_id: 'PM-120', item_label: 'PM-120 · Homepage redesign',
    hours: 6, description: 'Redesign completo da homepage com novos componentes.',
    status: 'submitted', submitted_at: '2025-07-24T17:00:00Z', created_at: '2025-07-24T09:00:00Z',
    squad_id: 'squad_design', approver_id: 'u_admin',
  },
  {
    id: 'ts_008', tenant_id: MOCK_TENANT.tenant_id,
    user_id: 'u_qa', user_name: 'Bruno Saraiva', user_initials: 'BS',
    date: '2025-07-24', project_id: 'proj_002', project_name: 'Infra Migration',
    item_id: 'IM-030', item_label: 'IM-030 · Load balancer config',
    hours: 3, description: 'Testes de carga e configuração do load balancer em staging.',
    status: 'approved', submitted_at: '2025-07-24T16:00:00Z',
    reviewed_by: 'Diana Costa', reviewed_at: '2025-07-25T09:00:00Z',
    created_at: '2025-07-24T08:00:00Z',
    squad_id: 'squad_platform', approver_id: 'u_admin',
  },
]

let AUDIT: AuditEntry[] = [
  { id: 'au_001', entry_id: 'ts_002', action: 'submitted', by: 'Ana Lima',       at: '2025-07-22T18:00:00Z' },
  { id: 'au_002', entry_id: 'ts_002', action: 'approved',  by: 'Diana Costa',    at: '2025-07-23T09:30:00Z' },
  { id: 'au_003', entry_id: 'ts_006', action: 'submitted', by: 'Rafael Mendes',  at: '2025-07-21T19:00:00Z' },
  { id: 'au_004', entry_id: 'ts_006', action: 'rejected',  by: 'Diana Costa',    at: '2025-07-22T08:00:00Z', reason: 'Horas insuficientes.' },
  { id: 'au_005', entry_id: 'ts_008', action: 'submitted', by: 'Bruno Saraiva',  at: '2025-07-24T16:00:00Z' },
  { id: 'au_006', entry_id: 'ts_008', action: 'approved',  by: 'Diana Costa',    at: '2025-07-25T09:00:00Z' },
]

let _counter = 10

// ─── Queries ─────────────────────────────────────────────────────────────────
export function getMyEntries(user_id: string, tenant_id: string): TimesheetEntry[] {
  return ENTRIES.filter(e => e.user_id === user_id && e.tenant_id === tenant_id)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getPendingEntries(tenant_id: string): TimesheetEntry[] {
  return ENTRIES.filter(e => e.tenant_id === tenant_id && e.status === 'submitted')
    .sort((a, b) => (a.submitted_at ?? '').localeCompare(b.submitted_at ?? ''))
}

export function getEntriesBySquads(squad_ids: string[], tenant_id: string): TimesheetEntry[] {
  if (squad_ids.length === 0) return []
  return ENTRIES.filter(e => e.tenant_id === tenant_id && squad_ids.includes(e.squad_id ?? ''))
    .sort((a, b) => b.date.localeCompare(a.date))
}

export function getAuditForEntry(entry_id: string): AuditEntry[] {
  return AUDIT.filter(a => a.entry_id === entry_id).sort((a, b) => a.at.localeCompare(b.at))
}

export function getApproversForTenant(tenant_id: string): { user_id: string; name: string; initials: string; approved_squads: string[] }[] {
  return MOCK_USERS
    .filter(u => u.tenant_id === tenant_id && (u.permissions.includes('*') || u.permissions.includes('approve:hours')))
    .map(u => ({ user_id: u.user_id, name: u.name, initials: u.avatar_initials, approved_squads: u.approved_squads ?? [] }))
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export function addEntry(e: Omit<TimesheetEntry, 'id' | 'created_at'>): TimesheetEntry {
  const entry: TimesheetEntry = {
    ...e,
    id: `ts_${String(_counter++).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  }
  ENTRIES = [entry, ...ENTRIES]
  return entry
}

export function updateEntry(id: string, patch: Partial<Pick<TimesheetEntry, 'date' | 'project_id' | 'project_name' | 'item_id' | 'item_label' | 'hours' | 'description'>>): void {
  ENTRIES = ENTRIES.map(e => e.id !== id ? e : { ...e, ...patch })
}

export function deleteEntry(id: string): void {
  ENTRIES = ENTRIES.filter(e => e.id !== id)
}

export function submitEntry(id: string): void {
  ENTRIES = ENTRIES.map(e =>
    e.id !== id ? e : { ...e, status: 'submitted', submitted_at: new Date().toISOString() }
  )
  const entry = ENTRIES.find(e => e.id === id)
  if (entry) {
    AUDIT = [...AUDIT, { id: `au_${_counter++}`, entry_id: id, action: 'submitted', by: entry.user_name, at: new Date().toISOString() }]
  }
}

export function submitPeriodEntries(user_id: string, tenant_id: string, period: string, approver_id: string, approver_name: string): number {
  // period = "YYYY-MM"
  let count = 0
  ENTRIES = ENTRIES.map(e => {
    if (e.user_id !== user_id || e.tenant_id !== tenant_id) return e
    if (e.status !== 'saved') return e
    if (!e.date.startsWith(period)) return e
    count++
    return { ...e, status: 'submitted', submitted_at: new Date().toISOString(), approver_id }
  })
  if (count > 0) {
    AUDIT = [...AUDIT, {
      id: `au_${_counter++}`, entry_id: `period_${period}`,
      action: 'submitted', by: approver_name, at: new Date().toISOString(),
    }]
  }
  return count
}

export function approveEntry(id: string, reviewer: string): void {
  ENTRIES = ENTRIES.map(e =>
    e.id !== id ? e : { ...e, status: 'approved', reviewed_by: reviewer, reviewed_at: new Date().toISOString() }
  )
  AUDIT = [...AUDIT, { id: `au_${_counter++}`, entry_id: id, action: 'approved', by: reviewer, at: new Date().toISOString() }]
}

export function rejectEntry(id: string, reviewer: string, reason: string): void {
  ENTRIES = ENTRIES.map(e =>
    e.id !== id ? e : { ...e, status: 'rejected', reviewed_by: reviewer, reviewed_at: new Date().toISOString(), reject_reason: reason }
  )
  AUDIT = [...AUDIT, { id: `au_${_counter++}`, entry_id: id, action: 'rejected', by: reviewer, at: new Date().toISOString(), reason }]
}

export function batchApprove(ids: string[], reviewer: string): void {
  for (const id of ids) approveEntry(id, reviewer)
}

export function batchReject(ids: string[], reviewer: string, reason: string): void {
  for (const id of ids) rejectEntry(id, reviewer, reason)
}

export const MOCK_PROJECTS = [
  { id: 'proj_001', name: 'Website Relaunch' },
  { id: 'proj_002', name: 'Infra Migration' },
  { id: 'proj_003', name: 'Mobile App' },
]

export const MOCK_ITEMS: Record<string, { id: string; label: string }[]> = {
  proj_001: [
    { id: 'PM-101', label: 'PM-101 · Login page refactor' },
    { id: 'PM-103', label: 'PM-103 · Unit tests auth module' },
    { id: 'PM-110', label: 'PM-110 · Code review' },
    { id: 'PM-115', label: 'PM-115 · Fix CORS policy' },
    { id: 'PM-120', label: 'PM-120 · Homepage redesign' },
    { id: 'PM-125', label: 'PM-125 · Performance audit' },
  ],
  proj_002: [
    { id: 'IM-020', label: 'IM-020 · DB migration script' },
    { id: 'IM-022', label: 'IM-022 · Backlog grooming' },
    { id: 'IM-030', label: 'IM-030 · Load balancer config' },
  ],
  proj_003: [
    { id: 'MA-010', label: 'MA-010 · iOS push notifications' },
    { id: 'MA-015', label: 'MA-015 · Android build pipeline' },
  ],
}

// Flat list for combobox search
export const ALL_ITEMS = Object.entries(MOCK_ITEMS).flatMap(([proj_id, items]) => {
  const proj = MOCK_PROJECTS.find(p => p.id === proj_id)!
  return items.map(i => ({
    item_id: i.id,
    item_label: i.label,
    project_id: proj_id,
    project_name: proj.name,
    search: `${i.id} ${i.label} ${proj.name}`.toLowerCase(),
  }))
})
