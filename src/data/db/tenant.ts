/* eslint-disable @typescript-eslint/no-explicit-any */
// Tenant settings data access layer — branding/localização do tenant e
// validação/troca de slug via a função SQL check_slug.
// Nunca expõe CPF/CNPJ (documento) na UI, URL ou log.
import { supabase } from '../../integrations/supabase/client'
import { DEFAULT_TENANT_ID } from './timeline'
import { safeCall, logger } from '../../utils/logger'

export { DEFAULT_TENANT_ID }

function tbl(name: 'tenant_settings' | 'tenants' | 'audit_logs'): any {
  return (supabase as unknown as { from: (t: string) => any }).from(name)
}

export interface TenantSettings {
  id: string | null
  tenant_id: string
  display_name: string
  timezone: string
  locale: string
  logo_url: string
  primary_color: string
}

export interface TenantIdentity {
  slug: string | null
  slug_status: string | null
  status: string | null
  type: string | null
  name: string | null
  /** apenas os 4 últimos dígitos — nunca o documento completo */
  document_last4: string | null
  document_verification_status: string | null
}

export type SlugCheck = 'available' | 'unavailable' | 'invalid' | 'reserved'

const EMPTY_SETTINGS: TenantSettings = {
  id: null,
  tenant_id: DEFAULT_TENANT_ID,
  display_name: '',
  timezone: 'America/Sao_Paulo',
  locale: 'pt-BR',
  logo_url: '',
  primary_color: '',
}

async function writeAudit(action: string, after: Record<string, unknown>, actorName?: string) {
  try {
    await tbl('audit_logs').insert({
      tenant_id: DEFAULT_TENANT_ID,
      entity_type: 'tenant',
      entity_id: DEFAULT_TENANT_ID,
      action,
      actor_name: actorName ?? null,
      before: null,
      after: after as any,
    })
  } catch (err) {
    logger.error('tenant.writeAudit', err, { action })
  }
}

// ─── Reads ────────────────────────────────────────────────────────────────────
export function getTenantSettings(): Promise<TenantSettings> {
  return safeCall('tenant.getTenantSettings', async () => {
    const { data, error } = await tbl('tenant_settings')
      .select('*').eq('tenant_id', DEFAULT_TENANT_ID).is('archived_at', null).maybeSingle()
    if (error) throw error
    if (!data) return EMPTY_SETTINGS
    return {
      id: data.id,
      tenant_id: data.tenant_id,
      display_name: data.display_name ?? '',
      timezone: data.timezone ?? 'America/Sao_Paulo',
      locale: data.locale ?? 'pt-BR',
      logo_url: data.logo_url ?? '',
      primary_color: data.primary_color ?? '',
    }
  }, EMPTY_SETTINGS)
}

export function getTenantIdentity(): Promise<TenantIdentity | null> {
  return safeCall('tenant.getTenantIdentity', async () => {
    const { data, error } = await tbl('tenants')
      .select('name, slug, slug_status, status, type, document_last4, document_verification_status')
      .eq('id', DEFAULT_TENANT_ID).maybeSingle()
    if (error) throw error
    if (!data) return null
    return data as TenantIdentity
  }, null)
}

// ─── Writes ───────────────────────────────────────────────────────────────────
export function updateTenantSettings(
  patch: Partial<Omit<TenantSettings, 'id' | 'tenant_id'>>,
  actorName?: string,
): Promise<boolean> {
  return safeCall('tenant.updateTenantSettings', async () => {
    const { error } = await tbl('tenant_settings')
      .upsert({ tenant_id: DEFAULT_TENANT_ID, ...patch }, { onConflict: 'tenant_id' })
    if (error) throw error
    await writeAudit('tenant settings updated', patch as Record<string, unknown>, actorName)
    return true
  }, false)
}

export function checkSlug(slug: string, actorName?: string): Promise<SlugCheck> {
  return safeCall('tenant.checkSlug', async () => {
    const { data, error } = await (supabase as any).rpc('check_slug', { p_slug: slug })
    if (error) throw error
    const result = (data as SlugCheck) ?? 'invalid'
    await writeAudit(result === 'reserved' ? 'slug_reserved' : 'slug_checked', { slug, result }, actorName)
    return result
  }, 'invalid')
}

export function changeSlug(slug: string, actorName?: string): Promise<{ ok: boolean; reason?: SlugCheck }> {
  return safeCall('tenant.changeSlug', async () => {
    const status = await checkSlug(slug, actorName)
    if (status !== 'available') return { ok: false, reason: status }
    const normalized = slug.trim().toLowerCase()
    const { error } = await tbl('tenants')
      .update({ slug: normalized, slug_status: 'active' }).eq('id', DEFAULT_TENANT_ID)
    if (error) throw error
    await writeAudit('tenant slug changed', { slug: normalized }, actorName)
    return { ok: true }
  }, { ok: false, reason: 'invalid' as SlugCheck })
}
