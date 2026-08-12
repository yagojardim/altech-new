// Calendar events data access layer — real `calendar_events` rows from Supabase.
// Tenant-safe: every read/write is scoped by tenant_id. Reads degrade to empty via safeCall.
import { supabase } from '@/integrations/supabase/client'
import type { Database, Json } from '@/integrations/supabase/types'
import { DEFAULT_TENANT_ID } from '@/data/db/timeline'
import { safeCall, logger } from '@/utils/logger'

export { DEFAULT_TENANT_ID }

type Tables = Database['public']['Tables']
type Row = Tables['calendar_events']['Row']

export type CalendarEventType = 'daily' | 'planning' | 'pre_review' | 'review' | 'retrospective' | 'other'

export const EVENT_TYPES: CalendarEventType[] = ['daily', 'planning', 'pre_review', 'review', 'retrospective', 'other']

export const EVENT_TYPE_LABEL: Record<CalendarEventType, string> = {
  daily: 'Daily',
  planning: 'Planning',
  pre_review: 'Pré-review',
  review: 'Review',
  retrospective: 'Retrospectiva',
  other: 'Evento',
}

export const EVENT_TYPE_COLOR: Record<CalendarEventType, string> = {
  daily: '#10B981',
  planning: '#F59E0B',
  pre_review: '#A78BFA',
  review: '#3B82F6',
  retrospective: '#EC4899',
  other: '#6366F1',
}

export const EVENT_TYPE_ICON: Record<CalendarEventType, string> = {
  daily: '🔁',
  planning: '🗺️',
  pre_review: '🔍',
  review: '🎬',
  retrospective: '💬',
  other: '📌',
}

export function normalizeEventType(value: string | null | undefined): CalendarEventType {
  return (EVENT_TYPES as string[]).includes(value ?? '') ? (value as CalendarEventType) : 'other'
}

export interface EventGuest { name: string; email: string }

export interface DbCalendarEvent {
  id: string
  tenantId: string
  title: string
  startIso: string
  endIso: string
  allDay: boolean
  eventType: CalendarEventType
  guests: EventGuest[]
  location?: string
  description?: string
  color: string
  meetLink?: string
  workItemKey?: string
  reminder?: number
  projectId: string | null
  sprintId: string | null
}

export interface CalendarEventInput {
  title: string
  startIso: string
  endIso: string
  allDay?: boolean
  eventType?: CalendarEventType
  guests?: EventGuest[]
  location?: string
  description?: string
  color?: string
  meetLink?: string
  workItemKey?: string
  reminder?: number
  projectId?: string | null
  sprintId?: string | null
  createdBy?: string | null
}

interface EventMeta {
  color?: string
  meetLink?: string
  workItemKey?: string
  reminder?: number
}

function readMeta(value: Json | null): EventMeta {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const rec = value as Record<string, Json | undefined>
  const meta: EventMeta = {}
  if (typeof rec.color === 'string') meta.color = rec.color
  if (typeof rec.meetLink === 'string') meta.meetLink = rec.meetLink
  if (typeof rec.workItemKey === 'string') meta.workItemKey = rec.workItemKey
  if (typeof rec.reminder === 'number') meta.reminder = rec.reminder
  return meta
}

function readGuests(value: Json | null): EventGuest[] {
  if (!Array.isArray(value)) return []
  const out: EventGuest[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue
    const rec = entry as Record<string, Json | undefined>
    const name = typeof rec.name === 'string' ? rec.name : ''
    const email = typeof rec.email === 'string' ? rec.email : ''
    if (name || email) out.push({ name: name || email, email })
  }
  return out
}

function mapRow(row: Row): DbCalendarEvent {
  const type = normalizeEventType(row.event_type)
  const meta = readMeta(row.metadata)
  return {
    id: row.id,
    tenantId: row.tenant_id,
    title: row.title,
    startIso: row.starts_at,
    endIso: row.ends_at ?? row.starts_at,
    allDay: row.all_day,
    eventType: type,
    guests: readGuests(row.attendees),
    location: row.location ?? undefined,
    description: row.description ?? undefined,
    color: meta.color ?? EVENT_TYPE_COLOR[type],
    meetLink: meta.meetLink,
    workItemKey: meta.workItemKey,
    reminder: meta.reminder,
    projectId: row.project_id,
    sprintId: row.sprint_id,
  }
}

function toMetadata(input: Pick<CalendarEventInput, 'color' | 'meetLink' | 'workItemKey' | 'reminder'>): Json {
  const meta: Record<string, Json> = {}
  if (input.color) meta.color = input.color
  if (input.meetLink) meta.meetLink = input.meetLink
  if (input.workItemKey) meta.workItemKey = input.workItemKey
  if (typeof input.reminder === 'number') meta.reminder = input.reminder
  return meta as Json
}

