/**
 * Altech — Dashboard Card Assignments store.
 * In-memory cache (screens read it synchronously) hydrated from the real
 * `dashboard_assignments` Supabase table; every write is persisted back.
 */
import { useEffect, useSyncExternalStore } from 'react'
import { MOCK_TENANT } from './session'
import type { DashboardType } from './session'
import * as api from './db/dashboardAssignments'
import { resolveProfileId } from './db/notifications'


export type AssignmentTarget = 'executivo' | 'dashview' | DashboardType

export interface DashboardAssignment {
  id:          string
  card_id:     string
  card_title:  string
  targets:     AssignmentTarget[]
  // per-target slot: 'mural' = top KPI strip | 'grid' = secondary composition area
  slots?:      Partial<Record<AssignmentTarget, 'mural' | 'grid'>>
  assigned_by: string
  tenant_id:   string
  updated_at:  string
}

// ─── Target catalog (used for the picker UI) ─────────────────────────────────
export interface TargetDef {
  id:    AssignmentTarget
  label: string
  icon:  string
  group: 'Executivos' | 'Por perfil'
}

export const ASSIGNMENT_TARGETS: TargetDef[] = [
  { id: 'executivo',       label: 'Dashboard Executivo',  icon: '📊', group: 'Executivos' },
  { id: 'dashview',        label: 'Dashview',             icon: '🔭', group: 'Executivos' },
  { id: 'admin',           label: 'Admin',                icon: '🛡️', group: 'Por perfil' },
  { id: 'pmo',             label: 'PMO',                  icon: '🗂️', group: 'Por perfil' },
  { id: 'project-manager', label: 'Project Manager',      icon: '📋', group: 'Por perfil' },
  { id: 'product-manager', label: 'Product Manager',      icon: '🎯', group: 'Por perfil' },
  { id: 'product-owner',   label: 'Product Owner',        icon: '📝', group: 'Por perfil' },
  { id: 'scrum-master',    label: 'Scrum Master',         icon: '🔄', group: 'Por perfil' },
  { id: 'tech-lead',       label: 'Tech Lead',            icon: '⚙️', group: 'Por perfil' },
  { id: 'dev',             label: 'Dev',                  icon: '💻', group: 'Por perfil' },
  { id: 'ux',              label: 'UX / UI',              icon: '🎨', group: 'Por perfil' },
  { id: 'qa',              label: 'QA',                   icon: '🧪', group: 'Por perfil' },
]

// ─── Store ────────────────────────────────────────────────────────────────────
let _assignments: DashboardAssignment[] = []

let _nextId = 10

// ─── Reactivity ───────────────────────────────────────────────────────────────
let _version = 0
const _listeners = new Set<() => void>()

function emit() {
  _version++
  _listeners.forEach(l => l())
}
function subscribe(l: () => void) {
  _listeners.add(l)
  return () => { _listeners.delete(l) }
}
function getVersion() { return _version }

// ─── Persistence ──────────────────────────────────────────────────────────────
let _profileId: string | null = null
let _hydrated = false
// last persisted `${dashboard}|${slot}` keys per card, so removals can be diffed
const _persisted = new Map<string, Set<string>>()

function keyOf(dash: string, slot: 'mural' | 'grid') { return `${dash}|${slot}` }

function persistCard(a: DashboardAssignment) {
  if (!_profileId) return
  const pid = _profileId
  const next = new Set<string>()
  for (const t of a.targets) {
    const slot = getCardSlot(a, t)
    next.add(keyOf(t, slot))
    void api.assign({ profileId: pid, dashboard: t, cardId: a.card_id, cardTitle: a.card_title, slot })
  }
  const before = _persisted.get(a.card_id) ?? new Set<string>()
  for (const k of before) {
    if (next.has(k)) continue
    const [dash, slot] = k.split('|')
    void api.remove(pid, dash, a.card_id, slot as 'mural' | 'grid')
  }
  _persisted.set(a.card_id, next)
}

function persistRemoval(card_id: string) {
  if (!_profileId) return
  const pid = _profileId
  for (const k of _persisted.get(card_id) ?? new Set<string>()) {
    const [dash, slot] = k.split('|')
    void api.remove(pid, dash, card_id, slot as 'mural' | 'grid')
  }
  _persisted.delete(card_id)
}

