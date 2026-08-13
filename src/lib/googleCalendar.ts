// Cliente do conector Google Calendar (App User Connector do Lovable).
// Todas as chamadas ao gateway acontecem em edge functions — o browser só invoca as funções.
import { supabase } from '@/integrations/supabase/client'
import { logger } from '@/utils/logger'

export const GOOGLE_CONNECTOR_ID = 'google_calendar'
export const GOOGLE_RETURN_PATH = '/oauth/google-calendar/return'

export interface GoogleStatus {
  connected: boolean
  email?: string
  error?: string
}

export interface GoogleRemoteEvent {
  externalId: string
  title: string
  startIso: string
  endIso: string
  allDay: boolean
  description: string | null
  location: string | null
  meetLink: string | null
  guests: { name: string; email: string }[]
}

function errMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message
  return fallback
}

/** Estado da conexão do usuário atual. Degrada para desconectado. */
export async function getGoogleStatus(): Promise<GoogleStatus> {
  try {
    const { data, error } = await supabase.functions.invoke('gcal-status')
    if (error) throw error
    const res = data as GoogleStatus
    return { connected: Boolean(res?.connected), email: res?.email, error: res?.error }
  } catch (err) {
    logger.warn('googleCalendar.status', 'falha ao consultar o conector', { err: errMessage(err, '') })
    return { connected: false, error: 'Conector Google indisponível no momento.' }
  }
}

function waitForOAuthCompletion(popup: Window): Promise<void> {
  return new Promise((resolve, reject) => {
    let poll: number | undefined
    const cleanup = () => {
      window.removeEventListener('message', onMessage)
      if (poll !== undefined) window.clearInterval(poll)
    }
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; connectorId?: string; reason?: string } | null
      const type = data?.type
      if (
        event.origin !== window.location.origin ||
        event.source !== popup ||
        data?.connectorId !== GOOGLE_CONNECTOR_ID ||
        (type !== 'appUserConnectorOAuthComplete' && type !== 'appUserConnectorOAuthFailed')
      ) return
      cleanup()
      if (type === 'appUserConnectorOAuthComplete') { resolve(); return }
      popup.close()
      reject(new Error(data?.reason ?? 'A conexão com o Google não foi concluída.'))
    }
    window.addEventListener('message', onMessage)
    poll = window.setInterval(() => {
      if (!popup.closed) return
      cleanup()
      reject(new Error('A janela do Google foi fechada antes de concluir.'))
    }, 500)
  })
}

/** Abre o consentimento do Google em popup. Resolve quando a chave é gravada. */
export async function connectGoogle(): Promise<void> {
  const popup = window.open('', 'lovable-oauth-google-calendar', 'width=600,height=720')
  if (!popup) throw new Error('Popup bloqueado. Libere popups e tente novamente.')
  try {
    const { data, error } = await supabase.functions.invoke('gcal-oauth-start', {
      body: { origin: window.location.origin },
    })
    if (error) throw error
    const url = (data as { authorizationUrl?: string })?.authorizationUrl
    if (!url) throw new Error('Conector Google indisponível. Tente novamente mais tarde.')
    const completion = waitForOAuthCompletion(popup)
    popup.location.href = url
    await completion
  } catch (err) {
    popup.close()
    throw new Error(errMessage(err, 'Não foi possível conectar ao Google Agenda.'))
  }
}

export async function disconnectGoogle(): Promise<void> {
  const { error } = await supabase.functions.invoke('gcal-disconnect')
  if (error) throw new Error(errMessage(error, 'Não foi possível desconectar.'))
}

/** Eventos reais do Google Calendar do usuário na janela informada. */
export async function fetchGoogleEvents(timeMin: string, timeMax: string): Promise<GoogleRemoteEvent[]> {
  const { data, error } = await supabase.functions.invoke('gcal-list-events', {
    body: { timeMin, timeMax },
  })
  if (error) throw new Error(errMessage(error, 'Falha ao ler o Google Agenda.'))
  const res = data as { connected?: boolean; events?: GoogleRemoteEvent[]; error?: string }
  if (res?.error) throw new Error(res.error)
  return res?.events ?? []
}

export interface GooglePushInput {
  externalId?: string
  title: string
  startIso: string
  endIso: string
  allDay: boolean
  description?: string
  location?: string
  guests?: { name: string; email: string }[]
}

/** Cria/atualiza o evento no Google. Retorna o external_id, ou null se não sincronizado. */
export async function pushEventToGoogle(input: GooglePushInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.functions.invoke('gcal-push-event', { body: input })
    if (error) throw error
    const res = data as { connected?: boolean; externalId?: string }
    if (!res?.connected) return null
    return res.externalId ?? null
  } catch (err) {
    logger.warn('googleCalendar.push', 'falha ao enviar evento ao Google', { err: errMessage(err, '') })
    return null
  }
}
