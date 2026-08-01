# Plan: Section 1 + Section 2 — Design System & Key Screens

## Context
The user is building a complete Design System + product UI showcase for a B2B SaaS Project Management platform targeting software factories and product teams. The deliverable is a multi-page React app:
- **Section 1** — Foundations page: all design tokens and atomic components with states
- **Section 2** — Key Screens: App Shell, Executive Dashboard, Project View (Kanban/List/Gantt/Metrics tabs), Client Portal, Task Drawer

Style reference: Linear.app / modern Jira — clean, high-density, corporate, light mode, strong hierarchy. Desktop 1440px.

---

## File Strategy

```
src/
  App.tsx            — top-level router between Section 1 and Section 2
  tokens.css         — all CSS custom property tokens (imported by index.css)
  index.css          — @import 'tailwindcss'; @import './tokens.css';
  pages/
    FoundationsPage.tsx   — Section 1 scroll page
    DashboardPage.tsx     — Section 2: Executive Dashboard
    ProjectPage.tsx       — Section 2: Project View (tabbed)
    ClientPortalPage.tsx  — Section 2: Client Transparency Portal
  components/
    Shell.tsx             — App shell: sidebar + header wrapper
    Sidebar.tsx           — Collapsible sidebar (expanded 240px / collapsed rail 56px)
    Header.tsx            — Top header bar
    TaskDrawer.tsx        — Right-side task detail drawer
    ds/                   — Design system primitives (reused across pages)
      Button.tsx
      Badge.tsx
      Avatar.tsx
      Input.tsx
      Card.tsx
      Table.tsx
      Tooltip.tsx
```

No new npm dependencies — React 19 + Tailwind CSS v4 cover everything including charts (burndown drawn with SVG paths).

---

## CSS Tokens (`src/tokens.css`)

```css
:root {
  --bg-page:        #F7F9FC;
  --bg-surface:     #FFFFFF;
  --border-subtle:  #E6EBF2;
  --border-default: #CDD6E3;
  --text-primary:   #0B1120;
  --text-secondary: #4B5769;
  --text-muted:     #7B8698;

  --primary:        #2F6BFF;
  --primary-hover:  #2557D6;
  --primary-active: #1E48B4;
  --focus-ring:     rgba(47,107,255,.35);
  --emerald:        #06C18A;

  --healthy:        #06C18A;  --healthy-tint:   #E6FAF4;
  --warning:        #F5A524;  --warning-tint:   #FEF4E0;
  --blocked:        #F0455A;  --blocked-tint:   #FDEAED;
  --inprogress:     #2F6BFF;  --inprogress-tint:#EBF0FF;
  --backlog:        #7B8698;  --backlog-tint:   #F0F2F5;
}
```

---

## Section 1 — Foundations Page (`src/pages/FoundationsPage.tsx`)

Scrollable single-column page with sticky left nav that links to section anchors.

### 1. Color Tokens
Grid of swatch pairs (full color + soft tint side-by-side), labeled with token name and hex. Groups: Neutrals · Brand/Action · Accent · Status Health.

### 2. Typography & Spacing
- Type specimen table: each row = style name | rendered text | size/weight/tracking/leading spec. Font: `system-ui, -apple-system, sans-serif` (Inter fallback). Code/Tag row uses `font-mono`.
- Spacing bars: horizontal colored bars in 8/16/24/32/48px heights, labeled.

### 3. Buttons — component grid
Columns = variants (Primary, Secondary, Ghost, Destructive). Rows = states (Default, Hover, Active, Disabled, Loading). Loading state shows inline SVG spinner with `animate-spin`. States displayed statically with forced CSS classes (not interactive) so all states are visible simultaneously.

### 4. Inputs / Fields
Vertical stack: plain input · icon-leading input · focused input · error input with message · select · textarea. Each has a label above.

### 5. Status Badges & Pills
Row of pills per status: colored 6px dot + label text, on soft tint background with 1px colored border. All 8 statuses shown inline.

### 6. Avatars
- Single: initials-based circles in sm (24px) / md (32px) / lg (40px) with distinct background hues
- Group: 3 overlapping avatars (negative margin stack) + "+2" slate pill
- Presence: md avatar with corner dot variants (green=online, amber=busy, slate=away)

