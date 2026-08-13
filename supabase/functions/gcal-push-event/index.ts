// Cria/atualiza no Google Calendar um evento nativo do Altech (push app → Google).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { callAsAppUser } from '../_shared/appUserConnector.ts'
import { getConnectionKeyForUser } from '../_shared/appUserConnections.ts'

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev'
const CONNECTOR_ID = 'google_calendar'

interface PushBody {
  externalId?: unknown
  title?: unknown
  startIso?: unknown
  endIso?: unknown
  allDay?: unknown
  description?: unknown
  location?: unknown
  guests?: unknown
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function dayPart(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
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

    const body = await req.json().catch(() => ({})) as PushBody
    const title = typeof body.title === 'string' ? body.title.trim() : ''
    const startIso = typeof body.startIso === 'string' ? body.startIso : ''
    const endIso = typeof body.endIso === 'string' ? body.endIso : ''
    if (!title || Number.isNaN(Date.parse(startIso)) || Number.isNaN(Date.parse(endIso))) {
      return json({ error: 'Evento inválido' }, 400)
    }
    const externalId = typeof body.externalId === 'string' && body.externalId ? body.externalId : null
    const allDay = body.allDay === true

    const connectionAPIKey = await getConnectionKeyForUser(user.id, CONNECTOR_ID)
    if (!connectionAPIKey) return json({ connected: false })

    const guests = Array.isArray(body.guests)
      ? body.guests
          .map(g => (g && typeof g === 'object' ? (g as { email?: unknown }).email : null))
          .filter((e): e is string => typeof e === 'string' && e.includes('@'))
          .map(email => ({ email }))
      : []

    const payload = {
      summary: title,
      description: typeof body.description === 'string' ? body.description : undefined,
      location: typeof body.location === 'string' ? body.location : undefined,
      start: allDay ? { date: dayPart(startIso) } : { dateTime: new Date(startIso).toISOString() },
      end: allDay ? { date: dayPart(endIso) } : { dateTime: new Date(endIso).toISOString() },
      attendees: guests.length > 0 ? guests : undefined,
    }

    const path = externalId
      ? `/calendar/v3/calendars/primary/events/${encodeURIComponent(externalId)}`
      : '/calendar/v3/calendars/primary/events'

    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path,
      init: {
        method: externalId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      },
    })
    if (!res.ok) {
      const details = await res.text()
      console.error(`gcal-push-event provider call failed [${res.status}]: ${details}`)
      return json({ error: 'Falha ao gravar no Google Agenda', status: res.status, details }, res.status)
    }
    const created = await res.json() as { id?: string; hangoutLink?: string }
    return json({ connected: true, externalId: created.id ?? externalId, meetLink: created.hangoutLink ?? null })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gcal-push-event failed:', message)
    return json({ error: message }, 500)
  }
})
