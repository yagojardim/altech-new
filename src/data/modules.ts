// ─── Module portfolio catalog — tenant-scoped, no billing/auth ───────────────
// Inspection Mode: all data is mock. No checkout, no gateway, no real activation.

export type ModuleCategory =
  | 'intelligence'
  | 'integration'
  | 'external'
  | 'community'
  | 'governance'
  | 'security'

export type ModuleStatus =
  | 'operational'      // live, being used
  | 'implemented'      // deployed in this tenant, ready to use
  | 'contracted'       // commercially agreed, being set up
  | 'deploying'        // currently being activated
  | 'pending'          // activation requested, awaiting decision
  | 'not-contracted'   // available to request, not yet contracted
  | 'planned'          // on roadmap, not yet available
  | 'coming-soon'      // arriving soon
  | 'preview'          // early access / beta
  | 'suspended'        // was active, currently suspended
  | 'unavailable'      // not available in this plan

export interface ModuleDef {
  id:          string
  key:         string
  name:        string
  tagline:     string
  description: string
  category:    ModuleCategory
  is_premium:  boolean
  is_future:   boolean
  is_preview:  boolean
  features:    string[]
  icon:        string   // emoji for now
}

export const CATEGORY_LABELS: Record<ModuleCategory, string> = {
  intelligence:  'Inteligência e automação',
  integration:   'Integrações e produtividade',
  external:      'Experiência externa',
  community:     'Comunidade e aprendizado',
  governance:    'Governança comercial',
  security:      'Segurança e continuidade',
}

export const STATUS_META: Record<ModuleStatus, { label: string; color: string; bg: string; dot: string }> = {
  operational:     { label: 'Operacional',      color: '#10B981', bg: '#10B98118', dot: '#10B981' },
  implemented:     { label: 'Implementado',     color: '#3B82F6', bg: '#3B82F618', dot: '#3B82F6' },
  contracted:      { label: 'Contratado',       color: '#6366F1', bg: '#6366F118', dot: '#6366F1' },
  deploying:       { label: 'Em implantação',   color: '#6366F1', bg: '#6366F114', dot: '#6366F1' },
  pending:         { label: 'Solicitado',        color: '#F59E0B', bg: '#F59E0B14', dot: '#F59E0B' },
  'not-contracted':{ label: 'Não contratado',   color: '#9898AD', bg: '#9898AD12', dot: '#9898AD' },
  planned:         { label: 'Planejado',         color: '#9898AD', bg: '#9898AD0E', dot: '#9898AD' },
  'coming-soon':   { label: 'Em breve',          color: '#F59E0B', bg: '#F59E0B10', dot: '#F59E0B' },
  preview:         { label: 'Preview',           color: '#8B5CF6', bg: '#8B5CF614', dot: '#8B5CF6' },
  suspended:       { label: 'Suspenso',          color: '#EF4444', bg: '#EF444414', dot: '#EF4444' },
  unavailable:     { label: 'Indisponível',      color: '#EF4444', bg: '#EF444412', dot: '#EF4444' },
}

