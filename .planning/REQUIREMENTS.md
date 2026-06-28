# Requirements: Download Renamer Web Extension

**Defined:** 2026-06-28
**Core Value:** New downloads get smart, consistent names automatically — Claude once per pattern, local rules forever after.

## v1 Requirements

### Core Rename Flow

- [ ] **CORE-01**: Extension intercepts new downloads via `onDeterminingFilename` and renames the file before the first byte is written
- [ ] **CORE-02**: When a known pattern matches, extension applies the stored rename rule locally — zero API call, instant
- [ ] **CORE-03**: When no pattern matches, extension sends filename + metadata to Claude Haiku and receives a suggested name + tag
- [ ] **CORE-04**: Claude-suggested name is applied and the rule is stored for all future matches
- [ ] **CORE-05**: On any failure (API timeout, error, no key), extension calls `suggest()` with the original filename — download never hangs

### Pattern Engine

- [ ] **PATT-01**: Pattern fingerprint is derived from file extension + normalized filename keywords (stripped of dates and numeric suffixes)
- [ ] **PATT-02**: Learned rules persist in `chrome.storage.local` across browser restarts and service worker terminations
- [ ] **PATT-03**: Pattern matching runs entirely locally for known patterns — no network request
- [ ] **PATT-04**: User can view the full list of stored rules in the settings panel
- [ ] **PATT-05**: User can delete individual rules from the settings panel

### Settings & UI

- [ ] **SET-01**: Popup displays extension enabled/disabled status and current month rename count
- [ ] **SET-02**: User can enable or disable the extension from the popup
- [ ] **SET-03**: Options page provides API key input field with masked display and save confirmation
- [ ] **SET-04**: Options page shows rule count, files renamed this month, and estimated API cost
- [ ] **SET-05**: Options page shows list of all learned rules (pattern → tag, example output)

### Monetization

- [ ] **MON-01**: Free tier allows maximum 5 file renames per calendar month; counter persists via `chrome.alarms`-based monthly reset
- [ ] **MON-02**: Free tier displays upgrade prompt and ad unit in the settings panel
- [ ] **MON-03**: Premium tier ($2.99/month) unlocks unlimited renames and removes ads; verified via client-side license key in v1
- [ ] **MON-04**: Free-tier monthly counter is written to `chrome.storage.local` immediately on every increment (survives service worker restart)

### Quality & Store Readiness

- [ ] **QUAL-01**: API key stored in `chrome.storage.local`; settings UI includes a one-line security note (use a low-spend-limit key)
- [ ] **QUAL-02**: All extension errors surface gracefully — no silent failures, no hung downloads, no popup crashes
- [ ] **QUAL-03**: Privacy policy page documents that only filenames (never file contents) are sent to Claude; required for Web Store submission
- [ ] **QUAL-04**: Extension declares only `downloads` and `storage` permissions — no `tabs`, no broad host permissions beyond `https://api.anthropic.com/*`

## v2 Requirements

### Rename History & Undo

- **HIST-01**: Extension maintains a log of the last 100 renames (original name, new name, rule applied, timestamp)
- **HIST-02**: User can undo the most recent rename from the popup
- **HIST-03**: User can view rename history in the settings panel

### Manual Rule Management

- **RULE-01**: User can manually create rules (if filename contains X → rename to [TAG] {original})
- **RULE-02**: User can export all rules as JSON
- **RULE-03**: User can import rules from a JSON file

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
| Real-time notifications per file | Top UX complaint in download managers; use badge count instead |

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
| SET-01 | Phase 3 | Pending |
| SET-02 | Phase 3 | Pending |
| SET-03 | Phase 3 | Pending |
| SET-04 | Phase 3 | Pending |
| SET-05 | Phase 3 | Pending |
| MON-01 | Phase 4 | Pending |
| MON-02 | Phase 4 | Pending |
| MON-03 | Phase 4 | Pending |
| MON-04 | Phase 4 | Pending |
| QUAL-01 | Phase 3 | Pending |
| QUAL-02 | Phase 1 | Pending |
| QUAL-03 | Phase 4 | Pending |
| QUAL-04 | Phase 1 | Pending |

**Coverage:**
- v1 requirements: 19 total
- Mapped to phases: 19
- Unmapped: 0 ✓

---
*Requirements defined: 2026-06-28*
*Last updated: 2026-06-28 after initial definition*
