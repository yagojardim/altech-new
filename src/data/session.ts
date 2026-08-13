// ─── Inspection Mode mock session data ───────────────────────────────────────
// All data is tenant-scoped. Never expose cross-tenant data.
import { derivePermissions } from './permissions'

export interface Tenant {
  tenant_id: string
  name: string
}

export type RoleContext =
  | 'Admin' | 'PMO' | 'ProjectManager' | 'ProductManager' | 'ProductOwner'
  | 'ScrumMaster' | 'TechLead' | 'Dev' | 'UX' | 'QA'

export interface UserDashboard {
  id: string
  tenant_id: string
  user_id: string
  dashboard_id: string
  is_default: boolean
  status: 'active' | 'inactive'
  created_at: string
  created_by: string
  updated_at: string
  updated_by: string
}

export type DashboardType =
  | 'admin'
  | 'pmo'
  | 'project-manager'
  | 'product-manager'
  | 'product-owner'
  | 'scrum-master'
  | 'tech-lead'
  | 'dev'
  | 'ux'
  | 'qa'

export interface DashboardDef {
  dashboard_id: DashboardType
  label: string
  description: string
  question: string
}

export interface MockUser {
  user_id: string
  tenant_id: string
  name: string
  email: string
  avatar_initials: string
  avatar_color: string
  role_context: RoleContext
  project_id: string
  squad_id: string
  modules_enabled: string[]
  permissions: string[]
  assigned_dashboards: UserDashboard[]
  password_must_change?: boolean
  approved_squads?: string[]
}

// ─── Catalog of all 10 dashboards ────────────────────────────────────────────
export const DASHBOARD_CATALOG: Record<DashboardType, DashboardDef> = {
  'admin':          { dashboard_id: 'admin',          label: 'Admin Master',      description: 'Gestão de usuários, projetos e módulos do tenant',           question: 'Minha empresa está corretamente administrada?' },
  'pmo':            { dashboard_id: 'pmo',            label: 'PMO',               description: 'Saúde e previsibilidade do portfólio de projetos',           question: 'Quais projetos precisam de atenção?' },
  'project-manager':{ dashboard_id: 'project-manager',label: 'Project Manager',   description: 'Status, bloqueios e próximas ações do projeto',             question: 'O que preciso destravar neste projeto?' },
  'product-manager':{ dashboard_id: 'product-manager',label: 'Product Manager',   description: 'Valor gerado, adoção e saúde do produto',                   question: 'O produto gera valor real?' },
  'product-owner':  { dashboard_id: 'product-owner',  label: 'Product Owner',     description: 'Qualidade, priorização e prontidão do backlog',             question: 'O backlog está claro, priorizado, refinado e pronto?' },
  'scrum-master':   { dashboard_id: 'scrum-master',   label: 'Scrum Master',      description: 'Fluxo da sprint, impedimentos e facilitação de cerimônias', question: 'O time está fluindo e o que impede a sprint de avançar?' },
  'tech-lead':      { dashboard_id: 'tech-lead',      label: 'Tech Lead',         description: 'Saúde técnica, PRs, deploys e dívida técnica',             question: 'O time consegue entregar tecnicamente com qualidade?' },
  'dev':            { dashboard_id: 'dev',            label: 'Dev',               description: 'Minha fila ativa, PRs e ações pendentes hoje',              question: 'O que preciso resolver primeiro hoje?' },
  'ux':             { dashboard_id: 'ux',             label: 'UX / UI',           description: 'Design ativo, validações e handoffs para dev',              question: 'A experiência está clara, validada, consistente e pronta?' },
  'qa':             { dashboard_id: 'qa',             label: 'QA',                description: 'Fila de testes, bugs críticos e cobertura de critérios',    question: 'O que preciso testar agora para garantir a entrega?' },
}

// ─── Tenant ───────────────────────────────────────────────────────────────────
/** Mesmo tenant real do banco (DEFAULT_TENANT_ID) — Rautaki. */
export const MOCK_TENANT: Tenant = {
  tenant_id: '00000000-0000-0000-0000-000000000001',
  name: 'Rautaki',
}

function ud(user_id: string, dashboard_id: DashboardType, is_default: boolean): UserDashboard {
  return {
    id: `ud_${user_id}_${dashboard_id}`,
    tenant_id: MOCK_TENANT.tenant_id,
    user_id,
    dashboard_id,
    is_default,
    status: 'active',
    created_at: '2025-01-10T09:00:00Z',
    created_by: 'sys',
    updated_at: '2025-06-01T12:00:00Z',
    updated_by: 'sys',
  }
}

export const DEFAULT_DASHBOARD_BY_ROLE: Record<RoleContext, DashboardType> = {
  Admin: 'admin', PMO: 'pmo', ProjectManager: 'project-manager',
  ProductManager: 'product-manager', ProductOwner: 'product-owner',
  ScrumMaster: 'scrum-master', TechLead: 'tech-lead', Dev: 'dev',
  UX: 'ux', QA: 'qa',
}

const AVATAR_COLORS = ['#7d92ff', '#35c9ae', '#f5a524', '#a78bfa', '#f0455a', '#60a5fa', '#34d399', '#fb923c', '#e879f9', '#fbbf24']

