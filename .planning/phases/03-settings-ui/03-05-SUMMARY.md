---
phase: 03-settings-ui
plan: 05
subsystem: ui
tags: [react, tailwindcss, chrome-extension, storage, options-page, lucide-react, custom-rules, conflict-resolution]

# Dependency graph
requires:
  - plan: 03-04
    provides: entrypoints/options/App.tsx with Learned Rules section (RuleRow, EditExpandedRow, DeleteConfirmRow, EmptyRuleState)
  - plan: 03-01
    provides: src/lib/storage.ts with storageCustomRules and storageConflict definitions

provides:
  - Custom Rules section in entrypoints/options/App.tsx (CustomRuleRow, EmptyCustomRuleState, AddCustomRuleButton)
  - CustomRuleModal: add rule via match text + rename format inputs, writes to storageCustomRules
  - ConflictModal: shown on mount when storageConflict is non-null; side-by-side "Use this" buttons force resolution; writes to storageRules and clears storageConflict
  - Full Phase 3 options page complete — all five success criteria are met

affects: []

# Tech tracking
tech-stack:
  added:
    - lucide-react Plus icon (added to existing Pencil/Trash2 import)
  patterns:
    - CustomRuleRow mirrors RuleRow delete-confirm pattern (mode: 'default' | 'deleting' via customRowModes Record)
    - storageCustomRules.getValue() → mutate → storageCustomRules.setValue() for add and delete
    - storageConflict.getValue() added to mount useEffect Promise.all alongside storageRules, storageMonthlyCount, storageCustomRules
    - ConflictModal: no dismiss path — only "Use this" picks; forces resolution per D-23
    - Optimistic local state update on conflict resolution (setRules, setPendingConflict(null))

key-files:
  created: []
  modified:
    - entrypoints/options/App.tsx

key-decisions:
  - "ConflictModal has no cancel button — forces resolution per D-23; acceptably opinionated UX for correctness of rule state"
  - "CustomRuleRow uses matchText as the storage key (same as storageCustomRules schema keying); delete removes by matchText key"
  - "ConflictModal rendered before CustomRuleModal in JSX (higher in tree) — avoids needing z-index hierarchy between the two overlays"
  - "pendingConflict state initialized to null; conflict loads alongside other storage in single Promise.all; ConflictModal only renders when pendingConflict !== null after load"

requirements-completed: [PATT-07, PATT-08, NOTIF-02]

# Metrics
duration: 4min
completed: 2026-06-29
---

# Phase 3 Plan 05: Custom Rules and Conflict Resolution Summary

**Custom Rules section with AddCustomRuleModal (writes to storageCustomRules) and ConflictModal that checks storageConflict on mount, forces side-by-side resolution, writes chosen format to storageRules, and clears the pending conflict — completing all five Phase 3 success criteria**

## Performance

- **Duration:** ~4 min
- **Completed:** 2026-06-29
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- Added `CustomRulesMap` and `ConflictData` type definitions to options/App.tsx
- Added `EmptyCustomRuleState`: centered py-8 div with "No custom rules" heading and body copy per copywriting contract
- Added `CustomRuleRow`: displays `contains "{matchText}" → {renameFormat}`, Trash2 delete button with same inline red confirm pattern as RuleRow (Delete this rule? / Yes, delete / Cancel)
- Added `CustomRuleModal`: fixed overlay with match text input ("If filename contains"), rename format input ("Rename to"), slot hint, validation error ("Both fields are required."), write error, Discard/Add rule button row — writes to storageCustomRules.setValue on success
- Added `Plus` icon import from lucide-react; "Add custom rule" button (bg-blue-600, h-9, flex+gap-2 with Plus icon) opens modal
- Extended mount useEffect Promise.all to load storageCustomRules and storageConflict alongside existing reads
- Added `ConflictModal`: shown when pendingConflict !== null; "Rule conflict detected" heading; body copy per UI-SPEC; side-by-side Custom rule / Learned rule cards each with "Use this" (bg-blue-600, w-full); no dismiss/cancel per D-23; "Use this" (custom) writes storageRules[fingerprint].renameFormat then clears storageConflict; "Use this" (learned) clears storageConflict only; save error shown below buttons
- Build: 340ms, options chunk 15.24kB, total 203.19kB

## Task Commits

1. **Task 1: Add Custom Rules section and CustomRuleModal** - `a9b7625` (feat)
2. **Task 2: Add ConflictModal** - `b23f934` (feat)

## Files Created/Modified

- `entrypoints/options/App.tsx` — added Custom Rules section, CustomRuleModal, ConflictModal, Plus icon import, extended mount useEffect (+369 net lines across two tasks)

## Decisions Made

- ConflictModal has no cancel/dismiss — D-23 explicitly requires resolution-only; the accepted threat T-03-10 acknowledges the intentional no-dismiss design
- CustomRuleRow uses matchText as the map key (matching storageCustomRules schema) — delete removes the entry by that key
- ConflictModal appears above CustomRuleModal in the JSX tree so both can share z-50 without explicit z-index management
- pendingConflict initializes to null and remains null until the mount Promise.all resolves; ConflictModal only renders when non-null

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

The following pre-existing stubs from earlier plans remain (not introduced by this plan):
- `entrypoints/options/App.tsx` line 547: `{/* Icon placeholder */}` — Phase 4 scope (icon asset)
- `entrypoints/options/App.tsx` line 576: `https://example.com/upgrade` — Phase 4 scope (payment/landing URL)
- `isPremium = false` hardcoded — Phase 4 scope (tier detection)

These do not block Phase 3 success criteria.

## Threat Surface Scan

No new network endpoints, auth paths, or external trust boundaries introduced. storageCustomRules write path accepts user-supplied matchText (used as .includes() substring only, per T-03-09 accepted) and renameFormat (template string, no eval, per T-03-07 accepted). storageConflict write path (setValue null) only clears the conflict record. Consistent with accepted threats T-03-09 and T-03-10 in plan threat model.

## Self-Check

- [x] entrypoints/options/App.tsx contains "Custom Rules" section heading
- [x] entrypoints/options/App.tsx contains "Add custom rule" button text
- [x] entrypoints/options/App.tsx contains "If filename contains" label (D-18)
- [x] entrypoints/options/App.tsx contains "Rename to" label
- [x] entrypoints/options/App.tsx contains "Add rule" and "Discard" in modal button row
- [x] entrypoints/options/App.tsx contains "No custom rules" empty state
- [x] entrypoints/options/App.tsx contains storageCustomRules.setValue
- [x] entrypoints/options/App.tsx imports Plus from lucide-react
- [x] entrypoints/options/App.tsx contains "Rule conflict detected" title
- [x] entrypoints/options/App.tsx contains "A custom rule and a learned rule both match" body
- [x] entrypoints/options/App.tsx contains "Custom rule" and "Learned rule" option labels
- [x] entrypoints/options/App.tsx contains "Use this" pick button
- [x] entrypoints/options/App.tsx contains storageConflict.getValue() in mount useEffect
- [x] entrypoints/options/App.tsx contains storageConflict.setValue(null) on resolution
- [x] ConflictModal has no Cancel/Close/Dismiss button
- [x] Commit a9b7625 exists
- [x] Commit b23f934 exists
- [x] npm run build exits 0 (340ms, 203.19kB)

## Self-Check: PASSED
