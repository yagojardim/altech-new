import type { WorkItem } from '../components/ds/DashboardKit'

const MS = { name: 'Mariana Souza',  initials: 'MS', color: '#f5a524' }
const AL = { name: 'Ana Lima',       initials: 'AL', color: '#fb923c' }
const LF = { name: 'Lucas Ferreira', initials: 'LF', color: '#34d399' }
const BS = { name: 'Bruno Saraiva',  initials: 'BS', color: '#fbbf24' }
const RM = { name: 'Rafael Mendes',  initials: 'RM', color: '#60a5fa' }
const CT = { name: 'Camila Torres',  initials: 'CT', color: '#e879f9' }
const FN = { name: 'Felipe Nunes',   initials: 'FN', color: '#a78bfa' }

export const WORK_ITEMS: WorkItem[] = [
  {
    id: 'wi-001', key: 'ALT-139', title: 'Exportar relatório em CSV',
    type: 'story', status: 'in-progress', priority: 'high',
    assignee: LF, reporter: MS,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 5, tags: ['backend', 'relatórios'],
    description: 'Permitir que o usuário exporte a lista de issues em formato CSV com colunas configuráveis.',
    history: [
      { when: 'há 5d', action: 'Issue criada', by: MS.name },
      { when: 'há 3d', action: 'Movida para Em Dev', by: LF.name },
      { when: 'há 1d', action: 'PR #282 aberta', by: LF.name },
    ],
  },
  {
    id: 'wi-002', key: 'ALT-141', title: 'Notificações por e-mail',
    type: 'story', status: 'backlog', priority: 'medium',
    assignee: undefined, reporter: FN,
    sprint: 'Sprint 15', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 8, tags: ['Sem Responsável', 'Sem Critério de Aceite'],
    description: 'Enviar notificações por e-mail quando uma issue for atribuída ou comentada.',
    history: [{ when: 'há 8d', action: 'Issue criada', by: FN.name }],
  },
  {
    id: 'wi-003', key: 'ALT-142', title: 'Filtro por assignee no board',
    type: 'story', status: 'in-review', priority: 'high',
    assignee: AL, reporter: MS,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 3, tags: ['frontend', 'board'],
    description: 'Adicionar chip de filtro rápido por assignee na barra superior do board Kanban.',
    history: [
      { when: 'há 4d', action: 'Issue criada', by: MS.name },
      { when: 'há 2d', action: 'Movida para Em Revisão', by: AL.name },
    ],
  },
  {
    id: 'wi-004', key: 'ALT-143', title: 'Limite WIP configurável',
    type: 'story', status: 'blocked', priority: 'high',
    assignee: RM, reporter: MS,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 3, tags: ['Dependência Aberta'], days_blocked: 3,
    description: 'Permitir configurar limite de WIP por coluna no board. Bloqueado por dependência de API de configuração.',
    history: [
      { when: 'há 6d', action: 'Issue criada', by: MS.name },
      { when: 'há 3d', action: 'Movida para Bloqueado', by: RM.name },
    ],
  },
  {
    id: 'wi-005', key: 'ALT-145', title: 'Integração Slack',
    type: 'story', status: 'backlog', priority: 'medium',
    assignee: undefined, reporter: FN,
    sprint: undefined, project_id: 'proj_001', squad_id: 'squad_growth',
    points: 0, tags: ['Sem Épico', 'Sem Prioridade', 'Sem Estimativa'],
    description: 'Integrar notificações do Altech com canais Slack via webhook.',
    history: [{ when: 'há 12d', action: 'Issue criada', by: FN.name }],
  },
  {
    id: 'wi-006', key: 'ALT-147', title: 'Export para Jira (migração)',
    type: 'task', status: 'backlog', priority: 'low',
    assignee: undefined, reporter: MS,
    sprint: undefined, project_id: 'proj_001', squad_id: 'squad_growth',
    points: 5, tags: ['Dependência Aberta', 'Descrição Insuficiente'],
    description: 'Exportar projetos Altech para formato compatível com importação no Jira.',
    history: [{ when: 'há 15d', action: 'Issue criada', by: MS.name }],
  },
  {
    id: 'wi-007', key: 'BUG-38', title: 'Board trava ao arrastar coluna em Firefox',
    type: 'bug', status: 'blocked', priority: 'critical',
    assignee: LF, reporter: BS,
    sprint: 'Sprint 14', project_id: 'proj_002', squad_id: 'squad_platform',
    points: 0, tags: ['Crítico', 'Prod'], days_blocked: 5,
    description: 'Ao arrastar uma coluna no Firefox 120+, o board congela e perde o estado de drag. Reproduzível 100%.',
    history: [
      { when: 'há 5d', action: 'Bug reportado por QA', by: BS.name },
      { when: 'há 5d', action: 'Escalado para TechLead', by: BS.name },
      { when: 'há 3d', action: 'Movido para Bloqueado — aguardando DevTools', by: LF.name },
    ],
  },
  {
    id: 'wi-008', key: 'BUG-39', title: 'CSV exportado vazio quando sem issues filtradas',
    type: 'bug', status: 'in-review', priority: 'high',
    assignee: LF, reporter: BS,
    sprint: 'Sprint 14', project_id: 'proj_002', squad_id: 'squad_platform',
    points: 0, tags: ['backend'], days_blocked: 1,
    description: 'Quando o filtro ativo não retorna issues, o CSV exportado contém apenas o cabeçalho e nenhuma linha.',
    history: [
      { when: 'há 3d', action: 'Bug reportado', by: BS.name },
      { when: 'há 1d', action: 'Fix entregue pelo dev', by: LF.name },
    ],
  },
  {
    id: 'wi-009', key: 'BUG-40', title: 'Tooltip cobre botão de ação em mobile',
    type: 'bug', status: 'testing', priority: 'medium',
    assignee: AL, reporter: CT,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_design',
    points: 0, tags: ['frontend', 'mobile'],
    description: 'Em viewports < 768px, o tooltip de "Atribuir" sobrepõe o botão de confirmar, impedindo clique.',
    history: [
      { when: 'há 4d', action: 'Bug reportado pelo UX', by: CT.name },
      { when: 'há 2d', action: 'Fix implementado', by: AL.name },
      { when: 'há 1d', action: 'Em teste', by: BS.name },
    ],
  },
  {
    id: 'wi-010', key: 'ALT-148', title: 'Filtros avançados de issue navigator',
    type: 'story', status: 'todo', priority: 'medium',
    assignee: AL, reporter: FN,
    sprint: 'Sprint 15', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 3, tags: ['Sem Critério de Aceite'],
    description: 'Adicionar filtros por tipo, épico, sprint, responsável e data de criação no Issue Navigator.',
    history: [{ when: 'há 2d', action: 'Issue criada', by: FN.name }],
  },
  {
    id: 'wi-011', key: 'ALT-150', title: 'Dashboard Executivo — OKR widget',
    type: 'story', status: 'in-progress', priority: 'high',
    assignee: FN, reporter: MS,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 8, tags: ['frontend', 'dashboard'],
    description: 'Widget de acompanhamento de OKRs com % de progresso, tendência e alerta de risco.',
    history: [
      { when: 'há 7d', action: 'Issue criada', by: MS.name },
      { when: 'há 5d', action: 'Em desenvolvimento', by: FN.name },
    ],
  },
  {
    id: 'wi-012', key: 'ALT-151', title: 'Handoff — Redesign board v2',
    type: 'task', status: 'ready', priority: 'high',
    assignee: CT, reporter: CT,
    sprint: 'Sprint 14', project_id: 'proj_001', squad_id: 'squad_design',
    points: 0, tags: ['design', 'handoff'],
    description: 'Entregar especificação de design do board v2 para dev com anotações de interação e tokens.',
    history: [
      { when: 'há 10d', action: 'Design iniciado', by: CT.name },
      { when: 'há 2d', action: 'Aprovado pelo PO', by: 'Beatriz Alves' },
    ],
  },
  {
    id: 'wi-013', key: 'ALT-139b', title: 'Webhook de deploy automático',
    type: 'task', status: 'in-progress', priority: 'medium',
    assignee: RM, reporter: LF,
    sprint: 'Sprint 14', project_id: 'proj_002', squad_id: 'squad_platform',
    points: 3, tags: ['devops', 'integrations'],
    description: 'Configurar webhook para trigger de deploy automático após merge na branch main.',
    history: [
      { when: 'há 4d', action: 'Issue criada', by: LF.name },
      { when: 'há 2d', action: 'Em desenvolvimento', by: RM.name },
    ],
  },
  {
    id: 'wi-014', key: 'ALT-152', title: 'Avatar em grupo (stack) no board',
    type: 'story', status: 'ready', priority: 'low',
    assignee: AL, reporter: CT,
    sprint: 'Sprint 15', project_id: 'proj_001', squad_id: 'squad_growth',
    points: 2, tags: ['frontend', 'design-system'],
    description: 'Exibir stack de avatares sobrepostos quando múltiplos assignees em uma issue.',
    history: [{ when: 'há 3d', action: 'Issue criada', by: CT.name }],
  },
  {
    id: 'wi-015', key: 'ALT-153', title: 'Reteste — CSV vazio corrigido',
    type: 'bug', status: 'testing', priority: 'high',
    assignee: BS, reporter: BS,
    sprint: 'Sprint 14', project_id: 'proj_002', squad_id: 'squad_platform',
    points: 0, tags: ['reteste', 'QA'],
    description: 'Verificar correção do BUG-39 em ambiente de homologação com dados reais.',
    history: [
      { when: 'há 1d', action: 'Fix entregue — reteste solicitado', by: LF.name },
      { when: 'há 4h', action: 'Em execução de testes', by: BS.name },
    ],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function getItemsByProject(project_id: string) {
  return WORK_ITEMS.filter(w => w.project_id === project_id)
}

export function getItemsBySquad(squad_id: string) {
  return WORK_ITEMS.filter(w => w.squad_id === squad_id)
}

export function getItemsByAssignee(name: string) {
  return WORK_ITEMS.filter(w => w.assignee?.name === name)
}

export function getBlockedItems(project_id?: string) {
  return WORK_ITEMS.filter(w => w.status === 'blocked' && (!project_id || w.project_id === project_id))
}

export function getSprintItems(sprint: string, project_id?: string) {
  return WORK_ITEMS.filter(w => w.sprint === sprint && (!project_id || w.project_id === project_id))
}

export function getReadyItems(project_id?: string) {
  return WORK_ITEMS.filter(w => w.status === 'ready' && (!project_id || w.project_id === project_id))
}

export function getTestingItems(project_id?: string) {
  return WORK_ITEMS.filter(w => (w.status === 'testing' || w.status === 'in-review') && (!project_id || w.project_id === project_id))
}

export function getBacklogWithAlerts(project_id?: string) {
  return WORK_ITEMS.filter(w =>
    (w.tags ?? []).some(t => ['Sem Critério de Aceite','Refinamento Pendente','Dependência Aberta','Sem Épico','Sem Prioridade','Sem Responsável','Descrição Insuficiente'].includes(t))
    && (!project_id || w.project_id === project_id)
  )
}
