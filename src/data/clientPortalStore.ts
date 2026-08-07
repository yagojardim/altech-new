// Client Portal store — hydrates the real Supabase portal tables into a small
// in-memory cache so the existing portal/management screens (which read
// synchronously) always render live tenant data. Every write goes to Supabase.
import { useEffect, useSyncExternalStore } from 'react'
import { MOCK_TENANT } from './session'
import { logger } from '../utils/logger'
import * as api from './db/clientPortal'
import type { ClientSignalRow, PortalProject } from './db/clientPortal'
import type { ClientSignal } from './clientSignals'
import type { ClientAccessRecord } from './clientAccess'

/** Client-safe, denormalised view of everything the portal is allowed to show. */
export interface ScopeProject {
  id: string; name: string; progress: number
  sprint: string; sprintPct: number; status: 'on-track' | 'at-risk'
}
export interface ScopeSprint { name: string; pct: number; status: string; ends: string }
export interface ScopeDelivery {
  id: string; title: string; status: 'done' | 'review' | 'progress'
  project: string; date: string; due: string; overdueDays: number
}
export interface ScopeMilestone {
  id: string; date: string; title: string; desc: string; status: 'upcoming' | 'done'
}
export interface PortalScope {
  projects: ScopeProject[]
  sprints: ScopeSprint[]
  deliveries: ScopeDelivery[]
  roadmap: ScopeMilestone[]
}

interface PortalState {
  signals: ClientSignal[]
  users: ClientAccessRecord[]
  projects: PortalProject[]
  scope: PortalScope
  loading: boolean
  error: string | null
}

const EMPTY_SCOPE: PortalScope = { projects: [], sprints: [], deliveries: [], roadmap: [] }

let state: PortalState = {
  signals: [], users: [], projects: [], scope: EMPTY_SCOPE, loading: false, error: null,
}

let version = 0
const listeners = new Set<() => void>()

function emit() {
  version++
  listeners.forEach(l => l())
}
function subscribe(l: () => void) {
  listeners.add(l)
  return () => { listeners.delete(l) }
}

export function getPortalState(): PortalState {
  return state
}

// ─── Mapping helpers ──────────────────────────────────────────────────────────
function initialsOf(name: string): string {
  return name.trim().split(/\s+/).map(w => w[0] ?? '').join('').toUpperCase().slice(0, 2)
}

function projectName(projectId: string): string {
  return state.projects.find(p => p.id === projectId)?.name ?? projectId
}

export function projectIdByName(name: string): string | null {
  return state.projects.find(p => p.name === name)?.id ?? null
}

function toSignal(row: ClientSignalRow): ClientSignal {
  const meta = (row.metadata ?? {}) as Record<string, unknown>
  const author = row.author ?? 'Cliente'
  return {
    id: row.id,
    type: row.type,
    item_id: row.item_id ?? '',
    item_title: row.item_title ?? '',
    project: projectName(row.project_id),
    tenant_id: MOCK_TENANT.tenant_id,
    responsible_po: 'u_po',
    body: row.body ?? undefined,
    author,
    author_initials: initialsOf(author),
    created_at: row.created_at,
    read_by_po: row.read_by_po,
    po_reply: row.po_reply ?? undefined,
    po_reply_by: typeof meta.po_reply_by === 'string' ? meta.po_reply_by : undefined,
    reply_read_by_client: row.po_reply ? row.reply_read_by_client : undefined,
    source: meta.source === 'management' ? 'management' : 'client',
  }
}

function toAccess(row: api.ClientPortalUserRow): ClientAccessRecord {
  return {
    id: row.id,
    tenant_id: MOCK_TENANT.tenant_id,
    client_name: row.name,
    client_email: row.email,
    permission: row.portal_role === 'portal-admin' ? 'admin' : 'viewer',
    client_can_approve: row.can_approve,
    client_can_preview: row.can_preview,
    client_can_comment: row.can_comment,
    password_must_change: row.password_must_change,
    project_id: row.project_id,
    created_at: row.created_at,
  }
}