export const MODULE_CATALOG: ModuleDef[] = [
  // ── Intelligence ────────────────────────────────────────────────────────────
  {
    id: 'mod_meeting_intel',
    key: 'MEETING_INTELLIGENCE',
    name: 'Meeting Intelligence',
    tagline: 'Transcrição, resumo e action items automáticos de reuniões',
    description: 'Integre reuniões ao fluxo do projeto: transcrição automática, resumo executivo gerado por IA, extração de decisions e action items diretamente vinculados às issues do board.',
    category: 'intelligence',
    is_premium: true, is_future: false, is_preview: false,
    features: [
      'Transcrição automática de reuniões (PT/EN)',
      'Resumo executivo gerado por IA',
      'Extração automática de action items → issues',
      'Vinculação a sprint/épico/projeto',
      'Histórico pesquisável por reunião',
    ],
    icon: '🎙️',
  },
  {
    id: 'mod_ai_insights',
    key: 'AI_INSIGHTS',
    name: 'AI Insights',
    tagline: 'Análise preditiva de riscos, velocity e saúde do portfólio',
    description: 'Módulo de inteligência artificial para antecipação de riscos, previsão de entrega, análise de padrões de velocity e recomendações acionáveis para o portfólio.',
    category: 'intelligence',
    is_premium: true, is_future: true, is_preview: false,
    features: [
      'Previsão de entrega por ML (burndown preditivo)',
      'Detecção antecipada de risco de escopo',
      'Análise de padrões de velocity por squad',
      'Recomendações acionáveis por papel',
      'Dashboard de saúde do portfólio por IA',
    ],
    icon: '🧠',
  },
  // ── External ─────────────────────────────────────────────────────────────────
  {
    id: 'mod_client_portal',
    key: 'CLIENT_PORTAL',
    name: 'Client Portal / Altech View',
    tagline: 'Portal de transparência para clientes externos',
    description: 'Ambiente dedicado para clientes acompanharem o andamento do projeto em tempo real, validarem entregas e comunicarem-se com o time — sem expor dados internos.',
    category: 'external',
    is_premium: false, is_future: false, is_preview: false,
    features: [
      'Dashboard de status do projeto para o cliente',
      'Validação de entregas com aprovação formal',
      'Chat segregado cliente ↔ gestão',
      'Roadmap publicado (sem dados técnicos)',
      'Gestão de acessos por tenant',
    ],
    icon: '🌐',
  },
  // ── Community ────────────────────────────────────────────────────────────────
  {
    id: 'mod_community',
    key: 'COMMUNITY',
    name: 'Community',
    tagline: 'Rede de times e partilha de práticas entre tenants',
    description: 'Espaço colaborativo para times do ecossistema Altech compartilharem templates, retrospectivas, frameworks e melhores práticas — com escopo isolado por tenant.',
    category: 'community',
    is_premium: false, is_future: true, is_preview: false,
    features: [
      'Templates de sprint e retrospectiva compartilhados',
      'Fórum de práticas ágeis segmentado',
      'Biblioteca de frameworks de time',
      'Badges e reconhecimento por contribuição',
      'Isolamento de dados por tenant',
    ],
    icon: '🤝',
  },
  {
    id: 'mod_academy',
    key: 'ACADEMY',
    name: 'Academy',
    tagline: 'Trilhas de aprendizado integradas ao contexto do projeto',
    description: 'Plataforma de capacitação contextualizada: cursos, trilhas e micro-certificações em Agile, Gestão de Produto e Engenharia de Software, integrados aos dados reais do time.',
    category: 'community',
    is_premium: true, is_future: true, is_preview: false,
    features: [
      'Trilhas de Agile, Product Management e Engenharia',
      'Micro-certificações com reconhecimento na plataforma',
      'Recomendações personalizadas por papel',
      'Progresso vinculado ao perfil do colaborador',
      'Integrações com LinkedIn Learning (roadmap)',
    ],
    icon: '🎓',
  },
  // ── Governance ───────────────────────────────────────────────────────────────
  {
    id: 'mod_financial',
    key: 'FINANCIAL_USER',
    name: 'Financial User',
    tagline: 'Usuário financeiro para aprovações, budget e relatórios de custo',
    description: 'Perfil de acesso financeiro com visibilidade de budget por projeto, aprovações de custo e relatórios de alocação de horas × custo — sem acesso ao board operacional.',
    category: 'governance',
    is_premium: true, is_future: false, is_preview: false,
    features: [
      'Painel de budget por projeto',
      'Aprovação de solicitações de custo',
      'Relatório de horas alocadas × custo estimado',
      'Perfil de acesso segregado (sem board)',
      'Exportação de relatórios financeiros',
    ],
    icon: '💼',
  },
  // ── Security ─────────────────────────────────────────────────────────────────
  {
    id: 'mod_backup',
    key: 'BACKUP_PREMIUM',
    name: 'Backup Premium',
    tagline: 'Backup automatizado, histórico e restauração de dados do tenant',
    description: 'Política de backup automatizado com retenção configurável, histórico de versões de projetos, issues e configurações, e restauração pontual — complementar ao backup padrão da infraestrutura.',
    category: 'security',
    is_premium: true, is_future: false, is_preview: false,
    features: [
      'Backup diário automatizado com retenção configurável',
      'Histórico versionado de projetos e configurações',
      'Restauração pontual (point-in-time recovery)',
      'Relatório de auditoria de backups',
      'Notificações de falha por e-mail / webhook',
    ],
    icon: '🔒',
  },
]
