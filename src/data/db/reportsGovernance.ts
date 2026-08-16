/* eslint-disable @typescript-eslint/no-explicit-any */
// Governança da tela "Relatórios e Insights".
//   • reports_access_roles   → papéis (além do Admin Master) que enxergam a tela
//   • released_report_cards  → cards liberados para o Board de Composição
// Persistido em tenant_settings.metadata (jsonb já existente) — sem migração.
import { useEffect, useState } from 'react'
import { supabase } from '../../integrations/supabase/client'
import { DEFAULT_TENANT_ID } from './timeline'
import { safeCall } from '../../utils/logger'
import type { RoleContext } from '../session'

/** Papéis que o Admin Master pode liberar. */
export const REPORTS_OPTIONAL_ROLES: RoleContext[] = [
  'PMO', 'ProjectManager', 'ProductOwner', 'TechLead',
]

export const REPORTS_ROLE_LABEL: Record<string, string> = {
  PMO: 'PMO',
  ProjectManager: 'Project Manager',
  ProductOwner: 'Product Owner',
  TechLead: 'Tech Lead',
}

export interface ReportsGovernance {
  /** Papéis liberados (subconjunto de REPORTS_OPTIONAL_ROLES). */
  accessRoles: RoleContext[]
  /** Cards liberados para o Board de Composição. `null` ⇒ todos liberados. */
  releasedCards: string[] | null
}

const EMPTY: ReportsGovernance = { accessRoles: [], releasedCards: null }

let cache: ReportsGovernance | null = null
let inflight: Promise<ReportsGovernance> | null = null
const listeners = new Set<(g: ReportsGovernance) => void>()

function emit(g: ReportsGovernance) {
  cache = g
  listeners.forEach(l => l(g))
}

function parse(metadata: any): ReportsGovernance {
  const roles = Array.isArray(metadata?.reports_access_roles)
    ? (metadata.reports_access_roles as string[]).filter(r =>
        (REPORTS_OPTIONAL_ROLES as string[]).includes(r)) as RoleContext[]
    : []
  const cards = Array.isArray(metadata?.released_report_cards)
    ? (metadata.released_report_cards as string[])
    : null
  return { accessRoles: roles, releasedCards: cards }
}

export function fetchReportsGovernance(force = false): Promise<ReportsGovernance> {
  if (!force && cache) return Promise.resolve(cache)
  if (!force && inflight) return inflight
  inflight = safeCall<ReportsGovernance>('reportsGovernance.fetch', async () => {
    const { data, error } = await (supabase as any)
      .from('tenant_settings').select('metadata')
      .eq('tenant_id', DEFAULT_TENANT_ID).maybeSingle()
    if (error) throw error
    return parse(data?.metadata)
  }, EMPTY).then(g => { emit(g); inflight = null; return g })
  return inflight
}

export function saveReportsGovernance(patch: Partial<ReportsGovernance>): Promise<boolean> {
  return safeCall('reportsGovernance.save', async () => {
    const current = cache ?? await fetchReportsGovernance()
    const next: ReportsGovernance = {
      accessRoles: patch.accessRoles ?? current.accessRoles,
      releasedCards: patch.releasedCards !== undefined ? patch.releasedCards : current.releasedCards,
    }
    const { data } = await (supabase as any)
      .from('tenant_settings').select('metadata')
      .eq('tenant_id', DEFAULT_TENANT_ID).maybeSingle()
    const metadata = { ...(data?.metadata ?? {}) } as Record<string, unknown>
    metadata.reports_access_roles = next.accessRoles
    metadata.released_report_cards = next.releasedCards
    const { error } = await (supabase as any)
      .from('tenant_settings')
      .upsert({ tenant_id: DEFAULT_TENANT_ID, metadata }, { onConflict: 'tenant_id' })
    if (error) throw error
    emit(next)
    return true
  }, false)
}

/** Admin Master do tenant (owner) — permissions inclui '*'. */
export function isTenantOwner(permissions: string[] | undefined | null): boolean {
  return !!permissions?.includes('*')
}

export function canAccessReports(
  role: RoleContext,
  permissions: string[] | undefined | null,
  gov: ReportsGovernance,
): boolean {
  if (isTenantOwner(permissions)) return true
  return gov.accessRoles.includes(role)
}

/** Cards liberados para o Board de Composição. */
export function isCardReleased(gov: ReportsGovernance, cardId: string): boolean {
  return gov.releasedCards === null || gov.releasedCards.includes(cardId)
}

/** Hook reativo — carrega uma vez e re-renderiza a cada save. */
export function useReportsGovernance(): ReportsGovernance {
  const [gov, setGov] = useState<ReportsGovernance>(cache ?? EMPTY)
  useEffect(() => {
    listeners.add(setGov)
    void fetchReportsGovernance().then(setGov)
    return () => { listeners.delete(setGov) }
  }, [])
  return gov
}