### 7. Containers
- **Card**: white, border, shadow-sm. Header row (title + ghost button), body paragraph, footer (Secondary + Primary buttons)
- **Modal preview**: shown as scaled inline mock — dark overlay slice + centered dialog with title / body / footer CTA row
- **Drawer preview**: right-anchored panel (300px), border-l, shadow-l, with header + scrollable body + footer
- **Tooltip**: absolute dark pill (#0B1120 bg, white text, 6px radius) above a trigger button, with a 4px caret

### 8. Table
5 columns: ☐ | Task | Assignee | Priority | Status. 5 realistic rows (sprint task names, real-name assignees, P0–P2 priorities, status badges). Interactive:
- `sortCol` + `sortDir` state — clicking header toggles asc/desc and shows caret
- `selectedRows` Set state — checkbox on each row; checked row gets `--inprogress-tint` bg
- `hoveredRow` state — row hover tint
- Pagination footer: "Showing 1–5 of 24" · Prev (disabled on page 1) · Next
- Empty state: centered lock icon SVG + "No tasks match your filters" message (shown when a toggle is active)

---

## Section 2 — Key Screens

All screens rendered inside `<Shell>` which provides sidebar + header.

### Shell (`src/components/Shell.tsx` + `Sidebar.tsx` + `Header.tsx`)

**Sidebar** (left, fixed):
- Expanded (240px): workspace switcher (avatar + workspace name + chevron) at top, global search input below it, then nav groups:
  - *Start Here*: Home, My Tasks, Inbox
  - *My Day*: Today, Upcoming
  - *Management*: Projects (with sub-list of 3 recent projects), Sprints, Roadmap, Reports
  - *Configuration*: Team, Settings
- Recent Projects list: 3 items with color dot + name + health badge
- User block pinned at bottom: avatar + name + role + ellipsis menu (Profile, Preferences, Sign out)
- Collapsed rail (56px): icon-only buttons with Tooltip on hover; a `>` chevron at top-right to expand

**Header** (top, full width minus sidebar):
- Breadcrumb (Workspace › Project name)
- Cmd+K search bar (styled input with `⌘K` badge inside, opens a mock command palette overlay on click)
- Project selector dropdown (current project name + chevron)
- Notifications bell with unread count badge (red pill)
- Theme toggle (sun/moon icon, non-functional visual)
- User avatar (32px) with dropdown menu (Profile, Settings, Sign out)

### Screen 1 — Executive Dashboard (`src/pages/DashboardPage.tsx`)

Layout: 2-column grid (left 70% / right 30%).

**Left column:**
1. **Project Health Row** — 3 RAG cards side-by-side:
   - Green card: "Payments API v3" — Healthy — "On track, 3 days ahead"
   - Amber card: "Mobile App Rebrand" — At Risk — "Design sign-off delayed 4d"
   - Red card: "Data Pipeline Migration" — Blocked — "Awaiting infra credentials"
   Each card: colored left border (4px), health badge, project name, reason tag chip, days remaining pill.

2. **Overall Progress** — large metric card: "67% Complete" as big number + thin progress bar (blue fill) + "Delivering on track" label. Sparkline SVG (delivery curve: rising line over 8 weeks) drawn inline.

3. **Active Impediments & Blockers** — card with list of 4 blockers:
   - Each row: Red/Amber badge | blocker title | "Owned by: [Name]" avatar+name | "Blocked X days" pill
   - Example: 🔴 "Prod DB credentials missing" · Owned by: Rafael Mendes · 3d blocked
   - Sort by days blocked descending.

**Right column:**
4. **Next Sprint & Immediate Deliveries** — card titled "Sprint 14 · Ends Jul 28":
   - Progress ring (donut SVG, 72% done)
   - List of 5 upcoming deliveries: title + due date + assignee avatar + status badge

### Screen 2 — Project View (`src/pages/ProjectPage.tsx`)

Tabs: Kanban · List · Gantt · Metrics (React useState for active tab).

**Quick filters bar** (always visible below tabs): Sprint selector · Assignee filter chips · Priority filter chips · Group-by dropdown · Layout-density toggle.

**Kanban tab:**
5 columns: Backlog | To Do | In Dev | In Review / UX | Done.
Each column: header with name + WIP badge (count) + "+" add button.
Each card (4–5 per column): key tag (e.g. "PM-142") + type icon (story/bug/task) + title + priority dot + assignee avatar + story-points badge + label chips + optional red "BLOCKED" flag banner.

**List tab:**
Table extending the Section 1 table component — columns: ☐ | Key | Title | Type | Assignee | Sprint | Priority | Story Pts | Status | Due Date. Filters applied above table as active chips.

**Gantt tab:**
Simplified horizontal bar chart. Left pane: task names (10 rows). Right pane: time axis (weeks, Jul 7 → Aug 18). Bars colored by status token. Diamond milestone markers. Dependency arrows (SVG lines connecting bar end to next bar start). Release milestone at Aug 1 (vertical dashed line).

**Metrics tab:**
Two side-by-side chart cards:
- Burndown: SVG line chart — ideal line (diagonal, dashed) vs actual remaining (stepped real line). X-axis: sprint days 1–14. Y-axis: story points.
- Burnup: SVG area chart — total scope line (flat top) vs completed (rising). Shows scope creep bump at day 6.
Both charts: labeled axes, data point dots, legend.

### Screen 3 — Client Transparency Portal (`src/pages/ClientPortalPage.tsx`)

Stripped-down shell: no sidebar, just a top bar with client logo area + "Client View" badge + user avatar.

Layout: 3-column grid.

**Col 1 (wide): Sprint Status**
- Card: "Sprint 14 — In Progress" header. Progress bar 72%. Deadline Jul 28.
- Deliveries this sprint: list of 5 user-story titles with status badge (Done/In Review/In Progress). No technical details.

**Col 2: Awaiting Your Validation**
- Highlighted card (emerald left border). Title: "Action Required".
- List of 3 items awaiting client approval: feature name + "Preview" ghost button + "Approve" primary button. 
- Counter badge at top: "3 pending".

**Col 3: Published Roadmap**
- Vertical timeline of 4 upcoming milestones: Q3 Release · Beta Launch · v2 Feature Drop · GA.
- Each: date chip + name + one-line business value description + status badge.
- No internal backlog, technical bugs, or internal comments visible.

**Bottom row:** "Recent Deliveries" full-width card — completed features with date delivered + "View Demo" ghost button.

### Screen 4 — Task Detail Drawer (`src/components/TaskDrawer.tsx`)

Rendered as an open right drawer (400px wide, overlapping the project view behind it — show blurred/dimmed project view in background).

**Drawer header:**
- Status badge (dropdown-style: click = mock open) · Task key "PM-142" · Actions row: Edit · Duplicate · Archive · More (···) · ✕ close

**Drawer body (scrollable):**
- Title (large, editable-looking h2)
- Rich-text description area (mock formatted text: bold label + paragraph, a code snippet block in monospace, a bullet list)
- Metadata grid (2-col): Assignee (avatar+name) | Reporter | Sprint | Estimate (story pts) | Priority | Created date | Due date
- Tags row: label chips (e.g. "backend", "auth", "critical")
- Attachments: 2 file thumbnails (file icon + name + size + download icon)
- **Change History timeline**: 4 events in a vertical timeline (dot + connector line): "Created by Ana Lima · Jun 10" → "Moved to In Dev · Jun 12" → "Lucas Ferreira added comment · Jun 14" → "Status changed to Blocked · Jun 15 — by Rafael Mendes"
- **Comment thread**: 3 comments. Each: avatar + name + timestamp + text body. Last comment has a text input below it with a Send button.

**Drawer footer:** Save Changes (Primary) · Cancel (Ghost)

---

## Navigation / Routing

Simple `useState` router in `App.tsx`:
```tsx
type View = 'foundations' | 'dashboard' | 'project' | 'client' | 'drawer-demo'
```
Top-level nav bar (above everything) lets the user switch between views — acts as a "prototype nav" for the showcase. When `view === 'dashboard' | 'project' | 'client'`, render inside `<Shell>`.

---

## Verification
1. Dev server always running — save triggers hot reload
2. Navigate to each view via the prototype nav
3. Verify Kanban columns scroll horizontally if needed; Gantt bars span visible
4. Verify all interactive states: tab switching, sort, row selection, sidebar collapse, drawer open
5. No TypeScript errors
