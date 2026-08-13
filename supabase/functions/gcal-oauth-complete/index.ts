// Troca o código de uma só vez pela connection key e a grava cifrada para o usuário.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { exchangeAppUserOAuthCode } from '../_shared/appUserConnector.ts'
import { saveConnectionKeyForUser } from '../_shared/appUserConnections.ts'

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev'
const CONNECTOR_ID = 'google_calendar'

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } },
    )
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return json({ error: 'Sign in required' }, 401)

    const body = await req.json().catch(() => ({})) as { code?: unknown }
    const code = typeof body.code === 'string' ? body.code : ''
    if (!code) return json({ error: 'code ausente' }, 400)

    const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code)
    if (connectorId !== CONNECTOR_ID) return json({ error: 'Conector inesperado' }, 400)

    await saveConnectionKeyForUser(user.id, connectorId, connectionAPIKey)
    return json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gcal-oauth-complete failed:', message)
    return json({ error: message }, 500)
  }
})
