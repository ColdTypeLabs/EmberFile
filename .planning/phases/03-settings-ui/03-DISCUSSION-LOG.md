# Phase 3: Settings UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 3-Settings-UI
**Areas discussed:** Popup layout & density, Options page entry point, Rule editing, Conflict resolution trigger

---

## Popup Layout & Density

| Option | Description | Selected |
|--------|-------------|----------|
| Compact (280px) | Small card feel | |
| Standard (360px) | Roomier, elements have breathing room | ✓ |
| You decide | — | |

**User's choice:** Standard (360px)

| Option | Description | Selected |
|--------|-------------|----------|
| Toggle switch + label | 'Renaming: ON/OFF' | |
| Single button ('Pause' / 'Resume') | Action-oriented | ✓ |
| You decide | — | |

**User's choice:** Single button that changes state

| Option | Description | Selected |
|--------|-------------|----------|
| Button in popup ('Manage rules →') | Lower friction for users | ✓ |
| chrome://extensions only | Less UI to build | |
| You decide | — | |

**User's choice:** Button in popup

| Option | Description | Selected |
|--------|-------------|----------|
| Dark card on white (slate/gray palette) | Utility look | |
| White card with blue/indigo accent | Friendly SaaS feel | ✓ |
| You decide | — | |

**User's choice:** White card with blue/indigo accent

| Option | Description | Selected |
|--------|-------------|----------|
| Logo / icon + name at top | Branded header | ✓ |
| Functional only — no branding | Minimal | |
| You decide | — | |

**User's choice:** Logo / icon + name at top

| Option | Description | Selected |
|--------|-------------|----------|
| '3 files renamed this month' | Sentence style | ✓ |
| '3 / 5 renames' (shows free tier limit) | Progress display | |
| You decide | — | |

**User's choice:** '3 files renamed this month'

---

## Options Page Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| WXT native options entrypoint | chrome://extensions → Options link | |
| Full-tab page via chrome.tabs.create() | More layout flexibility | ✓ |
| You decide | — | |

**User's choice:** Full-tab page opened from popup button

| Option | Description | Selected |
|--------|-------------|----------|
| Single scrolling page | Stats at top, rules below | ✓ |
| Sidebar nav (Account / Rules / Custom Rules) | More organized, heavier to build | |
| You decide | — | |

**User's choice:** Single scrolling page

| Option | Description | Selected |
|--------|-------------|----------|
| Consistent branding (logo + name) | Feels like a product | ✓ |
| Plain title ('Settings') | Minimal | |
| You decide | — | |

**User's choice:** Consistent branding

| Option | Description | Selected |
|--------|-------------|----------|
| Opens external payment link in new tab | Simplest for v1 | ✓ |
| Opens modal with pricing + license key input | More polished, more to build | |
| You decide | — | |

**User's choice:** Opens landing page / payment link in a new tab

| Option | Description | Selected |
|--------|-------------|----------|
| Simple scrolling list — no search | Fine for v1 volume | ✓ |
| Search bar above the list | Useful at 50+ rules | |
| You decide | — | |

**User's choice:** Simple scrolling list — no search

---

## Rule Editing — What's Editable & How

| Option | Description | Selected |
|--------|-------------|----------|
| renameFormat only | Simplest, matches PATT-06 literally | ✓ |
| Both renameFormat and tag | Lets users fix bad category labels | |
| You decide | — | |

**User's choice:** renameFormat only

| Option | Description | Selected |
|--------|-------------|----------|
| Row expands in place — input + Save/Cancel | No modal, stays in context | ✓ |
| Editable input right in the row | Spreadsheet-cell feel | |
| You decide | — | |

**User's choice:** Row expands in place — text input + Save/Cancel buttons

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — slot hint below input | Reduces confusion | ✓ |
| No — trust the user | Less visual clutter | |
| You decide | — | |

**User's choice:** Yes — show slot hint: 'Slots: {tag} {date} {index}'

| Option | Description | Selected |
|--------|-------------|----------|
| Inline confirm: row turns red | No modal, contextual | ✓ |
| Browser confirm() dialog | One line of code but ugly | |
| You decide | — | |

**User's choice:** Inline red-row confirm

| Option | Description | Selected |
|--------|-------------|----------|
| Simple 'contains' match | Easiest, covers 90% of cases | ✓ |
| Structured match type dropdown | More precise | |
| You decide | — | |

**User's choice:** Simple 'if filename contains [text]'

| Option | Description | Selected |
|--------|-------------|----------|
| Separate 'Custom Rules' section below learned rules | Clear separation | ✓ |
| Same unified list + button at top | Simpler | |
| You decide | — | |

**User's choice:** Separate 'Custom Rules' section

| Option | Description | Selected |
|--------|-------------|----------|
| Inline form expands when clicking '+ Add rule' | Consistent with row-expand edit pattern | |
| Modal dialog for adding | More focused, easier to dismiss | ✓ |
| You decide | — | |

**User's choice:** Modal dialog for adding custom rules

---

## Conflict Resolution Trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Background stores pending conflict in storage; options page shows on next open | No live messaging, simpler | ✓ |
| Background sends chrome.runtime message; live modal if options page is open | Real-time but requires open page | |
| You decide | — | |

**User's choice:** Storage-based pending conflict

| Option | Description | Selected |
|--------|-------------|----------|
| Custom rule wins; conflict logged for later | Matches PATT-07 | |
| Learned rule wins as fallback; conflict queued | Safe AI-generated default | ✓ |
| You decide | — | |

**User's choice:** Learned rule wins as fallback (note: intentional divergence from PATT-07's "custom always wins" for the conflict-detected case specifically)

| Option | Description | Selected |
|--------|-------------|----------|
| Both rules side by side; pick one permanently | Clear comparison | ✓ |
| Single panel + dropdown | More compact | |

**User's choice:** Both rules side by side — 'Custom: [format]' vs 'Learned: [format]'

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — conflict badge in popup | Better discoverability | |
| No — options page handles it on visit | Simpler | ✓ |
| You decide | — | |

**User's choice:** No badge in popup

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — queue multiple conflicts | Realistic | |
| No — one pending conflict max | Simpler storage schema | ✓ |

**User's choice:** One pending conflict max

| Option | Description | Selected |
|--------|-------------|----------|
| local:pendingConflict — `{ fingerprint, customRule, learnedRule } \| null` | Simple, self-describing | ✓ |
| You decide | — | |

**User's choice:** local:pendingConflict with that schema

---

## Claude's Discretion

- Component composition and React state management approach
- Tailwind class choices, exact spacing and sizing
- Animation/transition decisions within the established visual style

## Deferred Ideas

- Search/filter bar for rule list — v2
- Conflict badge in popup — deferred
- Structured match types for custom rules — v2
- Per-rename success toasts — explicitly out of scope (REQUIREMENTS.md)
- Undo last rename — HIST-02 in v2
