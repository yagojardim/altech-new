// Issue list data access layer — real work items from Supabase, filtered by tenant.
import { supabase } from '../../integrations/supabase/client'
import type { Database } from '../../integrations/supabase/types'
import { DEFAULT_TENANT_ID } from './timeline'
import { epicColor, PRIORITY_FROM_DB } from './board'

export { DEFAULT_TENANT_ID, epicColor, PRIORITY_FROM_DB }

type Tables = Database['public']['Tables']

export type ListItemRow = Pick<
  Tables['work_items']['Row'],
  'id' | 'key' | 'title' | 'type' | 'status' | 'priority' | 'assignee_id' | 'story_points'
  | 'epic_id' | 'sprint_id' | 'project_id' | 'due_date' | 'is_blocked'
>
export type ListEpicRow = Pick<Tables['epics']['Row'], 'id' | 'project_id' | 'name' | 'color'>
export type ListSprintRow = Pick<Tables['sprints']['Row'], 'id' | 'project_id' | 'name' | 'state'>
export type ListProfileRow = Pick<Tables['profiles']['Row'], 'id' | 'name' | 'avatar_initials' | 'avatar_color'>
export type ListProjectRow = Pick<Tables['projects']['Row'], 'id' | 'key' | 'name'>
export type ListLabelRow = { work_item_id: string; name: string }

export interface ListFilters {
  projectId?: string
  status?: string
  priority?: string
  type?: string
  assigneeId?: string
  sprintId?: string
  epicId?: string
  search?: string
}

export interface ListData {
  items: ListItemRow[]
  labels: ListLabelRow[]
  epics: ListEpicRow[]
  sprints: ListSprintRow[]
  profiles: ListProfileRow[]
  projects: ListProjectRow[]
}

function missingTableMessage(table: string, message: string): string {
  if (/does not exist|schema cache|Could not find the table/i.test(message)) {
    return `A tabela "${table}" não existe no Supabase conectado. Rode a migration do schema canônico antes de usar a Lista.`
  }
  return message
}

const sel = (s: string): string => s

export async function listWorkItems(filters: ListFilters = {}): Promise<ListData> {
  const tid = DEFAULT_TENANT_ID

  let query = supabase
    .from('work_items')
    .select(sel('id, key, title, type, status, priority, assignee_id, story_points, epic_id, sprint_id, project_id, due_date, is_blocked'))
    .eq('tenant_id', tid)
    .is('archived_at', null)

  if (filters.projectId) query = query.eq('project_id', filters.projectId)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.assigneeId) query = query.eq('assignee_id', filters.assigneeId)
  if (filters.sprintId) query = query.eq('sprint_id', filters.sprintId)
  if (filters.epicId) query = query.eq('epic_id', filters.epicId)
  if (filters.search) query = query.ilike('title', `%${filters.search}%`)

  const itemsPromise = query.order('key').returns<ListItemRow[]>()

  const [items, labels, epics, sprints, profiles, projects] = await Promise.all([
    itemsPromise,
    supabase.from('work_item_labels').select('work_item_id, labels(name)').eq('tenant_id', tid),
    supabase.from('epics').select('id, project_id, name, color').eq('tenant_id', tid).is('archived_at', null),
    supabase.from('sprints').select('id, project_id, name, state').eq('tenant_id', tid).is('archived_at', null),
    supabase.from('profiles').select('id, name, avatar_initials, avatar_color').eq('tenant_id', tid),
    supabase.from('projects').select('id, key, name').eq('tenant_id', tid).is('archived_at', null).order('name'),
  ])

  const failed = [
    ['work_items', items.error], ['work_item_labels', labels.error], ['epics', epics.error],
    ['sprints', sprints.error], ['profiles', profiles.error], ['projects', projects.error],
  ].find(([, err]) => err) as [string, { message: string }] | undefined
  if (failed) throw new Error(missingTableMessage(failed[0], failed[1].message))

  const labelRows: ListLabelRow[] = (labels.data ?? []).flatMap(row => {
    const rel = (row as { work_item_id: string; labels: { name: string } | { name: string }[] | null }).labels
    if (!rel) return []
    const list = Array.isArray(rel) ? rel : [rel]
    return list.map(l => ({ work_item_id: row.work_item_id, name: l.name }))
  })

  return {
    items: items.data ?? [],
    labels: labelRows,
    epics: epics.data ?? [],
    sprints: sprints.data ?? [],
    profiles: profiles.data ?? [],
    projects: projects.data ?? [],
  }
}
