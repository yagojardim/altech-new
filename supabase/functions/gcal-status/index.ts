// Estado da conexão Google Calendar do usuário autenticado (conectado + e-mail da agenda).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { callAsAppUser } from '../_shared/appUserConnector.ts'
import { getConnectionKeyForUser } from '../_shared/appUserConnections.ts'

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

    const connectionAPIKey = await getConnectionKeyForUser(user.id, CONNECTOR_ID)
    if (!connectionAPIKey) return json({ connected: false })

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: '/calendar/v3/calendars/primary',
    })
    if (!res.ok) {
      const details = await res.text()
      console.error(`gcal-status provider call failed [${res.status}]: ${details}`)
      return json({ connected: false, error: 'Falha ao consultar o Google Agenda.' })
    }
    const cal = await res.json() as { id?: string; summary?: string }
    return json({ connected: true, email: cal.id ?? cal.summary ?? '' })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gcal-status failed:', message)
    return json({ connected: false, error: message }, 500)
  }
})
