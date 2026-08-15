// Sprint management data access layer — reads and writes the connected Supabase project.
// Same pattern as ./board.ts and ./timeline.ts: every read and write is scoped by
// tenant_id (never cross-tenant) and every mutation is audited in audit_logs.
import { supabase } from '../../integrations/supabase/client'
import type { Database } from '../../integrations/supabase/types'
import { DEFAULT_TENANT_ID } from './timeline'

export { DEFAULT_TENANT_ID }

type Tables = Database['public']['Tables']

export type SprintState = 'planned' | 'active' | 'completed'

export type SprintRow = Pick<
  Tables['sprints']['Row'],
  'id' | 'project_id' | 'name' | 'goal' | 'state' | 'start_date' | 'end_date' | 'velocity' | 'completed_at' | 'metadata'
>

/** Outcome of each committed item at sprint closure. */
export type SprintClosureOutcome = 'done' | 'next' | 'backlog'

export interface SprintClosureItem {
  key: string
  title: string
  points: number
  outcome: SprintClosureOutcome
}

/** Snapshot persisted in sprints.metadata.closure when a sprint is completed. */
export interface SprintClosure {
  committedCount: number
  committedPoints: number
  doneCount: number
  donePoints: number
  deliveredPctCount: number
  deliveredPctPoints: number
  movedToNext: string[]
  movedToBacklog: string[]
  items: SprintClosureItem[]
  comment: string | null
  reason: string | null
  closedAt: string
}

/** Reads the closure snapshot out of a sprint metadata blob, when present. */
export function readSprintClosure(metadata: unknown): SprintClosure | null {
  if (!metadata || typeof metadata !== 'object') return null
  const closure = (metadata as Record<string, unknown>).closure
  if (!closure || typeof closure !== 'object') return null
  const c = closure as Record<string, unknown>
  const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0)
  const keys = (v: unknown) => (Array.isArray(v) ? v.filter((k): k is string => typeof k === 'string') : [])
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)
  const items: SprintClosureItem[] = Array.isArray(c.items)
    ? c.items.flatMap(raw => {
        if (!raw || typeof raw !== 'object') return []
        const r = raw as Record<string, unknown>
        const key = typeof r.key === 'string' ? r.key : ''
        if (!key) return []
        const outcome: SprintClosureOutcome =
          r.outcome === 'next' || r.outcome === 'backlog' || r.outcome === 'done'
            ? r.outcome
            : 'done'
        return [{
          key,
          title: typeof r.title === 'string' ? r.title : '',
          points: num(r.points),
          outcome,
        }]
      })
    : []
  return {
    committedCount: num(c.committedCount),
    committedPoints: num(c.committedPoints),
    doneCount: num(c.doneCount),
    donePoints: num(c.donePoints),
    deliveredPctCount: num(c.deliveredPctCount),
    deliveredPctPoints: num(c.deliveredPctPoints),
    movedToNext: keys(c.movedToNext),
    movedToBacklog: keys(c.movedToBacklog),
    items,
    comment: str(c.comment),
    reason: str(c.reason),
    closedAt: typeof c.closedAt === 'string' ? c.closedAt : '',
  }
}


export type SprintItemRow = Pick<
  Tables['work_items']['Row'],
  | 'id' | 'key' | 'title' | 'type' | 'status' | 'priority' | 'sprint_id'
  | 'story_points' | 'assignee_id' | 'epic_id' | 'is_blocked' | 'project_id'
>

const SPRINT_FIELDS = 'id, project_id, name, goal, state, start_date, end_date, velocity, completed_at, metadata'
const ITEM_FIELDS =
  'id, key, title, type, status, priority, sprint_id, story_points, assignee_id, epic_id, is_blocked, project_id'

function missingTableMessage(table: string, message: string): string {
  if (/does not exist|schema cache|Could not find the table/i.test(message)) {
    return `A tabela "${table}" não existe no Supabase conectado. Rode a migration do schema canônico antes de usar Sprints.`
  }
  return message
}

/** Normalises whatever the DB stores into the three states the UI knows. */
export function normalizeState(state: string | null | undefined): SprintState {
  return state === 'active' || state === 'completed' ? state : 'planned'
}

/** Lists the sprints of a project (planned / active / completed), oldest first. */
export async function listSprints(projectId?: string): Promise<SprintRow[]> {
  let query = supabase
    .from('sprints')
    .select(SPRINT_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID)
    .is('archived_at', null)
    .order('start_date', { ascending: true })

  if (projectId) query = query.eq('project_id', projectId)

  const { data, error } = await query
  if (error) throw new Error(missingTableMessage('sprints', error.message))
  return (data ?? []) as SprintRow[]
}

