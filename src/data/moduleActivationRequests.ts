// ─── Module activation request store ─────────────────────────────────────────
// "Solicitar ativação" creates a record here and sets module status → 'pending'.
// NEVER automatically activates the module. No billing/gateway.
import { MOCK_TENANT } from './session'

export type RequestPriority = 'low' | 'medium' | 'high' | 'critical'
export type RequestStatus   = 'pending' | 'in-review' | 'approved' | 'rejected' | 'cancelled'

export interface ModuleActivationRequest {
  id:               string
  tenant_id:        string
  module_id:        string
  module_name:      string
  requested_by:     string   // user_id
  requested_by_name: string
  requested_at:     string
  reason:           string
  expected_usage:   string
  priority:         RequestPriority
  observations?:    string
  status:           RequestStatus
}

export interface ModuleAuditEvent {
  id:         string
  tenant_id:  string
  module_id:  string
  event:      string
  by:         string
  at:         string
  detail?:    string
}

let REQUESTS: ModuleActivationRequest[] = []
let AUDIT:    ModuleAuditEvent[]        = [
  {
    id: 'ae_001', tenant_id: MOCK_TENANT.tenant_id,
    module_id: 'mod_client_portal',
    event: 'Módulo implementado', by: 'Altech Team',
    at: '2025-01-15T10:00:00Z',
    detail: 'Implementação inicial do Client Portal.',
  },
  {
    id: 'ae_002', tenant_id: MOCK_TENANT.tenant_id,
    module_id: 'mod_calendar',
    event: 'Preview habilitado', by: 'Altech Team',
    at: '2025-03-01T09:00:00Z',
    detail: 'Agenda Integrada disponível em acesso antecipado.',
  },
]

let _counter = 10

export function getRequestsForTenant(tenant_id: string): ModuleActivationRequest[] {
  return REQUESTS.filter(r => r.tenant_id === tenant_id).sort((a, b) => b.requested_at.localeCompare(a.requested_at))
}

export function getRequestForModule(tenant_id: string, module_id: string): ModuleActivationRequest | undefined {
  return REQUESTS.find(r => r.tenant_id === tenant_id && r.module_id === module_id && r.status === 'pending')
}

export function getAuditForModule(tenant_id: string, module_id: string): ModuleAuditEvent[] {
  return AUDIT.filter(e => e.tenant_id === tenant_id && e.module_id === module_id).sort((a, b) => b.at.localeCompare(a.at))
}

export function createActivationRequest(req: Omit<ModuleActivationRequest, 'id' | 'requested_at' | 'status'>): ModuleActivationRequest {
  const record: ModuleActivationRequest = {
    ...req,
    id: `req_${String(_counter++).padStart(3, '0')}`,
    requested_at: new Date().toISOString(),
    status: 'pending',
  }
  REQUESTS = [record, ...REQUESTS]

  AUDIT = [{
    id: `ae_${_counter++}`,
    tenant_id: req.tenant_id,
    module_id: req.module_id,
    event: 'Ativação solicitada',
    by: req.requested_by_name,
    at: new Date().toISOString(),
    detail: `Prioridade: ${req.priority} — ${req.reason.slice(0, 80)}${req.reason.length > 80 ? '…' : ''}`,
  }, ...AUDIT]

  return record
}

export function addAuditEvent(event: Omit<ModuleAuditEvent, 'id'>): void {
  AUDIT = [{ ...event, id: `ae_${_counter++}` }, ...AUDIT]
}
