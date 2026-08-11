/* eslint-disable @typescript-eslint/no-explicit-any */
// Fluxo nativo de reset de senha do Supabase Auth.
// NUNCA logar e-mail, token ou senha.
import { supabase } from '../integrations/supabase/client'
import { safeCall, logger } from '../utils/logger'

function tbl(name: string): any {
  return (supabase as unknown as { from: (t: string) => any }).from(name)
}

export const RESET_PATH = '/reset-password'

export function resetRedirectUrl(): string {
  if (typeof window === 'undefined') return RESET_PATH
  return `${window.location.origin}${RESET_PATH}`
}

/**
 * Dispara o e-mail nativo de recuperação.
 * Sempre resolve como sucesso do ponto de vista da UI (mensagem neutra),
 * para não revelar se o e-mail existe.
 */
export async function requestPasswordReset(email: string): Promise<{ ok: boolean }> {
  const mail = email.trim().toLowerCase()
  if (!mail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail)) return { ok: false }
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(mail, {
      redirectTo: resetRedirectUrl(),
    })
    if (error) logger.warn('passwordReset.request', error.message)
  } catch (err) {
    logger.error('passwordReset.request', err)
  }
  return { ok: true }
}

/** audit_logs do reset concluído — sem e-mail em claro nem token. */
export async function auditPasswordResetCompleted(
  opts: { tenantId?: string | null; profileId?: string | null } = {},
): Promise<void> {
  await safeCall('passwordReset.audit', async () => {
    await tbl('audit_logs').insert({
      tenant_id: opts.tenantId ?? null,
      entity_type: 'auth',
      entity_id: opts.profileId ?? null,
      action: 'password_reset_completed',
      actor_name: null,
      before: null,
      after: { via: 'supabase_recovery' },
    })
  }, undefined)
}
