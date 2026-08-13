/**
 * Altech — tipo de evento usado pelas visões do Calendário.
 * Os dados reais vêm de `calendar_events` (src/data/db/calendarEvents.ts);
 * eventos do Google chegam pelo conector e ficam marcados com source 'google'.
 */
import type { CalendarEventType } from './db/calendarEvents'

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
  reminder?:    number   // minutos antes
  source:       'altech' | 'google'
  eventType?:   CalendarEventType
  externalId?:  string
  created_by:   string
}