// ─── Hydration ────────────────────────────────────────────────────────────────
let hydrated = false
let inflight: Promise<void> | null = null

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
function fmtShort(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}
function fmtMonth(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

/** Turns per-project client-safe scopes into the flat shape the portal renders. */
function buildScope(scopes: api.ClientPortalScope[]): PortalScope {
  const projects: ScopeProject[] = []
  const sprints: ScopeSprint[] = []
  const deliveries: ScopeDelivery[] = []
  const roadmap: ScopeMilestone[] = []

  for (const sc of scopes) {
    if (!sc.project) continue
    const name = sc.project.name
    const done = sc.deliveries.filter(d => d.status === 'done').length
    const progress = sc.deliveries.length ? Math.round((done / sc.deliveries.length) * 100) : 0
    const active = sc.sprints.find(s => s.state === 'active') ?? sc.sprints[sc.sprints.length - 1]
    const late = sc.deliveries.some(
      d => d.status !== 'done' && d.due_date !== null && new Date(d.due_date) < new Date(),
    )
    projects.push({
      id: sc.project.id,
      name,
      progress,
      sprint: active?.name ?? 'Sem sprint ativa',
      sprintPct: progress,
      status: late ? 'at-risk' : 'on-track',
    })
    if (active) {
      sprints.push({
        name: `${active.name} — ${name}`,
        pct: progress,
        status: late ? 'at-risk' : 'on-track',
        ends: fmtShort(active.end_date),
      })
    }
    for (const d of sc.deliveries) {
      const overdueDays = d.status !== 'done' && d.due_date
        ? Math.max(0, Math.floor((Date.now() - new Date(d.due_date).getTime()) / 86400000))
        : 0
      deliveries.push({
        id: d.id, title: d.title, status: d.status, project: name,
        date: fmtShort(d.completed_at ?? d.due_date),
        due: fmtShort(d.due_date), overdueDays,
      })
    }
    for (const r of sc.roadmap) {
      roadmap.push({
        id: r.id,
        date: r.quarter ?? fmtMonth(sc.project.period_end),
        title: r.name,
        desc: `${name} · ${r.done}/${r.total} entregas concluídas`,
        status: r.total > 0 && r.done === r.total ? 'done' : 'upcoming',
      })
    }
  }
  return { projects, sprints, deliveries, roadmap }
}


export async function refreshPortal(): Promise<void> {
  if (inflight) return inflight
  state = { ...state, loading: true }
  emit()
  inflight = (async () => {
    try {
      const projects = await api.listPortalProjects()
      state = { ...state, projects }
      const [signals, users, scopes] = await Promise.all([
        api.listClientSignals(),
        api.listClientPortalUsers(),
        Promise.all(projects.map(p => api.getClientPortal(p.id))),
      ])
      state = {
        projects,
        signals: signals.map(toSignal),
        users: users.map(toAccess),
        scope: buildScope(scopes),
        loading: false,
        error: null,
      }
      hydrated = true
    } catch (e) {
      // Never let a portal failure bubble into render — degrade to empty state.
      logger.error('clientPortalStore.refreshPortal', e)
      state = {
        ...state,
        signals: state.signals ?? [],
        users: state.users ?? [],
        scope: state.scope ?? EMPTY_SCOPE,
        loading: false,
        error: e instanceof Error ? e.message : String(e),
      }
      hydrated = true
    } finally {
      inflight = null
      emit()
    }
  })()
  return inflight
}

/** Subscribes a component to the portal cache and hydrates it on first mount. */
export function useClientPortal(): PortalState {
  useSyncExternalStore(subscribe, () => version, () => version)
  useEffect(() => { if (!hydrated && !inflight) void refreshPortal() }, [])
  return state
}

// ─── Sync selectors (used by the facade modules) ──────────────────────────────
export function allSignals(): ClientSignal[] {
  return state.signals
}
export function allUsers(): ClientAccessRecord[] {
  return state.users
}

// ─── Writes (optimistic + persisted) ─────────────────────────────────────────
function patchSignal(id: string, patch: Partial<ClientSignal>) {
  state = { ...state, signals: state.signals.map(s => (s.id === id ? { ...s, ...patch } : s)) }
  emit()
}

export function writeClientComment(input: {
  project: string; body: string; author: string
  itemId?: string; itemTitle?: string; source?: 'client' | 'management'
}): void {
  const pid = projectIdByName(input.project)
  if (!pid) return
  const optimistic: ClientSignal = {
    id: `tmp_${Date.now()}`,
    type: 'comment',
    item_id: input.itemId ?? '',
    item_title: input.itemTitle ?? '',
    project: input.project,
    tenant_id: MOCK_TENANT.tenant_id,
    responsible_po: 'u_po',
    body: input.body,
    author: input.author,
    author_initials: initialsOf(input.author),
    created_at: new Date().toISOString(),
    read_by_po: input.source === 'management',
    source: input.source ?? 'client',
  }
  state = { ...state, signals: [...state.signals, optimistic] }
  emit()
  void api.addClientComment({
    projectId: pid,
    body: input.body,
    author: input.author,
    itemId: isUuid(input.itemId) ? input.itemId : null,
    itemTitle: input.itemTitle ?? null,
    source: input.source ?? 'client',
  }).then(() => refreshPortal()).catch(() => refreshPortal())
}

export function writeClientApproval(input: {
  project: string; itemTitle: string; author: string; itemId?: string
}): void {
  const pid = projectIdByName(input.project)
  if (!pid) return
  const optimistic: ClientSignal = {
    id: `tmp_${Date.now()}`,
    type: 'approval',
    item_id: input.itemId ?? '',
    item_title: input.itemTitle,
    project: input.project,
    tenant_id: MOCK_TENANT.tenant_id,
    responsible_po: 'u_po',
    author: input.author,
    author_initials: initialsOf(input.author),
    created_at: new Date().toISOString(),
    read_by_po: false,
    source: 'client',
  }
  state = { ...state, signals: [...state.signals, optimistic] }
  emit()
  void api.addClientApproval({
    projectId: pid,
    workItemId: isUuid(input.itemId) ? (input.itemId as string) : null,
    itemTitle: input.itemTitle,
    author: input.author,
  }).then(() => refreshPortal()).catch(() => refreshPortal())
}

export function writePoReply(signalId: string, reply: string, poName: string): void {
  patchSignal(signalId, {
    po_reply: reply, po_reply_by: poName, read_by_po: true, reply_read_by_client: false,
  })
  void api.addPoReply(signalId, reply, poName).then(() => refreshPortal()).catch(() => refreshPortal())
}

export function writeSignalRead(signalId: string): void {
  patchSignal(signalId, { read_by_po: true })
  void api.markSignalReadByPo(signalId)
}

export function writeProjectRead(project: string): void {
  const pid = projectIdByName(project)
  state = {
    ...state,
    signals: state.signals.map(s =>
      s.project === project && s.source !== 'management' ? { ...s, read_by_po: true } : s),
  }
  emit()
  if (pid) void api.markProjectReadByPo(pid)
}

export function writeAllRead(): void {
  state = { ...state, signals: state.signals.map(s => ({ ...s, read_by_po: true })) }
  emit()
  const projects = new Set(state.signals.map(s => s.project))
  projects.forEach(p => {
    const pid = projectIdByName(p)
    if (pid) void api.markProjectReadByPo(pid)
  })
}

export function writeReplyRead(signalId: string): void {
  patchSignal(signalId, { reply_read_by_client: true })
  void api.markReplyReadByClient(signalId)
}

export function writeAllRepliesRead(author: string): void {
  state = {
    ...state,
    signals: state.signals.map(s =>
      s.author === author && s.reply_read_by_client === false
        ? { ...s, reply_read_by_client: true } : s),
  }
  emit()
  void api.markAllRepliesReadByClient(author)
}

export function writePortalAccess(input: {
  name: string; email: string; permission: 'viewer' | 'admin'
  canApprove: boolean; canPreview: boolean; projectNames: string[]; actorName?: string
}): void {
  const ids = input.projectNames
    .map(projectIdByName)
    .filter((v): v is string => Boolean(v))
  const targets = ids.length > 0 ? ids : state.projects.slice(0, 1).map(p => p.id)
  void api.createClientPortalUsers({
    projectIds: targets,
    name: input.name,
    email: input.email,
    portalRole: input.permission === 'admin' ? 'portal-admin' : 'viewer',
    canApprove: input.canApprove,
    canPreview: input.canPreview,
    // viewer = read-only: no comments; portal-admin can always comment.
    canComment: input.permission === 'admin',
    actorName: input.actorName,
  }).then(() => refreshPortal()).catch(() => refreshPortal())
}

export function writePasswordChanged(userId: string): void {
  state = {
    ...state,
    users: state.users.map(u => (u.id === userId ? { ...u, password_must_change: false } : u)),
  }
  emit()
  void api.setPortalPasswordChanged(userId)
}

function isUuid(v?: string | null): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v)
}
