# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 1-Foundation
**Areas discussed:** Verification signal, Storage schema shape, Privacy policy format

---

## Verification Signal

| Option | Description | Selected |
|--------|-------------|----------|
| Visible rename prefix | File lands as `[HOOK-OK-{n}]-originalname.ext`. Unmistakable proof without opening DevTools. | ✓ |
| Console.log only | Service worker logs to DevTools console. Requires opening background inspector. | |
| No indicator — trust download completes | If download completes, suggest() was called. No visual proof. | |

**User's choice:** Visible rename prefix with per-session counter: `[HOOK-OK-{n}]-`

| Follow-up | Options | Selected |
|-----------|---------|----------|
| Include counter in prefix? | Yes (e.g., `[HOOK-OK-3]-`) / No (prefix only) | Yes ✓ |

**Notes:** Counter is in-memory only — resets on service worker restart, which is fine for Phase 1 testing. Prefix stripped entirely in Phase 2.

---

## Storage Schema Shape

| Question | Options | Selected |
|----------|---------|----------|
| Enable flag key | `enabled` / `isEnabled` | `enabled` ✓ |
| Rules storage | `chrome.storage.local` under `rules` key / IndexedDB | `chrome.storage.local` ✓ |
| Counter key | `monthlyCount` / `renamesThisMonth` | `monthlyCount` ✓ |

**User's choice:** All defaults selected. Schema: `{ enabled, monthlyCount, monthlyResetDate, rules: {} }`

**Notes:** IndexedDB deferred — simpler to start with storage.local and only move if scale requires it. Key names are final.

---

## Privacy Policy Format

| Question | Options | Selected |
|----------|---------|----------|
| Where does it live? | Bundled HTML page / PRIVACY.md at repo root / Placeholder only | PRIVACY.md at repo root ✓ |
| Data flow transparency | Full flow (extension → Trevor's server → Claude) / Simplified | Full flow ✓ |
| Mention hosted API key? | User asked a clarifying question about how renaming works without a user key | Full explanation added ✓ |

**User's choice:** `PRIVACY.md` at repo root. Full two-hop data flow documented. Trevor holds the API key — users supply nothing.

**Notes:** Trevor asked "well then how does it know how and what to rename the files to?" — clarified the hosted endpoint model (extension → Trevor's server → Claude). Policy must be hosted at a public URL before Phase 4 Web Store submission.

---

## Claude's Discretion

None — all areas had clear user selections.

## Deferred Ideas

- **IndexedDB for rules** — Raised by STATE.md as a potential scale option. User chose `chrome.storage.local` for simplicity. Revisit in Phase 2 if needed.
- **Privacy policy hosting** — Draft in `PRIVACY.md` now; must be deployed before Phase 4.
