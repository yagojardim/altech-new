import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { T as DS } from '../components/ds/tokens'
import { getBoardById } from '../data/boards'
import { CreateIssueModal } from '../components/CreateIssueModal'
import { CompleteSprintModal } from '../components/CompleteSprintModal'
import { useSession } from '../data/SessionContext'
import { can } from '../data/permissions'
import { WorkItemDetail, type WorkItemData } from '../components/WorkItemDetail'
import {
  fetchBoardData, moveWorkItemToColumn, createWorkItem, columnColor,
  PRIORITY_FROM_DB,
  type BoardItemRow, type BoardData,
} from '../data/db/board'
import {
  startSprint as dbStartSprint,
  completeSprint as dbCompleteSprint,
} from '../data/db/sprints'


// ─── RULE annotations ────────────────────────────────────────────────────────
// RULE 1: "planejado não é sobrescrito" — planned sprint data is immutable until explicitly started
// RULE 2: "coluna tem nome próprio independente do status" — BOARD_COLS[].label != status label
// RULE 3: "issue sem status mapeado cai em 'Não mapeados'" — catch-all column for unmapped statuses

// ─── Types ────────────────────────────────────────────────────────────────────
type IssueType   = 'story' | 'bug' | 'task' | 'subtask' | 'epic' | 'feature'
type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done'
type Priority    = 'critical' | 'high' | 'medium' | 'low'

interface IssueComment { author: string; text: string; when: string }

interface Issue {
  /** Supabase work_items.id — present for DB-backed cards (Board). */
  id?:      string
  /** Supabase board_columns.id the card currently sits in. */
  colId?:   string
  /** Raw DB status (snake_case), kept for persistence/audit. */
  dbStatus?: string
  key:      string

  type:     IssueType
  title:    string
  status:   IssueStatus
  priority: Priority
  labels:   string[]
  assignee: string
  dueDate:  string
  points:   number
  epic?:    string
  sprint?:  string
  blocked?: boolean
  delayed?: boolean
  // P2 extensions
  severity?:                   'critical' | 'high' | 'medium' | 'low'
  description?:                string
  reporter?:                   string
  blocked_reason?:             string
  parent_id?:                  string
  feature_id?:                 string
  acceptance_criteria_count?:  number
  comment_count?:              number
  attachment_count?:           number
  evidence_count?:             number
  reopen_count?:               number
  is_regression?:              boolean
  open_dependency?:            boolean
  comments?:                   IssueComment[]
  fix_versions?:               string[]
  history?:                    import('../components/WorkItemDetail').WIHistoryEntry[]
}

interface SprintDef {
  id:          string
  name:        string
  goal?:       string
  start:       string
  end:         string
  state:       'active' | 'planned' | 'completed'
  velocity?:   number
  completedAt?: string
}

// Module-level audit log (session-persistent mock)
const _SPRINT_AUDIT: { ts: string; who: string; action: string }[] = []

// ─── Board column definitions ─────────────────────────────────────────────────
// RULE 2 — label is independent; statuses[] is the mapping
// BoardCol interface replaced by ColState inside BoardTab (editable columns)

// BOARD_COLS and UNMAPPED_COL moved to BoardTab as INITIAL_COLS (editable per session)

// ─── Sprints ──────────────────────────────────────────────────────────────────
const SPRINTS: SprintDef[] = [
  { id: 's13', name: 'Sprint 13', goal: 'Tokens, CI e teardown competitivo', start: '01/04', end: '14/04', state: 'completed', velocity: 22 },
  { id: 's14', name: 'Sprint 14', goal: 'Homepage responsiva + correção de bugs críticos mobile', start: '15/04', end: '28/04', state: 'active' },
  { id: 's15', name: 'Sprint 15', goal: '',  start: '29/04', end: '12/05', state: 'planned' },
]

// ─── Issues ───────────────────────────────────────────────────────────────────
const INIT_ISSUES: Issue[] = [
  // Sprint 14 (active)
  {
    key:'PM-101', type:'story', title:'Homepage hero — layout explorations',
    status:'in-progress', priority:'high', labels:['Design','Hero'], assignee:'AL', dueDate:'Abr 4', points:5,
    epic:'EP-01', sprint:'s14', reporter:'JN',
    description:'Explorar variações de layout para o bloco hero da homepage: fullbleed, split e centered. Entregar 3 opções para revisão do PO.',
    acceptance_criteria_count:2, comment_count:3, attachment_count:2,
  },
  {
    key:'PM-102', type:'bug', title:'Login form validation falha no mobile',
    status:'in-progress', priority:'critical', labels:['Eng'], assignee:'JN', dueDate:'Abr 3', points:3,
    epic:'EP-02', sprint:'s14', blocked:true, severity:'critical', reporter:'CS',
    blocked_reason:'Aguardando fix no serviço de auth — ticket #892 aberto com infra.',
    description:'Em viewports < 480px o submit do formulário de login dispara sem validar os campos obrigatórios, enviando payload vazio para a API.',
    evidence_count:0,
    comments:[
      { author:'CS', text:'Reproduzido no Chrome Mobile e Safari iOS 17. Não ocorre no Android Firefox.', when:'há 2d' },
      { author:'JN', text:'Bloqueado pelo serviço de auth. Aguardando resposta da infra.', when:'há 1d' },
    ],
  },
  {
    key:'PM-103', type:'task', title:'Configurar Storybook para componentes',
    status:'in-progress', priority:'medium', labels:['Eng'], assignee:'LF', dueDate:'Abr 6', points:2,
    epic:'EP-02', sprint:'s14', reporter:'LF',
    description:'Instalar e configurar Storybook 7 com suporte a Tailwind CSS v4 e tokens de design. Criar stories para Button, Badge e Input.',
    acceptance_criteria_count:1, comment_count:1,
  },
  {
    key:'PM-104', type:'story', title:'Breakpoints responsivos — hero + feature grid',
    status:'in-progress', priority:'high', labels:['Design','Mobile'], assignee:'CS', dueDate:'Abr 3', points:8,
    epic:'EP-01', sprint:'s14', delayed:true, reporter:'AL',
    open_dependency:true,
    acceptance_criteria_count:0,
    description:'',
    blocked_reason:'',
    comments:[{ author:'AL', text:'Aguardando aprovação dos breakpoints no Figma antes de implementar.', when:'há 1d' }],
  },
  {
    key:'PM-105', type:'bug', title:'Footer sobrepõe conteúdo no Safari',
    status:'todo', priority:'medium', labels:['Eng','Web'], assignee:'NM', dueDate:'Abr 10', points:2,
    epic:'EP-02', sprint:'s14', severity:'medium', reporter:'AL',
    description:'No Safari 17, o footer em position:fixed sobrepõe o último bloco de conteúdo quando scroll chega ao final da página.',
    evidence_count:1, comment_count:0,
  },
  {
    key:'PM-107', type:'task', title:'Spec de nav + componente footer',
    status:'in-review', priority:'low', labels:['Design'], assignee:'AL', dueDate:'Abr 3', points:3,
    epic:'EP-01', sprint:'s14', reporter:'JN',
    description:'Criar especificação de componente para o footer: tipografia, espaçamento, links e comportamento responsivo. Entregar no Figma com anotações.',
    acceptance_criteria_count:2, comment_count:1,
  },
  {
    key:'PM-108', type:'story', title:'UX study: design Northwind',
    status:'in-review', priority:'medium', labels:['UX','SEO'], assignee:'JN', dueDate:'Abr 5', points:5,
    epic:'EP-03', sprint:'s14', reporter:'NM',
    description:'Teardown de UX do site Northwind: navigation, CTAs, onboarding flow e tratamento de erros. Deliverable: deck de insights com printscreens anotados.',
    acceptance_criteria_count:1, comment_count:2,
  },
  // Sprint 15 (planned) — RULE 1: not overwritten by board actions
  {
    key:'PM-106', type:'story', title:'Copywriting da página de preços v2',
    status:'backlog', priority:'high', labels:['Content'], assignee:'NM', dueDate:'Abr 22', points:5,
    epic:'EP-03', sprint:'s15', reporter:'RM',
    description:'',
    acceptance_criteria_count:0,
  },
  {
    key:'PM-109', type:'story', title:'Entrevistas com 5 clientes trial',
    status:'backlog', priority:'medium', labels:['Research'], assignee:'JN', dueDate:'Abr 16', points:5,
    epic:'EP-03', sprint:'s15', reporter:'NM',
    description:'Realizar entrevistas qualitativas semi-estruturadas com clientes em período trial para identificar friction points no onboarding e razões de churn.',
    acceptance_criteria_count:2, comment_count:1,
  },
  {
    key:'PM-110', type:'task', title:'Auditoria de a11y nas páginas de marketing',
    status:'backlog', priority:'medium', labels:['Design','Web'], assignee:'AL', dueDate:'Abr 12', points:3,
    epic:'EP-01', sprint:'s15', reporter:'CS',
    description:'Auditar contraste, foco de teclado, labels ARIA e semântica HTML nas 6 páginas de marketing. Usar axe-core e revisão manual.',
    acceptance_criteria_count:1,
  },
  // Completed
  { key:'PM-111', type:'story', title:'Teardown competitivo — 8 sites',              status:'done', priority:'low',    labels:['Research'], assignee:'RM', dueDate:'Mar 28', points:3, epic:'EP-03', sprint:'s13', description:'Análise de 8 sites competidores com foco em pricing, hero e onboarding.', acceptance_criteria_count:2 },
  { key:'PM-112', type:'task',  title:'Finalizar tokens de cor + tipografia',         status:'done', priority:'medium', labels:['Brand'],    assignee:'NM', dueDate:'Mar 28', points:2, epic:'EP-01', sprint:'s13', description:'Definir e exportar tokens de design no Figma e CSS.', acceptance_criteria_count:1 },
  { key:'PM-113', type:'task',  title:'Scaffolding do repositório + CI pipeline',     status:'done', priority:'high',   labels:['Eng'],      assignee:'LF', dueDate:'Mar 22', points:2, epic:'EP-02', sprint:'s13', description:'Setup inicial do repo com Vite, TypeScript, Tailwind e pipeline CI/CD.', acceptance_criteria_count:1 },
  // Backlog (no sprint)
  { key:'PM-114', type:'story',   title:'Auditoria de metadata SEO', status:'backlog', priority:'low',    labels:['SEO'],     assignee:'RM', dueDate:'Mai 5',  points:3, epic:'EP-03', description:'', acceptance_criteria_count:0 },
  { key:'PM-115', type:'subtask', title:'Escrever copy do hero principal', status:'backlog', priority:'low', labels:['Content'], assignee:'NM', dueDate:'Abr 8', points:1, epic:'EP-01', description:'Redigir headline, subheadline e CTA do hero para 3 variações de A/B test.' },
  { key:'PM-116', type:'feature', title:'Sistema de busca do portal', status:'backlog', priority:'medium', labels:['Eng'], assignee:'LF', dueDate:'Mai 20', points:8, epic:'EP-02', description:'Implementar busca full-text com Algolia no portal de conteúdo.', acceptance_criteria_count:3, comment_count:2 },
]

const EPICS = [
  { id:'EP-01', key:'EP-01', label:'Website Relaunch',    color: DS.accent  },
  { id:'EP-02', key:'EP-02', label:'Infra & Eng',         color: DS.warn    },
  { id:'EP-03', key:'EP-03', label:'Pesquisa & Conteúdo', color: DS.purple  },
]

// ─── Shared styles ────────────────────────────────────────────────────────────
const S = {
  bg:       DS.bgPage,
  surface:  DS.bgSurface,
  surface2: DS.bgSurface2,
  border:   DS.border,
  border2:  DS.border2,
  t1:       DS.text1,
  t2:       DS.text2,
  t3:       DS.text3,
}

const LABEL_STYLE: Record<string, { bg: string; color: string }> = {
  Design:   { bg: DS.accentDim,   color: DS.accent  },
  Web:      { bg: DS.neutralDim,  color: DS.text2   },
  Research: { bg: DS.purpleDim,   color: DS.purple  },
  Content:  { bg: DS.warnDim,     color: DS.warn    },
  Hero:     { bg: DS.neutralDim,  color: DS.text2   },
  Mobile:   { bg: 'rgba(56,189,248,0.12)', color: '#38bdf8' },
  Eng:      { bg: DS.successDim,  color: DS.success },
  UX:       { bg: DS.successDim,  color: '#14b8a6'  },
  SEO:      { bg: DS.critDim,     color: DS.crit    },
  Brand:    { bg: DS.purpleDim,   color: DS.purple  },
}

