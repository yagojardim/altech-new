import { useState } from 'react'
import { Badge } from './ds/Badge'
import { Avatar } from './ds/Avatar'
import { Button } from './ds/Button'

interface TaskDrawerProps {
  onClose?: () => void
}

const historyEvents = [
  { actor: 'Ana Lima', action: 'Criou a tarefa', date: '10 jun, 14:32', icon: '◉' },
  { actor: 'Rafael Mendes', action: 'Moveu para Em dev', date: '12 jun, 09:15', icon: '→' },
  { actor: 'Lucas Ferreira', action: 'Adicionou comentário', date: '14 jun, 16:47', icon: '💬' },
  { actor: 'Rafael Mendes', action: 'Status alterado para Bloqueado', date: '15 jun, 11:03', icon: '⛔', highlight: true },
]

const comments = [
  {
    author: 'Ana Lima',
    when: '14 jun, 16:47',
    body: 'Precisamos das credenciais do ambiente de produção para prosseguir com a integração OAuth2. @Rafael, você tem acesso ao Vault?',
  },
  {
    author: 'Rafael Mendes',
    when: '14 jun, 18:22',
    body: 'Já abri um ticket com a equipe de infra (INFRA-2041). Eles estimam 2 dias úteis para liberar o acesso.',
  },
  {
    author: 'Lucas Ferreira',
    when: '15 jun, 09:05',
    body: 'Enquanto isso posso avançar com os testes unitários e mocks. Assim que as credenciais chegarem, basta trocar para o ambiente real.',
  },
]

const tags = ['backend', 'auth', 'oauth2', 'bloqueado', 'sprint-14']

const attachments = [
  { name: 'oauth2-flow-diagram.pdf', size: '284 KB', icon: '📄' },
  { name: 'credentials-template.yaml', size: '12 KB', icon: '📋' },
]

const statusOptions = ['backlog', 'in-progress', 'in-review', 'done', 'blocked'] as const

