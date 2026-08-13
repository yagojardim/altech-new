// Lê os eventos da agenda principal do usuário no Google Calendar (janela de datas).
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors'
import { callAsAppUser } from '../_shared/appUserConnector.ts'
import { getConnectionKeyForUser } from '../_shared/appUserConnections.ts'

const GATEWAY_BASE_URL = 'https://connector-gateway.lovable.dev'
const CONNECTOR_ID = 'google_calendar'

interface GoogleEventDate { date?: string; dateTime?: string }
interface GoogleEvent {
  id?: string
  status?: string
  summary?: string
  description?: string
  location?: string
  hangoutLink?: string
  htmlLink?: string
  start?: GoogleEventDate
  end?: GoogleEventDate
  attendees?: { email?: string; displayName?: string }[]
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isoOf(d: GoogleEventDate | undefined, fallback: string): string {
  if (d?.dateTime) return new Date(d.dateTime).toISOString()
  if (d?.date) return new Date(`${d.date}T00:00:00`).toISOString()
  return fallback
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

    const body = await req.json().catch(() => ({})) as { timeMin?: unknown; timeMax?: unknown }
    const now = new Date()
    const defMin = new Date(now.getTime() - 30 * 864e5).toISOString()
    const defMax = new Date(now.getTime() + 90 * 864e5).toISOString()
    const timeMin = typeof body.timeMin === 'string' && !Number.isNaN(Date.parse(body.timeMin))
      ? new Date(body.timeMin).toISOString() : defMin
    const timeMax = typeof body.timeMax === 'string' && !Number.isNaN(Date.parse(body.timeMax))
      ? new Date(body.timeMax).toISOString() : defMax

    const connectionAPIKey = await getConnectionKeyForUser(user.id, CONNECTOR_ID)
    if (!connectionAPIKey) return json({ connected: false, events: [] })

    const qs = new URLSearchParams({
      timeMin, timeMax, singleEvents: 'true', orderBy: 'startTime', maxResults: '250',
    })
    const res = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL,
      connectionAPIKey,
      connectorId: CONNECTOR_ID,
      path: `/calendar/v3/calendars/primary/events?${qs.toString()}`,
    })
    if (!res.ok) {
      const details = await res.text()
      console.error(`gcal-list-events provider call failed [${res.status}]: ${details}`)
      return json({ error: 'Falha ao ler o Google Agenda', status: res.status, details }, res.status)
    }
    const payload = await res.json() as { items?: GoogleEvent[] }
    const events = (payload.items ?? [])
      .filter(e => e.id && e.status !== 'cancelled')
      .map(e => {
        const allDay = Boolean(e.start?.date && !e.start?.dateTime)
        const startIso = isoOf(e.start, new Date().toISOString())
        return {
          externalId: e.id as string,
          title: e.summary ?? '(sem título)',
          startIso,
          endIso: isoOf(e.end, startIso),
          allDay,
          description: e.description ?? null,
          location: e.location ?? null,
          meetLink: e.hangoutLink ?? null,
          guests: (e.attendees ?? [])
            .filter(a => a.email)
            .map(a => ({ name: a.displayName ?? a.email ?? '', email: a.email ?? '' })),
        }
      })
    return json({ connected: true, events })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('gcal-list-events failed:', message)
    return json({ error: message }, 500)
  }
})
