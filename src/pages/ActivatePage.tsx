import { useEffect, useState } from 'react'
import { T } from '../components/ds/tokens'
import { validateToken, type TokenState } from '../data/db/activationTokens'

interface Props {
  token: string
  /** Usuário autenticado? controla o CTA do estado "valid". */
  authenticated: boolean
  onDefinePassword: () => void
  onGoToLogin: () => void
}

const MESSAGES: Record<Exclude<TokenState, 'valid'>, string> = {
  expired: 'Este link expirou. Solicite um novo ao administrador.',
  used:    'Este link já foi utilizado.',
  invalid: 'Link inválido.',
}

export default function ActivatePage({ token, authenticated, onDefinePassword, onGoToLogin }: Props) {
  const [state, setState] = useState<TokenState | 'loading'>('loading')

  useEffect(() => {
    let alive = true
    validateToken(token).then(r => { if (alive) setState(r.state) })
    return () => { alive = false }
  }, [token])

  const box: React.CSSProperties = {
    width: '100%', maxWidth: 420, background: T.bgSurface, border: `1px solid ${T.border}`,
    borderRadius: 14, padding: 28, textAlign: 'center',
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={box}>
        {state === 'loading' && <p style={{ fontSize: 13, color: T.text3 }}>Validando link…</p>}

        {state === 'valid' && (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: T.text1, marginBottom: 8 }}>Link válido</h1>
            {authenticated ? (
              <>
                <p style={{ fontSize: 13, color: T.text3, marginBottom: 18 }}>
                  Você pode definir sua nova senha agora.
                </p>
                <button onClick={onDefinePassword} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: T.accent, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Definir senha
                </button>
              </>
            ) : (
              <>
                <p style={{ fontSize: 13, color: T.text3, marginBottom: 18 }}>
                  Entre com o e-mail e a senha temporária que você recebeu. Em seguida, será
                  solicitado que você crie uma nova senha.
                </p>
                <button onClick={onGoToLogin} style={{ padding: '10px 18px', borderRadius: 9, border: 'none', background: T.accent, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Ir para o login
                </button>
              </>
            )}
          </>
        )}

        {state !== 'loading' && state !== 'valid' && (
          <>
            <h1 style={{ fontSize: 19, fontWeight: 700, color: T.crit, marginBottom: 8 }}>Não foi possível continuar</h1>
            <p style={{ fontSize: 13, color: T.text3, marginBottom: 18 }}>{MESSAGES[state]}</p>
            <button onClick={onGoToLogin} style={{ padding: '10px 18px', borderRadius: 9, background: 'transparent', border: `1px solid ${T.border2}`, color: T.text2, fontSize: 13, cursor: 'pointer' }}>
              Voltar ao login
            </button>
          </>
        )}
      </div>
    </div>
  )
}