export function personaAvatarColor(seed: string): string {
  let hash = 0
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

export function personaInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return '??'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

const BASE_MODULES = ['board', 'reports', 'roadmap']

/** Monta uma persona de Inspection a partir de um profile real do tenant. */
export function buildPersona(input: {
  user_id: string
  tenant_id?: string
  name: string
  email: string
  role_context: RoleContext
  tenant_owner?: boolean
}): MockUser {
  const tenantId = input.tenant_id ?? MOCK_TENANT.tenant_id
  const isMaster = !!input.tenant_owner
  const dash = DEFAULT_DASHBOARD_BY_ROLE[input.role_context]
  const dashboards = [ud(input.user_id, dash, true)]
  if (isMaster && dash !== 'admin') dashboards.push(ud(input.user_id, 'admin', false))

  return {
    user_id: input.user_id,
    tenant_id: tenantId,
    name: input.name,
    email: input.email.toLowerCase(),
    avatar_initials: personaInitials(input.name),
    avatar_color: personaAvatarColor(input.email || input.name),
    role_context: input.role_context,
    project_id: '*',
    squad_id: '*',
    modules_enabled: isMaster
      ? ['board', 'reports', 'portfolio', 'roadmap', 'config', 'team', 'modules', 'audit']
      : BASE_MODULES,
    permissions: isMaster ? ['*'] : derivePermissions(input.role_context),
    assigned_dashboards: dashboards,
  }
}

// ─── Personas do tenant Rautaki ───────────────────────────────────────────────
// Seed mínimo (substituído na inicialização pelos profiles reais do banco, para
// que user_id === profiles.id — RBAC, assignee e fetchAssignedProjects dependem disso).
export const MOCK_USERS: MockUser[] = [
  buildPersona({ user_id: 'seed_pedro',  name: 'Pedro Zomer', email: 'pedro@rautaki.com', role_context: 'TechLead',     tenant_owner: true }),
  buildPersona({ user_id: 'seed_yago',   name: 'Yago Jardim', email: 'yago@rautaki.com',  role_context: 'ProductOwner' }),
  buildPersona({ user_id: 'seed_paulo',  name: 'Paulo',       email: 'paulo@rautaki.com', role_context: 'ScrumMaster' }),
]

/** Substitui as personas de Inspection pelos profiles reais do tenant. */
export function hydratePersonas(users: MockUser[]): void {
  if (!users.length) return
  MOCK_USERS.splice(0, MOCK_USERS.length, ...users)
  if (!MOCK_USERS.some(u => u.user_id === ACTIVE_USER_ID)) {
    ACTIVE_USER_ID = MOCK_USERS[0].user_id
  }
}

// ─── Active inspection-mode session ──────────────────────────────────────────
export let ACTIVE_USER_ID = MOCK_USERS[0].user_id

export function setActiveUser(user_id: string) {
  ACTIVE_USER_ID = user_id
}


// ─── Scope model ──────────────────────────────────────────────────────────────
export interface UserScope {
  user_id: string
  tenant_id: string
  role_context: RoleContext
  projects_allowed: string[]
  workspaces_allowed: string[]
  squads_allowed: string[]
  modules_allowed: string[]
  features_allowed: string[]
  repositories_allowed: string[]
  permissions: string[]
  assigned_dashboards: UserDashboard[]
  default_dashboard: UserDashboard
}

export function getUserAccessibleScope(
  user_id: string,
  tenant_id: string,
  _dashboard_type?: DashboardType,
): UserScope | null {
  const user = MOCK_USERS.find(u => u.user_id === user_id && u.tenant_id === tenant_id)
  if (!user) return null

  const defaultDash =
    user.assigned_dashboards.find(d => d.is_default) ?? user.assigned_dashboards[0]

  return {
    user_id: user.user_id,
    tenant_id: user.tenant_id,
    role_context: user.role_context,
    projects_allowed: user.project_id === '*' ? ['proj_001','proj_002'] : [user.project_id],
    workspaces_allowed: [`ws_${user.tenant_id}`],
    squads_allowed: user.squad_id === '*' ? ['squad_platform','squad_growth','squad_design'] : [user.squad_id],
    modules_allowed: user.modules_enabled,
    features_allowed: user.modules_enabled.map(m => `feat_${m}`),
    repositories_allowed: user.project_id === '*' ? ['repo_proj_001','repo_proj_002'] : [`repo_${user.project_id}`],
    permissions: user.permissions,
    assigned_dashboards: user.assigned_dashboards.filter(d => d.tenant_id === tenant_id),
    default_dashboard: defaultDash,
  }
}

export function getActiveScope(): UserScope {
  const scope = getUserAccessibleScope(ACTIVE_USER_ID, MOCK_TENANT.tenant_id)
  if (!scope) throw new Error(`No scope for active user ${ACTIVE_USER_ID}`)
  return scope
}

export function getActiveUser(): MockUser {
  return MOCK_USERS.find(u => u.user_id === ACTIVE_USER_ID)!
}

// ─── Invite flow (mock): adds a new user to the in-memory list ────────────────
export function addMockUser(user: MockUser): void {
  MOCK_USERS.push(user)
}

export function updateApprovedSquads(user_id: string, squads: string[]): void {
  const u = MOCK_USERS.find(u => u.user_id === user_id)
  if (u) u.approved_squads = squads
}

export function deactivateMockUser(user_id: string): void {
  const u = MOCK_USERS.find(u => u.user_id === user_id)
  if (u) (u as MockUser & { status?: string }).status = 'inactive'
}

export function blockMockUser(user_id: string): void {
  const u = MOCK_USERS.find(u => u.user_id === user_id)
  if (u) (u as MockUser & { status?: string }).status = 'blocked'
}