/** Lists the tenant events, optionally bounded by an ISO range. Degrades to []. */
export async function listCalendarEvents(
  tenantId: string = DEFAULT_TENANT_ID,
  fromISO?: string,
  toISO?: string,
): Promise<DbCalendarEvent[]> {
  return safeCall('calendarEvents.list', async () => {
    let query = supabase.from('calendar_events').select('*')
      .eq('tenant_id', tenantId)
      .is('archived_at', null)
      .order('starts_at', { ascending: true })
    if (toISO)   query = query.lte('starts_at', toISO)
    if (fromISO) query = query.gte('starts_at', fromISO)

    const { data, error } = await query
    if (error) throw new Error(error.message)
    return (data ?? []).map(mapRow)
  }, [], { tenantId, fromISO, toISO })
}

/** Creates one event. Returns null if the write failed. */
export async function createCalendarEvent(
  input: CalendarEventInput,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<DbCalendarEvent | null> {
  return safeCall('calendarEvents.create', async () => {
    const payload: Tables['calendar_events']['Insert'] = {
      tenant_id: tenantId,
      title: input.title,
      starts_at: input.startIso,
      ends_at: input.endIso,
      all_day: input.allDay ?? false,
      event_type: input.eventType ?? 'other',
      attendees: (input.guests ?? []) as unknown as Json,
      description: input.description ?? null,
      location: input.location ?? null,
      project_id: input.projectId ?? null,
      sprint_id: input.sprintId ?? null,
      created_by: input.createdBy ?? null,
      metadata: toMetadata(input),
    }
    const { data, error } = await supabase.from('calendar_events').insert(payload).select('*').single()
    if (error) throw new Error(error.message)
    return mapRow(data)
  }, null, { title: input.title })
}

/** Patches one event (tenant-scoped). Returns the updated row or null on failure. */
export async function updateCalendarEvent(
  id: string,
  patch: Partial<CalendarEventInput>,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<DbCalendarEvent | null> {
  return safeCall('calendarEvents.update', async () => {
    const update: Tables['calendar_events']['Update'] = {}
    if (patch.title !== undefined)       update.title = patch.title
    if (patch.startIso !== undefined)    update.starts_at = patch.startIso
    if (patch.endIso !== undefined)      update.ends_at = patch.endIso
    if (patch.allDay !== undefined)      update.all_day = patch.allDay
    if (patch.eventType !== undefined)   update.event_type = patch.eventType
    if (patch.guests !== undefined)      update.attendees = patch.guests as unknown as Json
    if (patch.description !== undefined) update.description = patch.description ?? null
    if (patch.location !== undefined)    update.location = patch.location ?? null
    if (patch.projectId !== undefined)   update.project_id = patch.projectId ?? null
    if (patch.sprintId !== undefined)    update.sprint_id = patch.sprintId ?? null
    if (patch.color !== undefined || patch.meetLink !== undefined
        || patch.workItemKey !== undefined || patch.reminder !== undefined) {
      update.metadata = toMetadata(patch)
    }

    const { data, error } = await supabase.from('calendar_events').update(update)
      .eq('id', id).eq('tenant_id', tenantId).select('*').single()
    if (error) throw new Error(error.message)
    return mapRow(data)
  }, null, { id })
}

/** Soft delete via archived_at. */
export async function deleteCalendarEvent(
  id: string,
  tenantId: string = DEFAULT_TENANT_ID,
): Promise<boolean> {
  return safeCall('calendarEvents.delete', async () => {
    const { error } = await supabase.from('calendar_events')
      .update({ archived_at: new Date().toISOString() })
      .eq('id', id).eq('tenant_id', tenantId)
    if (error) throw new Error(error.message)
    return true
  }, false, { id })
}

// ─── Sprint ceremonies generator ───────────────────────────────────────────────

export interface SprintCeremonyInput {
  id: string
  name: string
  projectId: string | null
  startDate: string | null   // 'YYYY-MM-DD'
  endDate: string | null     // 'YYYY-MM-DD'
}

export interface CeremonyResult {
  created: number
  skipped: number
  error?: string
}

function parseDay(value: string): Date {
  return new Date(`${value.slice(0, 10)}T00:00:00`)
}

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function at(day: Date, hour: number, minute: number): string {
  const d = new Date(day)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

interface PlannedCeremony {
  day: Date
  type: CalendarEventType
  title: string
  startHour: number; startMin: number
  endHour: number;   endMin: number
}

/** Pure planner: derives the ceremony agenda of a sprint from its date range. */
export function planSprintCeremonies(sprint: SprintCeremonyInput): PlannedCeremony[] {
  if (!sprint.startDate || !sprint.endDate) return []
  const start = parseDay(sprint.startDate)
  const end = parseDay(sprint.endDate)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return []

  const days: Date[] = []
  for (const d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(new Date(d))

  const mondays   = days.filter(d => d.getDay() === 1)
  const thursdays = days.filter(d => d.getDay() === 4)
  const fridays   = days.filter(d => d.getDay() === 5)

  const out: PlannedCeremony[] = []

  for (const d of days) {
    if (d.getDay() === 1 || d.getDay() === 3 || d.getDay() === 5) {
      out.push({ day: d, type: 'daily', title: `Daily — ${sprint.name}`, startHour: 9, startMin: 0, endHour: 9, endMin: 15 })
    }
  }
  if (mondays[0]) {
    out.push({ day: mondays[0], type: 'planning', title: `Planning — ${sprint.name}`, startHour: 10, startMin: 0, endHour: 12, endMin: 0 })
  }
  const lastThursday = thursdays[thursdays.length - 1]
  if (lastThursday) {
    out.push({ day: lastThursday, type: 'pre_review', title: `Pré-review — ${sprint.name}`, startHour: 15, startMin: 0, endHour: 16, endMin: 0 })
  }
  const lastFriday = fridays[fridays.length - 1]
  if (lastFriday) {
    out.push({ day: lastFriday, type: 'review', title: `Review — ${sprint.name}`, startHour: 9, startMin: 0, endHour: 10, endMin: 0 })
    out.push({ day: lastFriday, type: 'retrospective', title: `Retrospectiva (manhã) — ${sprint.name}`, startHour: 10, startMin: 30, endHour: 11, endMin: 30 })
    out.push({ day: lastFriday, type: 'retrospective', title: `Retrospectiva (tarde) — ${sprint.name}`, startHour: 14, startMin: 0, endHour: 15, endMin: 0 })
  }
  return out
}

/**
 * Creates the sprint ceremonies in `calendar_events`.
 * Idempotent: skips anything already present for the same sprint_id + event_type + day
 * (a day can legitimately hold two retrospectives, so the start time is part of the key).
 */
export async function generateSprintCeremonies(
  sprint: SprintCeremonyInput,
  tenantId: string = DEFAULT_TENANT_ID,
  createdBy: string | null = null,
): Promise<CeremonyResult> {
  const planned = planSprintCeremonies(sprint)
  if (planned.length === 0) {
    return { created: 0, skipped: 0, error: 'Sprint sem datas válidas de início/fim.' }
  }

  const existingRes = await safeCall('calendarEvents.ceremonies.existing', async () => {
    const { data, error } = await supabase.from('calendar_events')
      .select('event_type, starts_at')
      .eq('tenant_id', tenantId).eq('sprint_id', sprint.id).is('archived_at', null)
    if (error) throw new Error(error.message)
    return data ?? []
  }, null as { event_type: string; starts_at: string }[] | null, { sprintId: sprint.id })

  if (existingRes === null) {
    return { created: 0, skipped: 0, error: 'Não foi possível verificar as cerimônias existentes.' }
  }

  const seen = new Set(existingRes.map(r => {
    const d = new Date(r.starts_at)
    return `${normalizeEventType(r.event_type)}|${dayKey(d)}|${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }))

  const rows: Tables['calendar_events']['Insert'][] = []
  let skipped = 0
  for (const p of planned) {
    const key = `${p.type}|${dayKey(p.day)}|${String(p.startHour).padStart(2, '0')}:${String(p.startMin).padStart(2, '0')}`
    if (seen.has(key)) { skipped++; continue }
    seen.add(key)
    rows.push({
      tenant_id: tenantId,
      title: p.title,
      starts_at: at(p.day, p.startHour, p.startMin),
      ends_at: at(p.day, p.endHour, p.endMin),
      all_day: false,
      event_type: p.type,
      attendees: [] as unknown as Json,
      project_id: sprint.projectId ?? null,
      sprint_id: sprint.id,
      created_by: createdBy,
      metadata: { color: EVENT_TYPE_COLOR[p.type] } as Json,
    })
  }

  if (rows.length === 0) return { created: 0, skipped }

  const ok = await safeCall('calendarEvents.ceremonies.insert', async () => {
    const { error } = await supabase.from('calendar_events').insert(rows)
    if (error) throw new Error(error.message)
    return true
  }, false, { sprintId: sprint.id, count: rows.length })

  if (!ok) {
    logger.warn('calendarEvents.ceremonies', 'insert failed', { sprintId: sprint.id })
    return { created: 0, skipped, error: 'Falha ao gravar as cerimônias.' }
  }
  return { created: rows.length, skipped }
}
