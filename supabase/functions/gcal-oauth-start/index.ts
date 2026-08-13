// Inicia o consentimento OAuth do Google Calendar para o usuário autenticado.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { authorizeAppUserOAuth } from '../_shared/appUserConnector.ts'
import { getConnectionKeyForUser } from '../_shared/appUserConnections.ts'

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev'
const CONNECTOR_ID = 'google_calendar'
const SCOPES = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
]

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

    const clientAPIKey = Deno.env.get('GOOGLE_CALENDAR_APP_USER_CONNECTOR_CLIENT_API_KEY')
    if (!clientAPIKey) return json({ error: 'Conector Google Calendar não configurado.' }, 500)

    const body = await req.json().catch(() => ({})) as { origin?: unknown }
    const origin = typeof body.origin === 'string' ? body.origin : ''
    if (!origin || !/^https?:\/\//.test(origin)) return json({ error: 'origin inválido' }, 400)

    const returnUrl = new URL('/oauth/google-calendar/return', origin).toString()
    const connectionAPIKey = await getConnectionKeyForUser(user.id, CONNECTOR_ID)

    const { authorizationUrl } = await authorizeAppUserOAuth({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectorId: CONNECTOR_ID,
      appUserId: user.id,
      clientAPIKey,
      returnUrl,
      connectionAPIKey: connectionAPIKey ?? undefined,
      credentialsConfiguration: { scopes: SCOPES },
    })
    return json({ authorizationUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gcal-oauth-start failed:', message)
    return json({ error: message }, 500)
  }
})
