import { useEffect, useState } from 'react'
import { Modal } from './ds/Modal'
import { Button } from './ds/Button'
import { InputField } from './ds/Input'
import { T } from './ds/tokens'
import { useSession } from '../data/SessionContext'
import {
  getAdminMasterState, reconcileAdminMaster, electSelf,
  inviteAsAdminMaster, remindLater, type AdminMasterState,
} from '../data/db/adminMaster'
import { copyToClipboard } from '../utils/copyToClipboard'
import { logger } from '../utils/logger'

type Mode = 'choice' | 'invite' | 'link' | 'auto'

/**
 * Overlay de eleição autônoma do Admin Master.
 * Aparece a cada acesso enquanto tenant_settings.admin_master_status = 'pending'.
 */
export function AdminMasterOverlay() {
  const { activeUser, status } = useSession()
  const [state, setState] = useState<AdminMasterState | null>(null)
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<Mode>('choice')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    let alive = true
    if (status !== 'authenticated' && status !== 'inspection') return
    void (async () => {
      try {
        // Avaliação preguiçosa no login (mesmo padrão do reconcileExpiries dos trials).
        const reconciled = await reconcileAdminMaster()
        const current = reconciled.autoElected ? reconciled : await getAdminMasterState()
        if (!alive) return
        setState(current)
        if (reconciled.autoElected) { setMode('auto'); setOpen(true) }
        else if (current.status === 'pending') { setMode('choice'); setOpen(true) }
      } catch (err) {
        logger.error('AdminMasterOverlay.load', err)
      } finally {
        if (alive) setLoaded(true)
      }
    })()
    return () => { alive = false }
  }, [status])

  // Só renderiza depois que o estado carregou — nunca bloqueia o app.
  if (!loaded || !open || !state) return null

  const days = state.daysRemaining

  async function handleSelf() {
    setBusy(true); setError(null)
    const ok = await electSelf(activeUser.user_id)
    setBusy(false)
    if (!ok) { setError('Não foi possível definir o Admin Master. Tente novamente.'); return }
    setOpen(false)
  }

  async function handleInvite() {
    setBusy(true); setError(null)
    const res = await inviteAsAdminMaster(email, name, activeUser.user_id)
    setBusy(false)
    if (!res.ok) { setError(res.reason ?? 'Não foi possível concluir o convite.'); return }
    setLink(res.link ?? '')
    setMode('link')
  }

  async function handleLater() {
    setBusy(true)
    await remindLater(activeUser.user_id, days)
    setBusy(false)
    setOpen(false)
  }

  return (
    <Modal
      open
      onClose={() => { if (mode === 'auto' || mode === 'link') setOpen(false) }}
      closeOnBackdrop={false}
      size={mode === 'auto' ? 'sm' : 'md'}
      title={mode === 'auto' ? 'Admin Master definido automaticamente' : 'Defina o Admin Master do tenant'}
      subtitle={
        mode === 'auto'
          ? undefined
          : `O Admin Master é o proprietário desta conta. Faltam ${days} dia${days === 1 ? '' : 's'} até a eleição automática.`
      }
    >
      <div className="px-6 py-5 flex flex-col gap-4">
        {mode === 'auto' && (
          <>
            <p className="text-[13px] leading-relaxed" style={{ color: T.text2 }}>
              O prazo para definir o Admin Master expirou. Sua conta de cadastro foi elevada
              automaticamente a <strong style={{ color: T.text1 }}>Admin Master</strong>.
            </p>
            <div className="flex justify-end">
              <Button variant="primary" onClick={() => setOpen(false)}>Entendi</Button>
            </div>
          </>
        )}

        {mode === 'choice' && (
          <>
            <div
              className="rounded-lg px-3 py-2 text-[12px]"
              style={{
                background: days <= 2 ? T.warnDim : T.accentDim,
                border: `1px solid ${days <= 2 ? T.warn : T.accentBorder}`,
                color: days <= 2 ? T.warn : T.text2,
              }}
            >
              Se ninguém for definido em {days} dia{days === 1 ? '' : 's'}, a conta de cadastro será
              elevada automaticamente a Admin Master.
            </div>
            <p className="text-[13px] leading-relaxed" style={{ color: T.text2 }}>
              O Admin Master gerencia usuários, papéis e configurações do tenant. Só pode haver um por conta.
            </p>
            {error && <p className="text-[12px]" style={{ color: T.crit }}>{error}</p>}
            <div className="flex flex-col gap-2">
              <Button variant="primary" disabled={busy} onClick={handleSelf}>
                Usar minha conta atual ({activeUser.email})
              </Button>
              <Button variant="secondary" disabled={busy} onClick={() => { setMode('invite'); setError(null) }}>
                Cadastrar outro e-mail
              </Button>
              <Button variant="ghost" disabled={busy} onClick={handleLater}>
                Agora não
              </Button>
            </div>
          </>
        )}

        {mode === 'invite' && (
          <>
            <InputField
              label="Nome"
              value={name}
              placeholder="Nome do Admin Master"
              onChange={e => setName(e.target.value)}
            />
            <InputField
              label="E-mail"
              type="email"
              value={email}
              placeholder="admin@empresa.com"
              onChange={e => setEmail(e.target.value)}
            />
            {error && <p className="text-[12px]" style={{ color: T.crit }}>{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" disabled={busy} onClick={() => setMode('choice')}>Voltar</Button>
              <Button variant="primary" disabled={busy || !email.trim()} onClick={handleInvite}>
                Definir e gerar link
              </Button>
            </div>
          </>
        )}

        {mode === 'link' && (
          <>
            <p className="text-[13px]" style={{ color: T.text2 }}>
              Admin Master definido. Envie o link abaixo para a pessoa criar a senha — ele aparece
              uma única vez.
            </p>
            <div
              className="rounded-lg px-3 py-2 text-[12px] break-all"
              style={{ background: T.bgSurface2, border: `1px solid ${T.border}`, color: T.text1 }}
            >
              {link || 'Link indisponível — gere um novo em Time > Gerar link.'}
            </div>
            <div className="flex justify-end gap-2">
              {link && (
                <Button
                  variant="secondary"
                  onClick={async () => { await copyToClipboard(link); setCopied(true) }}
                >
                  {copied ? 'Copiado' : 'Copiar link'}
                </Button>
              )}
              <Button variant="primary" onClick={() => setOpen(false)}>Concluir</Button>
            </div>
          </>
        )}
      </div>
    </Modal>
  )
}

export default AdminMasterOverlay
