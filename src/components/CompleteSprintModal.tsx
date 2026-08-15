import React, { useState } from 'react'
import { T } from './ds/tokens'

export interface RemainingItem { id: string; key: string; title: string }
export interface SprintDecision { workItemId: string; destination: 'next-sprint' | 'backlog' }

interface CompleteSprintProps {
  sprint: { id: string; name: string; goal?: string }
  stats: { done: number; total: number; remaining: number }
  remainingItems?: RemainingItem[]
  nextSprintName?: string
  onClose: () => void
  onConfirm: (decisions: SprintDecision[]) => void
}

const overlay: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.72)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
}

const dialog: React.CSSProperties = {
  width: 480,
  maxWidth: '95vw',
  maxHeight: '90vh',
  overflowY: 'auto',
  background: T.bgSurface,
  border: `1px solid ${T.border}`,
  borderRadius: 16,
  boxShadow: T.shadowModal,
  display: 'flex',
  flexDirection: 'column',
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: T.bgSurface2,
  border: `1px solid ${T.border}`,
  borderRadius: 8,
  padding: '8px 12px',
  color: T.text1,
  fontSize: 13,
  outline: 'none',
  boxSizing: 'border-box',
  resize: 'vertical',
  fontFamily: 'inherit',
}

export function CompleteSprintModal({ sprint, stats, nextSprintName, onClose, onConfirm }: CompleteSprintProps) {
  const [move, setMove] = useState<'next-sprint' | 'backlog'>('next-sprint')
  const [comment, setComment] = useState('')

  const velocity = stats.done * 3

  function handleConfirm() {
    onConfirm(move)
  }

  return (
    <div style={overlay} onClick={onClose}>
      <div style={dialog} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 24px 16px',
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: T.text1 }}>Concluir Sprint</span>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 6, border: 'none', background: 'transparent',
              color: T.text3, cursor: 'pointer', fontSize: 18, lineHeight: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >×</button>
        </div>

        {/* Body */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20, overflowY: 'auto' }}>
          {/* Sprint name + goal */}
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: T.accent, marginBottom: 4 }}>
              {sprint.name}
            </p>
            {sprint.goal && (
              <p style={{ fontSize: 13, fontStyle: 'italic', color: T.text2 }}>
                "{sprint.goal}"
              </p>
            )}
          </div>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 12 }}>
            {[
              { label: 'Concluídas', value: stats.done, color: T.success, bg: T.successDim },
              { label: 'Restantes', value: stats.remaining, color: T.warn, bg: T.warnDim },
              { label: 'Total', value: stats.total, color: T.text2, bg: T.bgSurface2 },
            ].map(stat => (
              <div
                key={stat.label}
                style={{
                  flex: 1,
                  padding: '14px 12px',
                  borderRadius: 10,
                  background: stat.bg,
                  border: `1px solid ${T.border}`,
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 24, fontWeight: 700, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </p>
                <p style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Move remaining */}
          {stats.remaining > 0 && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 10 }}>
                O que fazer com as {stats.remaining} demanda{stats.remaining !== 1 ? 's' : ''} restantes?
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Next sprint option */}
                <button
                  onClick={() => setMove('next-sprint')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1px solid ${move === 'next-sprint' ? T.accentBorder : T.border}`,
                    background: move === 'next-sprint' ? T.accentDim : T.bgSurface2,
                    color: move === 'next-sprint' ? T.accent : T.text2,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: 18 }}>→</span>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Mover para o próximo sprint</p>
                    <p style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>{nextSprintName ?? 'Próxima sprint planejada'}</p>
                  </div>
                </button>

                {/* Backlog option */}
                <button
                  onClick={() => setMove('backlog')}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 16px',
                    borderRadius: 10,
                    border: `1px solid ${move === 'backlog' ? T.accentBorder : T.border}`,
                    background: move === 'backlog' ? T.accentDim : T.bgSurface2,
                    color: move === 'backlog' ? T.accent : T.text2,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <rect x="2" y="6" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M5 6V4a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M6 10h6M6 13h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600 }}>Mover para o Backlog</p>
                    <p style={{ fontSize: 11, color: T.text3, marginTop: 2 }}>Demandas ficam sem sprint</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {/* Comment */}
          <div>
            <label style={{ fontSize: 12, fontWeight: 600, color: T.text2, marginBottom: 6, display: 'block' }}>
              Comentário de conclusão (opcional)
            </label>
            <textarea
              rows={2}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Resumo do sprint, aprendizados..."
              style={inputStyle}
            />
          </div>

          {/* Velocity */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '12px 14px',
            borderRadius: 8,
            background: T.successDim,
            border: `1px solid rgba(53,201,174,0.2)`,
          }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2l1.7 3.5L14 6.3l-3 2.9.7 4.1L8 11.3l-3.7 2 .7-4.1-3-2.9 4.3-.8L8 2z" fill={T.success} />
            </svg>
            <span style={{ fontSize: 13, color: T.success, fontWeight: 600 }}>
              Velocity desta sprint: {velocity} pts
            </span>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 12,
          padding: '16px 24px',
          borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: `1px solid ${T.border2}`,
              background: 'transparent',
              color: T.text2,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >Cancelar</button>
          <button
            onClick={handleConfirm}
            style={{
              padding: '9px 20px',
              borderRadius: 8,
              border: 'none',
              background: T.warn,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1.1)' }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.filter = 'none' }}
          >Concluir Sprint</button>
        </div>
      </div>
    </div>
  )
}