export function TaskDrawer({ onClose }: TaskDrawerProps) {
  const [comment, setComment] = useState('')
  const [status, setStatus] = useState<typeof statusOptions[number]>('blocked')
  const [showStatusMenu, setShowStatusMenu] = useState(false)

  return (
    <div className="w-[420px] h-full bg-[--bg-surface] border-l border-[--border-subtle] shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[--border-subtle] flex-shrink-0">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Status dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowStatusMenu(s => !s)}
              className="flex items-center gap-1"
            >
              <Badge status={status} size="sm" />
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="text-[--text-muted]">
                <path d="M2.5 4L5 6.5L7.5 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {showStatusMenu && (
              <div className="absolute top-full left-0 mt-1 w-44 bg-[--bg-surface] border border-[--border-subtle] rounded-lg shadow-lg z-50 py-1">
                {statusOptions.map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatus(s); setShowStatusMenu(false) }}
                    className="w-full text-left px-3 py-2 hover:bg-[--bg-page] transition-colors"
                  >
                    <Badge status={s} size="sm" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <span className="font-mono text-xs text-[--text-muted]">PM-142</span>
        </div>
        <div className="flex items-center gap-0.5">
          <button className="h-7 px-2 text-xs text-[--text-secondary] hover:bg-[--bg-page] rounded transition-colors">Editar</button>
          <button className="h-7 px-2 text-xs text-[--text-secondary] hover:bg-[--bg-page] rounded transition-colors">Duplicar</button>
          <button className="h-7 px-2 text-xs text-[--text-secondary] hover:bg-[--bg-page] rounded transition-colors">Arquivar</button>
          <button className="h-7 w-7 flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-page] rounded transition-colors text-lg leading-none">···</button>
          <button
            onClick={onClose}
            className="h-7 w-7 flex items-center justify-center text-[--text-muted] hover:text-[--text-primary] hover:bg-[--bg-page] rounded transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M2 2L10 10M10 2L2 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Title */}
        <div className="px-4 pt-4 pb-3 border-b border-[--border-subtle]">
          <h2 className="text-base font-bold text-[--text-primary] leading-snug">
            Autenticação OAuth2 — fluxo completo de autorização e refresh token
          </h2>
        </div>

        {/* Description */}
        <div className="px-4 py-4 border-b border-[--border-subtle] space-y-3">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide">Descrição</p>
          <div className="text-sm text-[--text-secondary] leading-relaxed space-y-2">
            <p>Implementar o <strong className="text-[--text-primary]">fluxo completo de autenticação OAuth2</strong> com suporte a Authorization Code Flow, PKCE e refresh automático de tokens.</p>
            <div className="font-mono text-xs bg-[--bg-page] border border-[--border-subtle] rounded p-3 text-[--text-secondary]">
              <span className="text-[--primary]">POST</span> /oauth/token<br />
              Authorization: Bearer {'{access_token}'}<br />
              Content-Type: application/json
            </div>
            <ul className="list-disc list-inside space-y-1 text-xs">
              <li>Suporte a múltiplos provedores: Google, GitHub, Okta</li>
              <li>Refresh token automático 60s antes do vencimento</li>
              <li>Revogação de sessão e logout global</li>
            </ul>
          </div>
        </div>

        {/* Metadata grid */}
        <div className="px-4 py-4 border-b border-[--border-subtle]">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide mb-3">Detalhes</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {[
              { label: 'Responsável', value: <div className="flex items-center gap-1.5"><Avatar name="Ana Lima" size="xs" /><span className="text-xs text-[--text-primary]">Ana Lima</span></div> },
              { label: 'Reportado por', value: <div className="flex items-center gap-1.5"><Avatar name="Lucas Ferreira" size="xs" /><span className="text-xs text-[--text-primary]">Lucas Ferreira</span></div> },
              { label: 'Sprint', value: <span className="text-xs text-[--text-primary]">Sprint 14</span> },
              { label: 'Estimativa', value: <span className="text-xs text-[--text-primary]">8 pts</span> },
              { label: 'Prioridade', value: <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#FDEAED', color: '#F0455A' }}>P0 — Crítico</span> },
              { label: 'Prazo', value: <span className="text-xs text-[--text-primary]">28 jul 2025</span> },
              { label: 'Criado em', value: <span className="text-xs text-[--text-muted]">10 jun 2025</span> },
              { label: 'Atualizado', value: <span className="text-xs text-[--text-muted]">15 jun 2025</span> },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-[10px] text-[--text-muted] mb-1">{label}</p>
                {value}
              </div>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div className="px-4 py-4 border-b border-[--border-subtle]">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide mb-2">Tags</p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-[--bg-page] border border-[--border-default] text-[--text-secondary] hover:border-[--primary] hover:text-[--primary] cursor-pointer transition-colors">
                {t}
              </span>
            ))}
            <button className="text-xs px-2 py-0.5 rounded-full border border-dashed border-[--border-default] text-[--text-muted] hover:text-[--primary] hover:border-[--primary] transition-colors">
              + Adicionar
            </button>
          </div>
        </div>

        {/* Attachments */}
        <div className="px-4 py-4 border-b border-[--border-subtle]">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide mb-2">Anexos</p>
          <div className="space-y-2">
            {attachments.map(a => (
              <div key={a.name} className="flex items-center gap-2.5 px-3 py-2 rounded-md border border-[--border-subtle] hover:border-[--border-default] hover:bg-[--bg-page] transition-colors cursor-pointer">
                <span className="text-base">{a.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-[--text-primary] truncate">{a.name}</p>
                  <p className="text-[10px] text-[--text-muted]">{a.size}</p>
                </div>
                <button className="text-[--text-muted] hover:text-[--primary] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M6 2v6M3.5 6l2.5 2.5L8.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 10h8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* History timeline */}
        <div className="px-4 py-4 border-b border-[--border-subtle]">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide mb-3">Histórico de alterações</p>
          <div className="relative space-y-0">
            <div className="absolute left-[11px] top-2 bottom-2 w-px bg-[--border-subtle]" />
            {historyEvents.map((e, i) => (
              <div key={i} className="flex gap-3 py-1.5 relative">
                <span
                  className="w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 text-[9px] relative z-10 border-2 border-white"
                  style={{
                    background: e.highlight ? '#FDEAED' : '#EBF0FF',
                    color: e.highlight ? '#F0455A' : '#2F6BFF',
                  }}
                >
                  {e.icon === '💬' || e.icon === '⛔' ? e.icon : (
                    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                      <circle cx="4" cy="4" r="2.5" fill="currentColor" />
                    </svg>
                  )}
                </span>
                <div>
                  <p className="text-xs text-[--text-secondary]">
                    <strong className="text-[--text-primary]">{e.actor}</strong> {e.action}
                  </p>
                  <p className="text-[10px] text-[--text-muted]">{e.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comment thread */}
        <div className="px-4 py-4">
          <p className="text-[11px] font-semibold text-[--text-muted] uppercase tracking-wide mb-3">Comentários ({comments.length})</p>
          <div className="space-y-4">
            {comments.map((c, i) => (
              <div key={i} className="flex gap-2.5">
                <Avatar name={c.author} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-[--text-primary]">{c.author}</span>
                    <span className="text-[10px] text-[--text-muted]">{c.when}</span>
                  </div>
                  <p className="text-xs text-[--text-secondary] leading-relaxed bg-[--bg-page] rounded-lg px-3 py-2 border border-[--border-subtle]">
                    {c.body}
                  </p>
                </div>
              </div>
            ))}
            {/* Input */}
            <div className="flex gap-2.5 pt-2">
              <Avatar name="Ana Lima" size="sm" />
              <div className="flex-1 relative">
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Adicionar comentário..."
                  rows={2}
                  className="w-full px-3 py-2 text-xs bg-[--bg-surface] border border-[--border-default] rounded-lg resize-none outline-none focus:border-[--primary] focus:ring-2 transition-all placeholder:text-[--text-muted] text-[--text-primary]"
                  style={{ boxShadow: 'none' }}
                />
                {comment.trim() && (
                  <div className="flex justify-end mt-1.5 gap-1.5">
                    <Button variant="ghost" size="sm" onClick={() => setComment('')}>Cancelar</Button>
                    <Button size="sm">Enviar</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-[--border-subtle] flex-shrink-0 bg-[--bg-surface]">
        <Button variant="ghost" size="sm" onClick={onClose}>Cancelar</Button>
        <Button size="sm">Salvar alterações</Button>
      </div>
    </div>
  )
}
