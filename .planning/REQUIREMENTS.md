# Requirements: Download Renamer Web Extension

**Defined:** 2026-06-28
**Last updated:** 2026-06-28 after FINAL scope ingest
**Core Value:** New downloads get smart, consistent names automatically — Claude once per pattern, local rules forever after.

## v1 Requirements

### Core Rename Flow

- [ ] **CORE-01**: Extension intercepts new downloads via `onDeterminingFilename` and renames the file before the first byte is written
- [ ] **CORE-02**: When a known pattern matches, extension applies the stored rename rule locally — zero API call, instant
- [ ] **CORE-03**: When no pattern matches, extension sends filename + metadata to the hosted Claude Haiku endpoint and receives a suggested name + tag
- [ ] **CORE-04**: Claude-suggested name is applied and the rule is stored for all future matches
- [ ] **CORE-05**: On any failure (API timeout, error, network issue), extension calls `suggest()` with the original filename — download never hangs

### Pattern Engine

- [ ] **PATT-01**: Pattern fingerprint is derived from file extension + normalized filename keywords (stripped of dates and numeric suffixes)
- [ ] **PATT-02**: Learned rules persist in `chrome.storage.local` across browser restarts and service worker terminations
- [ ] **PATT-03**: Pattern matching runs entirely locally for known patterns — no network request
- [ ] **PATT-04**: User can view the full list of stored rules in the settings panel
- [ ] **PATT-05**: User can delete individual rules from the settings panel (with confirm dialog)
- [ ] **PATT-06**: User can edit a learned rule's rename format via inline pencil icon; edits apply forward-only and do not retroactively rename already-renamed files
- [ ] **PATT-07**: User can create custom rules without downloading a file first (format: "if filename contains X, rename to Y"); custom rules always win over learned rules when both match
- [ ] **PATT-08**: When a custom rule and a learned rule both match a download, extension shows a conflict modal presenting both options; user picks one; choice is stored and applied automatically to all future matches of that pattern

### Settings & UI

- [ ] **SET-01**: Popup displays extension enabled/disabled status, current month rename count, and a FREE or PREMIUM badge
- [ ] **SET-02**: User can enable or disable the extension from the popup
- [ ] **SET-03**: Options page displays account tier (FREE / PREMIUM ✓), rename stats, and upgrade button for free users
- [ ] **SET-04**: Options page shows rule count and files renamed this month
- [ ] **SET-05**: Options page shows list of all learned rules (pattern → tag, example output) with edit and delete controls

### Notifications

- [x] **NOTIF-01**: Extension shows a toast notification when the free tier monthly limit is reached; file stays unrenamed; toast includes an upgrade call-to-action
- [ ] **NOTIF-02**: Extension shows a toast or modal when a rule conflict is detected; UI presents both matching rules for user selection

### Monetization

- [ ] **MON-01**: Free tier allows maximum 5 file renames per calendar month; counter auto-resets on the 1st of each month
- [x] **MON-02**: Free tier displays upgrade prompt and ad unit in the settings panel
- [x] **MON-03**: Premium tier ($2.99/month) unlocks unlimited renames and removes ads; verified via client-side license key in v1
- [ ] **MON-04**: Free-tier monthly counter is written to `chrome.storage.local` immediately on every increment (survives service worker restart); `chrome.alarms` triggers monthly reset

### Quality & Store Readiness

- [ ] **QUAL-02**: All extension errors surface gracefully — no silent failures, no hung downloads, no popup crashes
- [ ] **QUAL-03**: Privacy policy page documents that only filenames (never file contents) are sent to Claude, and that no actual filenames are logged server-side (pattern only)
- [ ] **QUAL-04**: Extension declares only `downloads`, `storage`, and `alarms` permissions — no `tabs`, no broad host permissions beyond the hosted API endpoint

## v2 Requirements

### Rename History & Undo

- **HIST-01**: Extension maintains a log of the last 100 renames (original name, new name, rule applied, timestamp)
- **HIST-02**: User can undo the most recent rename from the popup
- **HIST-03**: User can view rename history in the settings panel

### Manual Rule Management

- **RULE-01**: User can export all rules as JSON
- **RULE-02**: User can import rules from a JSON file

### Platform & Premium

- **PLAT-01**: Firefox add-on port
- **PREM-01**: Backend-verified premium subscription (replaces v1 client-side license key)
- **PREM-02**: Dark mode for settings panel

## Out of Scope

| Feature | Reason |
|---------|--------|
| Folder sorting / file organization | Not the core problem; adds scope and permissions |
| Bulk rename UI | Manual operation, different UX pattern; defer |
| Sync across devices | Requires backend; v1 is local-only |
| Custom AI models | Haiku only for cost predictability; no model picker |
| Cloud backup of rules | Backend dependency; out of v1 |
| Non-Downloads folders | Adds permission surface and complexity; scope to Downloads |
| Per-rename success toasts | Active toast on every rename is UX noise; limit-hit and conflict toasts only (NOTIF-01, NOTIF-02) |
| User-supplied API key | Trevor hosts the key; users never input or see it — zero setup friction |
| Quality feedback (thumbs-down) | Add later if Claude suggestions degrade; not MVP |
| Retroactive file renaming | Users own their filesystem; edits apply forward only |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| CORE-01 | Phase 1 | Pending |
| CORE-02 | Phase 1 | Pending |
| CORE-03 | Phase 2 | Pending |
| CORE-04 | Phase 2 | Pending |
| CORE-05 | Phase 1 | Pending |
| PATT-01 | Phase 1 | Pending |
| PATT-02 | Phase 1 | Pending |
| PATT-03 | Phase 2 | Pending |
| PATT-04 | Phase 3 | Pending |
| PATT-05 | Phase 3 | Pending |
| PATT-06 | Phase 3 | Pending |
| PATT-07 | Phase 3 | Pending |
| PATT-08 | Phase 3 | Pending |
| SET-01 | Phase 3 | Pending |
| SET-02 | Phase 3 | Pending |
| SET-03 | Phase 3 | Pending |
| SET-04 | Phase 3 | Pending |
| SET-05 | Phase 3 | Pending |
| NOTIF-01 | Phase 4 | Complete |
| NOTIF-02 | Phase 3 | Pending |
| MON-01 | Phase 4 | Pending |
| MON-02 | Phase 4 | Complete |
| MON-03 | Phase 4 | Complete |
| MON-04 | Phase 4 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after FINAL scope ingest — hosted API key model, rule editing + conflict resolution promoted to v1, toast scope narrowed to limit-hit + conflict only*
