/**
 * Altech — Calendar Events shared store (Inspection Mode).
 * Tenant-scoped. Never cross-tenant. Events relative to real today.
 */
import { MOCK_TENANT } from './session'

export interface CalendarEvent {
  id:           string
  tenant_id:    string
  title:        string
  start:        string   // ISO 8601
  end:          string   // ISO 8601
  allDay:       boolean
  guests:       { name: string; email: string }[]
  meetLink?:    string
  location?:    string
  description?: string
  color:        string   // hex
  workItemId?:  string   // e.g. 'ALT-139'
  reminder?:    number   // minutes before
  source:       'altech' | 'google'
  created_by:   string
}

// ─── Google sync state (module-level, session-persistent) ─────────────────────
export const GOOGLE_SYNC = {
  connected:  false,
  connecting: false,
  email:      '',
  lastSync:   '',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function rel(days: number, hour: number, min = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, min, 0, 0)
  return d.toISOString()
}

function relEnd(days: number, hour: number, min = 0): string {
  return rel(days, hour, min)
}

let _id = 20

// ─── Mock Google events (added on connect, removed on disconnect) ──────────────
export const MOCK_GOOGLE_EVENTS: CalendarEvent[] = [
  {
    id: 'gce_001', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Almoço com cliente — Construtora',
    start: rel(-1, 12), end: relEnd(-1, 13, 30),
    allDay: false, guests: [{ name: 'João Silva', email: 'joao@construtora.com' }],
    color: '#10B981', source: 'google', created_by: 'google',
    description: 'Reunião de alinhamento de escopo.',
  },
  {
    id: 'gce_002', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Review de Proposta Comercial',
    start: rel(1, 10), end: relEnd(1, 11),
    allDay: false, guests: [{ name: 'Ana Lima', email: 'ana@altech.io' }],
    color: '#F59E0B', source: 'google', created_by: 'google',
  },
  {
    id: 'gce_003', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Workshop de Onboarding — Time New',
    start: rel(3, 14), end: relEnd(3, 17),
    allDay: false, guests: [], color: '#A78BFA', source: 'google', created_by: 'google',
  },
  {
    id: 'gce_004', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Apresentação Q3 — Board',
    start: rel(7, 9), end: relEnd(7, 10, 30),
    allDay: false, guests: [{ name: 'Carlos Drummond', email: 'carlos@altech.io' }],
    meetLink: 'meet.altech.io/brd-q3x-ppt', color: '#EF4444', source: 'google', created_by: 'google',
  },
  {
    id: 'gce_005', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Férias — Diana',
    start: rel(14, 0), end: relEnd(21, 23, 59),
    allDay: true, guests: [], color: '#6366F1', source: 'google', created_by: 'google',
  },
]

// ─── Store ────────────────────────────────────────────────────────────────────
let _events: CalendarEvent[] = [
  {
    id: 'ce_001', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Sprint Review — Sprint 14',
    start: rel(1, 16), end: relEnd(1, 17),
    allDay: false,
    guests: [
      { name: 'Beatriz Alves', email: 'beatriz@altech.io' },
      { name: 'Rafael Mendes', email: 'rafael.sm@altech.io' },
    ],
    meetLink: 'meet.altech.io/srv-r14-abc',
    description: 'Revisão do Sprint 14 com o time e stakeholders.',
    color: '#3B82F6', workItemId: undefined, reminder: 10,
    source: 'altech', created_by: 'u_sm',
  },
  {
    id: 'ce_002', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Daily Standup',
    start: rel(0, 9), end: relEnd(0, 9, 15),
    allDay: false,
    guests: [
      { name: 'Ana Lima', email: 'ana@altech.io' },
      { name: 'Lucas Ferreira', email: 'lucas.tl@altech.io' },
    ],
    meetLink: 'meet.altech.io/dly-s14-xyz',
    color: '#10B981', reminder: 5, source: 'altech', created_by: 'u_sm',
  },
  {
    id: 'ce_003', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Refinamento de Backlog',
    start: rel(2, 14), end: relEnd(2, 15, 30),
    allDay: false,
    guests: [
      { name: 'Beatriz Alves', email: 'beatriz@altech.io' },
      { name: 'Mariana Souza', email: 'mariana@altech.io' },
    ],
    color: '#6366F1', reminder: 15, source: 'altech', created_by: 'u_po',
    workItemId: 'ALT-141',
  },
  {
    id: 'ce_004', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Planning Sprint 15',
    start: rel(5, 10), end: relEnd(5, 12),
    allDay: false,
    guests: [
      { name: 'Rafael Mendes', email: 'rafael.sm@altech.io' },
      { name: 'Beatriz Alves', email: 'beatriz@altech.io' },
    ],
    meetLink: 'meet.altech.io/pln-s15-mno',
    color: '#F59E0B', reminder: 30, source: 'altech', created_by: 'u_sm',
  },
  {
    id: 'ce_005', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Apresentação para o cliente — ERP v2',
    start: rel(-2, 15), end: relEnd(-2, 16),
    allDay: false,
    guests: [{ name: 'Maria Fernanda', email: 'maria@cliente.com' }],
    meetLink: 'meet.altech.io/cli-erp-v2x',
    color: '#A78BFA', source: 'altech', created_by: 'u_po',
  },
  {
    id: 'ce_006', tenant_id: MOCK_TENANT.tenant_id,
    title: 'Deploy Website Relaunch v1.2',
    start: rel(4, 18), end: relEnd(4, 18, 30),
    allDay: false, guests: [{ name: 'Lucas Ferreira', email: 'lucas.tl@altech.io' }],
    color: '#EF4444', workItemId: 'ALT-139', reminder: 60, source: 'altech', created_by: 'u_tl',
  },
]

// ─── CRUD ─────────────────────────────────────────────────────────────────────
export function getAllEvents(tenant_id: string): CalendarEvent[] {
  return _events.filter(e => e.tenant_id === tenant_id)
}

export function getEventsInRange(tenant_id: string, from: Date, to: Date): CalendarEvent[] {
  return _events.filter(e => {
    if (e.tenant_id !== tenant_id) return false
    const s = new Date(e.start)
    const en = new Date(e.end)
    return s <= to && en >= from
  })
}

export function addEvent(ev: Omit<CalendarEvent, 'id'>): CalendarEvent {
  const newEv: CalendarEvent = { ...ev, id: `ce_${String(++_id).padStart(3, '0')}` }
  _events = [..._events, newEv]
  return newEv
}

export function updateEvent(id: string, patch: Partial<CalendarEvent>): void {
  _events = _events.map(e => e.id === id ? { ...e, ...patch } : e)
}

export function removeEvent(id: string): void {
  _events = _events.filter(e => e.id !== id)
}

export function addGoogleEvents(): void {
  const existing = new Set(_events.map(e => e.id))
  for (const ev of MOCK_GOOGLE_EVENTS) {
    if (!existing.has(ev.id)) _events = [..._events, { ...ev, tenant_id: MOCK_TENANT.tenant_id }]
  }
}

export function removeGoogleEvents(): void {
  _events = _events.filter(e => e.source !== 'google')
}

export function genMeetLink(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  const seg = (n: number) => Array.from({ length: n }, () => chars[Math.floor(Math.random() * 26)]).join('')
  return `meet.altech.io/${seg(3)}-${seg(4)}-${seg(3)}`
}
