// Altech Design System — JS token constants
// Neutral tokens resolve through CSS custom properties (see index.css), so the
// same constant renders correctly in both the dark (default) and light theme.
// Brand/semantic colors are identical across themes and stay as literal hex so
// they remain safe for alpha-suffix concatenation (e.g. `T.accent + '30'`).
export const T = {
  // Backgrounds
  bgPage:      'var(--bg-page, #09090B)',
  bgSurface:   'var(--bg-surface, #16161D)',
  bgSurface2:  'var(--bg-surface-2, #1C1C26)',
  bgOverlay:   'var(--bg-overlay, rgba(9,9,11,0.80))',
  // Borders
  border:      'var(--border-subtle, #262633)',
  border2:     'var(--border-default, #2E2E40)',
  // Text
  text1:       'var(--text-primary, #F1F1F5)',
  text2:       'var(--text-secondary, #9898AD)',
  text3:       'var(--text-muted, #5C5C7A)',
  // Accent — Altech Blue + Indigo (theme-invariant)
  accent:      '#3B82F6',
  accentDim:   'rgba(59,130,246,0.12)',
  accentBorder:'rgba(59,130,246,0.30)',
  indigo:      '#6366F1',
  indigoDim:   'rgba(99,102,241,0.12)',
  // Semantic (theme-invariant)
  success:     '#10B981',
  successDim:  'rgba(16,185,129,0.12)',
  warn:        '#F59E0B',
  warnDim:     'rgba(245,158,11,0.12)',
  crit:        '#EF4444',
  danger:      '#EF4444',
  critDim:     'rgba(239,68,68,0.12)',
  neutral:     '#5C5C7A',
  neutralDim:  'rgba(92,92,122,0.12)',
  purple:      '#A78BFA',
  purpleDim:   'rgba(167,139,250,0.12)',
  // Elevation
  shadow1:     'var(--shadow-1, 0 1px 3px rgba(0,0,0,0.4))',
  shadow2:     'var(--shadow-2, 0 4px 20px rgba(0,0,0,0.5))',
  shadowModal: 'var(--shadow-modal, 0 32px 80px rgba(0,0,0,0.64))',
} as const

export type TK = typeof T
