---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: Phase 4 — Freemium + Store Submission
current_plan: Popup UI Redesign — EXECUTED (plan at `CLI/plans/read-state-md-and-execute-typed-noodle.md`). Dark 3-screen popup live, options page stubbed, styling polish pass done.
status: executing
last_updated: "2026-06-30T05:17:48.980Z"
progress:
  total_phases: 4
  completed_phases: 3
  total_plans: 17
  completed_plans: 14
  percent: 75
---

# Project State: Download Renamer Web Extension

**Last updated:** 2026-06-29
**Status:** Ready to execute

---

## Project Reference

**Core value:** New downloads get smart, consistent names automatically — Claude once per pattern, local rules forever after.

**Current focus:** Phase 4 — popup UI redesign is DONE (3-screen dark popup, license key activation UI, upgrade banner, build clean, 36/36 tests pass). Remaining work to actually ship: two manual checkpoints (Cloudflare KV, GitHub Pages) + replacing TBD placeholder URLs + freemium gate wiring.

---

## Current Position

**Milestone:** v1 — Chrome Web Store Launch
**Current phase:** Phase 4 — Freemium + Store Submission
**Current plan:** Popup UI Redesign — EXECUTED (plan at `CLI/plans/read-state-md-and-execute-typed-noodle.md`). Dark 3-screen popup live, options page stubbed, styling polish pass done.
**Status:** Phase 4 — UI redesign complete. Wave 1 checkpoints (04-02 Cloudflare KV, 04-05 GitHub Pages) still open. Freemium gate enforcement, real upgrade URL, and store assets remain.

```
Progress: [x] Phase 1  [x] Phase 2  [x] Phase 3  [ ] Phase 4
          25%          50%          75%                   100%
```

---

## Performance Metrics

| Metric | Value |
|--------|-------|
| Phases total | 4 |
| Phases complete | 3 |
| Requirements mapped | 27/27 |
| Plans complete | 14 |

---

## Accumulated Context

### Key Decisions

| Decision | Rationale |
|----------|-----------|
| WXT 0.20.x (not Plasmo/CRXJS) | Plasmo is maintenance mode; CRXJS stalled; WXT is actively maintained and MV3-native |
| `chrome.storage.local` for all mutable state | Survives service worker termination; module-level vars do not |
| IndexedDB for pattern rules | Separate concern from volatile state; 10MB cap with LRU eviction at 500 rules |
| `onDeterminingFilename` + `suggest()` only | `chrome.downloads.rename()` does not exist in MV3 |
| Freemium bypass accepted in v1 | $2.99/mo impulse-buy price; backend enforcement deferred to v2 |
| Tailwind as PostCSS plugin only | CDN script is remotely-hosted code — rejected by MV3 CSP |
| Tailwind v4 via `@tailwindcss/vite` | WXT plugin dropped — use Vite plugin directly in wxt.config.ts vite() |
| Storage consolidated to `src/lib/storage.ts` | Single source of truth; background.ts + all UI pages import from here |
| ConflictModal has no dismiss | User must pick one side — per D-23 in CONTEXT.md |
| `isPremium` hardcoded false in Phase 3 | Phase 4 adds real freemium gate; Phase 3 UI is structural only |
| /validate-key route uses url.pathname dispatch | Existing POST / rename route unchanged; validate-key checked first then falls through |
| LICENSE_KEYS KV placeholder ID in wrangler.toml | Trevor must run kv namespace create and update ID before deploying |
| Privacy policy hosted via GitHub Pages /docs folder | No separate hosting infrastructure required |
| Store listing name 34 chars, short desc 105 chars | Well within Chrome Web Store limits (45/132 chars) |
| Upgrade URL and privacy URL left as explicit PLACEHOLDERs | Must be replaced before submission — marked clearly in STORE-LISTING.md |

### Architecture Constraints (must not violate)

- All event listeners registered synchronously at module top level (never inside async functions)
- Every state mutation written to `chrome.storage.local` immediately — no in-memory cache
- `suggest()` always called in `finally` block — download must never hang
- 5-second `Promise.race` timeout on all Claude API calls
- Permissions: `downloads`, `storage`, `alarms` only + host_permissions for `https://*.workers.dev/*`
- Storage items exported exclusively from `src/lib/storage.ts` — never redefined elsewhere

### Open Questions (for Phase 4)

- Premium tier verification: client-side `isPremium` flag vs. lightweight license key via serverless function?
- Monthly counter reset: `chrome.alarms` already scaffolded in background.ts — wire to counter in Phase 4
- Store listing copy, icon assets, and privacy policy URL needed for submission

### Todos (Phase 4)

