/* eslint-disable @typescript-eslint/no-explicit-any */
// Members data access layer — lê os profiles do tenant, incluindo os campos de
// Admin Master (dono do tenant). Admin Master ≠ SUPER_ADMIN da Altech.
import { supabase } from '../../integrations/supabase/client'
import { DEFAULT_TENANT_ID } from './timeline'
import { safeCall } from '../../utils/logger'

export { DEFAULT_TENANT_ID }

export interface MemberRow {
  id: string
  name: string
  email: string
  status: string
  tenant_owner: boolean
  primary_role: string | null
  first_access_at: string | null
  last_access_at: string | null
}

export function getMembers(): Promise<MemberRow[]> {
  return safeCall<MemberRow[]>('members.getMembers', async () => {
    const { data, error } = await (supabase as unknown as { from: (t: string) => any })
      .from('profiles')
      .select('id, name, email, status, tenant_owner, primary_role, first_access_at, last_access_at')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .is('archived_at', null)
    if (error) throw error
    return (data ?? []).map((r: any): MemberRow => ({
      id: r.id,
      name: r.name ?? '',
      email: r.email ?? '',
      status: r.status ?? 'active',
      tenant_owner: !!r.tenant_owner,
      primary_role: r.primary_role ?? null,
      first_access_at: r.first_access_at ?? null,
      last_access_at: r.last_access_at ?? null,
    }))
  }, [])
}

/** E-mails (minúsculos) dos donos do tenant — usado para proteger o Admin Master na UI. */
export function getTenantOwnerEmails(): Promise<Set<string>> {
  return safeCall<Set<string>>('members.getTenantOwnerEmails', async () => {
    const members = await getMembers()
    return new Set(members.filter(m => m.tenant_owner).map(m => m.email.toLowerCase()))
  }, new Set<string>())
}
