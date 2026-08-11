// Pré-login do Portal do Cliente: valida o acesso lendo client_portal_users
// server-side (service_role) e devolve APENAS o mínimo para iniciar a sessão.
// Nunca expõe linhas de outros tenants/clientes nem credenciais.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

const WINDOW_MS = 60_000
const MAX_HITS = 15
const hits = new Map<string, { count: number; resetAt: number }>()

function rateLimited(ip: string): boolean {
  const now = Date.now()
  const cur = hits.get(ip)
  if (!cur || cur.resetAt < now) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return false
  }
  cur.count += 1
  return cur.count > MAX_HITS
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

interface PortalRow {
  id: string
  tenant_id: string
  project_id: string
  name: string
  email: string
  portal_role: 'viewer' | 'portal-admin'
  can_approve: boolean
  can_preview: boolean
  can_comment: boolean
  password_must_change: boolean
  status: string
  archived_at: string | null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(ip)) return json({ ok: false, error: 'rate_limited' }, 429)

  let email = ''
  try {
    const body = await req.json()
    email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
  } catch {
    return json({ ok: false, error: 'invalid_body' }, 400)
  }
  if (!email || email.length > 320 || !email.includes('@')) {
    return json({ ok: false, error: 'invalid_credentials' }, 400)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const { data, error } = await supabase
      .from('client_portal_users')
      .select('id, tenant_id, project_id, name, email, portal_role, can_approve, can_preview, can_comment, password_must_change, status, archived_at')
      .ilike('email', email)
      .is('archived_at', null)

    if (error) throw error
    const rows = (data ?? []) as PortalRow[]
    if (rows.length === 0) return json({ ok: false, error: 'invalid_credentials' }, 401)

    // Todas as linhas pertencem ao mesmo e-mail; consolidamos no tenant da primeira.
    const tenantId = rows[0].tenant_id
    const scoped = rows.filter(r => r.tenant_id === tenantId)

    return json({
      ok: true,
      user: {
        id: scoped[0].id,
        name: scoped[0].name,
        email: scoped[0].email,
        tenantId,
        permission: scoped.some(r => r.portal_role === 'portal-admin') ? 'admin' : 'viewer',
        mustChangePassword: scoped.some(r => r.password_must_change),
        canApprove: scoped.some(r => r.can_approve),
        canPreview: scoped.some(r => r.can_preview),
        canComment: scoped.some(r => r.can_comment),
        projectIds: scoped.map(r => r.project_id),
      },
    })
  } catch (err) {
    console.error('client-portal-login failed', (err as Error)?.message)
    return json({ ok: false, error: 'server_error' }, 500)
  }
})
