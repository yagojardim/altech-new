// ─── Per-tenant module activation state ─────────────────────────────────────
// Inspection Mode: mutable in-memory store. No billing, no real activation.
import { MOCK_TENANT } from './session'
import type { ModuleStatus } from './modules'

export interface TenantModuleRecord {
  id:                 string
  tenant_id:          string
  module_id:          string
  status:             ModuleStatus
  requested_by?:      string   // user_id
  requested_by_name?: string
  requested_at?:      string
  approved_by?:       string
  approved_at?:       string
  notes?:             string
}

const T = MOCK_TENANT.tenant_id

let TENANT_MODULES: TenantModuleRecord[] = [
  // Client Portal → Implemented (fully live)
  {
    id: 'tm_001', tenant_id: T, module_id: 'mod_client_portal',
    status: 'implemented',
    approved_by: 'Altech Team', approved_at: '2025-01-15T10:00:00Z',
  },
  // Agenda → Preview
  {
    id: 'tm_002', tenant_id: T, module_id: 'mod_calendar',
    status: 'preview',
    notes: 'Acesso antecipado ao calendário nativo.',
  },
  // Meeting Intelligence → not contracted
  {
    id: 'tm_003', tenant_id: T, module_id: 'mod_meeting_intel',
    status: 'not-contracted',
  },
  // AI Insights → planned (future)
  {
    id: 'tm_004', tenant_id: T, module_id: 'mod_ai_insights',
    status: 'planned',
  },
  // Community → coming-soon (future)
  {
    id: 'tm_005', tenant_id: T, module_id: 'mod_community',
    status: 'coming-soon',
  },
  // Academy → planned (future premium)
  {
    id: 'tm_006', tenant_id: T, module_id: 'mod_academy',
    status: 'planned',
  },
  // Financial → not contracted
  {
    id: 'tm_007', tenant_id: T, module_id: 'mod_financial',
    status: 'not-contracted',
  },
  // Backup Premium → not contracted
  {
    id: 'tm_008', tenant_id: T, module_id: 'mod_backup',
    status: 'not-contracted',
  },
]

export function getTenantModules(tenant_id: string): TenantModuleRecord[] {
  return TENANT_MODULES.filter(m => m.tenant_id === tenant_id)
}

export function getTenantModule(tenant_id: string, module_id: string): TenantModuleRecord | undefined {
  return TENANT_MODULES.find(m => m.tenant_id === tenant_id && m.module_id === module_id)
}

export function setModuleStatus(tenant_id: string, module_id: string, status: ModuleStatus, meta?: Partial<TenantModuleRecord>): void {
  TENANT_MODULES = TENANT_MODULES.map(m =>
    m.tenant_id === tenant_id && m.module_id === module_id
      ? { ...m, status, ...meta }
      : m
  )
}

export function countOperationalModules(tenant_id: string): { total: number; active: number } {
  const mods = getTenantModules(tenant_id)
  const active = mods.filter(m => m.status === 'operational' || m.status === 'implemented' || m.status === 'preview').length
  return { total: mods.length, active }
}