const PRIORITY_COLOR: Record<Priority, string> = {
  critical: DS.crit, high: DS.warn, medium: DS.accent, low: DS.text3,
}

const AV_COLOR: Record<string, string> = {
  AL: DS.accent, NM: DS.purple, JN: DS.warn, CS: DS.success, RM: DS.crit, LF: '#f97316',
}

// ─── Small atoms ─────────────────────────────────────────────────────────────
function Av({ i, size = 20 }: { i: string; size?: number }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-full flex-shrink-0 font-bold text-white select-none"
      style={{ width: size, height: size, fontSize: size * 0.38, background: AV_COLOR[i] ?? DS.text3, outline: `2px solid ${S.surface}` }}
    >
      {i}
    </span>
  )
}

function LabelChip({ name }: { name: string }) {
  const c = LABEL_STYLE[name] ?? { bg: S.surface2, color: S.t2 }
  return (
    <span className="text-[9px] font-semibold px-1 py-px rounded-md" style={{ background: c.bg, color: c.color }}>
      {name}
    </span>
  )
}

function PriorityDot({ p }: { p: Priority }) {
  const icons: Record<Priority, string> = { critical: '↑↑', high: '↑', medium: '→', low: '↓' }
  return <span className="text-[9px] font-bold" style={{ color: PRIORITY_COLOR[p] }}>{icons[p]}</span>
}

function TypeIcon({ t }: { t: IssueType }) {
  const map: Record<IssueType, { label: string; color: string }> = {
    story:   { label: '◇', color: DS.accent  },
    bug:     { label: '⬟', color: DS.crit    },
    task:    { label: '☑', color: DS.text2   },
    subtask: { label: '◻', color: DS.text3   },
    epic:    { label: '⚡', color: DS.warn    },
    feature: { label: '▣', color: DS.purple  },
  }
  const m = map[t]
  return <span className="text-[11px] flex-shrink-0" style={{ color: m.color }}>{m.label}</span>
}

// ─── Tag system (P3) ──────────────────────────────────────────────────────────
type TagLevel = 'red' | 'amber' | 'green'
interface CardTag { label: string; level: TagLevel }

const TAG_COLORS: Record<TagLevel, { bg: string; color: string }> = {
  red:   { bg: DS.critDim,    color: DS.crit    },
  amber: { bg: DS.warnDim,    color: DS.warn    },
  green: { bg: DS.successDim, color: DS.success },
}

function isReadyForDev(issue: Issue): boolean {
  return !!(
    issue.description?.trim() &&
    (issue.epic || issue.feature_id) &&
    issue.acceptance_criteria_count && issue.acceptance_criteria_count > 0 &&
    issue.priority &&
    issue.points &&
    !issue.open_dependency &&
    !issue.blocked &&
    (issue.status === 'todo' || issue.status === 'backlog')
  )
}

function getCardTags(issue: Issue): CardTag[] {
  const tags: CardTag[] = []
  if (issue.blocked)
    tags.push({ label: 'Bloqueado', level: 'red' })
  if (issue.type === 'bug' && (issue.severity === 'critical' || issue.priority === 'critical'))
    tags.push({ label: 'Bug Crítico', level: 'red' })
  if (issue.delayed)
    tags.push({ label: 'Atrasado', level: 'red' })
  if (issue.type === 'bug' && issue.reopen_count && issue.reopen_count > 0)
    tags.push({ label: 'Reaberto', level: 'red' })
  if (issue.type === 'bug' && issue.is_regression)
    tags.push({ label: 'Regressão', level: 'red' })
  if (issue.type === 'subtask' && !issue.parent_id)
    tags.push({ label: 'Sem Pai', level: 'red' })
  if (!issue.assignee)
    tags.push({ label: 'Sem Responsável', level: 'amber' })
  if (issue.open_dependency)
    tags.push({ label: 'Dependência Aberta', level: 'amber' })
  if (issue.type === 'story' && !issue.acceptance_criteria_count)
    tags.push({ label: 'Sem Critério Aceite', level: 'amber' })
  if (!issue.points && issue.type !== 'bug' && issue.type !== 'subtask')
    tags.push({ label: 'Sem Estimativa', level: 'amber' })
  if (!issue.description?.trim())
    tags.push({ label: 'Desc. Insuficiente', level: 'amber' })
  if (issue.type === 'bug' && issue.evidence_count === 0)
    tags.push({ label: 'Sem Evidência', level: 'amber' })
  if (isReadyForDev(issue))
    tags.push({ label: '✓ Ready', level: 'green' })
  return tags
}

// ─── Iniciar Sprint modal ─────────────────────────────────────────────────────
interface StartSprintModalProps {
  sprint: SprintDef
  onConfirm: (id: string, goal: string, name: string) => void
  onClose: () => void
}

