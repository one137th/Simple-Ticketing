# LocalTicket — Design Brainstorm

## Context
A lightweight, browser-based ticketing system for personal use and AI agent workflows.
No auth, JSON file backend, File System Access API for local file selection.

---

<response>
<probability>0.07</probability>
<text>

## Idea A: "Terminal Noir" — Dark Monochrome Developer Console

**Design Movement**: Neo-brutalist developer tooling meets terminal aesthetics

**Core Principles**:
1. Everything is data-first — the UI serves the data, not the other way around
2. Dense information layout — maximum signal per pixel
3. Monochrome base with a single electric accent color for status/priority
4. Typewriter/monospace typography throughout

**Color Philosophy**:
- Background: near-black `#0d0d0d`
- Surface: `#1a1a1a`
- Borders: `#2e2e2e` — visible but not loud
- Accent: Electric green `#00ff88` for active states, CTAs
- Status colors: amber, red, cyan — all desaturated slightly for elegance
- Emotional intent: "This is a serious tool for serious work"

**Layout Paradigm**:
- Three-column layout: left sidebar (projects/filters), center list (tickets), right panel (detail)
- No cards — pure table rows with subtle hover highlights
- Resizable panels with drag handles

**Signature Elements**:
1. Monospace ticket IDs styled like `[PROJ-042]` in a subtle badge
2. Status indicators as ASCII-style glyphs `●` `◐` `○` with color
3. Subtle scanline texture on the sidebar

**Interaction Philosophy**:
- Keyboard-first: `N` for new ticket, `E` to edit, `Esc` to close
- Inline editing — click any field to edit in place
- Command palette (`Cmd+K`) for power users

**Animation**:
- Instant transitions — no decorative animations, only functional ones
- Slide-in for the detail panel (150ms ease-out)
- Row highlight on hover: subtle background shift

**Typography System**:
- Display: `JetBrains Mono` for IDs, labels, and headers
- Body: `JetBrains Mono` — fully monospace throughout
- Hierarchy through weight and color, not size

</text>
</response>

<response>
<probability>0.06</probability>
<text>

## Idea B: "Blueprint" — Engineering Precision, Light Mode

**Design Movement**: Swiss International Typographic Style meets modern SaaS

**Core Principles**:
1. Grid-aligned everything — every element snaps to an 8px grid
2. Information hierarchy through typographic weight, not decoration
3. Color used only for meaning (status, priority) — never decoration
4. Generous whitespace as a structural element

**Color Philosophy**:
- Background: warm white `#fafaf8`
- Surface: pure white `#ffffff`
- Borders: `#e2e2dc` — warm gray
- Primary: deep navy `#1e3a5f` for headers and primary actions
- Accent: amber `#f59e0b` for highlights and warnings
- Emotional intent: "Precise, trustworthy, calm"

**Layout Paradigm**:
- Fixed left sidebar (240px) + main content area
- Ticket list as a dense table with sortable columns
- Slide-over panel for ticket details (not a separate page)
- Sticky header with project switcher and file controls

**Signature Elements**:
1. Thin 1px rule separators — no box shadows, just lines
2. Priority dots as filled circles in a tight column
3. Status badges as small pill tags with category colors

**Interaction Philosophy**:
- Click-to-expand detail panel from list row
- Inline status changes via dropdown on the row
- Drag to reorder within status columns (optional kanban view)

**Animation**:
- Slide-over panel: 200ms ease-in-out from right
- Row hover: `background-color` transition 80ms
- New ticket: fade-in + subtle slide-down 200ms

**Typography System**:
- Headings: `DM Sans` 700 — clean, geometric
- Body: `DM Sans` 400/500 — readable at small sizes
- Monospace: `IBM Plex Mono` for IDs and code snippets

</text>
</response>

<response>
<probability>0.05</probability>
<text>

## Idea C: "Slate" — Muted Sophistication, Dark Mode

**Design Movement**: Contemporary product design — Notion meets Linear

**Core Principles**:
1. Calm, focused environment — reduce cognitive load
2. Sidebar-driven navigation with collapsible sections
3. Card-based ticket list with micro-detail visible at a glance
4. Dark but warm — not harsh black, but deep slate

**Color Philosophy**:
- Background: `#111318` — deep blue-gray
- Surface: `#1c1f26` — slightly lighter
- Sidebar: `#161920` — distinct but harmonious
- Primary: `#4f8ef7` — clear blue for actions
- Status: semantic colors (green, amber, red, blue) all at 60% saturation
- Emotional intent: "Focused, modern, professional — like Linear"

**Layout Paradigm**:
- Left sidebar (collapsible) with project list, labels, and assignees
- Main area: list view by default, toggle to kanban board
- Right slide-over for ticket detail
- Top bar: breadcrumb + global search + file controls

**Signature Elements**:
1. Smooth gradient on sidebar active item
2. Ticket cards with left-border color strip indicating priority
3. Subtle noise texture on the background for depth

**Interaction Philosophy**:
- Hover reveals action buttons (edit, delete, change status)
- Drag-and-drop between kanban columns
- Quick-add ticket with `+` button or keyboard shortcut

**Animation**:
- Kanban card drag: scale(1.02) + shadow elevation
- Panel open: 250ms cubic-bezier slide from right
- Status change: color transition on the badge

**Typography System**:
- Headings: `Geist` 600/700 — modern, clean
- Body: `Geist` 400 — excellent readability
- Monospace: `Geist Mono` for IDs

</text>
</response>

---

## Selected Approach: **Idea B — "Blueprint"**

Chosen because:
- Light mode is easier to read for long working sessions
- Swiss grid precision aligns well with the "tool for serious work" use case
- DM Sans + IBM Plex Mono is a strong, distinctive pairing (avoids Inter)
- The dense table layout is ideal for scanning many tickets quickly
- Amber accent adds warmth without being playful