/** Loads the real assignments of the given user into the in-memory cache. */
export async function hydrateAssignments(userName: string): Promise<void> {
  const pid = await resolveProfileId(userName)
  _profileId = pid
  _hydrated = true
  if (!pid) { _assignments = []; _persisted.clear(); emit(); return }

  const cards = await api.getAssignedCards(pid)
  const byCard = new Map<string, DashboardAssignment>()
  _persisted.clear()
  for (const c of cards) {
    const target = c.dashboard as AssignmentTarget
    const entry = byCard.get(c.cardId) ?? {
      id: c.id, card_id: c.cardId, card_title: c.cardTitle,
      targets: [] as AssignmentTarget[], slots: {} as Partial<Record<AssignmentTarget, 'mural' | 'grid'>>,
      assigned_by: pid, tenant_id: MOCK_TENANT.tenant_id, updated_at: new Date().toISOString(),
    }
    if (!entry.targets.includes(target)) entry.targets = [...entry.targets, target]
    entry.slots = { ...(entry.slots ?? {}), [target]: c.slot }
    byCard.set(c.cardId, entry)

    const set = _persisted.get(c.cardId) ?? new Set<string>()
    set.add(keyOf(target, c.slot))
    _persisted.set(c.cardId, set)
  }
  _assignments = [...byCard.values()]
  emit()
}