function StartSprintModal({ sprint, onConfirm, onClose }: StartSprintModalProps) {
  const [name, setName]         = useState(sprint.name)
  const [durType, setDurType]   = useState<'weeks' | 'days'>('weeks')
  const [durVal, setDurVal]     = useState(2)
  const [startDate, setStart]   = useState(sprint.start)
  const [endDate, setEnd]       = useState(sprint.end)
  const [goal, setGoal]         = useState(sprint.goal ?? '')

  const issueCount = INIT_ISSUES.filter(i => i.sprint === sprint.id).length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center fade-rise"
      style={{ background: 'rgba(8,10,14,0.72)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="rounded-2xl overflow-hidden flex flex-col"
        style={{ width: 520, background: DS.bgSurface, border: `1px solid ${DS.border2}`, boxShadow: DS.shadowModal }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: `1px solid ${DS.border}` }}>
          <div>
            <p className="text-[15px] font-bold" style={{ color: DS.text1 }}>Iniciar Sprint</p>
            <p className="text-[12px] mt-0.5" style={{ color: DS.text3 }}>{issueCount} issues · {sprint.start} → {sprint.end}</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors text-lg leading-none"
            style={{ color: DS.text3 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = DS.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >×</button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Name */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold" style={{ color: DS.text3 }}>Nome do Sprint</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="h-9 px-3 text-[13px] rounded-lg border outline-none"
              style={{ background: DS.bgSurface2, border: `1px solid ${DS.border}`, color: DS.text1 }}
              onFocus={e => { e.currentTarget.style.borderColor = DS.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = DS.border }}
            />
          </div>

          {/* Duration */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] font-semibold" style={{ color: DS.text3 }}>Duração</label>
              <div className="flex gap-2">
                <input
                  type="number" min={1} max={8}
                  value={durVal}
                  onChange={e => setDurVal(Number(e.target.value))}
                  className="w-16 h-9 px-2 text-[13px] rounded-lg border outline-none text-center"
                  style={{ background: DS.bgSurface2, border: `1px solid ${DS.border}`, color: DS.text1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = DS.accent }}
                  onBlur={e => { e.currentTarget.style.borderColor = DS.border }}
                />
                <div
                  className="flex rounded-lg overflow-hidden"
                  style={{ border: `1px solid ${DS.border}` }}
                >
                  {(['weeks', 'days'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setDurType(t)}
                      className="px-3 py-1 text-[12px] font-medium transition-colors"
                      style={{
                        background: durType === t ? `${DS.accent}22` : DS.bgSurface2,
                        color: durType === t ? DS.accent : DS.text2,
                      }}
                    >
                      {t === 'weeks' ? 'Semanas' : 'Dias'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="flex gap-3">
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] font-semibold" style={{ color: DS.text3 }}>Data de início</label>
              <input
                value={startDate}
                onChange={e => setStart(e.target.value)}
                className="h-9 px-3 text-[13px] rounded-lg border outline-none"
                style={{ background: DS.bgSurface2, border: `1px solid ${DS.border}`, color: DS.text1, colorScheme: 'dark' }}
                onFocus={e => { e.currentTarget.style.borderColor = DS.accent }}
                onBlur={e => { e.currentTarget.style.borderColor = DS.border }}
              />
            </div>
            <div className="flex flex-col gap-1 flex-1">
              <label className="text-[11px] font-semibold" style={{ color: DS.text3 }}>Data de término</label>
              <input
                value={endDate}
                onChange={e => setEnd(e.target.value)}
                className="h-9 px-3 text-[13px] rounded-lg border outline-none"
                style={{ background: DS.bgSurface2, border: `1px solid ${DS.border}`, color: DS.text1, colorScheme: 'dark' }}
                onFocus={e => { e.currentTarget.style.borderColor = DS.accent }}
                onBlur={e => { e.currentTarget.style.borderColor = DS.border }}
              />
            </div>
          </div>

          {/* Goal */}
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold" style={{ color: DS.text3 }}>
              Meta do Sprint <span style={{ color: DS.text3, fontWeight: 400 }}>(opcional)</span>
            </label>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={2}
              placeholder="Descreva o objetivo principal deste sprint..."
              className="px-3 py-2 text-[13px] rounded-lg border outline-none resize-none"
              style={{
                background: DS.bgSurface2, border: `1px solid ${DS.border}`,
                color: DS.text1, fontFamily: 'inherit',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = DS.accent }}
              onBlur={e => { e.currentTarget.style.borderColor = DS.border }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-3" style={{ borderTop: `1px solid ${DS.border}` }}>
          <button
            onClick={onClose}
            className="h-8 px-4 text-[13px] font-medium rounded-lg transition-colors"
            style={{ color: DS.text2 }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = DS.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(sprint.id, goal, name)}
            className="h-8 px-4 text-[13px] font-semibold rounded-lg text-white transition-all"
            style={{ background: DS.accent }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
          >
            Iniciar Sprint
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Board card ───────────────────────────────────────────────────────────────
function BoardCard({ issue, dragging, onDragStart, onDragEnd, onOpen, canDrag }: {
  issue: Issue
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onOpen: () => void
  canDrag: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const isBlocked = issue.blocked
  const isDelayed  = issue.delayed
  const mouseDownPos = useRef<{ x: number; y: number } | null>(null)

  const tags        = getCardTags(issue)
  const visibleTags = tags.slice(0, 3)
  const tagOverflow = tags.length - 3

  return (
    <div
      draggable={canDrag}
      onMouseDown={e => { mouseDownPos.current = { x: e.clientX, y: e.clientY } }}
      onClick={e => {
        if (!mouseDownPos.current) return
        const dx = e.clientX - mouseDownPos.current.x
        const dy = e.clientY - mouseDownPos.current.y
        if (Math.sqrt(dx * dx + dy * dy) < 5) onOpen()
        mouseDownPos.current = null
      }}
      onDragStart={canDrag ? e => { e.dataTransfer.effectAllowed = 'move'; onDragStart() } : undefined}
      onDragEnd={canDrag ? onDragEnd : undefined}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? DS.bgSurface2 : S.surface,
        border: isBlocked
          ? `1.5px solid ${DS.crit}`
          : isDelayed
          ? `1.5px solid ${DS.warn}`
          : `1px solid ${hovered ? S.border2 : S.border}`,
        borderRadius: 10,
        padding: '9px 11px',
        cursor: canDrag ? 'grab' : 'pointer',
        opacity: dragging ? 0.4 : 1,
        boxShadow: hovered ? '0 4px 12px rgba(0,0,0,0.3)' : '0 1px 3px rgba(0,0,0,0.15)',
        transform: hovered ? 'translateY(-1px)' : 'none',
        transition: 'all 0.12s',
      }}
    >
      {/* Type + key + severity badge (bug) + priority */}
      <div className="flex items-center gap-1.5 mb-1.5">
        <TypeIcon t={issue.type} />
        <span className="text-[10px] font-mono" style={{ color: S.t3 }}>{issue.key}</span>
        {issue.type === 'bug' && issue.severity && (
          <span
            className="text-[8px] font-bold px-1 py-px rounded leading-tight"
            style={issue.severity === 'critical'
              ? { background: DS.critDim, color: DS.crit }
              : issue.severity === 'high'
              ? { background: DS.warnDim, color: DS.warn }
              : { background: DS.accentDim, color: DS.accent }}
          >
            {issue.severity === 'critical' ? 'CRIT' : issue.severity === 'high' ? 'HIGH' : issue.severity.toUpperCase()}
          </span>
        )}
        <span className="ml-auto"><PriorityDot p={issue.priority} /></span>
      </div>

      {/* Title */}
      <p className="text-[12px] font-medium leading-snug mb-2" style={{ color: S.t1 }}>
        {issue.title}
      </p>

      {/* Conditional tags (P3) — max 3 + "+N" */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-0.5 mb-2">
          {visibleTags.map(tag => {
            const c = TAG_COLORS[tag.level]
            return (
              <span key={tag.label} className="text-[9px] font-semibold px-1 py-px rounded-md leading-tight"
                style={{ background: c.bg, color: c.color }}>
                {tag.label}
              </span>
            )
          })}
          {tagOverflow > 0 && (
            <span className="text-[9px] font-semibold px-1 py-px rounded-md leading-tight"
              style={{ background: S.surface2, color: S.t3 }}>
              +{tagOverflow}
            </span>
          )}
        </div>
      )}

      {/* Footer: due date + points + meta counts + assignee */}
      <div className="flex items-center gap-1.5">
        <span className="text-[10px] flex items-center gap-0.5"
          style={{ color: isBlocked ? DS.crit : isDelayed ? DS.warn : S.t3 }}>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
            <rect x="1" y="1.5" width="7" height="6" rx="1" stroke="currentColor" strokeWidth="1"/>
            <path d="M3 1v1.5M6 1v1.5M1 3.5h7" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
          </svg>
          {issue.dueDate}
        </span>
        <span className="text-[9px] font-bold px-1 py-px rounded ml-auto" style={{ background: S.surface2, color: S.t3 }}>
          {issue.points}pt
        </span>
        {(issue.comment_count ?? 0) > 0 && (
          <span className="text-[9px]" style={{ color: S.t3 }}>💬{issue.comment_count}</span>
        )}
        {(issue.attachment_count ?? 0) > 0 && (
          <span className="text-[9px]" style={{ color: S.t3 }}>📎{issue.attachment_count}</span>
        )}
        {issue.assignee
          ? <span onClick={e => e.stopPropagation()}><Av i={issue.assignee} size={18} /></span>
          : <span className="inline-flex items-center justify-center rounded-full text-[8px] font-bold flex-shrink-0"
              style={{ width:18, height:18, border:`1.5px dashed ${S.border2}`, color:S.t3 }}>?</span>
        }
      </div>
    </div>
  )
}

// ─── Issue ↔ WorkItemData adapter ────────────────────────────────────────────
const STATUS_LABEL: Record<string, string> = {
  backlog:'Backlog', todo:'A fazer', 'in-progress':'Em andamento', 'in-review':'Em revisão', done:'Concluído',
}
const STATUS_COLOR: Record<string, string> = {
  backlog:DS.text3, todo:DS.text2, 'in-progress':DS.accent, 'in-review':DS.warn, done:DS.success,
}
const NAMES: Record<string, string> = {
  AL:'Ana Lima', NM:'Natalia Moura', JN:'Julia Neves', CS:'Carlos Silva', RM:'Rafael Mendes', LF:'Lucas Ferreira',
}

function issueToWID(issue: Issue): WorkItemData {
  const epic   = EPICS.find(e => e.id === issue.epic)
  const sprint = SPRINTS.find(s => s.id === issue.sprint)
  return {
    key:              issue.key,
    type:             issue.type,
    title:            issue.title,
    status:           issue.status,
    priority:         issue.priority,
    labels:           issue.labels,
    assigneeInitials: issue.assignee,
    assigneeName:     NAMES[issue.assignee],
    reporterInitials: issue.reporter,
    reporterName:     issue.reporter ? NAMES[issue.reporter] : undefined,
    epicKey:          issue.epic,
    epicLabel:        epic?.label,
    epicColor:        epic?.color,
    sprintId:         issue.sprint,
    sprintName:       sprint?.name,
    blocked:          issue.blocked,
    blockedReason:    issue.blocked_reason,
    delayed:          issue.delayed,
    severity:         issue.severity,
    description:      issue.description,
    dueDate:          issue.dueDate,
    points:           issue.points,
    fixVersions:      issue.fix_versions ?? [],
    availableEpics:   EPICS.map(e => ({ id: e.id, label: e.label, color: e.color })),
    availableMembers: Object.entries(NAMES).map(([initials, name]) => ({ id: initials, initials, name })),
    availableSprints: SPRINTS.map(s => ({ id: s.id, name: s.name })),
    availableLabels:  ['Design','Web','Research','Content','Mobile','Eng','UX','SEO','Brand','Hero'],
    availableVersions:['v2.3.0','v2.4.0','v2.4.1','v2.5.0'],
    history:          issue.history ?? [],
    acItems:          issue.acceptance_criteria_count
      ? Array.from({ length: issue.acceptance_criteria_count }, (_, i) => ({ id:`ac-${i}`, text:`Critério de aceite ${i+1}`, done: i === 0 }))
      : [],
    comments:         (issue.comments ?? []).map(c => ({ author: c.author, body: c.text, time: c.when })),
    evidenceCount:    issue.evidence_count,
    attachmentCount:  issue.attachment_count,
    createdAt:        'Abr 2025',
    updatedAt:        'Abr 2025',
  }
}

function widToIssue(issue: Issue, updated: WorkItemData): Issue {
  return {
    ...issue,
    title:                     updated.title,
    status:                    updated.status as IssueStatus,
    priority:                  updated.priority as Priority,
    labels:                    updated.labels,
    assignee:                  updated.assigneeInitials,
    reporter:                  updated.reporterInitials,
    sprint:                    updated.sprintId,
    points:                    updated.points ?? 0,
    dueDate:                   updated.dueDate ?? '',
    fix_versions:              updated.fixVersions,
    blocked:                   updated.blocked,
    blocked_reason:            updated.blockedReason,
    severity:                  updated.severity as Issue['severity'],
    description:               updated.description,
    epic:                      updated.epicKey,
    history:                   updated.history,
    comments:                  (updated.comments ?? []).map(c => ({ author: c.author, text: c.body, when: c.time })),
    acceptance_criteria_count: updated.acItems?.length,
  }
}

function WorkItemDetailDrawer({ issue, onClose, onUpdate }: {
  issue: Issue
  onClose: () => void
  onUpdate: (updated: Issue) => void
}) {
  return (
    <WorkItemDetail
      mode="drawer"
      // Board issues carry the real work_items uuid: the panel then reads and persists from Supabase.
      itemId={/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(issue.id ?? '') ? issue.id : undefined}
      data={issueToWID(issue)}
      onClose={onClose}
      onUpdate={updated => onUpdate(widToIssue(issue, updated))}
    />
  )
}

// ─── Board tab ────────────────────────────────────────────────────────────────
type SwimlaneMode = 'none' | 'assignee' | 'epic'


// ─── BoardTab ─────────────────────────────────────────────────────────────────
// RULES (board column behavior):
// • Card criado via "+" herda status da coluna e entra no TOPO — não altera
//   o status das issues já existentes.
// • Nome da coluna ≠ nome do status (coluna mapeia 1+ statuses).
// • Reordenar colunas muda a ordem do fluxo, NÃO os statuses das issues.
// • Remover/remapear nunca faz issue sumir — cai em "Não mapeados".
// • Editar colunas (renomear/remover/reordenar) requer permissão Admin.

let _issueSeq = 200

/** dd/mm from an ISO date. */
function fmtDay(iso: string | null): string {
  if (!iso) return '—'
  const [, m, d] = iso.split('-')
  return `${d}/${m}`
}

/** Maps a Supabase work_item row into the Issue shape the board components render. */
function mapDbItem(
  it: BoardItemRow,
  profileById: Map<string, { name: string; avatar_initials: string | null }>,
  epicById: Map<string, { name: string; color: string | null }>,
): Issue {
  const assignee = it.assignee_id ? profileById.get(it.assignee_id) : undefined
  const reporter = it.reporter_id ? profileById.get(it.reporter_id) : undefined
  const epic     = it.epic_id ? epicById.get(it.epic_id) : undefined
  const initials = assignee?.avatar_initials
    ?? assignee?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    ?? ''
  return {
    id:       it.id,
    colId:    it.board_column_id ?? undefined,
    dbStatus: it.status,
    key:      it.key,
    type:     (['story','bug','task','subtask','epic','feature'].includes(it.type) ? it.type : 'task') as IssueType,
    title:    it.title,
    status:   uiStatus(it.status),
    priority: PRIORITY_FROM_DB[(it.priority ?? '').toLowerCase()] ?? 'medium',
    labels:   [],
    assignee: initials,
    dueDate:  it.due_date ? fmtDay(it.due_date) : '',
    points:   it.story_points != null ? Number(it.story_points) : 0,
    epic:     epic?.name,
    sprint:   it.sprint_id ?? undefined,
    blocked:  it.is_blocked,
    blocked_reason: it.blocked_reason ?? undefined,
    description: it.description ?? undefined,
    reporter: reporter?.avatar_initials ?? undefined,
  }
}

interface ColState {
  id:       string
  label:    string
  statuses: string[]
  wip?:     number
  dot:      string
}

/** DB status (snake_case) → UI status used by the card components. */
function uiStatus(dbStatus: string): IssueStatus {
  switch (dbStatus) {
    case 'in_progress': return 'in-progress'
    case 'in_review':   return 'in-review'
    case 'blocked':     return 'in-progress'
    case 'done':        return 'done'
    case 'todo':        return 'todo'
    default:            return 'backlog'
  }
}

function BoardTab({
  issues, onCreateIssue, onCompleteSprint, canManageSprint, activeSprints,
  dbCols, loading, error, onMoveCard, onQuickCreate, onLocalPatch,
}: {
  issues: Issue[]
  onCreateIssue: () => void
  onCompleteSprint: (s: SprintDef) => void
  canManageSprint: boolean
  activeSprints: SprintDef[]
  dbCols: ColState[]
  loading: boolean
  error: string | null
  onMoveCard: (issue: Issue, colId: string) => Promise<void>
  onQuickCreate: (title: string, colId: string, sprintId: string) => Promise<void>
  onLocalPatch: (key: string, patch: Partial<Issue>) => void
}) {
  const { activeUser: boardUser } = useSession()
  const canDrag = can(boardUser.permissions, 'board:manage')

  // ── column config state (hydrated from board_columns) ────────────────────
  const [cols, setCols]             = useState<ColState[]>(dbCols)
  const [colOrder, setColOrder]     = useState<string[]>(dbCols.map(c=>c.id))
  useEffect(() => {
    setCols(dbCols)
    setColOrder(dbCols.map(c => c.id))
  }, [dbCols])
  // drag-to-reorder columns
  const [draggingCol, setDraggingCol]   = useState<string|null>(null)
  const [dragOverColHeader, setDragOverColHeader] = useState<string|null>(null)
  // drag cards between columns
  const [draggingCard, setDraggingCard] = useState<string|null>(null)
  const [dragOverCol,  setDragOver]     = useState<string|null>(null)
  // inline card composer per column
  const [composerCol,  setComposerCol]  = useState<string|null>(null)
  const [composerText, setComposerText] = useState('')
  const [composerBusy, setComposerBusy] = useState(false)
  // inline column rename
  const [editingColId, setEditingColId] = useState<string|null>(null)
  const [editingColLabel, setEditingColLabel] = useState('')
  // column ⋯ menu
  const [menuColId, setMenuColId]       = useState<string|null>(null)
  // remove confirmation
  const [removeColId, setRemoveColId]   = useState<string|null>(null)
  // WIP editor
  const [wipColId, setWipColId]         = useState<string|null>(null)
  const [wipValue,  setWipValue]        = useState('')
  // issue detail drawer
  const [openIssue, setOpenIssue]   = useState<Issue | null>(null)
  // transient feedback
  const [boardToast, setBoardToast] = useState<string|null>(null)
  function flashToast(msg: string) {
    setBoardToast(msg)
    setTimeout(() => setBoardToast(null), 4000)
  }
  // filters
  const [activeSprint, setActiveSprint] = useState('')
  const [swimlane, setSwimlane]     = useState<SwimlaneMode>('none')
  const [filterAssignees, setFilterA] = useState<string[]>([])
  const [filterPriority, setFilterP]  = useState<Priority[]>([])
  const [filterType, setFilterType]   = useState<IssueType[]>([])

  const selectableSprints = activeSprints.filter(s => s.state !== 'completed')
  useEffect(() => {
    if (activeSprint && selectableSprints.some(s => s.id === activeSprint)) return
    const next = selectableSprints.find(s => s.state === 'active') ?? selectableSprints[0]
    if (next) setActiveSprint(next.id)
  }, [activeSprints]) // eslint-disable-line react-hooks/exhaustive-deps

  const sprintIssues = activeSprint ? issues.filter(i => i.sprint === activeSprint) : issues
  const filtered = sprintIssues.filter(i => {
    if (filterAssignees.length && !filterAssignees.includes(i.assignee)) return false
    if (filterPriority.length && !filterPriority.includes(i.priority)) return false
    if (filterType.length && !filterType.includes(i.type)) return false
    return true
  })

  const orderedCols = colOrder.map(id => cols.find(c=>c.id===id)!).filter(Boolean)
  const colIds = new Set(orderedCols.map(c => c.id))
  const mappedStatuses = new Set(orderedCols.flatMap(c=>c.statuses))
  const hasUnmapped = filtered.some(i => (i.colId ? !colIds.has(i.colId) : !mappedStatuses.has(i.status)))

  function getColIssues(col: ColState) {
    if (col.id === 'unmapped') {
      return filtered.filter(i => (i.colId ? !colIds.has(i.colId) : !mappedStatuses.has(i.status)))
    }
    return filtered.filter(i => (i.colId ? i.colId === col.id : col.statuses.includes(i.status)))
  }

  // ── card drag (persisted in Supabase, reverted on failure) ───────────────
  async function handleCardDrop(col: ColState) {
    const key = draggingCard
    setDraggingCard(null); setDragOver(null)
    if (!key || col.id === 'unmapped') return
    const issue = issues.find(i => i.key === key)
    if (!issue || issue.colId === col.id) return

    const previous: Partial<Issue> = { colId: issue.colId, status: issue.status, dbStatus: issue.dbStatus }
    const nextDbStatus = col.statuses.includes(issue.dbStatus ?? '') ? issue.dbStatus! : (col.statuses[0] ?? 'todo')
    // optimistic
    onLocalPatch(key, { colId: col.id, dbStatus: nextDbStatus, status: uiStatus(nextDbStatus) })
    try {
      await onMoveCard(issue, col.id)
    } catch (err) {
      onLocalPatch(key, previous)
      flashToast(`Não foi possível mover ${key}: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
  }

  // ── column reorder drag ──────────────────────────────────────────────────
  function handleColDrop(targetId: string) {
    if (!draggingCol || draggingCol === targetId) { setDraggingCol(null); setDragOverColHeader(null); return }
    setColOrder(prev => {
      const arr = [...prev]
      const from = arr.indexOf(draggingCol)
      const to   = arr.indexOf(targetId)
      arr.splice(from, 1)
      arr.splice(to, 0, draggingCol)
      return arr
    })
    setDraggingCol(null); setDragOverColHeader(null)
  }

  // ── inline quick-create (insert real work_item) ──────────────────────────
  function openComposer(colId: string) {
    setComposerCol(colId); setComposerText(''); setMenuColId(null)
  }
  async function submitComposer(col: ColState) {
    const title = composerText.trim()
    if (!title) { setComposerCol(null); return }
    setComposerBusy(true)
    try {
      await onQuickCreate(title, col.id, activeSprint)
      setComposerText('')
    } catch (err) {
      flashToast(`Falha ao criar issue: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    } finally {
      setComposerBusy(false)
    }
    // keep composer open for chaining — user hits Esc to close

  }

  // ── column rename ────────────────────────────────────────────────────────
  function startRename(col: ColState) {
    setEditingColId(col.id); setEditingColLabel(col.label); setMenuColId(null)
  }
  function saveRename() {
    if (!editingColId) return
    const label = editingColLabel.trim()
    if (label) setCols(prev => prev.map(c => c.id===editingColId ? {...c, label} : c))
    setEditingColId(null)
  }

  // ── move col (← →) ──────────────────────────────────────────────────────
  function moveCol(id: string, dir: -1|1) {
    setColOrder(prev => {
      const arr = [...prev]; const idx = arr.indexOf(id)
      const to = idx + dir
      if (to < 0 || to >= arr.length) return arr
      ;[arr[idx], arr[to]] = [arr[to], arr[idx]]
      return arr
    }); setMenuColId(null)
  }

  // ── remove column ────────────────────────────────────────────────────────
  function confirmRemove() {
    if (!removeColId) return
    setCols(prev => prev.filter(c=>c.id!==removeColId))
    setColOrder(prev => prev.filter(id=>id!==removeColId))
    setRemoveColId(null)
  }

  // ── WIP limit ────────────────────────────────────────────────────────────
  function saveWip() {
    if (!wipColId) return
    const val = parseInt(wipValue)
    setCols(prev => prev.map(c => c.id===wipColId ? {...c, wip: isNaN(val)||val<1 ? undefined : val} : c))
    setWipColId(null)
  }

  const ASSIGNEES = ['AL','NM','JN','CS','RM','LF']
  function toggleArr<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter(x=>x!==val) : [...arr, val]
  }
  const swimlaneKeys: string[] = swimlane==='none' ? ['_all']
    : swimlane==='assignee' ? [...new Set(filtered.map(i=>i.assignee))].sort()
    : [...new Set(filtered.map(i=>i.epic ?? 'Sem épico'))]

  const visibleCols = hasUnmapped
    ? [...orderedCols, {id:'unmapped',label:'⚠ Não mapeados',statuses:[],dot:DS.crit} as ColState]
    : orderedCols

  return (
    <div className="flex flex-col h-full overflow-hidden" onClick={()=>{if(menuColId)setMenuColId(null)}}>
      {/* ── Quick filters ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2 overflow-x-auto flex-shrink-0"
        style={{ background:S.surface, borderBottom:`1px solid ${S.border}` }}>
        <select value={activeSprint} onChange={e=>setActiveSprint(e.target.value)}
          className="h-7 px-2 text-[11px] rounded-lg border outline-none appearance-none pr-5 font-[inherit]"
          style={{ background:S.surface2, border:`1px solid ${S.border}`, color:DS.accent }}>
          {selectableSprints.map(s=>(
            <option key={s.id} value={s.id} style={{ background:S.surface2 }}>{s.name} {s.state==='active'?'▶':''}</option>
          ))}
        </select>
        {/* Encerrar sprint */}
        {(() => {
          const currentSprint = (activeSprints ?? SPRINTS).find(s => s.id === activeSprint)
          const isActive = currentSprint?.state === 'active'
          const disabled = !canManageSprint || !isActive
          return (
            <button
              onClick={()=>{ if(!disabled && currentSprint) onCompleteSprint(currentSprint) }}
              disabled={disabled}
              title={!canManageSprint ? 'Requer permissão: Gerenciar Sprint' : !isActive ? 'Nenhuma sprint ativa selecionada' : `Encerrar ${currentSprint?.name}`}
              className="h-7 px-2.5 rounded-lg text-[11px] font-medium flex items-center gap-1.5 flex-shrink-0 transition-all"
              style={{
                background: disabled ? S.surface2 : DS.warnDim,
                border: `1px solid ${disabled ? S.border : DS.warn+'60'}`,
                color: disabled ? S.t3 : DS.warn,
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.6 : 1,
              }}
              onMouseEnter={e=>{ if(!disabled)(e.currentTarget as HTMLButtonElement).style.background=DS.warn+'22' }}
              onMouseLeave={e=>{ if(!disabled)(e.currentTarget as HTMLButtonElement).style.background=DS.warnDim }}>
              ⏹ Encerrar sprint
            </button>
          )
        })()}
        <div className="w-px h-4 flex-shrink-0" style={{ background:S.border }}/>
        <div className="flex items-center gap-1">
          {ASSIGNEES.map(a=>(
            <button key={a} onClick={()=>setFilterA(prev=>toggleArr(prev,a))}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold text-white transition-all"
              style={{ background:AV_COLOR[a]??DS.text3, opacity:filterAssignees.length===0||filterAssignees.includes(a)?1:.3, outline:filterAssignees.includes(a)?'2px solid white':'2px solid transparent' }}>
              {a}
            </button>
          ))}
        </div>
        <div className="w-px h-4 flex-shrink-0" style={{ background:S.border }}/>
        {(['critical','high','medium','low'] as Priority[]).map(p=>(
          <button key={p} onClick={()=>setFilterP(prev=>toggleArr(prev,p))}
            className="flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium transition-all"
            style={{ background:filterPriority.includes(p)?`${PRIORITY_COLOR[p]}22`:S.surface2, color:filterPriority.includes(p)?PRIORITY_COLOR[p]:S.t3, border:`1px solid ${filterPriority.includes(p)?`${PRIORITY_COLOR[p]}50`:S.border}` }}>
            <PriorityDot p={p}/>{p.charAt(0).toUpperCase()+p.slice(1)}
          </button>
        ))}
        <div className="w-px h-4 flex-shrink-0" style={{ background:S.border }}/>
        {(['story','bug','task'] as IssueType[]).map(t=>(
          <button key={t} onClick={()=>setFilterType(prev=>toggleArr(prev,t))}
            className="flex items-center gap-1 h-6 px-2 rounded-md text-[10px] font-medium transition-all"
            style={{ background:filterType.includes(t)?S.surface2:'transparent', border:`1px solid ${filterType.includes(t)?S.border2:'transparent'}`, color:filterType.includes(t)?S.t1:S.t3 }}>
            <TypeIcon t={t}/> {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-1.5">
          <span className="text-[10px]" style={{ color:S.t3 }}>Agrupar:</span>
          {(['none','assignee','epic'] as SwimlaneMode[]).map(m=>(
            <button key={m} onClick={()=>setSwimlane(m)}
              className="h-6 px-2 rounded-md text-[10px] font-medium transition-colors"
              style={{ background:swimlane===m?`${DS.accent}20`:'transparent', color:swimlane===m?DS.accent:S.t3 }}>
              {m==='none'?'Nenhum':m==='assignee'?'Responsável':'Épico'}
            </button>
          ))}
        </div>
      </div>

      {/* ── Loading / error / empty ────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 overflow-hidden">
          <div className="flex gap-3 p-4">
            {[0,1,2,3,4].map(i=>(
              <div key={i} className="flex flex-col gap-2 flex-shrink-0" style={{ width:212 }}>
                <div style={{ height:14, width:'55%', borderRadius:6, background:S.surface2 }}/>
                {[0,1,2].map(j=>(
                  <div key={j} style={{ height:64, borderRadius:10, background:S.surface, border:`1px solid ${S.border}`, opacity:1-j*0.22 }}/>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <div style={{ maxWidth:460, textAlign:'center' }}>
            <p style={{ fontSize:13, fontWeight:700, color:DS.crit, marginBottom:6 }}>Não foi possível carregar o board</p>
            <p style={{ fontSize:12, color:S.t3 }}>{error}</p>
          </div>
        </div>
      ) : orderedCols.length === 0 ? (
        <div className="flex-1 flex items-center justify-center p-6">
          <p style={{ fontSize:12, color:S.t3 }}>Nenhuma coluna configurada para este board.</p>
        </div>
      ) : (
      <>
      {/* ── Board area ─────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto">
        <div className="flex gap-3 p-4 h-full" style={{ minWidth: visibleCols.length*224+80 }}>

          {visibleCols.map((col) => {
            const colIssues  = getColIssues(col)
            const isCardOver = dragOverCol === col.id
            const isColOver  = dragOverColHeader === col.id && draggingCol && draggingCol !== col.id
            const wipOver    = col.wip != null && colIssues.length > col.wip
            const colIdx2 = colOrder.indexOf(col.id)

            return (
              <div key={col.id}
                className="flex flex-col flex-shrink-0"
                style={{ width:212, opacity: draggingCol===col.id ? 0.45 : 1 }}>

                {/* ── Column header ────────────────────────────────────── */}
                <div
                  draggable={col.id !== 'unmapped'}
                  onDragStart={()=>{ if(col.id!=='unmapped') setDraggingCol(col.id) }}
                  onDragEnd={()=>{ setDraggingCol(null); setDragOverColHeader(null) }}
                  onDragOver={e=>{ e.preventDefault(); if(draggingCol && draggingCol!==col.id) setDragOverColHeader(col.id) }}
                  onDragLeave={()=>setDragOverColHeader(null)}
                  onDrop={()=>handleColDrop(col.id)}
                  className="flex items-center justify-between mb-2 px-1 rounded-lg transition-all"
                  style={{
                    cursor: col.id!=='unmapped' ? 'grab' : 'default',
                    padding:'4px 6px',
                    background: isColOver ? `${DS.accent}18` : 'transparent',
                    border: isColOver ? `1.5px dashed ${DS.accent}` : '1.5px dashed transparent',
                  }}>
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:col.dot }}/>
                    {editingColId === col.id ? (
                      <input
                        autoFocus
                        value={editingColLabel}
                        onChange={e=>setEditingColLabel(e.target.value)}
                        onBlur={saveRename}
                        onKeyDown={e=>{ if(e.key==='Enter') saveRename(); if(e.key==='Escape'){setEditingColId(null)} }}
                        onClick={e=>e.stopPropagation()}
                        className="text-[10px] font-bold uppercase tracking-wider outline-none bg-transparent border-b flex-1"
                        style={{ color:S.t1, borderColor:DS.accent, minWidth:0 }}
                      />
                    ) : (
                      <span
                        onDoubleClick={()=>col.id!=='unmapped' && startRename(col)}
                        title="Clique duplo para renomear"
                        className="text-[10px] font-bold uppercase tracking-wider truncate"
                        style={{ color:S.t2, cursor:'text' }}>
                        {col.label}
                      </span>
                    )}
                    <span className="text-[9px] font-bold px-1.5 py-px rounded-full flex-shrink-0"
                      style={{ background:wipOver?DS.critDim:DS.accentDim, color:wipOver?DS.crit:DS.accent }}>
                      {colIssues.length}{col.wip?`/${col.wip}`:''}
                    </span>
                    {wipOver && (
                      <span className="text-[8px] font-bold px-1 py-px rounded flex-shrink-0" style={{ background:DS.critDim,color:DS.crit }}>WIP</span>
                    )}
                  </div>

                  {/* Header actions */}
                  {col.id !== 'unmapped' && (
                    <div className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                      {/* Quick "+" — opens CreateIssueModal pre-filled with column status */}
                      <button
                        onClick={e=>{ e.stopPropagation(); openComposer(col.id) }}
                        title="Criar issue nesta coluna"
                        className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[15px] leading-none"
                        style={{ color:S.t3 }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=S.surface2;(e.currentTarget as HTMLButtonElement).style.color=S.t1}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color=S.t3}}>
                        +
                      </button>
                      {/* ⋯ menu */}
                      <div className="relative">
                        <button
                          onClick={e=>{ e.stopPropagation(); setMenuColId(menuColId===col.id?null:col.id) }}
                          className="w-5 h-5 flex items-center justify-center rounded transition-colors text-[13px]"
                          style={{ color:S.t3 }}
                          onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background=S.surface2;(e.currentTarget as HTMLButtonElement).style.color=S.t1}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.color=S.t3}}>
                          ⋯
                        </button>
                        {menuColId === col.id && (
                          <div onClick={e=>e.stopPropagation()}
                            style={{ position:'absolute',right:0,top:'110%',zIndex:50,width:168,background:S.surface,border:`1px solid ${S.border2}`,borderRadius:10,boxShadow:DS.shadowModal,padding:'4px 0',overflow:'hidden' }}>
                            {[
                              { label:'Renomear',       icon:'✏️', action:()=>startRename(col) },
                              { label:'Mover ‹ (esq.)', icon:'◀', action:()=>moveCol(col.id,-1), disabled:colIdx2<=0 },
                              { label:'Mover › (dir.)', icon:'▶', action:()=>moveCol(col.id,1),  disabled:colIdx2>=colOrder.length-1 },
                              { label:'Limite WIP',     icon:'⚡', action:()=>{ setWipColId(col.id); setWipValue(col.wip?.toString()??''); setMenuColId(null) } },
                              null, // separator
                              { label:'Remover coluna', icon:'🗑', action:()=>{ setRemoveColId(col.id); setMenuColId(null) }, danger:true },
                            ].map((item,i)=>{
                              if (!item) return <div key={i} style={{ height:1, background:S.border, margin:'3px 0' }}/>
                              const it = item as {label:string;icon:string;action:()=>void;disabled?:boolean;danger?:boolean}
                              return (
                                <button key={it.label} onClick={()=>{ if(!it.disabled) it.action() }}
                                  style={{ width:'100%',display:'flex',alignItems:'center',gap:8,padding:'7px 12px',background:'transparent',border:'none',cursor:it.disabled?'not-allowed':'pointer',color:it.danger?DS.crit:it.disabled?S.t3:S.t2,fontSize:12,textAlign:'left' }}
                                  onMouseEnter={e=>{ if(!it.disabled&&!it.danger)(e.currentTarget as HTMLButtonElement).style.background=S.surface2 }}
                                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='transparent'}}>
                                  <span style={{ fontSize:11 }}>{it.icon}</span>{it.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* ── Drop zone + cards ─────────────────────────────── */}
                <div className="flex flex-col gap-2 flex-1 rounded-xl p-1.5 transition-all"
                  style={{ background:isCardOver?`${DS.accent}10`:'transparent', border:isCardOver?`1.5px dashed ${DS.accent}`:'1.5px dashed transparent', minHeight:80 }}
                  onDragOver={e=>{ e.preventDefault(); setDragOver(col.id) }}
                  onDragLeave={()=>setDragOver(null)}
                  onDrop={()=>{ void handleCardDrop(col) }}
                  data-testid={`col-${col.id}`}>

                  {/* ── Inline mini-card composer ────────────────────── */}
                  {composerCol === col.id && (
                    <div style={{ background:S.surface,border:`1.5px solid ${DS.accentBorder}`,borderRadius:10,padding:'8px 10px',boxShadow:`0 0 0 3px ${DS.accentDim}` }}>
                      {/* Status chip */}
                      <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:6 }}>
                        <span style={{ width:6,height:6,borderRadius:'50%',background:col.dot,flexShrink:0 }}/>
                        <span style={{ fontSize:10,fontWeight:700,color:col.dot,textTransform:'uppercase',letterSpacing:'.04em' }}>{col.label}</span>
                        <span style={{ fontSize:10,color:S.t3,marginLeft:'auto' }}>História</span>
                      </div>
                      <textarea
                        autoFocus
                        rows={2}
                        value={composerText}
                        onChange={e=>setComposerText(e.target.value)}
                        onKeyDown={e=>{
                          if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); void submitComposer(col) }
                          if(e.key==='Escape'){ setComposerCol(null); setComposerText('') }
                        }}
                        placeholder="O que precisa ser feito?"
                        style={{ width:'100%',background:'transparent',border:'none',outline:'none',color:S.t1,fontSize:12,resize:'none',fontFamily:'inherit',lineHeight:1.4,boxSizing:'border-box' }}
                      />
                      <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginTop:6 }}>
                        <button onClick={()=>{ onCreateIssue(); setComposerCol(null) }}
                          style={{ fontSize:11,color:DS.accent,background:'none',border:'none',cursor:'pointer',padding:0 }}>
                          ＋ mais campos
                        </button>
                        <div style={{ display:'flex',gap:6 }}>
                          <button onClick={()=>{ setComposerCol(null); setComposerText('') }}
                            style={{ fontSize:11,color:S.t3,background:'none',border:'none',cursor:'pointer',padding:'3px 8px' }}>
                            Esc
                          </button>
                          <button onClick={()=>{ void submitComposer(col) }} disabled={!composerText.trim()||composerBusy}
                            style={{ fontSize:11,fontWeight:600,color:'#fff',background:composerText.trim()?DS.accent:S.border,border:'none',borderRadius:6,cursor:composerText.trim()?'pointer':'not-allowed',padding:'3px 10px',opacity:composerBusy?0.6:1 }}>
                            {composerBusy?'Salvando…':'Adicionar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Cards */}
                  {swimlane === 'none' ? (
                    colIssues.map(issue=>(
                      <BoardCard key={issue.key} issue={issue}
                        dragging={draggingCard===issue.key}
                        onDragStart={()=>setDraggingCard(issue.key)}
                        onDragEnd={()=>{ setDraggingCard(null); setDragOver(null) }}
                        onOpen={()=>setOpenIssue(issue)}
                        canDrag={canDrag}/>
                    ))
                  ) : (
                    swimlaneKeys.map(lane=>{
                      const laneIssues = colIssues.filter(i=>swimlane==='assignee'?i.assignee===lane:(i.epic??'Sem épico')===lane)
                      if(!laneIssues.length) return null
                      return (
                        <div key={lane}>
                          <p className="text-[9px] font-semibold uppercase tracking-wide mb-1 px-0.5" style={{ color:S.t3 }}>{lane}</p>
                          {laneIssues.map(issue=>(
                            <div key={issue.key} className="mb-1.5">
                              <BoardCard issue={issue} dragging={draggingCard===issue.key}
                                onDragStart={()=>setDraggingCard(issue.key)}
                                onDragEnd={()=>{ setDraggingCard(null); setDragOver(null) }}
                                onOpen={()=>setOpenIssue(issue)}
                                canDrag={canDrag}/>
                            </div>
                          ))}
                        </div>
                      )
                    })
                  )}

                  {/* Bottom add button — opens CreateIssueModal pre-filled with column status */}
                  {col.id !== 'unmapped' && (
                    <button onClick={()=>openComposer(col.id)}
                      className="w-full py-1.5 rounded-lg text-[11px] transition-all text-center mt-auto"
                      style={{ color:S.t3, border:`1px dashed ${S.border}` }}
                      onMouseEnter={e=>{ (e.currentTarget as HTMLButtonElement).style.background=DS.accentDim;(e.currentTarget as HTMLButtonElement).style.borderColor=DS.accent;(e.currentTarget as HTMLButtonElement).style.color=DS.accent }}
                      onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.background='transparent';(e.currentTarget as HTMLButtonElement).style.borderColor=S.border;(e.currentTarget as HTMLButtonElement).style.color=S.t3 }}>
                      + issue
                    </button>
                  )}
                </div>
              </div>
            )
          })}

          {/* ── Add new column ─────────────────────────────────────────── */}
          <div className="flex-shrink-0 self-start" style={{ width:180 }}>
            <button onClick={()=>{
              const id = `col_${Date.now()}`
              const newCol:ColState = { id, label:'Nova coluna', statuses:[], dot:DS.text3 }
              setCols(prev=>[...prev, newCol])
              setColOrder(prev=>[...prev, id])
              setTimeout(()=>setEditingColId(id), 50)
            }}
              className="w-full flex items-center justify-center gap-1.5 h-8 rounded-xl text-[11px] font-medium transition-colors"
              style={{ background:S.surface2, border:`1.5px dashed ${S.border2}`, color:S.t3 }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=DS.accentBorder;(e.currentTarget as HTMLButtonElement).style.color=DS.accent}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.borderColor=S.border2;(e.currentTarget as HTMLButtonElement).style.color=S.t3}}>
              + Adicionar coluna
            </button>
          </div>
        </div>
      </div>

      </>
      )}

      {boardToast && (
        <div style={{ position:'fixed', bottom:20, left:'50%', transform:'translateX(-50%)', zIndex:300,
          background:S.surface, border:`1px solid ${DS.crit}55`, color:S.t1, fontSize:12,
          padding:'9px 14px', borderRadius:10, boxShadow:DS.shadowModal, maxWidth:420 }}>
          {boardToast}
        </div>
      )}

      {/* ── Remove column confirmation ────────────────────────────────────── */}
      {removeColId && (() => {
        const col = cols.find(c=>c.id===removeColId)
        const affected = filtered.filter(i=>col?.statuses.includes(i.status)).length
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 }}>
            <div style={{ background:S.surface,border:`1px solid ${S.border}`,borderRadius:14,padding:28,boxShadow:DS.shadowModal,width:400 }}>
              <p style={{ fontSize:16,fontWeight:700,color:DS.text1,marginBottom:8 }}>Remover coluna "{col?.label}"?</p>
              <p style={{ fontSize:13,color:DS.text2,marginBottom:affected>0?10:20 }}>A coluna será removida do fluxo.</p>
              {affected > 0 && (
                <div style={{ background:DS.warnDim,border:`1px solid ${DS.warn}30`,borderRadius:8,padding:'8px 12px',marginBottom:20 }}>
                  <p style={{ fontSize:12,color:DS.warn,margin:0 }}>⚠ {affected} issue{affected!==1?'s':''} mapeada{affected!==1?'s':''} para esta coluna será{affected!==1?'o':''} movida{affected!==1?'s':''} automaticamente para "⚠ Não mapeados" — nenhuma issue some.</p>
                </div>
              )}
              <div style={{ display:'flex',justifyContent:'flex-end',gap:10 }}>
                <button onClick={()=>setRemoveColId(null)} style={{ padding:'7px 16px',borderRadius:8,background:'transparent',border:`1px solid ${S.border}`,color:DS.text2,fontSize:13,cursor:'pointer' }}>Cancelar</button>
                <button onClick={confirmRemove} style={{ padding:'7px 16px',borderRadius:8,background:DS.crit,color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer' }}>Remover</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── WorkItemDetailDrawer (P4) ───────────────────────────────────── */}
      {openIssue && (
        <WorkItemDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={updated => {
            onLocalPatch(updated.key, updated)
            setOpenIssue(updated)
          }}
        />
      )}

      {/* ── WIP limit editor ────────────────────────────────────────────── */}
      {wipColId && (() => {
        const col = cols.find(c=>c.id===wipColId)
        return (
          <div style={{ position:'fixed',inset:0,background:'rgba(0,0,0,.72)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 }}>
            <div style={{ background:S.surface,border:`1px solid ${S.border}`,borderRadius:14,padding:24,boxShadow:DS.shadowModal,width:320 }}>
              <p style={{ fontSize:15,fontWeight:700,color:DS.text1,marginBottom:4 }}>Limite WIP — {col?.label}</p>
              <p style={{ fontSize:12,color:DS.text3,marginBottom:16 }}>Deixe em branco para sem limite.</p>
              <input type="number" min={1} max={99} value={wipValue} onChange={e=>setWipValue(e.target.value)}
                placeholder="Ex: 4"
                style={{ width:'100%',background:S.surface2,border:`1px solid ${S.border}`,borderRadius:8,padding:'8px 12px',color:DS.text1,fontSize:14,outline:'none',boxSizing:'border-box',marginBottom:16 }}/>
              <div style={{ display:'flex',justifyContent:'flex-end',gap:8 }}>
                <button onClick={()=>setWipColId(null)} style={{ padding:'7px 14px',borderRadius:8,background:'transparent',border:`1px solid ${S.border}`,color:DS.text2,fontSize:13,cursor:'pointer' }}>Cancelar</button>
                <button onClick={saveWip} style={{ padding:'7px 14px',borderRadius:8,background:DS.accent,color:'#fff',border:'none',fontSize:13,fontWeight:600,cursor:'pointer' }}>Salvar</button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

function BacklogRow({ issue, epicColor, onOpen }: { issue: Issue; epicColor: string; onOpen: () => void }) {
  const [hovered, setHovered] = useState(false)
  const tags = getCardTags(issue)
  return (
    <div
      className="flex items-center gap-2 px-4 py-2 transition-colors group cursor-pointer"
      style={{ background: hovered ? S.surface2 : 'transparent' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onOpen}
    >
      {/* Drag handle */}
      <span className="text-[10px] cursor-grab" style={{ color: S.t3, opacity: hovered ? 1 : 0.3 }} onClick={e => e.stopPropagation()}>⠿</span>
      {/* Type icon */}
      <TypeIcon t={issue.type} />
      {/* Key */}
      <span className="text-[10px] font-mono w-14 flex-shrink-0" style={{ color: S.t3 }}>{issue.key}</span>
      {/* Epic indicator */}
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: epicColor }} />
      {/* Title */}
      <span className="flex-1 text-[12px] truncate" style={{ color: S.t1 }}>{issue.title}</span>
      {/* Critical tags (red only, max 2) */}
      <div className="hidden group-hover:flex gap-0.5 flex-shrink-0">
        {tags.filter(t => t.level === 'red').slice(0,2).map(tag => (
          <span key={tag.label} className="text-[9px] font-semibold px-1 py-px rounded-md"
            style={{ background: TAG_COLORS.red.bg, color: TAG_COLORS.red.color }}>{tag.label}</span>
        ))}
        {tags.filter(t => t.level === 'amber').slice(0,1).map(tag => (
          <span key={tag.label} className="text-[9px] font-semibold px-1 py-px rounded-md"
            style={{ background: TAG_COLORS.amber.bg, color: TAG_COLORS.amber.color }}>{tag.label}</span>
        ))}
      </div>
      {/* Priority */}
      <span className="flex-shrink-0"><PriorityDot p={issue.priority} /></span>
      {/* Assignee */}
      {issue.assignee
        ? <span onClick={e => e.stopPropagation()}><Av i={issue.assignee} size={18} /></span>
        : <span className="w-[18px] h-[18px] rounded-full inline-flex items-center justify-center text-[8px] flex-shrink-0"
            style={{ border:`1.5px dashed ${S.border2}`, color:S.t3 }}>?</span>
      }
      {/* Points */}
      <span className="text-[10px] font-bold px-1.5 py-px rounded w-7 text-center flex-shrink-0"
        style={{ background: S.surface2, color: S.t3 }}>
        {issue.points}
      </span>
    </div>
  )
}

// ─── Backlog tab ──────────────────────────────────────────────────────────────
function BacklogTab({ issues, sprints, canManageSprint, onCreateIssue, onCompleteSprint, onUpdateIssue }: {
  issues: Issue[]
  sprints: SprintDef[]
  canManageSprint: boolean
  onCreateIssue: () => void
  onCompleteSprint: (sprint: SprintDef) => void
  onUpdateIssue: (updated: Issue) => void
}) {
  const [collapsed, setCollapsed]       = useState<Set<string>>(new Set())
  const [startingSprint, setStarting]   = useState<SprintDef | null>(null)
  const [sprintStates, setSprintStates] = useState<Record<string,string>>({})
  const [openIssue, setOpenIssue]       = useState<Issue | null>(null)

  function toggleCollapse(id: string) {
    setCollapsed(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  function handleStartSprint(id: string, goal: string) {
    setSprintStates(prev => ({ ...prev, [id]: goal }))
    setStarting(null)
  }

  const getEpicColor = (epicId?: string) => EPICS.find(e => e.id === epicId)?.color ?? DS.text3

  const backlogIssues = issues.filter(i => !i.sprint)

  return (
    <div className="flex-1 overflow-y-auto">
      {startingSprint && (
        <StartSprintModal
          sprint={startingSprint}
          onConfirm={handleStartSprint}
          onClose={() => setStarting(null)}
        />
      )}

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">

        {/* Sprint containers */}
        {sprints.map(sprint => {
          const sprintIssues = issues.filter(i => i.sprint === sprint.id)
          const totalPts = sprintIssues.reduce((s, i) => s + i.points, 0)
          const donePts  = sprintIssues.filter(i => i.status === 'done').reduce((s, i) => s + i.points, 0)
          const isOpen   = !collapsed.has(sprint.id)
          const goalOverride = sprintStates[sprint.id]
          const goal     = goalOverride ?? sprint.goal

          const statusColors: Record<SprintDef['state'], { text: string; bg: string }> = {
            active:    { text: DS.success, bg: DS.successDim },
            planned:   { text: DS.accent,  bg: DS.accentDim  },
            completed: { text: DS.text3,   bg: DS.neutralDim },
          }
          const sc = statusColors[sprint.state]

          return (
            <div
              key={sprint.id}
              className="rounded-xl overflow-hidden"
              style={{ background: S.surface, border: `1px solid ${S.border}` }}
            >
              {/* Sprint header */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                style={{ borderBottom: isOpen ? `1px solid ${S.border}` : 'none' }}
                onClick={() => toggleCollapse(sprint.id)}
              >
                {/* Chevron */}
                <svg
                  width="12" height="12" viewBox="0 0 12 12" fill="none"
                  style={{ color: S.t3, transform: isOpen ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
                >
                  <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>

                {/* Sprint name */}
                <p className="text-[13px] font-semibold" style={{ color: S.t1 }}>{sprint.name}</p>

                {/* State badge */}
                <span className="text-[9px] font-bold px-1.5 py-px rounded-full" style={{ background: sc.bg, color: sc.text }}>
                  {sprint.state === 'active' ? '▶ Em andamento' : sprint.state === 'planned' ? 'Planejado' : '✓ Concluído'}
                </span>

                {/* Dates */}
                <span className="text-[11px]" style={{ color: S.t3 }}>{sprint.start} → {sprint.end}</span>

                {/* Points */}
                <span className="text-[11px] font-medium" style={{ color: S.t2 }}>
                  {sprint.state === 'completed' ? `${sprint.velocity ?? 0}pts concluídos` : `${donePts}/${totalPts}pts`}
                </span>

                {/* Actions */}
                <div className="ml-auto flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  {sprint.state === 'planned' && (
                    <button
                      onClick={canManageSprint ? () => setStarting(sprint) : undefined}
                      disabled={!canManageSprint}
                      title={!canManageSprint ? 'Requer permissão: Gerenciar Sprint (Admin, Project Manager ou Scrum Master)' : undefined}
                      className="h-6 px-3 text-[11px] font-semibold rounded-lg transition-all"
                      style={{
                        background: canManageSprint ? DS.accent : S.surface2,
                        color: canManageSprint ? '#fff' : S.t3,
                        border: canManageSprint ? 'none' : `1px solid ${S.border}`,
                        cursor: canManageSprint ? 'pointer' : 'not-allowed',
                      }}
                      onMouseEnter={canManageSprint ? e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)' } : undefined}
                      onMouseLeave={canManageSprint ? e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' } : undefined}
                    >
                      Iniciar Sprint
                    </button>
                  )}
                  {sprint.state === 'active' && (
                    <button
                      onClick={canManageSprint ? () => onCompleteSprint(sprint) : undefined}
                      disabled={!canManageSprint}
                      title={!canManageSprint ? 'Requer permissão: Gerenciar Sprint (Admin, Project Manager ou Scrum Master)' : undefined}
                      className="h-6 px-3 text-[11px] font-medium rounded-lg transition-colors"
                      style={{
                        border: `1px solid ${S.border}`,
                        color: canManageSprint ? S.t2 : S.t3,
                        cursor: canManageSprint ? 'pointer' : 'not-allowed',
                        opacity: canManageSprint ? 1 : 0.5,
                      }}
                      onMouseEnter={canManageSprint ? e => { (e.currentTarget as HTMLButtonElement).style.borderColor = S.border2 } : undefined}
                      onMouseLeave={canManageSprint ? e => { (e.currentTarget as HTMLButtonElement).style.borderColor = S.border } : undefined}
                    >
                      Concluir Sprint
                    </button>
                  )}
                  <button
                    className="w-6 h-6 flex items-center justify-center rounded-lg text-[14px] transition-colors"
                    style={{ color: S.t3 }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = S.surface2 }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
                  >
                    ···
                  </button>
                </div>
              </div>

              {isOpen && (
                <>
                  {/* Sprint goal */}
                  {goal && (
                    <div
                      className="flex items-start gap-2 px-4 py-2"
                      style={{ background: `${DS.accent}08`, borderBottom: `1px solid ${S.border}` }}
                    >
                      <span className="text-[10px] font-bold flex-shrink-0 mt-0.5" style={{ color: DS.accent }}>META</span>
                      <p className="text-[11px] italic" style={{ color: S.t2 }}>{goal}</p>
                    </div>
                  )}

                  {/* Column header */}
                  <div
                    className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-widest"
                    style={{ color: S.t3, borderBottom: `1px solid ${S.border}` }}
                  >
                    <span className="w-4" />
                    <span className="w-4" />
                    <span className="w-14">Chave</span>
                    <span className="w-1.5" />
                    <span className="flex-1">Título</span>
                    <span className="w-10 text-right">Prior.</span>
                    <span className="w-[18px]" />
                    <span className="w-7 text-right">Pts</span>
                  </div>

                  {/* Issues */}
                  {sprintIssues.length === 0 ? (
                    <div className="px-4 py-6 text-center text-[12px]" style={{ color: S.t3 }}>
                      Nenhuma issue neste sprint
                    </div>
                  ) : (
                    <div className="divide-y" style={{ borderColor: S.border }}>
                      {sprintIssues.map(issue => (
                        <BacklogRow key={issue.key} issue={issue} epicColor={getEpicColor(issue.epic)} onOpen={()=>setOpenIssue(issue)} />
                      ))}
                    </div>
                  )}

                  {/* Add issue */}
                  <div className="px-4 py-2" style={{ borderTop: `1px solid ${S.border}` }}>
                    <button
                      onClick={onCreateIssue}
                      className="text-[11px] font-medium transition-colors"
                      style={{ color: S.t3 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = DS.accent }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = S.t3 }}
                    >
                      + Adicionar issue
                    </button>
                  </div>
                </>
              )}
            </div>
          )
        })}

        {/* Backlog (unassigned) */}
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: S.surface, border: `1px solid ${S.border}` }}
        >
          <div
            className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
            style={{ borderBottom: !collapsed.has('_backlog') ? `1px solid ${S.border}` : 'none' }}
            onClick={() => toggleCollapse('_backlog')}
          >
            <svg
              width="12" height="12" viewBox="0 0 12 12" fill="none"
              style={{ color: S.t3, transform: !collapsed.has('_backlog') ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', flexShrink: 0 }}
            >
              <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p className="text-[13px] font-semibold" style={{ color: S.t1 }}>Backlog</p>
            <span className="text-[9px] font-bold px-1.5 py-px rounded-full" style={{ background: DS.neutralDim, color: DS.text3 }}>
              {backlogIssues.length}
            </span>
            <span className="text-[11px]" style={{ color: S.t3 }}>
              {backlogIssues.reduce((s,i) => s+i.points, 0)}pts
            </span>
          </div>

          {!collapsed.has('_backlog') && (
            <>
              {backlogIssues.length === 0 ? (
                <div className="px-4 py-6 text-center text-[12px]" style={{ color: S.t3 }}>Backlog vazio</div>
              ) : (
                <div className="divide-y" style={{ borderColor: S.border }}>
                  {backlogIssues.map(issue => (
                    <BacklogRow key={issue.key} issue={issue} epicColor={getEpicColor(issue.epic)} onOpen={()=>setOpenIssue(issue)} />
                  ))}
                </div>
              )}
              <div className="px-4 py-2" style={{ borderTop: `1px solid ${S.border}` }}>
                <button
                  onClick={onCreateIssue}
                  className="text-[11px] font-medium transition-colors"
                  style={{ color: S.t3 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = DS.accent }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = S.t3 }}
                >
                  + Criar issue no backlog
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drawer de detalhe (consistência cross-tela — P4) */}
      {openIssue && (
        <WorkItemDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={updated => {
            onUpdateIssue(updated)
            setOpenIssue(updated)
          }}
        />
      )}
    </div>
  )
}

// ─── Sprints tab ──────────────────────────────────────────────────────────────
function SprintsTab({ issues, sprints, onUpdateIssue, canManageSprint, loading, error, onStartSprint, onCompleteSprint }: {
  issues: Issue[]
  sprints: SprintDef[]
  onUpdateIssue: (updated: Issue) => void
  canManageSprint: boolean
  loading: boolean
  error: string | null
  onStartSprint: (sprint: SprintDef) => void
  onCompleteSprint: (sprint: SprintDef) => void
}) {
  const [openIssue, setOpenIssue]   = useState<Issue | null>(null)
  const [expanded, setExpanded]     = useState<Set<string>>(new Set(['s14']))
  const getEpicColor = (epicId?: string) => EPICS.find(e => e.id === epicId)?.color ?? DS.text3

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  if (loading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="rounded-xl h-28 skeleton"
              style={{ background: S.surface, border: `1px solid ${S.border}`, opacity: 0.6 }} />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="rounded-xl px-4 py-3 text-[12px]"
            style={{ background: `${DS.crit}12`, border: `1px solid ${DS.crit}44`, color: DS.crit }}>
            Falha ao carregar as sprints: {error}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-4xl mx-auto px-4 py-4 space-y-3">
        {sprints.length === 0 && (
          <div className="rounded-xl px-4 py-8 text-center text-[12px]"
            style={{ background: S.surface, border: `1px solid ${S.border}`, color: S.t3 }}>
            Nenhuma sprint neste projeto
          </div>
        )}
        {sprints.map(sprint => {
          const si      = issues.filter(i => i.sprint === sprint.id)
          const total   = si.reduce((s, i) => s + i.points, 0)
          const done    = si.filter(i => i.status === 'done')
          const donePts = done.reduce((s, i) => s + i.points, 0)
          const blocked = si.filter(i => i.blocked)
          const inProg  = si.filter(i => i.status === 'in-progress' || i.status === 'in-review')
          const pct     = total ? Math.round((donePts / total) * 100) : 0
          const vel     = sprint.velocity ?? 0
          const isOpen  = expanded.has(sprint.id)

          const sc = ({ active: DS.success, planned: DS.accent, completed: DS.text3 } as const)[sprint.state]

          return (
            <div key={sprint.id} className="rounded-xl overflow-hidden"
              style={{ background: S.surface, border: `1px solid ${S.border}` }}>

              {/* ── Summary header ─────────────────────────────────────── */}
              <div className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleExpand(sprint.id)}>
                <div className="flex items-center gap-3 mb-3">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"
                    style={{ color:S.t3, transform:isOpen?'rotate(90deg)':'none', transition:'transform 0.15s', flexShrink:0 }}>
                    <path d="M4.5 3L7.5 6L4.5 9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[14px] font-bold" style={{ color: S.t1 }}>{sprint.name}</p>
                      <span className="text-[9px] font-bold px-1.5 py-px rounded-full" style={{ background:`${sc}22`, color:sc }}>
                        {sprint.state === 'active' ? '▶ Em andamento' : sprint.state === 'planned' ? 'Planejado' : '✓ Concluído'}
                      </span>
                    </div>
                    <p className="text-[11px]" style={{ color: S.t3 }}>{sprint.start} → {sprint.end}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-center">
                      <p className="text-[18px] font-bold tabular" style={{ color: sc }}>{sprint.state === 'completed' ? vel : donePts}</p>
                      <p className="text-[9px]" style={{ color: S.t3 }}>pts concluídos</p>
                    </div>
                    <div className="text-center">
                      <p className="text-[18px] font-bold tabular" style={{ color: S.t2 }}>{si.length}</p>
                      <p className="text-[9px]" style={{ color: S.t3 }}>issues</p>
                    </div>
                    {blocked.length > 0 && (
                      <div className="text-center">
                        <p className="text-[18px] font-bold tabular" style={{ color: DS.crit }}>{blocked.length}</p>
                        <p className="text-[9px]" style={{ color: S.t3 }}>bloqueados</p>
                      </div>
                    )}
                    {sprint.state !== 'completed' && (
                      <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        {sprint.state === 'planned' ? (
                          <button
                            onClick={canManageSprint ? () => onStartSprint(sprint) : undefined}
                            disabled={!canManageSprint}
                            title={!canManageSprint ? 'Requer permissão: Gerenciar Sprint (sprint:manage)' : `Iniciar ${sprint.name}`}
                            className="h-7 px-3 text-[11px] font-semibold rounded-lg transition-all"
                            style={{
                              background: canManageSprint ? DS.accent : S.surface2,
                              color: canManageSprint ? '#fff' : S.t3,
                              border: canManageSprint ? 'none' : `1px solid ${S.border}`,
                              cursor: canManageSprint ? 'pointer' : 'not-allowed',
                              opacity: canManageSprint ? 1 : 0.6,
                            }}
                          >
                            Iniciar Sprint
                          </button>
                        ) : (
                          <button
                            onClick={canManageSprint ? () => onCompleteSprint(sprint) : undefined}
                            disabled={!canManageSprint}
                            title={!canManageSprint ? 'Requer permissão: Gerenciar Sprint (sprint:manage)' : `Encerrar ${sprint.name}`}
                            className="h-7 px-3 text-[11px] font-medium rounded-lg transition-colors"
                            style={{
                              border: `1px solid ${S.border}`,
                              color: canManageSprint ? S.t2 : S.t3,
                              cursor: canManageSprint ? 'pointer' : 'not-allowed',
                              opacity: canManageSprint ? 1 : 0.5,
                            }}
                          >
                            Encerrar
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                </div>

                {sprint.state !== 'planned' && (
                  <div className="mb-3">
                    <div className="flex justify-between text-[10px] mb-1" style={{ color: S.t3 }}>
                      <span>{pct}% concluído</span>
                      <span>{donePts}/{total}pts</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background:`${sc}20` }}>
                      <div className="h-full rounded-full transition-all" style={{ width:`${pct}%`, background:sc }} />
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  {[
                    { label:'Concluído',    count:done.length,   color:DS.success },
                    { label:'Em andamento', count:inProg.length, color:DS.accent  },
                    { label:'A fazer', count:si.filter(i=>i.status==='todo'||i.status==='backlog').length, color:S.t3 },
                    { label:'Bloqueado',    count:blocked.length,color:DS.crit    },
                  ].filter(s=>s.count>0).map(s=>(
                    <div key={s.label} className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background:s.color }}/>
                      <span className="text-[11px]" style={{ color:S.t2 }}>
                        <span className="font-semibold">{s.count}</span> {s.label}
                      </span>
                    </div>
                  ))}
                  {sprint.goal && (
                    <div className="ml-auto flex items-center gap-1.5">
                      <span className="text-[9px] font-bold" style={{ color:DS.accent }}>META</span>
                      <span className="text-[11px] italic max-w-xs truncate" style={{ color:S.t2 }}>{sprint.goal}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* ── Issue list ─────────────────────────────────────────── */}
              {isOpen && (
                <div style={{ borderTop:`1px solid ${S.border}` }}>
                  {/* Column header */}
                  <div className="flex items-center gap-2 px-4 py-1.5 text-[9px] font-semibold uppercase tracking-widest"
                    style={{ color:S.t3, borderBottom:`1px solid ${S.border}`, background:`${S.surface2}80` }}>
                    <span className="w-4" /><span className="w-4" /><span className="w-14">Chave</span>
                    <span className="w-1.5" /><span className="flex-1">Título</span>
                    <span className="w-16 text-right">Status</span>
                    <span className="w-10 text-right">Prior.</span>
                    <span className="w-[18px]" />
                    <span className="w-7 text-right">Pts</span>
                  </div>
                  {si.length === 0 ? (
                    <div className="px-4 py-5 text-center text-[12px]" style={{ color:S.t3 }}>Nenhuma issue neste sprint</div>
                  ) : (
                    <div className="divide-y" style={{ borderColor:S.border }}>
                      {si.map(issue => (
                        <div key={issue.key} className="flex items-center gap-2 px-4 py-2 transition-colors group cursor-pointer"
                          style={{ background:'transparent' }}
                          onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background=S.surface2}}
                          onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='transparent'}}
                          onClick={()=>setOpenIssue(issue)}>
                          <span className="text-[10px] cursor-grab" style={{ color:S.t3, opacity:0.3 }} onClick={e=>e.stopPropagation()}>⠿</span>
                          <TypeIcon t={issue.type} />
                          <span className="text-[10px] font-mono w-14 flex-shrink-0" style={{ color:S.t3 }}>{issue.key}</span>
                          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background:getEpicColor(issue.epic) }}/>
                          <span className="flex-1 text-[12px] truncate" style={{ color:S.t1 }}>{issue.title}</span>
                          {/* Status badge */}
                          <span className="w-16 text-right flex-shrink-0">
                            <span className="text-[9px] font-semibold px-1.5 py-px rounded-full"
                              style={{ background:`${STATUS_COLOR[issue.status]}18`, color:STATUS_COLOR[issue.status] }}>
                              {STATUS_LABEL[issue.status]}
                            </span>
                          </span>
                          <span className="flex-shrink-0 w-10 text-right"><PriorityDot p={issue.priority} /></span>
                          {issue.assignee
                            ? <span onClick={e=>e.stopPropagation()}><Av i={issue.assignee} size={18} /></span>
                            : <span className="w-[18px]"/>}
                          <span className="text-[10px] font-bold px-1.5 py-px rounded w-7 text-center flex-shrink-0"
                            style={{ background:S.surface2, color:S.t3 }}>{issue.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Drawer — consistência cross-tela (P4) */}
      {openIssue && (
        <WorkItemDetailDrawer
          issue={openIssue}
          onClose={() => setOpenIssue(null)}
          onUpdate={updated => {
            onUpdateIssue(updated)
            setOpenIssue(updated)
          }}
        />
      )}
    </div>
  )
}

// ─── Page shell ───────────────────────────────────────────────────────────────
type Tab = 'Board' | 'Backlog' | 'Sprints'

interface ProjectPageProps {
  boardId?: string
  onBackToBoards?: () => void
}

export default function ProjectPage({ boardId, onBackToBoards }: ProjectPageProps = {}) {
  const [tab, setTab]     = useState<Tab>('Board')
  const [issues, setIssues]   = useState<Issue[]>(INIT_ISSUES)
  const [sprints, setSprints] = useState<SprintDef[]>(SPRINTS)
  const [quickCreate, setQuickCreate] = useState<{colStatus?:string; sprintId?:string}|null>(null)
  const [completingSprint, setCompletingSprint] = useState<SprintDef|null>(null)
  const [startingSprint, setStartingSprint] = useState<SprintDef|null>(null)
  const [toast, setToast] = useState<string|null>(null)

  // ── Board (Kanban) — real data from Supabase ────────────────────────────
  const [boardData, setBoardData]   = useState<BoardData | null>(null)
  const [boardLoading, setBoardLoading] = useState(true)
  const [boardError, setBoardError] = useState<string|null>(null)
  const [dbIssues, setDbIssues]     = useState<Issue[]>([])

  const applyBoardData = useCallback((data: BoardData) => {
    const profileById = new Map(data.profiles.map(p => [p.id, p]))
    const epicById    = new Map(data.epics.map(e => [e.id, e]))
    setDbIssues(data.items.map<Issue>(it => mapDbItem(it, profileById, epicById)))
  }, [])

  const loadBoard = useCallback(async () => {
    setBoardLoading(true); setBoardError(null)
    try {
      const data = await fetchBoardData(undefined, undefined, boardDef?.name)
      setBoardData(data)
      applyBoardData(data)
    } catch (err) {
      setBoardError(err instanceof Error ? err.message : 'Falha ao carregar o board')
    } finally {
      setBoardLoading(false)
    }
  }, [applyBoardData])

  useEffect(() => { void loadBoard() }, [loadBoard])


  const dbCols = useMemo<ColState[]>(() => (boardData?.columns ?? []).map(c => ({
    id: c.id,
    label: c.name,
    statuses: c.statuses.length ? c.statuses : [c.category],
    wip: c.wip_limit ?? undefined,
    dot: columnColor(c),
  })), [boardData])

  const dbSprints = useMemo<SprintDef[]>(() => (boardData?.sprints ?? []).map(s => ({
    id: s.id,
    name: s.name,
    goal: s.goal ?? undefined,
    start: fmtDay(s.start_date),
    end: fmtDay(s.end_date),
    state: (s.state === 'active' || s.state === 'completed' ? s.state : 'planned') as SprintDef['state'],
    velocity: s.velocity != null ? Number(s.velocity) : undefined,
  })), [boardData])

  function patchDbIssue(key: string, patch: Partial<Issue>) {
    setDbIssues(prev => prev.map(i => i.key === key ? { ...i, ...patch } : i))
  }

  async function moveCard(issue: Issue, colId: string) {
    const column = boardData?.columns.find(c => c.id === colId)
    if (!column || !issue.id) throw new Error('Coluna inválida')
    await moveWorkItemToColumn(
      { id: issue.id, status: issue.dbStatus ?? 'todo', board_column_id: issue.colId ?? null },
      column,
      activeUser.name,
    )
  }

  async function quickCreateCard(title: string, colId: string, sprintId: string) {
    const column = boardData?.columns.find(c => c.id === colId)
    if (!boardData?.board || !column) throw new Error('Board indisponível')
    const created = await createWorkItem({
      projectId: boardData.board.project_id,
      boardId: boardData.board.id,
      column,
      sprintId: sprintId || null,
      title,
    }, activeUser.name)
    const profileById = new Map(boardData.profiles.map(p => [p.id, p]))
    const epicById    = new Map(boardData.epics.map(e => [e.id, e]))
    setDbIssues(prev => [mapDbItem(created, profileById, epicById), ...prev])
    setBoardData(prev => prev ? { ...prev, items: [created, ...prev.items] } : prev)
  }


  const { activeUser }    = useSession()
  const canManageSprint   = can(activeUser.permissions, 'sprint:manage')

  const boardDef          = boardId ? getBoardById(boardId) : undefined
  const isArchivedBoard   = boardDef?.status === 'archived'

  const activeSprint      = sprints.find(s => s.state === 'active')
  const activeSid         = activeSprint?.id ?? 's14'

  // ── Sprint lifecycle — persisted in Supabase (sprints/sprint_items/
  //    sprint_scope_events/audit_logs) and re-read so Board and Timeline follow.
  async function handleCompleteSprint(moveRemaining: 'next-sprint' | 'backlog') {
    if (!completingSprint) return
    const sprint = completingSprint
    setCompletingSprint(null)
    try {
      const result = await dbCompleteSprint(sprint.id, moveRemaining, activeUser.name)
      await loadBoard()
      const destLabel = result.destinationSprint ? result.destinationSprint.name : 'backlog'
      const fallbackNote = moveRemaining === 'next-sprint' && !result.destinationSprint
        ? ' (sem próxima sprint planejada, movido para backlog)'
        : ''
      const n = result.movedCount
      setToast(`${sprint.name} encerrada — velocity ${result.velocity}pts · ${n} ${n === 1 ? 'item movido' : 'itens movidos'} para ${destLabel}${fallbackNote}`)
    } catch (err) {
      setToast(`Falha ao encerrar a sprint: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
    setTimeout(() => setToast(null), 4500)
  }

  async function handleStartSprintDb(sprintId: string, goal: string, name: string) {
    setStartingSprint(null)
    try {
      await dbStartSprint(sprintId, { goal, name }, activeUser.name)
      await loadBoard()
      setToast(`${name} iniciada`)
    } catch (err) {
      setToast(`Falha ao iniciar a sprint: ${err instanceof Error ? err.message : 'erro desconhecido'}`)
    }
    setTimeout(() => setToast(null), 4000)
  }


  const tabBadges: Partial<Record<Tab, number>> = {
    Board:   dbIssues.filter(i => i.sprint === (dbSprints.find(s => s.state === 'active')?.id ?? '')).length,
    Backlog: issues.filter(i => !i.sprint || i.sprint === sprints.find(s => s.state === 'planned')?.id).length,
    Sprints: sprints.length,
  }

  return (
    <>
    {/* Board context bar — shown when opened from boards list */}
    {boardDef && (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 20px', background: isArchivedBoard ? `${DS.warn}15` : `${DS.accent}12`, borderBottom: `1px solid ${isArchivedBoard ? DS.warn + '44' : DS.accent + '33'}`, flexShrink: 0 }}>
        {onBackToBoards && (
          <button onClick={onBackToBoards} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', color: DS.accent, fontSize: 12, padding: 0 }}>
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8 2.5L4 6.5l4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Boards
          </button>
        )}
        {onBackToBoards && <span style={{ fontSize: 12, color: DS.accent + '66' }}>›</span>}
        <svg width="13" height="13" viewBox="0 0 18 18" fill="none"><rect x="1" y="1" width="4" height="16" rx="1.5" fill={isArchivedBoard ? DS.warn : DS.accent} opacity="0.8"/><rect x="7" y="1" width="4" height="11" rx="1.5" fill={isArchivedBoard ? DS.warn : DS.accent} opacity="0.6"/><rect x="13" y="1" width="4" height="14" rx="1.5" fill={isArchivedBoard ? DS.warn : DS.accent} opacity="0.4"/></svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: isArchivedBoard ? DS.warn : DS.accent }}>{boardDef.name}</span>
        <span style={{ fontSize: 11, color: DS.text3 }}>· {boardDef.project_name}</span>
        {isArchivedBoard && (
          <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: DS.warn, background: `${DS.warn}20`, border: `1px solid ${DS.warn}44`, borderRadius: 4, padding: '1px 7px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Arquivado — modo leitura
          </span>
        )}
      </div>
    )}
    <div className="flex flex-col h-full" style={{ background: S.bg }}>
      {/* Toolbar */}
      <div
        className="flex items-center justify-between px-5 py-2 flex-shrink-0"
        style={{ background: S.surface, borderBottom: `1px solid ${S.border}` }}
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[13px]">
          <span style={{ color: S.t2 }}>Harbor Labs</span>
          <svg width="9" height="9" viewBox="0 0 9 9" fill="none" style={{ color: S.t3 }}>
            <path d="M3 2.5L5.5 4.5L3 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span className="font-semibold" style={{ color: S.t1 }}>Website Relaunch</span>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-0.5 p-0.5 rounded-lg" style={{ background: S.bg, border: `1px solid ${S.border}` }}>
          {(['Board', 'Backlog', 'Sprints'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium rounded-md transition-all"
              style={{
                background: tab === t ? S.surface2 : 'transparent',
                color: tab === t ? S.t1 : S.t3,
                boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.2)' : 'none',
              }}
            >
              {t}
              {tabBadges[t] != null && (
                <span className="text-[9px] font-bold px-1.5 py-px rounded-full" style={{ background: DS.accentDim, color: DS.accent }}>
                  {tabBadges[t]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Team avatars */}
          <div className="flex items-center">
            {['AL','NM','JN','CS'].map((a, i) => (
              <span key={a} style={{ marginLeft: i > 0 ? -7 : 0, zIndex: 4-i, position:'relative' }}>
                <Av i={a} size={26} />
              </span>
            ))}
          </div>
          <button
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-[12px] font-semibold text-white transition-all"
            style={{ background: DS.accent }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.15)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
          >
            <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
              <path d="M4.5 1.5v6M1.5 4.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            Issue
          </button>
        </div>
      </div>

      {/* Tab content */}
      {tab === 'Board' && (
        <BoardTab
          issues={dbIssues}
          onCreateIssue={()=>setQuickCreate({})}
          onCompleteSprint={s=>setCompletingSprint(s)}
          canManageSprint={canManageSprint}
          activeSprints={dbSprints}
          dbCols={dbCols}
          loading={boardLoading}
          error={boardError}
          onMoveCard={moveCard}
          onQuickCreate={quickCreateCard}
          onLocalPatch={patchDbIssue}
        />
      )}
      {tab === 'Backlog' && (
        <BacklogTab issues={issues} sprints={sprints} canManageSprint={canManageSprint} onCreateIssue={()=>setQuickCreate({})} onCompleteSprint={s=>setCompletingSprint(s)} onUpdateIssue={updated=>setIssues(prev=>prev.map(i=>i.key===updated.key?updated:i))} />
      )}
      {tab === 'Sprints' && (
        <SprintsTab
          issues={dbIssues}
          sprints={dbSprints}
          canManageSprint={canManageSprint}
          loading={boardLoading}
          error={boardError}
          onStartSprint={s=>setStartingSprint(s)}
          onCompleteSprint={s=>setCompletingSprint(s)}
          onUpdateIssue={updated=>patchDbIssue(updated.key, updated)}
        />
      )}

    </div>
    {quickCreate !== null && (
      <CreateIssueModal
        onClose={()=>setQuickCreate(null)}
        defaultStatus={quickCreate.colStatus}
        defaultSprintId={quickCreate.sprintId}
        onCreate={data => {
          // Map modal output → Issue and persist
          const sprintMatch = sprints.find(s =>
            quickCreate.sprintId ? s.id === quickCreate.sprintId : s.state === 'active'
          )
          const labelArr = data.labels ? String(data.labels).split(',').map((l:string)=>l.trim()).filter(Boolean) : []
          const newIssue: Issue = {
            key:      `PM-${++_issueSeq}`,
            type:     (data.type as IssueType) ?? 'story',
            title:    String(data.summary ?? ''),
            status:   (quickCreate.colStatus as IssueStatus) ?? 'todo',
            priority: (data.priority as Priority) ?? 'medium',
            labels:   labelArr,
            assignee: String(data.assignee ?? 'AL'),
            dueDate:  '',
            points:   parseInt(String(data.points ?? '0')) || 0,
            sprint:   sprintMatch?.id ?? quickCreate.sprintId,
            epic:     data.epic ? String(data.epic).split(' ')[0] : undefined,
            description: String(data.description ?? ''),
          }
          setIssues(prev => [newIssue, ...prev])
          setToast(`Issue ${newIssue.key} criada na coluna`)
          setTimeout(() => setToast(null), 3500)
          setQuickCreate(null)
        }}
      />
    )}
    {startingSprint && (
      <StartSprintModal
        sprint={startingSprint}
        onConfirm={(id, goal, name) => { void handleStartSprintDb(id, goal, name) }}
        onClose={() => setStartingSprint(null)}
      />
    )}
    {completingSprint && (() => {
      const sprintIssues  = dbIssues.filter(i => i.sprint === completingSprint.id)
      const doneCount     = sprintIssues.filter(i => i.status === 'done').length
      const totalCount    = sprintIssues.length
      const remainCount   = sprintIssues.filter(i => i.status !== 'done').length
      return (
        <CompleteSprintModal
          sprint={completingSprint}
          stats={{ done: doneCount, total: totalCount, remaining: remainCount }}
          nextSprintName={dbSprints.find(s => s.state === 'planned')?.name}
          onClose={() => setCompletingSprint(null)}
          onConfirm={m => { void handleCompleteSprint(m) }}
        />
      )
    })()}
    {/* Toast */}
    {toast && (
      <div style={{
        position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
        background: '#1a2540', border: `1px solid ${DS.accent}40`,
        borderRadius: 10, padding: '12px 20px', zIndex: 9999,
        boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
        display: 'flex', alignItems: 'center', gap: 10, maxWidth: 480,
      }}>
        <span style={{ fontSize: 16 }}>✓</span>
        <span style={{ fontSize: 13, color: '#e8ecf4', fontWeight: 500 }}>{toast}</span>
      </div>
    )}
    </>
  )
}