/** Work items of a sprint, resolved through sprint_items (falling back to work_items.sprint_id). */
export async function getSprintItems(sprintId: string): Promise<SprintItemRow[]> {
  const [linkRes, directRes] = await Promise.all([
    supabase.from('sprint_items').select('work_item_id').eq('tenant_id', DEFAULT_TENANT_ID).eq('sprint_id', sprintId),
    supabase.from('work_items').select(ITEM_FIELDS)
      .eq('tenant_id', DEFAULT_TENANT_ID).eq('sprint_id', sprintId).is('archived_at', null),
  ])
  if (linkRes.error) throw new Error(missingTableMessage('sprint_items', linkRes.error.message))
  if (directRes.error) throw new Error(missingTableMessage('work_items', directRes.error.message))

  const direct = (directRes.data ?? []) as SprintItemRow[]
  const known = new Set(direct.map(i => i.id))
  const missing = (linkRes.data ?? []).map(l => l.work_item_id).filter(id => !known.has(id))
  if (missing.length === 0) return direct

  const extraRes = await supabase.from('work_items').select(ITEM_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID).in('id', missing).is('archived_at', null)
  if (extraRes.error) throw new Error(missingTableMessage('work_items', extraRes.error.message))
  return [...direct, ...((extraRes.data ?? []) as SprintItemRow[])]
}

type AuditPayload = Record<string, string | number | boolean | null>

async function writeSprintAudit(
  sprintId: string,
  action: string,
  actorName: string,
  before: AuditPayload,
  after: AuditPayload,
) {
  await supabase.from('audit_logs').insert({
    tenant_id: DEFAULT_TENANT_ID,
    entity_type: 'sprint',
    entity_id: sprintId,
    action,
    actor_name: actorName,
    before,
    after,
  })
}

/** sprint_scope_events only accepts 'added' | 'removed'. */
async function writeScopeEvents(
  rows: { sprintId: string; workItemId: string; event: 'added' | 'removed'; pointsDelta: number | null }[],
) {
  if (rows.length === 0) return
  await supabase.from('sprint_scope_events').insert(
    rows.map(r => ({
      tenant_id: DEFAULT_TENANT_ID,
      sprint_id: r.sprintId,
      work_item_id: r.workItemId,
      event: r.event,
      points_delta: r.pointsDelta,
    })),
  )
}

export interface StartSprintInput {
  goal?: string | null
  startDate?: string | null
  endDate?: string | null
  name?: string | null
}

/** Moves a planned sprint to `active`, optionally updating name/goal/dates. */
export async function startSprint(
  sprintId: string,
  input: StartSprintInput = {},
  actorName = 'Sistema',
): Promise<SprintRow> {
  const beforeRes = await supabase.from('sprints').select(SPRINT_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID).eq('id', sprintId).maybeSingle()
  if (beforeRes.error) throw new Error(missingTableMessage('sprints', beforeRes.error.message))
  const before = beforeRes.data as SprintRow | null
  if (!before) throw new Error('Sprint não encontrada')

  const patch: Tables['sprints']['Update'] = { state: 'active' }
  if (input.name) patch.name = input.name
  if (input.goal !== undefined) patch.goal = input.goal || null
  if (input.startDate) patch.start_date = input.startDate
  if (input.endDate) patch.end_date = input.endDate

  const { data, error } = await supabase.from('sprints').update(patch)
    .eq('id', sprintId).eq('tenant_id', DEFAULT_TENANT_ID)
    .select(SPRINT_FIELDS).single()
  if (error) throw new Error(error.message)

  await writeSprintAudit(sprintId, 'sprint.started', actorName,
    { state: before.state, start_date: before.start_date, end_date: before.end_date, goal: before.goal },
    { state: 'active', start_date: data.start_date, end_date: data.end_date, goal: data.goal })

  return data as SprintRow
}

export interface SprintItemDecision {
  workItemId: string
  destination: 'next-sprint' | 'backlog'
}

export interface CompleteSprintResult {
  velocity: number
  doneCount: number
  movedToNext: number
  movedToBacklog: number
  closure: SprintClosure
  /** true when items asked for 'next-sprint' but no planned sprint existed. */
  fellBackToBacklog: boolean
  destinationSprint: SprintRow | null
}

