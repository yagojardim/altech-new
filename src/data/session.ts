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
export const MOCK_TENANT: Tenant = {
  tenant_id: 'ten_altech_001',
  name: 'Altech Agency',
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

// ─── Users — one per role, plus multi-dashboard examples ─────────────────────
export const MOCK_USERS: MockUser[] = [
  {
    user_id: 'u_admin',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Diana Costa',
    email: 'diana@altech.io',
    avatar_initials: 'DC',
    avatar_color: '#7d92ff',
    role_context: 'Admin',
    project_id: '*',
    squad_id: '*',
    modules_enabled: ['board','reports','portfolio','roadmap','config','team','modules','audit'],
    permissions: ['*'],
    assigned_dashboards: [ud('u_admin', 'admin', true)],
    approved_squads: ['squad_growth', 'squad_platform', 'squad_design'],
  },
  {
    user_id: 'u_pmo',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Carlos Drummond',
    email: 'carlos@altech.io',
    avatar_initials: 'CD',
    avatar_color: '#35c9ae',
    role_context: 'PMO',
    project_id: 'proj_001',
    squad_id: 'squad_platform',
    modules_enabled: ['board','reports','portfolio','roadmap'],
    permissions: derivePermissions('PMO'),
    assigned_dashboards: [ud('u_pmo', 'pmo', true), ud('u_pmo', 'admin', false)],
  },
  {
    user_id: 'u_pm',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Mariana Souza',
    email: 'mariana@altech.io',
    avatar_initials: 'MS',
    avatar_color: '#f5a524',
    role_context: 'ProjectManager',
    project_id: 'proj_001',
    squad_id: 'squad_growth',
    modules_enabled: ['board','reports','roadmap','releases'],
    permissions: derivePermissions('ProjectManager', ['approve:hours']),
    assigned_dashboards: [ud('u_pm', 'project-manager', true)],
    approved_squads: ['squad_growth'],
  },
  {
    user_id: 'u_prodmgr',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Felipe Nunes',
    email: 'felipe@altech.io',
    avatar_initials: 'FN',
    avatar_color: '#a78bfa',
    role_context: 'ProductManager',
    project_id: 'proj_001',
    squad_id: 'squad_growth',
    modules_enabled: ['board','reports','roadmap','analytics'],
    permissions: derivePermissions('ProductManager'),
    assigned_dashboards: [ud('u_prodmgr', 'product-manager', true), ud('u_prodmgr', 'pmo', false)],
  },
  {
    user_id: 'u_po',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Beatriz Alves',
    email: 'beatriz@altech.io',
    avatar_initials: 'BA',
    avatar_color: '#f0455a',
    role_context: 'ProductOwner',
    project_id: 'proj_001',
    squad_id: 'squad_growth',
    modules_enabled: ['board','reports','roadmap'],
    permissions: derivePermissions('ProductOwner'),
    assigned_dashboards: [ud('u_po', 'product-owner', true), ud('u_po', 'project-manager', false)],
  },
  {
    user_id: 'u_sm',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Rafael Mendes',
    email: 'rafael.sm@altech.io',
    avatar_initials: 'RM',
    avatar_color: '#60a5fa',
    role_context: 'ScrumMaster',
    project_id: 'proj_001',
    squad_id: 'squad_growth',
    modules_enabled: ['board','reports'],
    permissions: derivePermissions('ScrumMaster'),
    assigned_dashboards: [ud('u_sm', 'scrum-master', true)],
  },
  {
    user_id: 'u_tl',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Lucas Ferreira',
    email: 'lucas.tl@altech.io',
    avatar_initials: 'LF',
    avatar_color: '#34d399',
    role_context: 'TechLead',
    project_id: 'proj_002',
    squad_id: 'squad_platform',
    modules_enabled: ['board','reports','integrations','deployments'],
    // TechLead with opt-ins for epic/dashview (granted at invite time)
    permissions: derivePermissions('TechLead', ['create:epic', 'create:feature', 'access:dashview']),
    assigned_dashboards: [ud('u_tl', 'tech-lead', true), ud('u_tl', 'dev', false)],
  },
  {
    user_id: 'u_dev',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Ana Lima',
    email: 'ana@altech.io',
    avatar_initials: 'AL',
    avatar_color: '#fb923c',
    role_context: 'Dev',
    project_id: 'proj_002',
    squad_id: 'squad_platform',
    modules_enabled: ['board','reports'],
    permissions: derivePermissions('Dev'),
    assigned_dashboards: [ud('u_dev', 'dev', true)],
  },
  {
    user_id: 'u_ux',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Camila Torres',
    email: 'camila@altech.io',
    avatar_initials: 'CT',
    avatar_color: '#e879f9',
    role_context: 'UX',
    project_id: 'proj_001',
    squad_id: 'squad_design',
    modules_enabled: ['board','reports'],
    permissions: derivePermissions('UX'),
    assigned_dashboards: [ud('u_ux', 'ux', true)],
  },
  {
    user_id: 'u_qa',
    tenant_id: MOCK_TENANT.tenant_id,
    name: 'Bruno Saraiva',
    email: 'bruno@altech.io',
    avatar_initials: 'BS',
    avatar_color: '#fbbf24',
    role_context: 'QA',
    project_id: 'proj_002',
    squad_id: 'squad_platform',
    modules_enabled: ['board','reports'],
    permissions: derivePermissions('QA'),
    assigned_dashboards: [ud('u_qa', 'qa', true), ud('u_qa', 'tech-lead', false)],
  },
]

// ─── Active inspection-mode session ──────────────────────────────────────────
export let ACTIVE_USER_ID = 'u_po'

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
