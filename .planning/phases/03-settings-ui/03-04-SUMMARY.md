---
phase: 03-settings-ui
plan: 04
subsystem: ui
tags: [react, tailwindcss, chrome-extension, storage, options-page, lucide-react]

# Dependency graph
requires:
  - plan: 03-03
    provides: entrypoints/options/App.tsx shell with header, stats, account sections and live storageRules/storageMonthlyCount reads
  - plan: 03-01
    provides: src/lib/storage.ts with storageRules (RulesMap typed), src/lib/renameEngine.ts with applyTemplate

provides:
  - Learned Rules section in entrypoints/options/App.tsx
  - RuleRow component (default state: tag → renameFormat display with Pencil/Trash2 icon buttons)
  - EditExpandedRow (inline expand: text input, slot hint, applyTemplate live preview, Save format/Discard)
  - DeleteConfirmRow (bg-red-50 inline confirm: "Delete this rule?" + Yes, delete/Cancel)
  - EmptyRuleState (heading + body copy when rules object has 0 keys)
  - Per-row mode state (default/editing/deleting) managed in App parent
  - Optimistic local rules state updates on successful save/delete (no re-read from storage)

affects:
  - 03-05 (custom rules section — builds below Learned Rules in same App.tsx)

# Tech tracking
tech-stack:
  added:
    - lucide-react (Pencil, Trash2 icons — already a devDependency, first use in options page)
  patterns:
    - Per-row mode state pattern: Record<fingerprint, 'default'|'editing'|'deleting'> managed in parent
    - Optimistic local update: on storageRules.setValue success, update local React state without re-reading storage
    - applyTemplate called with live input value for real-time preview during editing
    - storageRules.getValue() → mutate → storageRules.setValue() pattern for edit and delete writes

key-files:
  created: []
  modified:
    - entrypoints/options/App.tsx

key-decisions:
  - "Per-row mode state stored in parent App as Record<string, RowMode> — avoids prop drilling while keeping options page flat"
  - "Full RulesMap held in App state (replacing ruleCount-only from 03-03) to power RuleRow renders and optimistic updates"
  - "EditExpandedRow replaces the row content entirely (not appended below) — consistent with UI-SPEC and D-14 inline expand pattern"
  - "Save/delete errors shown inline per row; row stays open until user explicitly cancels or retries"

requirements-completed: [PATT-04, PATT-05, PATT-06, SET-05]

# Metrics
duration: 5min
completed: 2026-06-29
---

# Phase 3 Plan 04: Learned Rules Section Summary

**Inline rule management for options page: RuleRow with Pencil/Trash2 controls, EditExpandedRow wired to storageRules.setValue with applyTemplate live preview, and DeleteConfirmRow with bg-red-50 inline confirm — all driving optimistic local state updates**

## Performance

- **Duration:** ~5 min
- **Completed:** 2026-06-29
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments

- Added full RulesMap state to App (replacing ruleCount-only), enabling RuleRow renders and optimistic updates
- RuleRow default state displays `{tag} → {renameFormat}` with Pencil (aria-label "Edit rename format") and Trash2 (aria-label "Delete rule") icon buttons — hover states and transition-colors per UI-SPEC
- EditExpandedRow: text input pre-filled with current renameFormat, slot hint "Slots: {tag} {date} {index}" (D-15), live applyTemplate preview, Save format/Discard buttons (h-9, bg-blue-600, disabled:opacity-50 while saving)
- DeleteConfirmRow: bg-red-50 background, text-red-700 "Delete this rule?", Yes, delete (bg-red-600, disabled while deleting) and Cancel buttons
- EmptyRuleState: centered py-8 div with "No learned rules yet" heading and descriptive body per copywriting contract
- Error states: inline text-red-600 text-xs for both save and delete failure paths
- Build: 368ms, options chunk 8kB, total 195.66kB

## Task Commits

1. **Task 1: Add Learned Rules section with RuleRow, EditExpandedRow, DeleteConfirmRow, EmptyRuleState** - `c087381` (feat)

## Files Created/Modified

- `entrypoints/options/App.tsx` — added Learned Rules section with all interaction states (220 net lines added)

## Decisions Made

- Full RulesMap stored in App state (not just count) — required to render per-row data and apply optimistic updates without re-fetching from storage
- Per-row mode state as `Record<string, RowMode>` in parent App — flat, avoids lifting complex edit state into individual RuleRow components
- EditExpandedRow replaces the right-side icons inline (not appended as a sibling) — matches D-14 "expands in place" intent and keeps the list layout clean
- Save/delete errors shown per-row inline; the row stays open after error so the user can retry without losing their input

## Deviations from Plan

None - plan executed exactly as written.

## Stub Tracking

No new stubs introduced. Existing stubs from 03-03 (isPremium hardcoded false, placeholder upgrade URL, icon placeholder) remain — tracked in 03-03-SUMMARY.md and are Phase 4 scope.

## Threat Surface Scan

No new network endpoints or trust boundaries introduced. renameFormat edit path uses storageRules.setValue (local storage only) and applyTemplate which uses .replace() exclusively — no eval risk per T-03-07. Delete path removes a key from local storage. Consistent with accepted threats T-03-07 and T-03-08 in plan threat model.

## Self-Check

- [x] entrypoints/options/App.tsx contains "Learned Rules" section heading
- [x] entrypoints/options/App.tsx contains "Edit rename format" (pencil aria-label)
- [x] entrypoints/options/App.tsx contains "Delete rule" (trash aria-label)
- [x] entrypoints/options/App.tsx contains "Save format" and "Discard" strings
- [x] entrypoints/options/App.tsx contains "Delete this rule?" and "Yes, delete" strings
- [x] entrypoints/options/App.tsx contains "No learned rules yet" empty state
- [x] entrypoints/options/App.tsx contains "Slots:" slot hint
- [x] entrypoints/options/App.tsx imports Pencil and Trash2 from lucide-react
- [x] entrypoints/options/App.tsx imports applyTemplate from renameEngine
- [x] entrypoints/options/App.tsx contains storageRules.setValue
- [x] Commit c087381 exists in git log
- [x] npm run build exits 0 (368ms, 195.66kB)

## Self-Check: PASSED
