import { useEffect, useState } from 'react'
import { T } from '../components/ds/tokens'
import { supabase } from '../integrations/supabase/client'
import { safeCall, logger } from '../utils/logger'
import { auditPasswordResetCompleted, requestPasswordReset } from '../lib/passwordReset'
import { markPasswordChanged } from '../data/db/activationTokens'

interface Props {
  /** Volta para o login (limpa a rota). */
  onGoToLogin: () => void
  /** Chamado após a troca com sucesso. */
  onDone: () => void
}

const RULES = [
  { key: 'len',   label: 'Mínimo de 12 caracteres', test: (v: string) => v.length >= 12 },
  { key: 'upper', label: 'Uma letra maiúscula',      test: (v: string) => /[A-Z]/.test(v) },
  { key: 'lower', label: 'Uma letra minúscula',      test: (v: string) => /[a-z]/.test(v) },
  { key: 'digit', label: 'Um número',                test: (v: string) => /[0-9]/.test(v) },
  { key: 'spec',  label: 'Um caractere especial',    test: (v: string) => /[^A-Za-z0-9]/.test(v) },
]

type Phase = 'checking' | 'ready' | 'invalid' | 'done'

export default function ResetPasswordPage({ onGoToLogin, onDone }: Props) {
  const [phase, setPhase] = useState<Phase>('checking')
  const [pwd, setPwd] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resendMail, setResendMail] = useState('')
  const [resent, setResent] = useState(false)

  useEffect(() => {
    let settled = false
    const resolve = (p: Phase) => { if (!settled) { settled = true; setPhase(p) } }

    // O Supabase emite PASSWORD_RECOVERY ao processar o link do e-mail.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && session)) resolve('ready')
    })

    // Fallback: sessão já materializada antes do listener montar.
    ;(async () => {
      const has = await safeCall('resetPassword.getSession', async () => {
        const { data } = await supabase.auth.getSession()
        return Boolean(data.session)
      }, false)
      if (has) resolve('ready')
    })()

    const t = window.setTimeout(() => resolve('invalid'), 4000)
    return () => { window.clearTimeout(t); sub.subscription.unsubscribe() }
  }, [])

  const score = RULES.filter(r => r.test(pwd)).length
  const allRulesOk = score === RULES.length
  const matches = pwd.length > 0 && pwd === confirm
  const canSubmit = allRulesOk && matches && !busy
  const barColor = score <= 2 ? T.crit : score < RULES.length ? T.warn : T.success
  const barLabel = score <= 2 ? 'Fraca' : score < RULES.length ? 'Média' : 'Forte'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setBusy(true); setError(null)
    try {
      const { error: upErr } = await supabase.auth.updateUser({ password: pwd })
      if (upErr) {
        logger.warn('resetPassword.updateUser', upErr.message)
        setError('Não foi possível atualizar a senha. O link pode ter expirado.')
        setBusy(false)
        return
      }
      const userId = await safeCall('resetPassword.getUser', async () => {
        const { data } = await supabase.auth.getUser()
        return data.user?.id ?? null
      }, null)
      if (userId) await safeCall('resetPassword.mustChange', () => markPasswordChanged(userId), false)
      await auditPasswordResetCompleted({})
      setPhase('done')
      setBusy(false)
    } catch (err) {
      logger.error('resetPassword.submit', err)
      setError('Não foi possível atualizar a senha agora.')
      setBusy(false)
    }
  }

  async function handleResend(e: React.FormEvent) {
    e.preventDefault()
    await requestPasswordReset(resendMail)
    setResent(true)
  }

  const card: React.CSSProperties = {
    width: '100%', maxWidth: 420, background: T.bgSurface,
    border: `1px solid ${T.border}`, borderRadius: 14, padding: 28,
  }
  const input: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box', padding: '10px 12px', borderRadius: 8,
    background: T.bgSurface2, border: `1px solid ${T.border2}`, color: T.text1, fontSize: 13,
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bgPage, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      {phase === 'checking' && (
        <div style={{ ...card, textAlign: 'center', color: T.text3, fontSize: 13 }}>
          Validando o link de recuperação…
        </div>
      )}

      {phase === 'invalid' && (
        <form onSubmit={handleResend} style={card}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text1, margin: '0 0 6px' }}>Link inválido ou expirado</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '0 0 18px' }}>
            Este link de redefinição não é mais válido. Solicite um novo abaixo.
          </p>
          {resent ? (
            <div style={{ background: T.successDim, border: `1px solid ${T.success}40`, borderRadius: 8, padding: 10, fontSize: 12, color: T.success, marginBottom: 16 }}>
              Se o e-mail existir, enviaremos um link de redefinição.
            </div>
          ) : (
            <>
              <label style={{ fontSize: 12, color: T.text2, display: 'block', marginBottom: 6 }}>E-mail</label>
              <input type="email" value={resendMail} autoComplete="email" placeholder="voce@empresa.com"
                onChange={e => setResendMail(e.target.value)} style={{ ...input, marginBottom: 16 }} />
              <button type="submit" disabled={!resendMail}
                style={{ width: '100%', height: 42, borderRadius: 8, border: 'none', background: resendMail ? T.accent : T.bgSurface2, color: resendMail ? 'white' : T.text3, fontWeight: 600, fontSize: 14, cursor: resendMail ? 'pointer' : 'not-allowed', marginBottom: 12 }}>
                Enviar novo link
              </button>
            </>
          )}
          <button type="button" onClick={onGoToLogin}
            style={{ width: '100%', height: 38, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, cursor: 'pointer' }}>
            Voltar ao login
          </button>
        </form>
      )}

      {phase === 'done' && (
        <div style={{ ...card, textAlign: 'center' }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text1, margin: '0 0 6px' }}>Senha redefinida</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '0 0 20px' }}>Sua nova senha já está ativa.</p>
          <button type="button" onClick={onDone}
            style={{ width: '100%', height: 42, borderRadius: 8, border: 'none', background: T.accent, color: 'white', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
            Continuar
          </button>
        </div>
      )}

      {phase === 'ready' && (
        <form onSubmit={handleSubmit} style={card}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: T.text1, margin: '0 0 6px' }}>Definir nova senha</h1>
          <p style={{ fontSize: 13, color: T.text3, margin: '0 0 20px' }}>
            Escolha uma senha forte para acessar o Altech Project.
          </p>

          <label style={{ fontSize: 12, color: T.text2, display: 'block', marginBottom: 6 }}>Nova senha</label>
          <input type="password" value={pwd} autoComplete="new-password"
            onChange={e => setPwd(e.target.value)} style={{ ...input, marginBottom: 12 }} />

          <div style={{ height: 6, borderRadius: 3, background: T.bgSurface2, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ width: `${(score / RULES.length) * 100}%`, height: '100%', background: barColor, transition: 'width .2s' }} />
          </div>
          <div style={{ fontSize: 11, color: barColor, marginBottom: 12 }}>Força: {barLabel}</div>

          <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px' }}>
            {RULES.map(r => {
              const ok = r.test(pwd)
              return (
                <li key={r.key} style={{ fontSize: 11.5, color: ok ? T.success : T.text3, marginBottom: 4 }}>
                  {ok ? '✓' : '○'} {r.label}
                </li>
              )
            })}
          </ul>

          <label style={{ fontSize: 12, color: T.text2, display: 'block', marginBottom: 6 }}>Confirmar senha</label>
          <input type="password" value={confirm} autoComplete="new-password"
            onChange={e => setConfirm(e.target.value)} style={{ ...input, marginBottom: 8 }} />
          {confirm.length > 0 && !matches && (
            <div style={{ fontSize: 11.5, color: T.crit, marginBottom: 8 }}>As senhas não coincidem.</div>
          )}

          {error && (
            <div style={{ background: T.critDim, border: `1px solid ${T.crit}30`, borderRadius: 8, padding: 10, fontSize: 12, color: T.crit, marginBottom: 12 }}>
              ⚠ {error}
            </div>
          )}

          <button type="submit" disabled={!canSubmit}
            style={{ width: '100%', height: 42, borderRadius: 8, border: 'none', background: canSubmit ? T.accent : T.bgSurface2, color: canSubmit ? 'white' : T.text3, fontWeight: 600, fontSize: 14, cursor: canSubmit ? 'pointer' : 'not-allowed', marginBottom: 12 }}>
            {busy ? 'Salvando…' : 'Salvar nova senha'}
          </button>
          <button type="button" onClick={onGoToLogin}
            style={{ width: '100%', height: 38, borderRadius: 8, background: 'transparent', border: `1px solid ${T.border}`, color: T.text2, fontSize: 13, cursor: 'pointer' }}>
            Cancelar
          </button>
        </form>
      )}
    </div>
  )
}