/** Hook: hydrates once per user and re-renders on any local mutation. */
export function useDashboardAssignments(userName: string): number {
  const version = useSyncExternalStore(subscribe, getVersion, getVersion)
  useEffect(() => {
    if (_hydrated && _profileId !== null) return
    void hydrateAssignments(userName)
  }, [userName])
  return version
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function getAssignment(tenant_id: string, card_id: string): DashboardAssignment | undefined {
  return _assignments.find(a => a.tenant_id === tenant_id && a.card_id === card_id)
}

export function getAllAssignments(tenant_id: string): DashboardAssignment[] {
  return _assignments.filter(a => a.tenant_id === tenant_id)
}

export function getAssignedCards(tenant_id: string, target: AssignmentTarget): DashboardAssignment[] {
  return _assignments.filter(a => a.tenant_id === tenant_id && a.targets.includes(target))
}

export function upsertAssignment(
  tenant_id: string,
  card_id: string,
  card_title: string,
  targets: AssignmentTarget[],
  assigned_by: string,
  slots?: Partial<Record<AssignmentTarget, 'mural' | 'grid'>>,
): DashboardAssignment {
  const existing = _assignments.find(a => a.tenant_id === tenant_id && a.card_id === card_id)
  const updated_at = new Date().toISOString()
  if (existing) {
    existing.targets     = targets
    existing.slots       = slots
    existing.updated_at  = updated_at
    existing.assigned_by = assigned_by
    persistCard(existing)
    emit()
    return existing
  }
  const newA: DashboardAssignment = {
    id: `da_${String(++_nextId).padStart(3, '0')}`,
    card_id, card_title, targets, slots,
    assigned_by, tenant_id, updated_at,
  }
  _assignments = [..._assignments, newA]
  persistCard(newA)
  emit()
  return newA
}

export function removeAssignment(tenant_id: string, card_id: string): void {
  _assignments = _assignments.filter(a => !(a.tenant_id === tenant_id && a.card_id === card_id))
  persistRemoval(card_id)
  emit()
}


// ─── Per-user Home card preferences (session-persistent mock) ─────────────────
// dismissed: admin-assigned cards the user hid from their Home
// pinned:    cards the user added themselves beyond admin assignments
let _dismissed: Record<string, Set<string>> = {}  // key: `${userId}:${dashId}`
let _pinned:    Record<string, string[]>   = {}  // key: `${userId}:${dashId}`

function _prefKey(userId: string, dashId: string) { return `${userId}:${dashId}` }

export function dismissHomeCard(userId: string, dashId: string, cardId: string) {
  const k = _prefKey(userId, dashId)
  if (!_dismissed[k]) _dismissed[k] = new Set()
  _dismissed[k].add(cardId)
}

export function pinHomeCard(userId: string, dashId: string, cardId: string) {
  const k = _prefKey(userId, dashId)
  if (!_pinned[k]) _pinned[k] = []
  if (!_pinned[k].includes(cardId)) _pinned[k] = [..._pinned[k], cardId]
  // Remove from dismissed in case it was there
  _dismissed[k]?.delete(cardId)
}

export interface HomeCardSlot {
  cardId:       string
  cardTitle:    string
  isUserPinned: boolean
}

// ─── Per-user native mural card dismissal ─────────────────────────────────────
let _dismissedNative: Record<string, Set<string>> = {}  // key: `${userId}:${dashId}`

export function dismissNativeCard(userId: string, dashId: string, cardId: string) {
  const k = _prefKey(userId, dashId)
  if (!_dismissedNative[k]) _dismissedNative[k] = new Set()
  _dismissedNative[k].add(cardId)
}

export function restoreNativeCard(userId: string, dashId: string, cardId: string) {
  _dismissedNative[_prefKey(userId, dashId)]?.delete(cardId)
}

export function getDismissedNative(userId: string, dashId: string): Set<string> {
  return _dismissedNative[_prefKey(userId, dashId)] ?? new Set<string>()
}

// Returns the slot a card occupies for a given target (default: 'mural')
export function getCardSlot(a: DashboardAssignment, target: AssignmentTarget): 'mural' | 'grid' {
  return a.slots?.[target] ?? 'mural'
}

export function getVisibleHomeCards(tenantId: string, dashId: AssignmentTarget, userId: string): HomeCardSlot[] {
  const assigned = getAssignedCards(tenantId, dashId)
  const k        = _prefKey(userId, dashId)
  const dismissed = _dismissed[k] ?? new Set<string>()
  const pinned    = _pinned[k] ?? []

  // Admin-assigned to mural slot, not dismissed
  const result: HomeCardSlot[] = assigned
    .filter(a => getCardSlot(a, dashId) === 'mural' && !dismissed.has(a.card_id))
    .map(a => ({ cardId: a.card_id, cardTitle: a.card_title, isUserPinned: false }))

  // User-pinned extras not in assigned list
  const assignedIds = new Set(assigned.map(a => a.card_id))
  for (const cardId of pinned) {
    if (!assignedIds.has(cardId) && !dismissed.has(cardId)) {
      result.push({ cardId, cardTitle: cardId, isUserPinned: true })
    }
  }
  return result
}

// Cards assigned to the secondary composition grid for a given profile/target
export function getGridCards(tenantId: string, dashId: AssignmentTarget, userId: string): HomeCardSlot[] {
  const assigned  = getAssignedCards(tenantId, dashId)
  const dismissed = _dismissed[_prefKey(userId, dashId)] ?? new Set<string>()
  return assigned
    .filter(a => getCardSlot(a, dashId) === 'grid' && !dismissed.has(a.card_id))
    .map(a => ({ cardId: a.card_id, cardTitle: a.card_title, isUserPinned: false }))
}

// Add a report card to the composition grid for a given dashboard (user-level action for prototype)
export function pinGridCard(
  tenantId: string, dashId: AssignmentTarget,
  cardId: string, cardTitle: string, userId: string,
) {
  const existing = _assignments.find(a => a.tenant_id === tenantId && a.card_id === cardId)
  const targets = existing ? [...new Set([...existing.targets, dashId])] : [dashId]
  const slots = { ...(existing?.slots ?? {}), [dashId]: 'grid' as const }
  upsertAssignment(tenantId, cardId, cardTitle, targets, userId, slots)
}

// Remove a report card from the composition grid of a given dashboard
export function dismissGridCard(
  tenantId: string, dashId: AssignmentTarget, cardId: string, userId: string,
) {
  const existing = _assignments.find(a => a.tenant_id === tenantId && a.card_id === cardId)
  if (!existing) return
  const targets = existing.targets.filter(t => t !== dashId)
  const slots = { ...(existing.slots ?? {}) }
  delete slots[dashId]
  if (targets.length === 0) {
    removeAssignment(tenantId, cardId)
  } else {
    upsertAssignment(tenantId, cardId, existing.card_title, targets, userId, slots)
  }
}
