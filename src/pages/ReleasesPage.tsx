import { useState } from 'react'
import { T } from '../components/ds/tokens'
import { NewReleaseModal } from '../components/NewReleaseModal'
import { ISSUES, RELEASES, STATUS_CFG, type Release } from '../data/issues'

function stateColor(state: Release['state']) {
  if (state === 'released') return T.success
  if (state === 'in-progress') return T.accent
  return T.text3
}
function stateBg(state: Release['state']) {
  if (state === 'released') return T.successDim
  if (state === 'in-progress') return T.accentDim
  return T.neutralDim
}
function stateLabel(state: Release['state']) {
  if (state === 'released') return 'Lançada'
  if (state === 'in-progress') return 'Em andamento'
  return 'Planejada'
}

function daysUntil(dateStr: string) {
  const months: Record<string, number> = {
    jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
    jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
  }
  const parts = dateStr.toLowerCase().split(' ')
  if (parts.length < 3) return null
  const day = parseInt(parts[0])
  const month = months[parts[1]]
  const year = parseInt(parts[2])
  if (isNaN(day) || month === undefined || isNaN(year)) return null
  const target = new Date(year, month, day)
  const now = new Date()
  const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  return diff
}

export default function ReleasesPage() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [newRelOpen, setNewRelOpen] = useState(false)

  return (
    <div style={{ padding: 32, maxWidth: 860, margin: '0 auto' }}>
      {newRelOpen && <NewReleaseModal onClose={() => setNewRelOpen(false)} onSave={() => setNewRelOpen(false)} />}
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 22, fontWeight: 700, color: T.text1 }}>Releases</span>
          <span style={{
            fontSize: 13, color: T.text3, background: T.neutralDim,
            borderRadius: 20, padding: '2px 10px',
          }}>{RELEASES.length} releases</span>
        </div>
        <button style={{
          fontSize: 13, color: T.text1, background: T.accentDim,
          border: `1px solid ${T.accentBorder ?? T.accent}`, borderRadius: 8,
          padding: '8px 18px', cursor: 'pointer', fontWeight: 600,
        }} onClick={() => setNewRelOpen(true)}>+ Nova release</button>
      </div>

      {/* Release list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {RELEASES.map(release => {
          const releaseIssues = ISSUES.filter(i => i.releaseId === release.id)
          const done = releaseIssues.filter(i => i.status === 'done').length
          const total = releaseIssues.length
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          const color = stateColor(release.state)
          const isReleased = release.state === 'released'
          const isExpanded = expanded[release.id]
          const days = release.state === 'in-progress' ? daysUntil(release.date) : null

          return (
            <div key={release.id} style={{
              background: T.bgSurface, border: `1px solid ${T.border}`,
              borderRadius: 12, padding: '20px 24px',
              boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
              opacity: isReleased ? 0.85 : 1,
            }}>
              {/* Top row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 10 }}>
                {/* Version badge */}
                <span style={{
                  fontSize: 13, fontWeight: 700, color, background: stateBg(release.state),
                  borderRadius: 8, padding: '3px 12px', fontFamily: 'monospace',
                  border: `1px solid ${color}40`, letterSpacing: 0.5,
                }}>
                  {isReleased && '✓ '}{release.version}
                </span>
                <span style={{ fontSize: 15, fontWeight: 700, color: isReleased ? T.text2 : T.text1 }}>
                  {release.name}
                </span>
                <span style={{ fontSize: 12, color: T.text3 }}>{release.date}</span>
                {/* State badge */}
                <span style={{
                  fontSize: 11, color, background: stateBg(release.state),
                  borderRadius: 20, padding: '2px 10px',
                  border: `1px solid ${color}30`,
                }}>{stateLabel(release.state)}</span>
                {/* Countdown */}
                {days !== null && (
                  <span style={{
                    fontSize: 11, color: days <= 7 ? T.crit : T.warn,
                    background: days <= 7 ? T.critDim : T.warnDim,
                    borderRadius: 20, padding: '2px 10px',
                    border: `1px solid ${(days <= 7 ? T.crit : T.warn)}30`,
                  }}>
                    Release em {days > 0 ? `${days} dias` : 'hoje'}
                  </span>
                )}
                <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
                  {total > 0 && (
                    <span style={{ fontSize: 12, color: T.text3 }}>
                      {done}/{total} issues
                    </span>
                  )}
                </div>
              </div>

              {/* Notes */}
              {release.notes && (
                <p style={{ fontSize: 12, color: T.text3, fontStyle: 'italic', margin: '0 0 14px', lineHeight: 1.5 }}>
                  {release.notes}
                </p>
              )}

              {/* Progress bar */}
              {total > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <span style={{ fontSize: 11, color: T.text3 }}>Progresso</span>
                    <span style={{ fontSize: 11, color: T.text2, fontWeight: 600 }}>{pct}%</span>
                  </div>
                  <div style={{ height: 6, background: T.border2, borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', width: `${pct}%`,
                      background: isReleased ? T.success : T.accent,
                      borderRadius: 4, transition: 'width 0.4s',
                    }} />
                  </div>
                  {/* Status breakdown mini */}
                  <div style={{ display: 'flex', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
                    {(['done', 'in-progress', 'in-review', 'todo', 'backlog'] as const).map(s => {
                      const cnt = releaseIssues.filter(i => i.status === s).length
                      if (cnt === 0) return null
                      const cfg = STATUS_CFG[s]
                      return (
                        <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.color }} />
                          <span style={{ fontSize: 11, color: T.text3 }}>{cfg.label}: {cnt}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Expand */}
              {total > 0 && (
                <button
                  onClick={() => setExpanded(p => ({ ...p, [release.id]: !p[release.id] }))}
                  style={{
                    fontSize: 12, color: color, background: stateBg(release.state),
                    border: `1px solid ${color}40`, borderRadius: 6, padding: '5px 14px',
                    cursor: 'pointer', fontWeight: 600,
                  }}
                >
                  {isExpanded ? '▲ Ocultar issues' : `▼ Ver issues (${total})`}
                </button>
              )}

              {/* Expanded issue list */}
              {isExpanded && (
                <div style={{ marginTop: 14, borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {releaseIssues.map(issue => {
                      const sc = STATUS_CFG[issue.status]
                      return (
                        <div key={issue.key} style={{
                          display: 'flex', alignItems: 'center', gap: 10,
                          padding: '7px 10px', background: T.bgSurface2,
                          borderRadius: 8, border: `1px solid ${T.border}`,
                        }}>
                          <span style={{ fontSize: 11, color: T.text3, fontFamily: 'monospace', width: 62, flexShrink: 0 }}>
                            {issue.key}
                          </span>
                          <span style={{
                            fontSize: 13, color: T.text1, flex: 1, overflow: 'hidden',
                            textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{issue.title}</span>
                          <span style={{
                            fontSize: 11, color: sc.color, background: sc.bg,
                            borderRadius: 20, padding: '2px 8px', flexShrink: 0,
                          }}>{sc.label}</span>
                          <span style={{ fontSize: 11, color: T.text3, flexShrink: 0 }}>{issue.assignee}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* CTA */}
      <div style={{ marginTop: 24 }}>
        <button style={{
          width: '100%', padding: '14px', textAlign: 'center',
          fontSize: 13, color: T.text3,
          background: 'transparent', border: `1px dashed ${T.border2}`,
          borderRadius: 12, cursor: 'pointer',
        }} onClick={() => setNewRelOpen(true)}>+ Criar release</button>
      </div>
    </div>
  )
}
