// Pré-login: valida o link /activate sem expor a tabela activation_tokens.
// Roda server-side com service_role. NUNCA loga o token nem devolve dados sensíveis.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'

type TokenState = 'valid' | 'expired' | 'used' | 'invalid'

// Rate-limit básico em memória (por instância): 20 tentativas / 60s por IP.
const WINDOW_MS = 60_000
const MAX_HITS = 20
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

async function sha256Hex(raw: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw))
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('')
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ state: 'invalid' as TokenState }, 405)

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (rateLimited(ip)) return json({ state: 'invalid' as TokenState, error: 'rate_limited' }, 429)

  let token = ''
  try {
    const body = await req.json()
    token = typeof body?.token === 'string' ? body.token.trim() : ''
  } catch {
    return json({ state: 'invalid' as TokenState }, 400)
  }
  if (!token || token.length > 512) return json({ state: 'invalid' as TokenState })

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } },
    )

    const token_hash = await sha256Hex(token)
    const { data, error } = await supabase
      .from('activation_tokens')
      .select('expires_at, used_at')
      .eq('token_hash', token_hash)
      .limit(1)

    if (error) throw error
    const row = (data ?? [])[0] as { expires_at: string; used_at: string | null } | undefined

    let state: TokenState = 'valid'
    if (!row) state = 'invalid'
    else if (row.used_at) state = 'used'
    else if (new Date(row.expires_at).getTime() < Date.now()) state = 'expired'

    return json({ state })
  } catch (err) {
    console.error('validate-activation failed', (err as Error)?.message)
    return json({ state: 'invalid' as TokenState, error: 'server_error' }, 500)
  }
})