/**
 * Closes a sprint: computes the velocity from the 'done' items, marks it completed
 * and moves each unfinished item to the destination chosen for it (next planned
 * sprint or backlog).
 */
export async function completeSprint(
  sprintId: string,
  decisions: SprintItemDecision[],
  comment?: string,
  actorName = 'Sistema',
): Promise<CompleteSprintResult> {
  const sprintRes = await supabase.from('sprints').select(SPRINT_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID).eq('id', sprintId).maybeSingle()
  if (sprintRes.error) throw new Error(missingTableMessage('sprints', sprintRes.error.message))
  const sprint = sprintRes.data as SprintRow | null
  if (!sprint) throw new Error('Sprint não encontrada')

  const items = await getSprintItems(sprintId)
  const done = items.filter(i => i.status === 'done')
  const remaining = items.filter(i => i.status !== 'done')
  const velocity = done.reduce((sum, i) => sum + Number(i.story_points ?? 0), 0)

  // Snapshot taken BEFORE any item leaves the sprint.
  const committedCount = items.length
  const committedPoints = items.reduce((sum, i) => sum + Number(i.story_points ?? 0), 0)
  const donePoints = velocity
  const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0)

  const decisionBy = new Map(decisions.map(d => [d.workItemId, d.destination]))
  const wantsNext = remaining.filter(i => (decisionBy.get(i.id) ?? 'backlog') === 'next-sprint')

  // Next planned sprint of the same project (by start date).
  let target: SprintRow | null = null
  if (wantsNext.length > 0) {
    const planned = (await listSprints(sprint.project_id)).filter(
      s => s.id !== sprintId && normalizeState(s.state) === 'planned',
    )
    target = planned[0] ?? null
  }
  const fellBackToBacklog = wantsNext.length > 0 && !target

  const toNext = target ? wantsNext : []
  const toNextIds = new Set(toNext.map(i => i.id))
  const toBacklog = remaining.filter(i => !toNextIds.has(i.id))

  if (remaining.length > 0) {
    const ids = remaining.map(i => i.id)

    if (toBacklog.length > 0) {
      const res = await supabase.from('work_items').update({ sprint_id: null })
        .in('id', toBacklog.map(i => i.id)).eq('tenant_id', DEFAULT_TENANT_ID)
      if (res.error) throw new Error(res.error.message)
    }
    if (target && toNext.length > 0) {
      const res = await supabase.from('work_items').update({ sprint_id: target.id })
        .in('id', toNext.map(i => i.id)).eq('tenant_id', DEFAULT_TENANT_ID)
      if (res.error) throw new Error(res.error.message)
    }

    // Keep sprint_items in sync with the moves.
    const delRes = await supabase.from('sprint_items').delete()
      .eq('tenant_id', DEFAULT_TENANT_ID).eq('sprint_id', sprintId).in('work_item_id', ids)
    if (delRes.error) throw new Error(delRes.error.message)

    if (target && toNext.length > 0) {
      const insRes = await supabase.from('sprint_items').insert(
        toNext.map(i => ({ tenant_id: DEFAULT_TENANT_ID, sprint_id: target.id, work_item_id: i.id })),
      )
      if (insRes.error) throw new Error(insRes.error.message)
    }

    await writeScopeEvents([
      ...remaining.map(i => ({
        sprintId, workItemId: i.id, event: 'removed' as const,
        pointsDelta: i.story_points == null ? null : -Number(i.story_points),
      })),
      ...(target
        ? toNext.map(i => ({
            sprintId: target.id, workItemId: i.id, event: 'added' as const,
            pointsDelta: i.story_points == null ? null : Number(i.story_points),
          }))
        : []),
    ])
  }

  const completedAt = new Date().toISOString()
  const closure: SprintClosure = {
    committedCount,
    committedPoints,
    doneCount: done.length,
    donePoints,
    deliveredPctCount: pct(done.length, committedCount),
    deliveredPctPoints: pct(donePoints, committedPoints),
    movedToNext: toNext.map(i => i.key),
    movedToBacklog: toBacklog.map(i => i.key),
    comment: comment?.trim() ? comment.trim() : null,
    closedAt: completedAt,
  }
  const existingMeta =
    sprint.metadata && typeof sprint.metadata === 'object' && !Array.isArray(sprint.metadata)
      ? (sprint.metadata as Record<string, unknown>)
      : {}

  const closeRes = await supabase.from('sprints')
    .update({
      state: 'completed',
      velocity,
      completed_at: completedAt,
      metadata: { ...existingMeta, closure } as unknown as Tables['sprints']['Update']['metadata'],
    })
    .eq('id', sprintId).eq('tenant_id', DEFAULT_TENANT_ID)
  if (closeRes.error) throw new Error(closeRes.error.message)

  await writeSprintAudit(sprintId, 'sprint.completed', actorName,
    { state: sprint.state, velocity: sprint.velocity == null ? null : Number(sprint.velocity) },
    {
      state: 'completed',
      velocity,
      completed_at: completedAt,
      done_items: done.length,
      committed_count: committedCount,
      committed_points: committedPoints,
      done_points: donePoints,
      delivered_pct_count: closure.deliveredPctCount,
      delivered_pct_points: closure.deliveredPctPoints,
      moved_to_next: toNext.length,
      moved_to_backlog: toBacklog.length,
      next_sprint: target ? target.name : null,
      comment: closure.comment,
    })

  return {
    velocity,
    closure,
    doneCount: done.length,
    movedToNext: toNext.length,
    movedToBacklog: toBacklog.length,
    fellBackToBacklog,
    destinationSprint: target,
  }
}

