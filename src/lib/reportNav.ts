// Cross-screen navigation intent for report/KPI cards.
// A card sets the intent right before navigating; the destination screen
// consumes it once on mount and applies the corresponding filter/focus.

export interface ReportNavIntent {
  /** Destination view id handled by App.tsx (e.g. 'reports', 'list', 'team:convites'). */
  view: string
  /** Report card to focus/highlight on ReportsPage. */
  reportId?: string
  /** Work item type filter for ListPage (e.g. 'bug'). */
  itemType?: string
  /** Work item status filter for ListPage. */
  itemStatus?: string
}

let pending: ReportNavIntent | null = null

export function setReportNav(intent: ReportNavIntent): void {
  pending = intent
}

/** Reads and clears the pending intent. Returns null when there is none. */
export function takeReportNav(view: string): ReportNavIntent | null {
  if (!pending || pending.view !== view) return null
  const p = pending
  pending = null
  return p
}
