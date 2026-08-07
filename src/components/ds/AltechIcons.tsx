// Altech icon library — minimal geometry, 24×24 grid, stroke 1.5, currentColor.
// All icons inherit the surrounding text color (active / inactive / hover states).
import type { SVGProps } from 'react'

export interface AltechIconProps extends Omit<SVGProps<SVGSVGElement>, 'viewBox'> {
  size?: number | string
}

function Base({ size = 24, children, ...rest }: AltechIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...rest}
    >
      {children}
    </svg>
  )
}

/** 1) Dashboard executivo */
export function DashboardIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <line x1="12" y1="4" x2="12" y2="6.5" />
      <line x1="12" y1="17.5" x2="12" y2="20" />
      <line x1="4" y1="12" x2="6.5" y2="12" />
      <line x1="17.5" y1="12" x2="20" y2="12" />
      <path d="M12 9 L13.5 12 L12 13.5 L10.5 12 Z" fill="currentColor" stroke="none" />
    </Base>
  )
}

/** 2) Projetos & Tarefas */
export function ProjectsIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <ellipse cx="12" cy="12" rx="9" ry="3.5" transform="rotate(-20 12 12)" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="5" cy="9.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="14.5" r="1" fill="currentColor" stroke="none" />
    </Base>
  )
}

/** 3) Discovery — Filtros & Busca / Issue Navigator */
export function DiscoveryIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <circle cx="10.5" cy="10.5" r="5.5" />
      <path d="M10.5 7.5 L10.5 13.5 M7.5 10.5 L13.5 10.5" />
      <line x1="14.5" y1="14.5" x2="20" y2="20" strokeWidth={2} />
      <path d="M6 6 L8 8" strokeWidth={1} opacity="0.5" />
      <path d="M15 6 L13 8" strokeWidth={1} opacity="0.5" />
    </Base>
  )
}

/** 4) Backlog / Lista */
export function BacklogIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <line x1="5" y1="7" x2="21" y2="7" />
      <line x1="5" y1="12" x2="17" y2="12" />
      <line x1="5" y1="17" x2="12" y2="17" />
      <circle cx="3" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="3" cy="12" r="1.2" fill="currentColor" stroke="none" opacity="0.65" />
      <circle cx="3" cy="17" r="1.2" fill="currentColor" stroke="none" opacity="0.35" />
    </Base>
  )
}

/** 5) Sprints */
export function SprintIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <path d="M12 3.5 A8.5 8.5 0 1 1 4.5 17.5" fill="none" />
      <path d="M4.5 17.5 L2 14 L7.5 14 Z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="3.5" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="12" r="1.2" fill="currentColor" stroke="none" opacity="0.5" />
    </Base>
  )
}

/** 6) Roadmap — Timeline */
export function RoadmapIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <path d="M3 18 C5 18 9 18 12 12 C15 6 19 6 21 6" fill="none" />
      <circle cx="3" cy="18" r="2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" opacity="0.65" />
      <circle cx="21" cy="6" r="2" fill="currentColor" stroke="none" opacity="0.4" />
    </Base>
  )
}

/** 7) Relatórios & Insights */
export function ReportsAltIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <line x1="2" y1="12" x2="7" y2="12" />
      <path d="M7 5.5 L17 12 L7 18.5 Z" fill="none" />
      <line x1="17" y1="12" x2="22" y2="8" />
      <line x1="17" y1="12" x2="22" y2="12" />
      <line x1="17" y1="12" x2="22" y2="16" />
    </Base>
  )
}

/** 8) Administração — Configurações / Time & Permissões */
export function AdminIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <path d="M12 2 L20.66 7 L20.66 17 L12 22 L3.34 17 L3.34 7 Z" />
      <line x1="12" y1="12" x2="12" y2="2" />
      <line x1="12" y1="12" x2="20.66" y2="17" />
      <line x1="12" y1="12" x2="3.34" y2="7" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    </Base>
  )
}

/** 9) Epic */
export function EpicIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <circle cx="12" cy="4" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="20" cy="9" r="1.2" fill="currentColor" stroke="none" opacity="0.7" />
      <circle cx="17" cy="19" r="1.5" fill="currentColor" stroke="none" opacity="0.85" />
      <circle cx="7" cy="19" r="1" fill="currentColor" stroke="none" opacity="0.6" />
      <circle cx="4" cy="9" r="1.3" fill="currentColor" stroke="none" opacity="0.9" />
      <line x1="12" y1="4" x2="20" y2="9" strokeWidth={0.8} opacity="0.35" />
      <line x1="20" y1="9" x2="17" y2="19" strokeWidth={0.8} opacity="0.35" />
      <line x1="17" y1="19" x2="7" y2="19" strokeWidth={0.8} opacity="0.35" />
      <line x1="7" y1="19" x2="4" y2="9" strokeWidth={0.8} opacity="0.35" />
      <line x1="4" y1="9" x2="12" y2="4" strokeWidth={0.8} opacity="0.35" />
    </Base>
  )
}

/** 10) História */
export function StoryIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <rect x="3" y="15" width="5.5" height="5.5" rx="1.5" />
      <rect x="9.25" y="10" width="5.5" height="10.5" rx="1.5" />
      <rect x="15.5" y="4" width="5.5" height="16.5" rx="1.5" />
    </Base>
  )
}

/** 11) Risco / bloqueio */
export function RiskIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <path d="M12 12 m-2.5 0 a2.5 2.5 0 0 1 5 0" strokeWidth={1.6} fill="none" />
      <path d="M12 12 m-5.5 0 a5.5 5.5 0 0 1 11 0" strokeWidth={1.2} fill="none" opacity="0.65" />
      <path d="M12 12 m-8.5 0 a8.5 8.5 0 0 1 17 0" strokeWidth={0.9} fill="none" opacity="0.35" />
      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
      <line x1="12" y1="12" x2="18" y2="6.5" strokeWidth={1} opacity="0.5" />
    </Base>
  )
}

/** 12) PMO */
export function PmoIcon(p: AltechIconProps) {
  return (
    <Base {...p}>
      <path d="M12 3 L21 12 L12 21 L3 12 Z" fill="none" />
      <line x1="12" y1="1" x2="12" y2="3.5" />
      <line x1="22.5" y1="12" x2="20.5" y2="12" />
      <line x1="12" y1="22.5" x2="12" y2="20.5" />
      <line x1="1.5" y1="12" x2="3.5" y2="12" />
      <circle cx="12" cy="12" r="2" fill="none" />
    </Base>
  )
}
