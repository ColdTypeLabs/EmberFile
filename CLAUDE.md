# Download Renamer Web Extension — Project Guide

## Project

A Chrome Manifest V3 extension that auto-renames downloads using Claude Haiku. First encounter → AI call. Every repeat → local rule, zero API cost. Freemium: 5 files/month free, $2.99/mo premium.

## GSD Workflow

This project uses the GSD (Get Shit Done) workflow system.

**Planning artifacts:** `.planning/`
**Current state:** `.planning/STATE.md`
**Roadmap:** `.planning/ROADMAP.md`
**Requirements:** `.planning/REQUIREMENTS.md`

**Commands:**
- `/gsd:plan-phase N` — plan the next phase
- `/gsd:execute-phase N` — execute a planned phase
- `/gsd:progress` — check current status
- `/gsd:discuss-phase N` — discuss approach before planning

## Critical Architecture Constraints

These are locked decisions from research — do not deviate without explicit discussion:

1. **`onDeterminingFilename` + `suggest()`** is the only valid rename API. `chrome.downloads.rename()` does not exist. Always call `suggest()` in a `finally` block — Chrome blocks the download until it's called.
2. **Storage-first state** — no module-level variables. MV3 service workers terminate after 30s idle. All state (counters, rules, queue) must be written to `chrome.storage.local` immediately on mutation.
3. **WXT framework** (not Plasmo, not CRXJS). Plasmo is in maintenance mode. WXT is Vite-based, MV3-native, actively maintained.
4. **Tailwind as PostCSS plugin only** — the CDN script is remotely-hosted code and causes instant Web Store rejection.
5. **Freemium gating in the service worker** — never in the popup (bypassable via DevTools).
6. **`chrome.alarms`** for monthly counter reset — `setInterval` does not survive service worker termination.

## Stack

- **Framework:** WXT (`wxt` + `@wxt-dev/module-react`)
- **UI:** React 18 + TailwindCSS (PostCSS plugin)
- **Storage:** `chrome.storage.local` (via `@wxt-dev/storage`)
- **API:** Claude Haiku (`claude-haiku-4-5-20251001` or latest Haiku)
- **Permissions:** `downloads`, `storage`, `alarms`, host: `https://api.anthropic.com/*`
- **Testing:** Vitest (unit), Playwright (E2E, lower priority)

## Roadmap Summary

| Phase | Goal | Key Requirements |
|-------|------|-----------------|
| 1 – Foundation | Loadable extension, MV3 rename hook proven, storage schema | CORE-01/02/05, PATT-01/02, QUAL-02/04 |
| 2 – Rename Engine | Claude on first encounter, local cache on repeat | CORE-03/04, PATT-03 |
| 3 – Settings UI | Popup + options: toggle, rule viewer, inline edit, custom rules, conflict resolution | PATT-04–08, SET-01–05, NOTIF-02 |
| 4 – Freemium + Store | Usage gate, limit toast, monthly reset, Web Store submission | MON-01–04, NOTIF-01, QUAL-03 |

## Privacy Policy (Required for Web Store)

The extension sends only filenames (never file contents) to the hosted Claude endpoint. Server logs record only the anonymized pattern (e.g., "invoice + .pdf"), tag, rename format, and timestamp — never actual filenames or user identifiers. Draft must exist before Phase 4 submission.

## Hosted API Key Model

Trevor hosts the Claude API key. Users never input or see it. This means:
- No API key field in the settings UI (SET-03 is account tier badge, not key input)
- No chrome.storage.local key storage
- Trevor absorbs API cost (~$0.01/mo per active user)
- Freemium enforcement is the only cost-control mechanism
