// RULE: All views reflect the SAME issues coherently — single source of truth
import { T } from '../components/ds/tokens'

export type IssueType   = 'story' | 'bug' | 'task' | 'subtask' | 'epic' | 'feature'
export type IssueStatus = 'backlog' | 'todo' | 'in-progress' | 'in-review' | 'done'
export type Priority    = 'critical' | 'high' | 'medium' | 'low'

export interface Issue {
  key:string; type:IssueType; title:string; status:IssueStatus; priority:Priority
  labels:string[]; assignee:string; dueDate:string; dueDateDay:number
  /** ISO date relative to real today (for calendar view) */
  dueDateIso: string
  points:number; epic?:string; sprint?:string; blocked?:boolean; delayed?:boolean; releaseId?:string
}

/** Returns an ISO date string offset by `days` from today (midnight local) */
function rel(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}
export interface Epic    { id:string; key:string; label:string; color:string; desc:string; quarter:string; owner:string }
export interface Sprint  { id:string; name:string; goal?:string; start:string; end:string; state:'active'|'planned'|'completed'; velocity?:number }
export interface Release { id:string; version:string; name:string; date:string; state:'released'|'in-progress'|'planned'; notes?:string }

export const EPICS: Epic[] = [
  { id:'EP-01', key:'EP-01', label:'Website Relaunch',    color:T.accent, desc:'Relançamento completo do site marketing',    quarter:'Q2 2025', owner:'AL' },
  { id:'EP-02', key:'EP-02', label:'Infra & Eng',         color:T.warn,   desc:'Infraestrutura, CI/CD e débito técnico',     quarter:'Q2 2025', owner:'LF' },
  { id:'EP-03', key:'EP-03', label:'Pesquisa & Conteúdo', color:T.purple, desc:'UX research, copywriting e SEO',             quarter:'Q3 2025', owner:'JN' },
]
export const SPRINTS: Sprint[] = [
  { id:'s13', name:'Sprint 13', goal:'Tokens, CI e teardown',           start:'01/04', end:'14/04', state:'completed', velocity:22 },
  { id:'s14', name:'Sprint 14', goal:'Homepage responsiva + bug fixes', start:'15/04', end:'28/04', state:'active' },
  { id:'s15', name:'Sprint 15', goal:'',                                start:'29/04', end:'12/05', state:'planned' },
]
export const RELEASES: Release[] = [
  { id:'r1', version:'v1.0.0', name:'Lançamento Inicial',  date:'28 mar 2025', state:'released',    notes:'Deploy inicial e infraestrutura base.' },
  { id:'r2', version:'v1.1.0', name:'Homepage Responsiva', date:'28 abr 2025', state:'in-progress', notes:'Homepage com design system e responsividade.' },
  { id:'r3', version:'v1.2.0', name:'Pesquisa & SEO',      date:'15 mai 2025', state:'planned' },
  { id:'r4', version:'v2.0.0', name:'Plataforma v2',       date:'01 set 2025', state:'planned' },
]
export const ISSUES: Issue[] = [
  { key:'PM-101', type:'story',   title:'Homepage hero — layout explorations',        status:'in-progress', priority:'high',     labels:['Design','Hero'],   assignee:'AL', dueDate:'Abr 4',  dueDateDay:4,  dueDateIso:rel(-1), points:5, epic:'EP-01', sprint:'s14', releaseId:'r2' },
  { key:'PM-102', type:'bug',     title:'Login form validation falha no mobile',      status:'in-progress', priority:'critical', labels:['Eng'],             assignee:'JN', dueDate:'Abr 3',  dueDateDay:3,  dueDateIso:rel(0),  points:3, epic:'EP-02', sprint:'s14', blocked:true },
  { key:'PM-103', type:'task',    title:'Configurar Storybook para componentes',      status:'in-progress', priority:'medium',   labels:['Eng'],             assignee:'LF', dueDate:'Abr 6',  dueDateDay:6,  dueDateIso:rel(2),  points:2, epic:'EP-02', sprint:'s14', releaseId:'r2' },
  { key:'PM-104', type:'story',   title:'Breakpoints responsivos — hero + grid',      status:'in-progress', priority:'high',     labels:['Design','Mobile'], assignee:'CS', dueDate:'Abr 9',  dueDateDay:9,  dueDateIso:rel(3),  points:8, epic:'EP-01', sprint:'s14', delayed:true, releaseId:'r2' },
  { key:'PM-105', type:'bug',     title:'Footer sobrepõe conteúdo no Safari',        status:'todo',        priority:'medium',   labels:['Eng','Web'],       assignee:'NM', dueDate:'Abr 10', dueDateDay:10, dueDateIso:rel(4),  points:2, epic:'EP-02', sprint:'s14' },
  { key:'PM-107', type:'task',    title:'Spec de nav + componente footer',           status:'in-review',   priority:'low',      labels:['Design'],          assignee:'AL', dueDate:'Abr 3',  dueDateDay:3,  dueDateIso:rel(0),  points:3, epic:'EP-01', sprint:'s14', releaseId:'r2' },
  { key:'PM-108', type:'story',   title:'UX study: design Northwind',               status:'in-review',   priority:'medium',   labels:['UX','SEO'],        assignee:'JN', dueDate:'Abr 5',  dueDateDay:5,  dueDateIso:rel(1),  points:5, epic:'EP-03', sprint:'s14' },
  { key:'PM-106', type:'story',   title:'Copywriting da página de preços v2',        status:'backlog',     priority:'high',     labels:['Content'],         assignee:'NM', dueDate:'Abr 22', dueDateDay:22, dueDateIso:rel(14), points:5, epic:'EP-03', sprint:'s15', releaseId:'r3' },
  { key:'PM-109', type:'story',   title:'Entrevistas com 5 clientes trial',         status:'backlog',     priority:'medium',   labels:['Research'],        assignee:'JN', dueDate:'Abr 16', dueDateDay:16, dueDateIso:rel(8),  points:5, epic:'EP-03', sprint:'s15' },
  { key:'PM-110', type:'task',    title:'Auditoria de a11y nas páginas',            status:'backlog',     priority:'medium',   labels:['Design','Web'],    assignee:'AL', dueDate:'Abr 12', dueDateDay:12, dueDateIso:rel(6),  points:3, epic:'EP-01', sprint:'s15', releaseId:'r2' },
  { key:'PM-111', type:'story',   title:'Teardown competitivo — 8 sites',           status:'done',        priority:'low',      labels:['Research'],        assignee:'RM', dueDate:'Mar 28', dueDateDay:1,  dueDateIso:rel(-7), points:3, epic:'EP-03', sprint:'s13', releaseId:'r1' },
  { key:'PM-112', type:'task',    title:'Finalizar tokens de cor + tipografia',     status:'done',        priority:'medium',   labels:['Brand'],           assignee:'NM', dueDate:'Mar 28', dueDateDay:1,  dueDateIso:rel(-5), points:2, epic:'EP-01', sprint:'s13', releaseId:'r1' },
  { key:'PM-113', type:'task',    title:'Scaffolding do repositório + CI pipeline', status:'done',        priority:'high',     labels:['Eng'],             assignee:'LF', dueDate:'Mar 22', dueDateDay:1,  dueDateIso:rel(-3), points:2, epic:'EP-02', sprint:'s13', releaseId:'r1' },
  { key:'PM-114', type:'story',   title:'Auditoria de metadata SEO',               status:'backlog',     priority:'low',      labels:['SEO'],             assignee:'RM', dueDate:'Mai 5',  dueDateDay:28, dueDateIso:rel(21), points:3, epic:'EP-03', releaseId:'r3' },
  { key:'PM-115', type:'subtask', title:'Escrever copy do hero principal',          status:'backlog',     priority:'low',      labels:['Content'],         assignee:'NM', dueDate:'Abr 8',  dueDateDay:8,  dueDateIso:rel(5),  points:1, epic:'EP-01' },
  { key:'PM-116', type:'feature', title:'Sistema de busca do portal',              status:'backlog',     priority:'medium',   labels:['Eng'],             assignee:'LF', dueDate:'Mai 20', dueDateDay:30, dueDateIso:rel(28), points:8, epic:'EP-02', releaseId:'r4' },
]
export const DEPENDENCIES: { from:string; to:string }[] = [
  { from:'PM-102', to:'PM-107' },
  { from:'PM-101', to:'PM-104' },
  { from:'PM-103', to:'PM-105' },
]
export const STATUS_CFG: Record<IssueStatus,{label:string;color:string;bg:string}> = {
  backlog:      { label:'Backlog',      color:T.text3,  bg:T.neutralDim  },
  todo:         { label:'A Fazer',      color:T.text2,  bg:`${T.text3}18`},
  'in-progress':{ label:'Em andamento', color:T.accent, bg:T.accentDim   },
  'in-review':  { label:'Em revisão',   color:T.warn,   bg:T.warnDim     },
  done:         { label:'Concluído',    color:T.success,bg:T.successDim  },
}
export const PRIORITY_CFG: Record<Priority,{label:string;color:string;icon:string}> = {
  critical:{ label:'Crítica', color:T.crit,   icon:'↑↑' },
  high:    { label:'Alta',    color:T.warn,   icon:'↑'  },
  medium:  { label:'Média',   color:T.accent, icon:'→'  },
  low:     { label:'Baixa',   color:T.text3,  icon:'↓'  },
}
export const TYPE_ICON: Record<IssueType,{icon:string;color:string}> = {
  story:{icon:'◇',color:T.accent}, bug:{icon:'⬟',color:T.crit}, task:{icon:'☑',color:T.text2},
  subtask:{icon:'◻',color:T.text3}, epic:{icon:'⚡',color:T.warn}, feature:{icon:'▣',color:T.purple},
}
export const AV_COLOR: Record<string,string> = {
  AL:T.accent, NM:T.purple, JN:T.warn, CS:T.success, RM:T.crit, LF:'#f97316',
}
