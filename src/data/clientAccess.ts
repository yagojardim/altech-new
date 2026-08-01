/**
 * Altech — Client access records (Inspection Mode / mocked).
 * Stores portal credentials + capabilities per tenant client.
 * Tenant-scoped. Never cross-tenant.
 */
import { MOCK_TENANT } from './session'

export interface ClientAccessRecord {
  id:                   string
  tenant_id:            string
  client_name:          string
  client_email:         string
  permission:           'viewer' | 'admin'
  client_can_approve:   boolean   // default false — admin opt-in per client
  client_can_preview:   boolean   // default false — admin opt-in per client
  // client_can_comment is always true (native capability, never toggleable)
  password_must_change: boolean   // true on first access; cleared after client sets new password
  mock_password?:       string    // Inspection Mode only — demonstrativa, sem hash real
  created_at:           string
}

let _counter = 2
let CLIENT_ACCESS_RECORDS: ClientAccessRecord[] = [
  {
    id:                   'ca_001',
    tenant_id:            MOCK_TENANT.tenant_id,
    client_name:          'João Silva',
    client_email:         'joao@clienteexemplo.com',
    permission:           'admin',
    client_can_approve:   false,
    client_can_preview:   false,
    password_must_change: true,   // demo: first access triggers change-password modal
    mock_password:        'TempPass#2025',
    created_at:           '2025-07-01T00:00:00Z',
  },
]

export function getClientAccessByEmail(tenant_id: string, email: string): ClientAccessRecord | undefined {
  return CLIENT_ACCESS_RECORDS.find(r => r.tenant_id === tenant_id && r.client_email.toLowerCase() === email.toLowerCase())
}

export function updateClientPassword(id: string, newPassword: string): void {
  CLIENT_ACCESS_RECORDS = CLIENT_ACCESS_RECORDS.map(r =>
    r.id === id
      ? { ...r, mock_password: newPassword, password_must_change: false }
      : r
  )
}

export function createClientAccess(record: Omit<ClientAccessRecord, 'id' | 'created_at'>): ClientAccessRecord {
  const newRec: ClientAccessRecord = {
    password_must_change: true,  // always true for new records (temp password)
    ...record,
    id:         `ca_${String(_counter++).padStart(3, '0')}`,
    created_at: new Date().toISOString(),
  }
  CLIENT_ACCESS_RECORDS = [...CLIENT_ACCESS_RECORDS, newRec]
  return newRec
}

export function getClientAccess(tenant_id: string, client_name: string): ClientAccessRecord | undefined {
  return CLIENT_ACCESS_RECORDS.find(r => r.tenant_id === tenant_id && r.client_name === client_name)
}

export function getClientPermissions(tenant_id: string, client_name: string): {
  client_can_approve: boolean
  client_can_preview: boolean
  client_can_comment: true
} {
  const rec = getClientAccess(tenant_id, client_name)
  return {
    client_can_approve: rec?.client_can_approve ?? false,
    client_can_preview: rec?.client_can_preview ?? false,
    client_can_comment: true,
  }
}

export function getAllClientAccess(tenant_id: string): ClientAccessRecord[] {
  return CLIENT_ACCESS_RECORDS.filter(r => r.tenant_id === tenant_id)
}
