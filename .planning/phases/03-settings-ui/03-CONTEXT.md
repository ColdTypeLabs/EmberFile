# Phase 3: Settings UI - Context

**Gathered:** 2026-06-28
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers the complete user-facing UI layer: a 360px popup and a full-tab options page. Users can view stats and toggle the extension from the popup, and manage all rules (view, edit, delete, create custom) from the options page. Conflict resolution between custom and learned rules is queued in storage and resolved via a modal in the options page.

</domain>

<decisions>
## Implementation Decisions

### Popup Layout & Visual Design
- **D-01:** Popup width: 360px.
- **D-02:** Enable/disable control: single button that changes label — "Pause" when active, "Resume" when paused. Not a toggle switch.
- **D-03:** Popup includes a "Manage rules →" button that opens the full-tab options page via `chrome.tabs.create()`.
- **D-04:** Color scheme: white card with blue/indigo accent (Tailwind blue/indigo palette). Consumer-app feel.
- **D-05:** Popup header: logo/icon + "Download Renamer" name at the top. Branded.
- **D-06:** Rename count label format: `"{N} files renamed this month"` — simple sentence style, no progress-toward-limit display in popup.
- **D-07:** No conflict badge/indicator in the popup. Pending conflicts are resolved when the user opens the options page.

### Options Page Architecture
- **D-08:** Options page is a full-tab HTML page opened via `chrome.tabs.create()` from the popup's "Manage rules →" button. Not a WXT native options entrypoint. Entry: `entrypoints/options/` (WXT will scaffold this as a page accessible at `chrome-extension://[id]/options.html`).
- **D-09:** Single scrolling page layout — stats section at top, learned rules section below, custom rules section at the bottom. No sidebar nav.
- **D-10:** Consistent branding header on options page (same logo + "Download Renamer" as popup).
- **D-11:** "Upgrade" button (free users, SET-03) opens an external payment/landing page in a new tab. No in-extension payment modal.
- **D-12:** Rule list: simple scrolling list with no search/filter bar at v1.

### Rule Editing
- **D-13:** Only `renameFormat` is editable on a learned rule. `tag` is not user-editable. Matches PATT-06 ("edit rename format").
- **D-14:** Inline editing pattern: clicking the pencil icon expands the row in place — a text input appears below the rule display with Save and Cancel buttons. No modal for editing learned rules.
- **D-15:** Slot hint shown when editing: a small line below the input reads `"Slots: {tag} {date} {index}"`.
- **D-16:** Delete confirmation (PATT-05): row turns red with "Delete?" + "Yes" / "Cancel" buttons inline. No browser `confirm()` dialog.
- **D-17:** Custom rules live in a separate "Custom Rules" section on the options page, below the learned rules section.
- **D-18:** Custom rule match condition: simple "if filename contains [text]" text input. Single match type only — no dropdown for "starts with" / "ends with" at v1.
- **D-19:** Adding a new custom rule opens a **modal dialog** (not inline expand). Fields: match text + rename format.

### Conflict Resolution
- **D-20:** Conflict detection: background service worker stores conflict in `chrome.storage.local` under `local:pendingConflict`. Schema: `{ fingerprint: string, customRule: { matchText, renameFormat }, learnedRule: { tag, renameFormat } } | null`. Null = no pending conflict.
- **D-21:** Conflict fallback: when a conflict is detected during a download, the **learned rule** is applied as the fallback (download proceeds). The pending conflict is stored for the user to resolve later.
- **D-22:** Conflict cap: one pending conflict at a time. If another conflicting download occurs before resolution, the same learned-rule fallback applies. The stored conflict is not overwritten (first conflict wins the queue slot).
- **D-23:** Conflict resolution UX: options page checks `local:pendingConflict` on mount. If non-null, shows a modal with both rules side by side — "Custom: [renameFormat]" vs "Learned: [renameFormat]". User picks one; choice is stored as the resolved rule for that fingerprint; `local:pendingConflict` is cleared.

### Claude's Discretion
- Component composition, state management approach (React state vs. hooks), Tailwind class choices, animation/transition decisions, exact pixel spacing — all open to implementer's judgment within the established visual style (white + blue/indigo).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — PATT-04 through PATT-08, SET-01 through SET-05, NOTIF-02 are the Phase 3 requirements. Read these for exact acceptance criteria.
- `.planning/ROADMAP.md` — Phase 3 success criteria (5 criteria that must be TRUE)

### Prior Phase Decisions (locked — inherit, do not override)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Storage schema: key names `local:enabled`, `local:monthlyCount`, `local:monthlyResetDate`, `local:rules`
- `.planning/phases/02-rename-engine/02-CONTEXT.md` — Rule schema `{ tag, renameFormat, matchCount }`, template slots `{tag}/{date}/{index}`, Worker relay architecture

### Architecture Constraints
- `CLAUDE.md` (project root) — Critical constraints: Tailwind as PostCSS plugin only (never CDN), storage-first state, WXT framework, no API key in extension

### Existing Code
- `entrypoints/background.ts` — Storage item definitions (exported); Phase 3 needs to add `local:pendingConflict` storage item here
- `entrypoints/popup/App.tsx` — Current stub to be replaced with real popup UI
- `src/lib/renameEngine.ts` — `applyTemplate()` — useful for live-previewing what a renameFormat template produces in the edit UI

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `storageEnabled`, `storageRules`, `storageMonthlyCount` (exported from `entrypoints/background.ts`) — popup and options page import these directly to read/write state
- `applyTemplate(renameFormat, tag, matchCount)` from `src/lib/renameEngine.ts` — can power a live rename preview in the edit expanded row
- `entrypoints/popup/main.tsx` — existing React entry point; just replace `App.tsx`

### Established Patterns
- Storage-first: every mutation written immediately via the storage item's `.setValue()`. No optimistic local state that might not flush before service worker termination.
- WXT framework: new pages go under `entrypoints/` (e.g., `entrypoints/options/App.tsx`)

### Integration Points
- `entrypoints/background.ts` — needs `local:pendingConflict` storage item added (schema: `{ fingerprint, customRule, learnedRule } | null`)
- `background.ts:handleDeterminingFilename` — conflict detection logic added here: if both `storageRules[fingerprint]` and `storageCustomRules[fingerprint]` match, write `local:pendingConflict` and use learned rule as fallback
- Custom rules need their own storage key — `local:customRules` (Record keyed by match text, value: `{ matchText, renameFormat }`)

</code_context>

<specifics>
## Specific Ideas

- Popup visual style: white card, blue/indigo accent — think Tailwind `blue-600` or `indigo-600` for the Pause/Resume button and badge accents.
- The "Manage rules →" button in the popup should call `chrome.tabs.create({ url: chrome.runtime.getURL('options.html') })`.
- Options page add-custom-rule is a **modal** specifically (not inline) — this is the one place a modal was explicitly requested.
- Learned rules section and Custom Rules section are visually separated on the options page (different headings, possibly a divider).

</specifics>

<deferred>
## Deferred Ideas

- Search/filter bar for rule list — deferred to v2 if users request it
- Conflict badge in popup — deferred; options page handles resolution on visit
- Structured match types for custom rules (starts with / ends with / extension is) — deferred to v2
- Per-rename success toasts — explicitly out of scope per REQUIREMENTS.md (UX noise)
- Undo last rename — HIST-02 in v2 requirements

</deferred>

---

*Phase: 3-Settings-UI*
*Context gathered: 2026-06-28*
