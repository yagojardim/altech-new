import React, { useState } from 'react'
import { T } from './ds/tokens'
import { HelpHint } from './ds/HelpHint'

export interface NewProjectInput {
  name: string
  key: string
  description: string
  clientName: string | null
  boardType: 'scrum' | 'kanban'
  leadId: string | null
}

interface Props {
  onClose: () => void
  onSuccess: (projectKey: string, projectName: string) => void
  /** Real persistence hook — when given, "Criar" inserts the project in the database. */
  onCreate?: (input: NewProjectInput) => Promise<void>
  /** Real leads loaded from the database. */
  leads?: { id: string; name: string; initials: string }[]
  /** Keys already used in the database (duplicate guard). */
  existingKeys?: string[]
  /** Nome do tenant atual — exibido como rótulo read-only. */
  tenantName?: string
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
  width: 520,
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
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: T.text2,
  marginBottom: 6,
  display: 'block',
}

export function NewProjectModal({ onClose, onSuccess, onCreate, leads, existingKeys, tenantName }: Props) {
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [key, setKey] = useState('')
  const [keyManual, setKeyManual] = useState(false)
  const [type, setType] = useState<'scrum' | 'kanban'>('scrum')
  const [lead, setLead] = useState<string>(leads?.[0]?.id ?? '')
  const [desc, setDesc] = useState('')
  const [success, setSuccess] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const takenKeys = (existingKeys ?? []).map(k => k.toUpperCase())
  const isDuplicate = key.length > 0 && takenKeys.includes(key.toUpperCase())
  const canCreate = name.trim().length > 0 && key.length > 0 && !isDuplicate && !saving

  function handleNameChange(val: string) {
    setName(val)
    if (!keyManual) {
      const generated = val
        .split(/\s+/)
        .map(w => w[0] || '')
        .join('')
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 6)
      setKey(generated)
    }
  }

  function handleKeyChange(val: string) {
    const filtered = val.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 6)
    setKey(filtered)
    setKeyManual(true)
  }

  async function handleCreate() {
    if (!canCreate) return
    setError(null)
    if (!onCreate) { setSuccess(true); return }
    setSaving(true)
    try {
      await onCreate({ name: name.trim(), key, description: desc.trim(), clientName: client.trim() || null, boardType: type, leadId: lead || null })
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível criar o projeto.')
    } finally {
      setSaving(false)
    }
  }

  function handleReset() {
    setName('')
    setClient('')
    setKey('')
    setKeyManual(false)
    setType('scrum')
    setLead(leads?.[0]?.id ?? '')
    setDesc('')
    setSuccess(false)
    setError(null)
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
          <span style={{ fontSize: 18, fontWeight: 700, color: T.text1 }}>Novo Projeto</span>
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

        {success ? (
          /* ── Success state ── */
          <div style={{
            padding: '48px 32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 20,
            textAlign: 'center',
          }}>
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
              <circle cx="32" cy="32" r="32" fill={T.successDim} />
              <path d="M20 33l9 9 15-17" stroke={T.success} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <div>
              <p style={{ fontSize: 18, fontWeight: 700, color: T.text1, marginBottom: 8 }}>
                Projeto criado com sucesso!
              </p>
              <p style={{ fontSize: 14, color: T.accent, fontWeight: 600 }}>{name}</p>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
              <button
                onClick={() => onSuccess(key, name)}
                style={{
                  padding: '10px 24px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.accent,
                  color: '#fff',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >Abrir projeto →</button>
              <button
                onClick={handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: 8,
                  border: `1px solid ${T.border2}`,
                  background: 'transparent',
                  color: T.text2,
                  fontSize: 14,
                  cursor: 'pointer',
                }}
              >Criar outro</button>
            </div>
          </div>
        ) : (
          <>
            {/* Body */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16, overflowY: 'auto' }}>
              {/* Tenant (read-only) */}
              <div>
                <label style={labelStyle}>Workspace</label>
                <div style={{ ...inputStyle, color: T.text2, background: T.bgSurface, cursor: 'default' }}>
                  {tenantName || 'Tenant atual'}
                </div>
              </div>

              {/* Name */}
              <div>
                <label style={labelStyle}>Nome do projeto <span style={{ color: T.crit }}>*</span> <HelpHint text="Nome completo do projeto, como ele aparece nas listas e no topo do board." /></label>
                <input
                  type="text"
                  placeholder="Ex: Website Relaunch"
                  value={name}
                  onChange={e => handleNameChange(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Client */}
              <div>
                <label style={labelStyle}>Cliente</label>
                <input
                  type="text"
                  placeholder="Ex: Cobasi"
                  value={client}
                  onChange={e => setClient(e.target.value)}
                  style={inputStyle}
                />
              </div>

              {/* Key */}
              <div>
                <label style={labelStyle}>Chave <span style={{ color: T.crit }}>*</span></label>
                <input
                  type="text"
                  value={key}
                  onChange={e => handleKeyChange(e.target.value)}
                  style={{
                    ...inputStyle,
                    borderColor: isDuplicate ? T.crit : T.border,
                  }}
                />
                {isDuplicate && (
                  <p style={{ fontSize: 11, color: T.crit, marginTop: 4 }}>
                    Esta chave já está em uso.
                  </p>
                )}
                {!isDuplicate && key.length > 0 && (
                  <p style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>
                    Prefixo das issues: {key}-1, {key}-2…
                  </p>
                )}
              </div>

              {/* Type */}
              <div>
                <label style={labelStyle}>Tipo</label>
                <div style={{ display: 'flex', gap: 12 }}>
                  {(['scrum', 'kanban'] as const).map(t => (
                    <button
                      key={t}
                      onClick={() => setType(t)}
                      style={{
                        flex: 1,
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: `1px solid ${type === t ? T.accentBorder : T.border}`,
                        background: type === t ? T.accentDim : T.bgSurface2,
                        color: type === t ? T.accent : T.text2,
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 8,
                        fontSize: 13,
                        fontWeight: 600,
                        transition: 'all 0.15s',
                      }}
                    >
                      {t === 'scrum' ? (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 2" />
                          <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                          <rect x="3" y="5" width="4" height="14" rx="1.5" fill="currentColor" opacity="0.5" />
                          <rect x="10" y="5" width="4" height="10" rx="1.5" fill="currentColor" opacity="0.7" />
                          <rect x="17" y="5" width="4" height="7" rx="1.5" fill="currentColor" />
                        </svg>
                      )}
                      {t === 'scrum' ? 'Scrum' : 'Kanban'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Lead */}
              <div>
                <label style={labelStyle}>Responsável</label>
                <select
                  value={lead}
                  onChange={e => setLead(e.target.value)}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {(leads ?? []).length === 0 && <option value="">Sem responsável</option>}
                  {(leads ?? []).map(l => (
                    <option key={l.id} value={l.id}>{l.name} ({l.initials})</option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label style={labelStyle}>Descrição</label>
                <textarea
                  rows={2}
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="Descreva o objetivo do projeto..."
                  style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              {error && (
                <p style={{ fontSize: 12, color: T.crit }}>{error}</p>
              )}
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
                onClick={handleCreate}
                disabled={!canCreate}
                style={{
                  padding: '9px 20px',
                  borderRadius: 8,
                  border: 'none',
                  background: T.accent,
                  color: '#fff',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: canCreate ? 'pointer' : 'not-allowed',
                  opacity: canCreate ? 1 : 0.4,
                  transition: 'opacity 0.15s',
                }}
              >{saving ? 'Criando…' : 'Criar'}</button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
