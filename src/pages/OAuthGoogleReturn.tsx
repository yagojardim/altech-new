// Rota /oauth/google-calendar/return — recebe o código de uso único do gateway,
// entrega à edge function autenticada e devolve o resultado ao popup de origem.
import { useEffect, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { GOOGLE_CONNECTOR_ID } from '@/lib/googleCalendar'
import { T } from '@/components/ds/tokens'

export default function OAuthGoogleReturn() {
  const [message, setMessage] = useState('Concluindo a conexão com o Google Agenda…')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const notify = (type: 'appUserConnectorOAuthComplete' | 'appUserConnectorOAuthFailed', reason?: string) => {
      window.opener?.postMessage({ type, connectorId: GOOGLE_CONNECTOR_ID, reason }, window.location.origin)
    }

    if (params.get('success') !== 'true') {
      const reason = params.get('error') ?? 'A autorização não foi concluída.'
      setMessage(reason)
      notify('appUserConnectorOAuthFailed', reason)
      window.close()
      return
    }

    const code = params.get('code')
    if (!code) {
      if (params.get('offline_access_allowed') === 'false') {
        const reason = 'Esta conexão não pode ser usada: um administrador do workspace precisa habilitar o acesso offline no cliente do conector.'
        setMessage(reason)
        notify('appUserConnectorOAuthFailed', reason)
        return
      }
      const reason = 'A autorização terminou sem código de troca.'
      setMessage(reason)
      notify('appUserConnectorOAuthFailed', reason)
      window.close()
      return
    }

    void supabase.functions.invoke('gcal-oauth-complete', { body: { code } })
      .then(({ error }) => {
        if (error) throw error
        notify('appUserConnectorOAuthComplete')
        window.close()
      })
      .catch(() => {
        const reason = 'Não foi possível finalizar a conexão.'
        setMessage(reason)
        notify('appUserConnectorOAuthFailed', reason)
        window.close()
      })
  }, [])

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: T.bgPage, color: T.text1, fontSize: 14, padding: 24, textAlign: 'center',
    }}>
      {message}
    </div>
  )
}