- [x] Popup UI redesign — dark 3-screen popup (popup/settings/rules), license key activation, upgrade banner, options page stub
- [x] Styling polish pass — brighter borders, deeper accent blue w/ real hover state, bolder labels (Trevor-approved 2026-06-29)
- [x] Implement freemium gate in service worker (5 free renames/month) — confirmed live in `entrypoints/background.ts` (gate, counter increment on both cache-hit/miss paths, notification on block)
- [x] Wire `chrome.alarms` monthly reset to `storageMonthlyCount` — confirmed live (`checkMissedReset` + `setupAlarms` + calendar-accurate reschedule on each fire)
- [x] Upgrade prompt toast/notification on 6th download for free users — confirmed live
- [x] `isPremium` derivation — `!!licenseKey`, no server-side revalidation, is the locked v1 design (CONTEXT.md D-15), not a placeholder
- [ ] Create store assets: 128×128 icon, 440×280 promo tile, store listing copy (listing copy done in STORE-LISTING.md; icon/promo tile are Trevor's manual step)
- [ ] Replace `UPGRADE_URL` and `CHROME_STORE_URL` placeholders in `src/lib/constants.ts` (still `example.com` / generic webstore URL — both marked TBD in code; tracked in STORE-LISTING.md pre-submission checklist)
- [ ] Confirm `/validate-key` worker endpoint works against the real KV namespace once 04-02 is done
- [ ] **04-06 (new, from cross-AI review):** guard `chrome.notifications.onButtonClicked` on `notifId === 'limitReached'`, not just `btnIdx === 0` — currently any future notification with a button at index 0 would wrongly open the upgrade URL
- [ ] **04-04 (found during replan verification):** `handleActivateKey`'s fetch to `/validate-key` has no 5-second `Promise.race` timeout, unlike every other Worker call in this codebase — add one
- [ ] **04-03/04-04 (new):** no regression tests exist yet for the popup freemium UI or key-redemption flow — add `tests/popup-freemium.test.tsx` and `tests/popup-key-redemption.test.tsx`

**Note on Phase 4 replanning (2026-06-30):** `/gsd:plan-phase 4 --reviews` ran after the Codex cross-AI review (`04-REVIEWS.md`). Found the implementation had drifted ahead of the plan docs (executed via an ad-hoc popup redesign pass, not the original 04-03/04-04 plan text) and that most HIGH/MEDIUM review concerns were already resolved in code. Rewrote 04-03/04-04 to target the actual `entrypoints/popup/App.tsx` architecture and added 04-06 for the one real remaining gap (notification ID guard). Phase 4 is now 6 plans across 2 waves.

**Known gate false-negative:** the plan-phase Decision Coverage Gate (`check.decision-coverage-plan`) reported 0/26 CONTEXT.md decisions covered for Phase 4. Verified this is a tooling limitation, not a real gap — the gate's body-section extractor only recognizes markdown `#` headings, but this project's plans use XML tags (`<objective>`, `<must_haves>`) for structure, which the regex doesn't match. Manually confirmed substantive coverage via keyword grep across all 6 plans (alarms, notifications, validate-key, KV, privacy.html, store listing, isPremium, key redemption all densely represented) plus explicit `D-NN` citations already present in 04-01/04-03/04-04 prose. Proceeded without re-planning to avoid pure busywork on already-correct, already-executed plans.

### Blockers

*(none)*

---

## Session Continuity

## Next Actions

**Immediate (what's actually blocking ship):**

1. Trevor completes the two manual checkpoints below (KV deploy, GitHub Pages)
2. Wire real freemium enforcement in `entrypoints/background.ts` — right now the popup UI shows the upgrade banner at `count >= 5` but nothing in the background worker actually blocks the 6th rename
3. Replace `UPGRADE_URL` / `CHROME_STORE_URL` in `src/lib/constants.ts` with real URLs (payment platform + Web Store listing link, once published)
4. Store assets (icon, promo tile, listing copy) before submission

**Trevor must complete manually (human-action checkpoints):**

04-02 — Cloudflare KV deploy:

1. `wrangler kv namespace create LICENSE_KEYS` (run from workers/rename-relay/)
2. Copy the KV namespace ID into workers/rename-relay/wrangler.toml
3. `wrangler kv key put --binding=LICENSE_KEYS "TEST-KEY-001" "active"`
4. `wrangler deploy`
5. `curl -X POST https://<your-worker>.workers.dev/validate-key -H "Content-Type: application/json" -d '{"key":"TEST-KEY-001"}'` → expect `{"valid":true}`

Resume signal: type "deployed"

04-05 — GitHub Pages:

1. Repo Settings → Pages → Source: main branch → /docs folder → Save
2. Wait ~2min for build
3. Confirm https://ya-boy-mac.github.io/Download-Renamer-Web-Extension/privacy.html is live
4. Update PRIVACY_URL in src/lib/constants.ts (created during UI redesign)

Resume signal: type "pages-live" and paste confirmed URL

---

*State initialized: 2026-06-28*
*Phase 3 complete: 2026-06-28 — 5/5 plans, 4 waves, 32/32 tests, build clean*
