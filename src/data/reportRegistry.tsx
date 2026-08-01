/**
 * Altech Report Registry — single source of truth for all chart components.
 * Used by ReportsPage, AssignedReportCards, and any chart modal.
 */
import { useState } from 'react'
import { T } from '../components/ds/tokens'

const px = (n: number) => `${n}px`

// ─── Chart Components ─────────────────────────────────────────────────────────

export function BurndownChart({
  variant = 'full',
  sprintTotal,
  sprintRemaining,
}: {
  variant?: 'thumbnail' | 'full'
  sprintTotal?: number
  sprintRemaining?: number
}) {
  const th = variant === 'thumbnail'
  const W = 520; const H = 180
  const PAD = { top: 12, right: 16, bottom: th ? 8 : 30, left: th ? 8 : 36 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const days = 14
  const maxPts = sprintTotal ?? 40
  // When real sprint data is provided, derive a step-wise burndown curve
  const actual: number[] = sprintTotal != null && sprintRemaining != null
    ? (() => {
        const done = sprintTotal - sprintRemaining
        const arr: number[] = []
        for (let i = 0; i < 14; i++) {
          // Step function: drops happen at roughly even intervals
          const dropped = i === 0 ? 0 : Math.round(done * Math.min(1, (i / 10)))
          arr.push(Math.max(sprintRemaining, sprintTotal - dropped))
        }
        return arr
      })()
    : [38, 35, 35, 31, 31, 28, 24, 24, 20, 20, 16, 12, 8, 4]
  const toX = (d: number) => PAD.left + (d / (days - 1)) * cw
  const toY = (p: number) => PAD.top + ch - (p / maxPts) * ch
  const idealPath = `M ${toX(0)} ${toY(38)} L ${toX(13)} ${toY(0)}`
  const pts = actual.map((p, i) => [toX(i), toY(p)] as [number, number])
  let stepPath = `M ${pts[0][0]} ${pts[0][1]}`
  for (let i = 1; i < pts.length; i++) stepPath += ` H ${pts[i][0]} V ${pts[i][1]}`
  const areaPath = stepPath + ` H ${pts[pts.length - 1][0]} V ${toY(0)} H ${toX(0)} Z`
  const ticks = [0, 10, 20, 30, 40]
  const dayTicks = [1, 3, 5, 7, 9, 11, 13]
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {ticks.map(t => <line key={t} x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke={T.border} strokeWidth={0.5} />)}
      {!th && ticks.map(t => <text key={t} x={PAD.left - 6} y={toY(t) + 4} textAnchor="end" fontSize={9} fill={T.text3}>{t}</text>)}
      {!th && dayTicks.map(d => <text key={d} x={toX(d)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={T.text3}>D{d + 1}</text>)}
      <path d={areaPath} fill={T.accentDim} />
      <path d={idealPath} stroke={T.accent} strokeWidth={th ? 2 : 1.5} strokeDasharray="5,3" fill="none" />
      <path d={stepPath} stroke={T.text1} strokeWidth={th ? 2.5 : 2} fill="none" />
      {!th && <circle cx={toX(5)} cy={toY(28)} r={5} fill={T.warn} />}
      {!th && <text x={toX(5) + 8} y={toY(28) + 4} fontSize={9} fill={T.warn}>Escopo +3pts</text>}
      {!th && (
        <g transform={`translate(${W - PAD.right - 130}, ${PAD.top})`}>
          <line x1={0} y1={5} x2={18} y2={5} stroke={T.accent} strokeWidth={1.5} strokeDasharray="5,3" />
          <text x={22} y={9} fontSize={9} fill={T.text2}>Ideal</text>
          <line x1={0} y1={18} x2={18} y2={18} stroke={T.text1} strokeWidth={2} />
          <text x={22} y={22} fontSize={9} fill={T.text2}>Realizado</text>
        </g>
      )}
    </svg>
  )
}

export function VelocityChart({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const W = 200; const H = 140
  const PAD = { top: 12, right: 8, bottom: th ? 4 : 28, left: th ? 4 : 28 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const sprints = ['S8', 'S9', 'S10', 'S11', 'S12', 'S13']
  const vals = [18, 22, 19, 25, 21, 22]
  const avg = 21; const maxV = 30
  const bw = (cw / sprints.length) * 0.6
  const toY = (v: number) => PAD.top + ch - (v / maxV) * ch
  const toX = (i: number) => PAD.left + (i / sprints.length) * cw + (cw / sprints.length) * 0.2
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      <line x1={PAD.left} y1={toY(avg)} x2={W - PAD.right} y2={toY(avg)} stroke={T.text3} strokeWidth={1} strokeDasharray="4,3" />
      {!th && <text x={W - PAD.right + 2} y={toY(avg) + 4} fontSize={8} fill={T.text3}>avg</text>}
      {vals.map((v, i) => (
        <g key={i}>
          <rect x={toX(i)} y={toY(v)} width={bw} height={ch - (toY(v) - PAD.top)} rx={2} fill={i === vals.length - 1 ? '#b3beff' : T.accent} />
          {!th && <text x={toX(i) + bw / 2} y={toY(v) - 3} textAnchor="middle" fontSize={8} fill={T.text2}>{v}</text>}
          {!th && <text x={toX(i) + bw / 2} y={H - PAD.bottom + 12} textAnchor="middle" fontSize={8} fill={T.text3}>{sprints[i]}</text>}
        </g>
      ))}
      {!th && [0, 10, 20, 30].map(t => <text key={t} x={PAD.left - 4} y={toY(t) + 3} textAnchor="end" fontSize={8} fill={T.text3}>{t}</text>)}
    </svg>
  )
}

export function CFDChart({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const W = 520; const H = 160
  const PAD = { top: th ? 4 : 12, right: 8, bottom: th ? 4 : 28, left: th ? 4 : 36 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const days = 14
  const layers = [
    { label: 'Backlog',     color: T.text3,   data: [20,19,18,17,16,15,14,13,12,11,10,9,8,7] },
    { label: 'To Do',       color: T.text2,   data: [5, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 1, 1] },
    { label: 'In Progress', color: T.accent,  data: [3, 4, 4, 4, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2] },
    { label: 'Review',      color: T.warn,    data: [1, 1, 2, 2, 2, 3, 3, 3, 2, 2, 2, 1, 1, 1] },
    { label: 'Done',        color: T.success, data: [0, 1, 1, 2, 3, 3, 5, 7, 9,11,13,15,18,20] },
  ]
  const maxY = 30
  const toX = (d: number) => PAD.left + (d / (days - 1)) * cw
  const toY = (v: number) => PAD.top + ch - (v / maxY) * ch
  const stacked = layers.map((_, li) =>
    Array.from({ length: days }, (_, d) => { let sum = 0; for (let l = 0; l <= li; l++) sum += layers[l].data[d]; return sum })
  )
  const areaPath = (top: number[], bottom: number[]) => {
    const fwd = top.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`)
    const bwd = bottom.slice().reverse().map((v, i) => `L ${toX(days - 1 - i)} ${toY(v)}`)
    return [...fwd, ...bwd, 'Z'].join(' ')
  }
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {stacked.map((top, li) => {
        const bottom = li === 0 ? Array(days).fill(0) : stacked[li - 1]
        return <path key={li} d={areaPath(top, bottom)} fill={layers[li].color} opacity={0.35} />
      })}
      {stacked.map((top, li) => {
        const line = top.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
        return <path key={li} d={line} stroke={layers[li].color} strokeWidth={1.2} fill="none" />
      })}
      {!th && [1, 4, 7, 10, 13].map(d => <text key={d} x={toX(d)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={T.text3}>D{d + 1}</text>)}
      {!th && [0, 10, 20, 30].map(t => <text key={t} x={PAD.left - 4} y={toY(t) + 4} textAnchor="end" fontSize={9} fill={T.text3}>{t}</text>)}
      {!th && (
        <g transform={`translate(${PAD.left}, ${PAD.top - 2})`}>
          {layers.map((l, i) => (
            <g key={i} transform={`translate(${i * 88}, 0)`}>
              <rect x={0} y={-7} width={10} height={8} fill={l.color} opacity={0.6} rx={1} />
              <text x={13} y={0} fontSize={8} fill={T.text2}>{l.label}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

export function BugsDonut({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const cx = 70; const cy = 70; const R = 50; const r = 28
  const segs = [
    { label: 'Critical', color: T.crit,   val: 2 },
    { label: 'High',     color: T.warn,   val: 3 },
    { label: 'Medium',   color: T.accent, val: 2 },
    { label: 'Low',      color: T.text3,  val: 1 },
  ]
  const total = segs.reduce((s, x) => s + x.val, 0)
  let angle = -Math.PI / 2
  const arcs = segs.map(seg => {
    const sweep = (seg.val / total) * 2 * Math.PI
    const x1 = cx + R * Math.cos(angle); const y1 = cy + R * Math.sin(angle)
    const x2 = cx + R * Math.cos(angle + sweep); const y2 = cy + R * Math.sin(angle + sweep)
    const x3 = cx + r * Math.cos(angle + sweep); const y3 = cy + r * Math.sin(angle + sweep)
    const x4 = cx + r * Math.cos(angle); const y4 = cy + r * Math.sin(angle)
    const large = sweep > Math.PI ? 1 : 0
    const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`
    angle += sweep
    return { ...seg, d }
  })
  const donut = (
    <svg width={th ? '100%' : 140} height={th ? undefined : 140} viewBox="0 0 140 140" style={th ? { display: 'block' } : undefined}>
      {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} />)}
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize={18} fontWeight={700} fill={T.text1}>{total}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={9} fill={T.text3}>bugs</text>
    </svg>
  )
  if (th) return donut
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: px(16) }}>
      {donut}
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(6) }}>
        {segs.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color }} />
            <span style={{ color: T.text2, fontSize: px(12) }}>{s.label}</span>
            <span style={{ color: T.text1, fontSize: px(12), fontWeight: 600, marginLeft: 'auto' }}>{s.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function CreatedVsResolved({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const W = 520; const H = 150
  const PAD = { top: th ? 4 : 20, right: 8, bottom: th ? 4 : 28, left: th ? 4 : 28 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const weeks = 8
  const created  = [3, 5, 4, 6, 5, 7, 4, 3]
  const resolved = [2, 3, 5, 4, 6, 5, 6, 5]
  const maxV = 8
  const toX = (i: number) => PAD.left + (i / (weeks - 1)) * cw
  const toY = (v: number) => PAD.top + ch - (v / maxV) * ch
  const linePath = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  const areaPath = (data: number[]) => {
    const base = PAD.top + ch
    return linePath(data) + ` L ${toX(weeks - 1)} ${base} L ${toX(0)} ${base} Z`
  }
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 2, 4, 6, 8].map(t => <line key={t} x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke={T.border} strokeWidth={0.5} />)}
      <path d={areaPath(created)}  fill={T.warn}    opacity={0.15} />
      <path d={areaPath(resolved)} fill={T.success} opacity={0.15} />
      <path d={linePath(created)}  stroke={T.warn}    strokeWidth={2} fill="none" />
      <path d={linePath(resolved)} stroke={T.success} strokeWidth={2} fill="none" />
      {created.map((v, i)  => <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={T.warn} />)}
      {resolved.map((v, i) => <circle key={i} cx={toX(i)} cy={toY(v)} r={3} fill={T.success} />)}
      {!th && Array.from({ length: weeks }, (_, i) => <text key={i} x={toX(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={T.text3}>W{i + 1}</text>)}
      {!th && (
        <g transform={`translate(${PAD.left}, ${PAD.top - 10})`}>
          <line x1={0} y1={0} x2={14} y2={0} stroke={T.warn} strokeWidth={2} /><text x={18} y={4} fontSize={9} fill={T.text2}>Criados</text>
          <line x1={70} y1={0} x2={84} y2={0} stroke={T.success} strokeWidth={2} /><text x={88} y={4} fontSize={9} fill={T.text2}>Resolvidos</text>
        </g>
      )}
    </svg>
  )
}

export function WorkloadChart({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const people = [
    { name: 'AL', pts: 14 }, { name: 'NM', pts: 10 }, { name: 'JN', pts: 8 },
    { name: 'CS', pts: 12 }, { name: 'RM', pts: 6 },  { name: 'LF', pts: 9 },
  ]
  const maxPts = 16
  const color = (pts: number) => pts < 10 ? T.success : pts <= 14 ? T.warn : T.crit
  if (th) {
    const W = 200; const H = 100
    const barH = 10; const gap = 6; const labelW = 18; const valW = 0
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {people.map((p, i) => {
          const y = i * (barH + gap) + 4
          const bw = ((p.pts / maxPts) * (W - labelW - valW - 8))
          return (
            <g key={i}>
              <rect x={labelW + 4} y={y} width={W - labelW - 8} height={barH} rx={2} fill={T.bgSurface2} />
              <rect x={labelW + 4} y={y} width={bw} height={barH} rx={2} fill={color(p.pts)} opacity={0.8} />
            </g>
          )
        })}
      </svg>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
      {people.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
          <div style={{ width: px(24), color: T.text2, fontSize: px(12), fontWeight: 600 }}>{p.name}</div>
          <div style={{ flex: 1, background: T.bgSurface2, borderRadius: px(4), height: px(14), overflow: 'hidden' }}>
            <div style={{ width: `${(p.pts / maxPts) * 100}%`, height: '100%', background: color(p.pts), borderRadius: px(4), opacity: 0.8 }} />
          </div>
          <div style={{ width: px(36), color: color(p.pts), fontSize: px(12), fontWeight: 600 }}>{p.pts}pt</div>
        </div>
      ))}
    </div>
  )
}

export function AgingChart({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const issues = [
    { id: 'ALT-143', days: 9,  tag: null,      color: T.accent },
    { id: 'BUG-38',  days: 12, tag: 'Blocked', color: T.crit  },
    { id: 'ALT-142', days: 7,  tag: null,      color: T.accent },
    { id: 'ALT-150', days: 15, tag: 'Delayed', color: T.warn  },
    { id: 'ALT-153', days: 3,  tag: null,      color: T.success},
  ]
  const maxDays = 16
  if (th) {
    const W = 200; const H = 90
    const barH = 10; const gap = 7
    return (
      <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
        {issues.map((iss, i) => {
          const y = i * (barH + gap) + 4
          const bw = (iss.days / maxDays) * (W - 8)
          return (
            <g key={i}>
              <rect x={4} y={y} width={W - 8} height={barH} rx={2} fill={T.bgSurface2} />
              <rect x={4} y={y} width={bw} height={barH} rx={2} fill={iss.color} opacity={0.75} />
            </g>
          )
        })}
      </svg>
    )
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(8) }}>
      {issues.map((iss, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(8) }}>
          <div style={{ width: px(58), color: T.text2, fontSize: px(11), fontFamily: 'monospace' }}>{iss.id}</div>
          <div style={{ flex: 1, background: T.bgSurface2, borderRadius: px(4), height: px(14), overflow: 'hidden' }}>
            <div style={{ width: `${(iss.days / maxDays) * 100}%`, height: '100%', background: iss.color, borderRadius: px(4), opacity: 0.7 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: px(4), minWidth: px(72) }}>
            <span style={{ color: T.text1, fontSize: px(11), fontWeight: 600 }}>{iss.days}d</span>
            {iss.tag && (
              <span style={{ fontSize: px(9), fontWeight: 700, padding: '2px 5px', borderRadius: px(4), background: iss.color === T.crit ? T.critDim : T.warnDim, color: iss.color }}>{iss.tag}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

export function LeadCycleChart({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const W = 200; const H = 80
  const PAD = { top: 8, right: 8, bottom: th ? 4 : 20, left: th ? 4 : 28 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const buckets = ['1-3d', '4-6d', '7-9d', '10-14d', '15+d']
  const vals = [1, 3, 5, 4, 2]
  const maxV = 6
  const bw = (cw / buckets.length) * 0.65
  const toX = (i: number) => PAD.left + (i / buckets.length) * cw + (cw / buckets.length) * 0.175
  const toY = (v: number) => PAD.top + ch - (v / maxV) * ch
  const histogram = (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {vals.map((v, i) => (
        <g key={i}>
          <rect x={toX(i)} y={toY(v)} width={bw} height={ch - (toY(v) - PAD.top)} rx={2} fill={T.accent} opacity={0.7} />
          {!th && <text x={toX(i) + bw / 2} y={H - PAD.bottom + 12} textAnchor="middle" fontSize={7} fill={T.text3}>{buckets[i]}</text>}
        </g>
      ))}
      {!th && [0, 2, 4, 6].map(t => <text key={t} x={PAD.left - 3} y={toY(t) + 3} textAnchor="end" fontSize={7} fill={T.text3}>{t}</text>)}
    </svg>
  )
  if (th) return histogram
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: px(12) }}>
      {[
        { label: 'Lead Time médio',  value: '8.4 dias', color: T.accent  },
        { label: 'Cycle Time médio', value: '4.2 dias', color: T.success },
      ].map((s, i) => (
        <div key={i} style={{ background: T.bgSurface2, borderRadius: px(8), padding: `${px(10)} ${px(14)}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: T.text2, fontSize: px(12) }}>{s.label}</span>
          <span style={{ color: s.color, fontSize: px(18), fontWeight: 700 }}>{s.value}</span>
        </div>
      ))}
      <div style={{ color: T.text3, fontSize: px(11), marginTop: px(4) }}>Distribuição Lead Time</div>
      {histogram}
    </div>
  )
}

export function ProjectHealth({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const axes = [
    { label: 'Velocity',       val: 85 }, { label: 'Quality',        val: 60 },
    { label: 'Predictability', val: 72 }, { label: 'Team Morale',    val: 90 },
    { label: 'Risk',           val: 45 },
  ]
  const n = axes.length; const cx = 85; const cy = 75; const R = 55
  const score = Math.round(axes.reduce((s, a) => s + a.val, 0) / n)
  const angleOf = (i: number) => (i * 2 * Math.PI) / n - Math.PI / 2
  const point = (i: number, frac: number) => {
    const a = angleOf(i)
    return [cx + R * frac * Math.cos(a), cy + R * frac * Math.sin(a)] as [number, number]
  }
  const pentagon = (frac: number) =>
    Array.from({ length: n }, (_, i) => point(i, frac)).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'
  const dataPath = axes.map((a, i) => point(i, a.val / 100)).map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'
  const dotColor = (v: number) => v >= 80 ? T.success : v >= 60 ? T.warn : T.crit
  const radar = (
    <svg width={th ? '100%' : 170} height={th ? undefined : 150} viewBox="0 0 170 150" style={th ? { display: 'block' } : undefined}>
      {[0.25, 0.5, 0.75, 1].map(f => <path key={f} d={pentagon(f)} stroke={T.border2} strokeWidth={0.8} fill="none" />)}
      {Array.from({ length: n }, (_, i) => { const [x, y] = point(i, 1); return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke={T.border2} strokeWidth={0.8} /> })}
      <path d={dataPath} fill={T.accentDim} stroke={T.accent} strokeWidth={1.5} />
      {!th && axes.map((a, i) => { const [x, y] = point(i, 1.22); return <text key={i} x={x} y={y} textAnchor="middle" fontSize={8} fill={T.text2}>{a.label}</text> })}
      <circle cx={cx} cy={cy} r={20} fill={T.bgSurface2} />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize={14} fontWeight={700} fill={T.text1}>{score}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize={7} fill={T.text3}>/100</text>
    </svg>
  )
  if (th) return radar
  return (
    <div style={{ display: 'flex', gap: px(16), alignItems: 'flex-start' }}>
      {radar}
      <div style={{ display: 'flex', flexDirection: 'column', gap: px(6), paddingTop: px(12) }}>
        {axes.map((a, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: px(6) }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor(a.val), flexShrink: 0 }} />
            <span style={{ color: T.text2, fontSize: px(11) }}>{a.label}</span>
            <span style={{ color: T.text1, fontSize: px(11), fontWeight: 600, marginLeft: 'auto' }}>{a.val}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function EpicBurndown({ variant = 'full' }: { variant?: 'thumbnail' | 'full' }) {
  const th = variant === 'thumbnail'
  const W = 520; const H = 160
  const PAD = { top: th ? 6 : 24, right: 8, bottom: th ? 4 : 28, left: th ? 4 : 36 }
  const cw = W - PAD.left - PAD.right
  const ch = H - PAD.top - PAD.bottom
  const weeks = 6
  const epics = [
    { label: 'EP-01', color: T.accent, data: [20, 18, 15, 12, 8,  4] },
    { label: 'EP-02', color: T.warn,   data: [15, 14, 13, 10, 7,  3] },
    { label: 'EP-03', color: T.purple, data: [10, 10, 9,  8,  8,  7] },
  ]
  const maxV = 22
  const toX = (i: number) => PAD.left + (i / (weeks - 1)) * cw
  const toY = (v: number) => PAD.top + ch - (v / maxV) * ch
  const linePath = (data: number[]) => data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(v)}`).join(' ')
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
      {[0, 5, 10, 15, 20].map(t => <line key={t} x1={PAD.left} y1={toY(t)} x2={W - PAD.right} y2={toY(t)} stroke={T.border} strokeWidth={0.5} />)}
      {epics.map((e, i) => <path key={i} d={linePath(e.data)} stroke={e.color} strokeWidth={th ? 2.5 : 2} fill="none" />)}
      {epics.map((e, i) => e.data.map((v, j) => <circle key={`${i}-${j}`} cx={toX(j)} cy={toY(v)} r={th ? 2.5 : 3} fill={e.color} />))}
      {!th && Array.from({ length: weeks }, (_, i) => <text key={i} x={toX(i)} y={H - PAD.bottom + 14} textAnchor="middle" fontSize={9} fill={T.text3}>W{i + 1}</text>)}
      {!th && [0, 5, 10, 15, 20].map(t => <text key={t} x={PAD.left - 4} y={toY(t) + 4} textAnchor="end" fontSize={9} fill={T.text3}>{t}</text>)}
      {!th && (
        <g transform={`translate(${W - PAD.right - 150}, ${PAD.top - 16})`}>
          {epics.map((e, i) => (
            <g key={i} transform={`translate(${i * 56}, 0)`}>
              <line x1={0} y1={4} x2={12} y2={4} stroke={e.color} strokeWidth={2} />
              <text x={15} y={8} fontSize={9} fill={T.text2}>{e.label}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  )
}

// ─── Registry ─────────────────────────────────────────────────────────────────

export interface ReportEntry {
  id:        string
  title:     string
  subtitle:  string
  span2:     boolean
  Component: (props?: { variant?: 'thumbnail' | 'full' }) => JSX.Element
}

export const REPORT_REGISTRY: Record<string, ReportEntry> = {
  burndown: { id:'burndown', title:'Burndown Chart',        subtitle:'Sprint S14 · Story points restantes vs. ideal',           span2:true,  Component: BurndownChart   },
  velocity: { id:'velocity', title:'Velocity Chart',         subtitle:'Story points entregues por sprint',                       span2:false, Component: VelocityChart   },
  cfd:      { id:'cfd',      title:'CFD / Cumulative Flow',  subtitle:'Distribuição de itens por status ao longo do tempo',      span2:true,  Component: CFDChart        },
  bugs:     { id:'bugs',     title:'Bugs por Severidade',    subtitle:'Issues de tipo Bug abertas no sprint',                    span2:false, Component: BugsDonut       },
  criados:  { id:'criados',  title:'Criados vs Resolvidos',  subtitle:'Issues criadas e resolvidas por semana (8 semanas)',      span2:true,  Component: CreatedVsResolved},
  workload: { id:'workload', title:'Workload por Pessoa',    subtitle:'Story points atribuídos por membro da equipe',            span2:false, Component: WorkloadChart   },
  aging:    { id:'aging',    title:'Aging de Issues',        subtitle:'Dias em aberto por issue em progresso',                  span2:false, Component: AgingChart      },
  leadtime: { id:'leadtime', title:'Lead Time & Cycle Time', subtitle:'Tempo médio de entrega e execução',                      span2:false, Component: LeadCycleChart  },
  health:   { id:'health',   title:'Saúde do Projeto',       subtitle:'Score geral baseado em 5 dimensões',                     span2:false, Component: ProjectHealth   },
  epic:     { id:'epic',     title:'Epic / Release Burndown',subtitle:'Story points restantes por épico ao longo de 6 semanas', span2:true,  Component: EpicBurndown    },
}

export const REPORT_CARDS_LIST: ReportEntry[] = Object.values(REPORT_REGISTRY)

// ─── Chart Modal ──────────────────────────────────────────────────────────────

export function ReportChartModal({ reportId, onClose }: { reportId: string; onClose: () => void }) {
  const entry = REPORT_REGISTRY[reportId]
  if (!entry) return null
  const Chart = entry.Component
  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 1300, backdropFilter: 'blur(2px)' }}
      />
      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
        zIndex: 1301, width: 'min(760px, 95vw)', maxHeight: '85vh',
        background: T.bgSurface, border: `1px solid ${T.border2}`,
        borderRadius: 16, boxShadow: T.shadowModal,
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>{entry.title}</div>
            <div style={{ fontSize: 12, color: T.text3, marginTop: 3 }}>{entry.subtitle}</div>
          </div>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: 7, background: `${T.text3}14`, border: 'none', color: T.text2, cursor: 'pointer', fontSize: 18, lineHeight: 1, flexShrink: 0 }}
          >×</button>
        </div>
        {/* Chart body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          <Chart />
        </div>
        {/* Footer */}
        <div style={{ padding: '10px 20px', borderTop: `1px solid ${T.border}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ fontSize: 12, color: T.text2, background: 'none', border: `1px solid ${T.border}`, borderRadius: 6, padding: '5px 14px', cursor: 'pointer' }}
          >
            Fechar
          </button>
        </div>
      </div>
    </>
  )
}

// ─── Hook: open a chart modal from any panel ──────────────────────────────────
export function useChartModal() {
  const [openId, setOpenId] = useState<string | null>(null)
  const modal = openId ? <ReportChartModal reportId={openId} onClose={() => setOpenId(null)} /> : null
  return { openChart: setOpenId, chartModal: modal }
}
