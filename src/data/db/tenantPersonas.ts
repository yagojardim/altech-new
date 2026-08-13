// Personas de Inspection carregadas dos profiles REAIS do tenant (Rautaki).
// user_id da persona === profiles.id, para não quebrar RBAC/assignee/escopo.
import { supabase } from '../../integrations/supabase/client'
import { safeCall } from '../../utils/logger'
import { DEFAULT_TENANT_ID } from './timeline'
import { buildPersona, type MockUser, type RoleContext } from '../session'

interface ProfileLite {
  id: string
  name: string | null
  email: string | null
  status: string | null
  primary_role: string | null
  tenant_owner: boolean | null
}

interface UserRoleLite { profile_id: string | null; role_id: string | null }
interface RoleLite { id: string; key: string | null; name: string | null }

const ROLE_ALIASES: Record<string, RoleContext> = {
  admin: 'Admin', admin_master: 'Admin', administrador: 'Admin',
  pmo: 'PMO',
  project_manager: 'ProjectManager', pm: 'ProjectManager',
  product_manager: 'ProductManager',
  product_owner: 'ProductOwner', po: 'ProductOwner',
  scrum_master: 'ScrumMaster', sm: 'ScrumMaster',
  tech_lead: 'TechLead', tl: 'TechLead',
  dev: 'Dev', developer: 'Dev', desenvolvedor: 'Dev',
  ux: 'UX', design: 'UX', designer: 'UX',
  qa: 'QA', quality: 'QA', tester: 'QA',
}

function normalizeRole(raw: string | null | undefined): RoleContext | null {
  if (!raw) return null
  const key = raw.trim().toLowerCase().replace(/[\s/-]+/g, '_')
  return ROLE_ALIASES[key] ?? ROLE_ALIASES[key.replace(/_/g, '')] ?? null
}

/** Papéis conhecidos do time Rautaki (prevalecem sobre dados incompletos no banco). */
const NAME_OVERRIDES: { match: RegExp; role: RoleContext }[] = [
  { match: /pedro\s*zomer/i, role: 'TechLead' },
  { match: /yago\s*jardim/i, role: 'ProductOwner' },
  { match: /\bpaulo\b/i,     role: 'ScrumMaster' },
]

const ROLE_ORDER: RoleContext[] = [
  'Admin', 'PMO', 'ProjectManager', 'ProductManager', 'ProductOwner',
  'ScrumMaster', 'TechLead', 'Dev', 'QA', 'UX',
]

export function fetchTenantPersonas(): Promise<MockUser[]> {
  return safeCall<MockUser[]>('tenantPersonas.fetch', async () => {
    const { data: profileRows, error } = await supabase
      .from('profiles')
      .select('id, name, email, status, primary_role, tenant_owner')
      .eq('tenant_id', DEFAULT_TENANT_ID)
      .is('archived_at', null)
    if (error) throw error

    const profiles = (profileRows ?? []) as unknown as ProfileLite[]
    const active = profiles.filter(p => (p.status ?? 'active') !== 'inactive')
    if (!active.length) return []

    // Papel oficial via user_roles → roles.
    const roleByProfile = new Map<string, RoleContext>()
    const { data: urRows } = await supabase
      .from('user_roles')
      .select('profile_id, role_id')
      .eq('tenant_id', DEFAULT_TENANT_ID)
    const userRoles = (urRows ?? []) as unknown as UserRoleLite[]
    const roleIds = [...new Set(userRoles.map(r => r.role_id).filter((v): v is string => !!v))]
    if (roleIds.length) {
      const { data: roleRows } = await supabase.from('roles').select('id, key, name').in('id', roleIds)
      const roles = (roleRows ?? []) as unknown as RoleLite[]
      const byId = new Map(roles.map(r => [r.id, normalizeRole(r.key ?? r.name)]))
      for (const ur of userRoles) {
        if (!ur.profile_id || !ur.role_id) continue
        const rc = byId.get(ur.role_id)
        if (rc && !roleByProfile.has(ur.profile_id)) roleByProfile.set(ur.profile_id, rc)
      }
    }

    const personas = active.map(p => {
      const name = p.name ?? p.email ?? 'Sem nome'
      const override = NAME_OVERRIDES.find(o => o.match.test(name))?.role
      const role: RoleContext =
        override ?? roleByProfile.get(p.id) ?? normalizeRole(p.primary_role) ?? 'Dev'
      return buildPersona({
        user_id: p.id,
        name,
        email: p.email ?? '',
        role_context: role,
        tenant_owner: !!p.tenant_owner,
      })
    })

    personas.sort((a, b) => {
      const d = ROLE_ORDER.indexOf(a.role_context) - ROLE_ORDER.indexOf(b.role_context)
      return d !== 0 ? d : a.name.localeCompare(b.name)
    })
    return personas
  }, [])
}
