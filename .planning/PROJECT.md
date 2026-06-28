# Download Renamer Web Extension

## What This Is

A Chrome extension that watches the Downloads folder and intelligently renames files using Claude AI. On first encounter with a new file pattern, it calls Claude Haiku to generate a clean, tagged name. From then on, matching patterns are renamed locally — no API call, instant, free. Built for users tired of `Download (2).pdf` and manual renaming.

## Core Value

New downloads get smart, consistent names automatically — the first time via Claude, every time after from local rules.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Extension watches Downloads folder and detects new files
- [ ] Unknown patterns are sent to Claude Haiku for tagging and naming
- [ ] Learned rules are stored locally in IndexedDB (filename pattern + extension → tag + naming scheme)
- [ ] Known patterns are renamed instantly with zero API calls
- [ ] Files are renamed in real-time in the user's Downloads folder
- [ ] Settings panel: API key input, enable/disable toggle, stats, rule viewer
- [ ] Free tier: 5 files/month renamed; Premium ($2.99/mo): unlimited + no ads
- [ ] Error handling: API failures, permission denied, graceful degradation

### Out of Scope

- Folder sorting / file organization — not the core problem
- Manual file uploads / bulk rename UI — adds complexity, defer
- Sync across devices — no backend in v1
- Support for non-Downloads folders — scoped to Downloads for now
- Custom AI models — Claude Haiku only for cost predictability
- Cloud backup of rules — local-only in v1

## Context

- **Platform:** Chrome Web Store (Manifest V3). Firefox deferred post-launch.
- **Business model:** Freemium. Free = 5 files/month + ads. Premium = $2.99/mo unlimited.
- **API cost structure:** ~$0.0003/file (40 tokens @ Haiku rates). ~$0.015 first month, ~$0.01/mo ongoing after patterns stabilize. This is the competitive advantage — patterns learned once, applied forever.
- **Tech stack per spec:** React + TailwindCSS (popup/settings UI), Manifest V3, IndexedDB (pattern storage), Chrome `downloads` API, background service worker.
- **Timeline:** 3-week ship target. Week 1: foundation. Week 2: core logic. Week 3: polish + store submission.
- **Target user:** Anyone with a chaotic Downloads folder who repeatedly downloads similar files (invoices, screenshots, reports).

## Constraints

- **Tech stack:** Manifest V3 (Chrome standard — required for Web Store). No V2.
- **API:** Claude Haiku only — cost must stay at ~$0.01/mo per active user
- **Permissions:** `downloads`, `storage` only — minimal footprint builds trust
- **Timeline:** 3 weeks to Chrome Web Store submission
- **Privacy:** Only filenames sent to Claude, never file contents. Must be in privacy policy.
- **IndexedDB cap:** 10MB max for stored patterns to prevent memory bloat

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Claude Haiku for tagging | ~40 tokens/call = negligible cost; fast enough for background rename | — Pending |
| Local pattern storage (IndexedDB) | Zero recurring API cost after first encounter; works offline | — Pending |
| Freemium at $2.99/mo | Low enough to impulse-buy; free tier (5 files) hits limit fast, makes upgrade obvious | — Pending |
| Free tier = 5 files/month | Aggressive enough to show value, tight enough to drive upgrade | — Pending |
| Downloads folder only | Scope control; Chrome `downloads` API makes this easy and trustworthy | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-06-28 after initialization*
