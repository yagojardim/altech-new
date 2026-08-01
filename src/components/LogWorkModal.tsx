import React, { useState } from 'react'
import { T } from './ds/tokens'

interface Props {
  issueKey: string
  issueTitle: string
  originalEstimate: number
  remaining: number
  onClose: () => void
  onSave: (entry: { hours: number; date: string; comment: string; adjustRemaining: number }) => void
}

const inputStyle: React.CSSProperties = {
  background: T.bgSurface2,
  border: `1px solid ${T.border2}`,
  borderRadius: 8,
  color: T.text1,
  fontSize: 13,
  padding: '8px 12px',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: T.text3,
  marginBottom: 6,
  display: 'block',
}

export function LogWorkModal({ issueKey, issueTitle, originalEstimate, remaining, onClose, onSave }: Props) {
  const [hours, setHours] = useState(0)
  const [mins, setMins] = useState(0)
  const [date, setDate] = useState('2025-04-15')
  const [remainMode, setRemainMode] = useState<'auto' | 'set' | 'keep'>('auto')
  const [newRemaining, setNewRemaining] = useState(remaining)
  const [comment, setComment] = useState('')

  const totalHoursLogged = hours + mins / 60
  const isEmpty = hours === 0 && mins === 0

  const adjustRemaining =
    remainMode === 'auto'
      ? Math.max(0, remaining - totalHoursLogged)
      : remainMode === 'set'
      ? newRemaining
      : remaining

  function handleSave() {
    if (isEmpty) return
    onSave({ hours: totalHoursLogged, date, comment, adjustRemaining })
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.72)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        width: 480, background: T.bgSurface, border: `1px solid ${T.border}`,
        borderRadius: 16, padding: 28, boxShadow: T.shadowModal,
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>Registrar Tempo</span>
            <span style={{
              fontSize: 11, fontWeight: 600, color: T.accent,
              background: T.accentDim, border: `1px solid ${T.accentBorder}`,
              borderRadius: 6, padding: '2px 8px',
            }}>{issueKey}</span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer',
              color: T.text3, fontSize: 18, lineHeight: 1,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >×</button>
        </div>

        <div style={{ fontSize: 12, color: T.text2, marginBottom: 20 }}>{issueTitle}</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Tempo gasto */}
          <div>
            <label style={labelStyle}>Horas trabalhadas</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div style={{ flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    value={hours}
                    onChange={e => setHours(Math.max(0, parseInt(e.target.value) || 0))}
                    placeholder="0"
                    style={{ ...inputStyle, paddingRight: 32 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: T.text3 }}>h</span>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={mins}
                    onChange={e => setMins(Math.min(59, Math.max(0, parseInt(e.target.value) || 0)))}
                    placeholder="30"
                    style={{ ...inputStyle, paddingRight: 32 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: T.text3 }}>m</span>
                </div>
              </div>
            </div>
            <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>Formato: 0h 30m</div>
          </div>

          {/* Data */}
          <div>
            <label style={labelStyle}>Data</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              style={{ ...inputStyle, colorScheme: 'dark' }}
            />
          </div>

          {/* Remaining estimate */}
          <div>
            <label style={labelStyle}>Estimativa restante</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {([
                ['auto', 'Ajustar automaticamente'],
                ['set', 'Definir novo restante'],
                ['keep', 'Não alterar'],
              ] as const).map(([val, lbl]) => (
                <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: T.text2 }}>
                  <input
                    type="radio"
                    name="remainMode"
                    value={val}
                    checked={remainMode === val}
                    onChange={() => setRemainMode(val)}
                    style={{ accentColor: T.accent }}
                  />
                  {lbl}
                </label>
              ))}
              {remainMode === 'set' && (
                <div style={{ marginLeft: 24, position: 'relative' }}>
                  <input
                    type="number"
                    min={0}
                    value={newRemaining}
                    onChange={e => setNewRemaining(Math.max(0, parseFloat(e.target.value) || 0))}
                    style={{ ...inputStyle, paddingRight: 32, width: 120 }}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: T.text3 }}>h</span>
                </div>
              )}
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label style={labelStyle}>Descrição do trabalho</label>
            <textarea
              rows={3}
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="O que foi feito…"
              style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
            />
          </div>

          {/* Worklog summary bar */}
          <div style={{
            background: T.bgSurface2, borderRadius: 8, padding: '10px 14px',
            display: 'flex', alignItems: 'center', gap: 16, fontSize: 12,
          }}>
            <span style={{ color: T.text3 }}>Original: <span style={{ color: T.text2, fontWeight: 600 }}>{originalEstimate}h</span></span>
            <span style={{ color: T.text3 }}>Registrado: <span style={{ color: T.accent, fontWeight: 600 }}>{totalHoursLogged.toFixed(1)}h</span></span>
            <span style={{ color: T.text3 }}>Restante: <span style={{ color: adjustRemaining <= 1 ? T.crit : T.warn, fontWeight: 600 }}>{adjustRemaining.toFixed(1)}h</span></span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              height: 34, padding: '0 16px', fontSize: 13, borderRadius: 8,
              background: 'transparent', border: 'none', cursor: 'pointer', color: T.text2,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = T.bgSurface2 }}
            onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
          >Cancelar</button>
          <button
            onClick={handleSave}
            disabled={isEmpty}
            style={{
              height: 34, padding: '0 18px', fontSize: 13, fontWeight: 600, borderRadius: 8,
              background: isEmpty ? `${T.accent}50` : T.accent,
              border: 'none', cursor: isEmpty ? 'not-allowed' : 'pointer', color: '#fff',
            }}
          >Salvar</button>
        </div>
      </div>
    </div>
  )
}