/** Adds a work item to a sprint (work_items.sprint_id + sprint_items + scope event). */
export async function addItemToSprint(
  sprintId: string,
  workItemId: string,
  actorName = 'Sistema',
): Promise<void> {
  const itemRes = await supabase.from('work_items').select(ITEM_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID).eq('id', workItemId).maybeSingle()
  if (itemRes.error) throw new Error(missingTableMessage('work_items', itemRes.error.message))
  const item = itemRes.data as SprintItemRow | null
  if (!item) throw new Error('Item não encontrado')

  const updateRes = await supabase.from('work_items').update({ sprint_id: sprintId })
    .eq('id', workItemId).eq('tenant_id', DEFAULT_TENANT_ID)
  if (updateRes.error) throw new Error(updateRes.error.message)

  if (item.sprint_id && item.sprint_id !== sprintId) {
    await supabase.from('sprint_items').delete()
      .eq('tenant_id', DEFAULT_TENANT_ID).eq('sprint_id', item.sprint_id).eq('work_item_id', workItemId)
    await writeScopeEvents([{
      sprintId: item.sprint_id, workItemId, event: 'removed',
      pointsDelta: item.story_points == null ? null : -Number(item.story_points),
    }])
  }

  const insRes = await supabase.from('sprint_items')
    .insert({ tenant_id: DEFAULT_TENANT_ID, sprint_id: sprintId, work_item_id: workItemId })
  if (insRes.error && !/duplicate key/i.test(insRes.error.message)) throw new Error(insRes.error.message)

  await writeScopeEvents([{
    sprintId, workItemId, event: 'added',
    pointsDelta: item.story_points == null ? null : Number(item.story_points),
  }])

  await writeSprintAudit(sprintId, 'sprint.item_added', actorName,
    { work_item_id: workItemId, sprint_id: item.sprint_id },
    { work_item_id: workItemId, sprint_id: sprintId, key: item.key })
}

/** Removes a work item from a sprint, sending it back to the backlog. */
export async function removeItemFromSprint(
  sprintId: string,
  workItemId: string,
  actorName = 'Sistema',
): Promise<void> {
  const itemRes = await supabase.from('work_items').select(ITEM_FIELDS)
    .eq('tenant_id', DEFAULT_TENANT_ID).eq('id', workItemId).maybeSingle()
  if (itemRes.error) throw new Error(missingTableMessage('work_items', itemRes.error.message))
  const item = itemRes.data as SprintItemRow | null
  if (!item) throw new Error('Item não encontrado')

  const updateRes = await supabase.from('work_items').update({ sprint_id: null })
    .eq('id', workItemId).eq('tenant_id', DEFAULT_TENANT_ID)
  if (updateRes.error) throw new Error(updateRes.error.message)

  const delRes = await supabase.from('sprint_items').delete()
    .eq('tenant_id', DEFAULT_TENANT_ID).eq('sprint_id', sprintId).eq('work_item_id', workItemId)
  if (delRes.error) throw new Error(delRes.error.message)

  await writeScopeEvents([{
    sprintId, workItemId, event: 'removed',
    pointsDelta: item.story_points == null ? null : -Number(item.story_points),
  }])

  await writeSprintAudit(sprintId, 'sprint.item_removed', actorName,
    { work_item_id: workItemId, sprint_id: sprintId },
    { work_item_id: workItemId, sprint_id: null, key: item.key })
}
