/**
 * Altech — Client access facade.
 * Reads/writes the real client_portal_users table through the portal store.
 * Tenant + project scoped, never cross-tenant.
 */
import * as store from './clientPortalStore'

export interface ClientAccessRecord {
  id:                   string
  tenant_id:            string
  client_name:          string
  client_email:         string
  permission:           'viewer' | 'admin'
  client_can_approve:   boolean
  client_can_comment:   boolean
  client_can_preview:   boolean
  password_must_change: boolean
  project_id:           string
  created_at:           string
}

export function getAllClientAccess(_tenant_id: string): ClientAccessRecord[] {
  return store.allUsers()
}

export function getClientAccess(_tenant_id: string, client_name: string): ClientAccessRecord | undefined {
  return store.allUsers().find(r => r.client_name === client_name)
}

export function getClientAccessByEmail(_tenant_id: string, email: string): ClientAccessRecord | undefined {
  return store.allUsers().find(r => r.client_email.toLowerCase() === email.trim().toLowerCase())
}

export function getClientPermissions(_tenant_id: string, client_name: string): {
  client_can_approve: boolean
  client_can_preview: boolean
  client_can_comment: boolean
} {
  const rec = getClientAccess(_tenant_id, client_name)
  return {
    client_can_approve: rec?.client_can_approve ?? false,
    client_can_preview: rec?.client_can_preview ?? false,
    client_can_comment: rec?.client_can_comment ?? true,
  }
}

export function updateClientPassword(id: string, _newPassword: string): void {
  store.writePasswordChanged(id)
}

export function createClientAccess(input: {
  tenant_id: string
  client_name: string
  client_email: string
  permission: 'viewer' | 'admin'
  client_can_approve: boolean
  client_can_preview: boolean
  project_names?: string[]
  actor_name?: string
}): void {
  store.writePortalAccess({
    name: input.client_name,
    email: input.client_email,
    permission: input.permission,
    canApprove: input.client_can_approve,
    canPreview: input.client_can_preview,
    projectNames: input.project_names ?? [],
    actorName: input.actor_name,
  })
}
