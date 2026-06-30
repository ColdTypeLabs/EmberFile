# Roadmap: Download Renamer Web Extension

**Milestone:** v1 — Chrome Web Store Launch
**Granularity:** Standard (4 phases)
**Mode:** MVP — each phase delivers a working vertical slice
**Coverage:** 27/27 v1 requirements mapped

---

## Phases

- [x] **Phase 1: Foundation** - WXT build pipeline, MV3 event hook, storage schema, privacy policy (Complete 2026-06-28)
- [x] **Phase 2: Rename Engine** - Claude integration, pattern learning, local cache matching (Complete 2026-06-28)
- [x] **Phase 3: Settings UI** - Popup, options page, rule viewer, inline editing, custom rules, conflict resolution (Complete 2026-06-28)
- [ ] **Phase 4: Freemium + Store Submission** - Usage gating, upgrade prompt, store assets

---

## Phase Details

### Phase 1: Foundation

**Goal:** A loadable Chrome extension that intercepts downloads, applies a no-op rename, and persists state — proving the critical MV3 mechanics before any logic builds on top.
**Mode:** mvp
**Depends on:** Nothing (first phase)
**Requirements:** CORE-01, CORE-02, CORE-05, PATT-01, PATT-02, QUAL-02, QUAL-04
**Success Criteria** (what must be TRUE):

  1. Extension loads in Chrome without CSP violations and appears in chrome://extensions
  2. Downloading a file triggers the `onDeterminingFilename` listener and `suggest()` is called — download completes normally
  3. On any simulated failure, `suggest()` is called with the original filename and the download never hangs
  4. Enable/disable flag and storage schema are readable across simulated service worker restarts
  5. Privacy policy draft exists and correctly states only filenames (never file contents) are sent to Claude

**Plans:** 3 plans
Plans:

- [x] 01-01-PLAN.md — WXT scaffold, manifest permissions, storage schema, Vitest config (Wave 1)
- [x] 01-02-PLAN.md — onDeterminingFilename hook implementation + unit tests + manual Chrome load (Wave 2)
- [x] 01-03-PLAN.md — Privacy policy draft (PRIVACY.md) (Wave 2, parallel)

**UI hint:** yes

---

### Phase 2: Rename Engine

**Goal:** Downloads are renamed intelligently — unknown patterns go to Claude Haiku; known patterns match locally with zero API calls.
**Mode:** mvp
**Depends on:** Phase 1
**Requirements:** CORE-03, CORE-04, PATT-03
**Success Criteria** (what must be TRUE):

  1. Downloading a never-seen file triggers a Claude Haiku call and the file is renamed with the AI-suggested name
  2. Downloading the same pattern a second time applies the stored rule instantly — no network request made
  3. Claude API timeout or error results in the original filename being used — download completes, no hang
  4. Learned rules survive browser restart and service worker termination

**Plans:** 3 plans
Plans:

- [x] 02-01-PLAN.md — computeFingerprint + applyTemplate pure functions with TDD unit tests (Wave 1)
- [x] 02-02-PLAN.md — Cloudflare Worker relay scaffold, VITE_WORKER_URL env var, host_permissions update (Wave 1, parallel)
- [x] 02-03-PLAN.md — Wire rename engine into background.ts: cache lookup + Worker call + rule storage + timeout (Wave 2)

---

### Phase 3: Settings UI

**Goal:** Users can view and manage rules, create custom rules, resolve conflicts, and see their account status — all through a complete popup and options page.
**Mode:** mvp
**Depends on:** Phase 2
**Requirements:** PATT-04, PATT-05, PATT-06, PATT-07, PATT-08, SET-01, SET-02, SET-03, SET-04, SET-05, NOTIF-02
**Success Criteria** (what must be TRUE):

  1. Popup shows rename count for current month, an enable/disable toggle, and a FREE/PREMIUM badge
  2. Options page lists all learned rules with pattern, example output, edit (pencil), and delete controls
  3. User can edit a rule's rename format inline; saving applies forward only; prior renames unchanged
  4. User can create a custom rule without downloading a file; custom rule wins when it matches
  5. When a custom rule and learned rule both match a download, a conflict modal appears; user picks one; same pattern never prompts again

**Plans:** 5 plans
Plans:

- [x] 03-01-PLAN.md — Tailwind install, storage extraction to src/lib/storage.ts, conflict detection in background, options scaffold (Wave 1)
- [x] 03-02-PLAN.md — Popup UI: PauseResumeButton, RenameCountLabel, AccountBadge, ManageRulesLink (Wave 2, parallel)
- [x] 03-03-PLAN.md — Options shell: OptionsHeader, StatsSection, AccountSection (Wave 2, parallel)
- [x] 03-04-PLAN.md — Learned Rules section: RuleRow, EditExpandedRow, DeleteConfirmRow, EmptyRuleState (Wave 3)
- [x] 03-05-PLAN.md — Custom Rules section + CustomRuleModal + ConflictModal (Wave 4)

**UI hint:** yes

---

### Phase 4: Freemium + Store Submission

**Goal:** Freemium gate is enforced and survives service worker restarts; extension is submitted to Chrome Web Store with all required assets.
**Mode:** mvp
**Depends on:** Phase 3
**Requirements:** MON-01, MON-02, MON-03, MON-04, NOTIF-01, QUAL-03
**Success Criteria** (what must be TRUE):

  1. Free tier user who has renamed 5 files sees an upgrade prompt on the 6th download instead of a rename
  2. Monthly counter resets on the first day of the new calendar month and persists through browser restarts
  3. Premium license key unlocks unlimited renames and removes the upgrade prompt
  4. Extension is submitted to Chrome Web Store with privacy policy URL, store listing copy, and icon assets

**Plans:** 6 plans
Plans:
**Wave 1**

- [x] 04-01-PLAN.md — storageLocalLicenseKey + freemium gate + alarms + notification listener (Wave 1) — EXECUTED
- [ ] 04-02-PLAN.md — Worker /validate-key route + KV binding + deployment checkpoint (Wave 1, parallel) — code done, Cloudflare KV checkpoint pending
- [x] 04-05-PLAN.md — docs/privacy.html + STORE-LISTING.md + SCREENSHOTS.md + GitHub Pages checkpoint (Wave 1, parallel) — code done, GitHub Pages checkpoint pending

**Wave 2** *(blocked on Wave 1 completion)*

- [ ] 04-03-PLAN.md — Reconciled: verify popup freemium UI (isPremium wiring + at-limit banner, already built in popup/App.tsx) + add regression tests (Wave 2, depends on 04-01)
- [ ] 04-04-PLAN.md — Reconciled: verify popup key redemption flow (already built in popup/App.tsx SettingsScreen, not options/App.tsx) + add 5s timeout + regression tests (Wave 2, depends on 04-01)
- [ ] 04-06-PLAN.md — Notification ID guard fix on chrome.notifications.onButtonClicked (Codex review finding) + regression test (Wave 2, depends on 04-01)

**UI hint:** yes

**Note (2026-06-29, reviews mode replan):** Phase 4 UI architecture diverged from the original 04-03/04-04 plan text during an ad-hoc popup redesign (see STATE.md). All popup-facing Phase 4 work (isPremium wiring, upgrade banner, key redemption) now lives in entrypoints/popup/App.tsx; entrypoints/options/App.tsx is an intentional stub. 04-03 and 04-04 were rewritten to verify-and-test the actual shipped code rather than re-describe a UI structure that no longer exists. 04-06 was added to close the one still-open Codex cross-AI review finding (notification ID guard); all other review findings were confirmed already resolved in code.

---

## Progress Table

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/3 | Complete | 2026-06-28 |
| 2. Rename Engine | 3/3 | Complete | 2026-06-28 |
| 3. Settings UI | 5/5 | Complete | 2026-06-28 |
| 4. Freemium + Store Submission | 3/6 (04-01, 04-02 code, 04-05 code complete; checkpoints pending) | In progress | - |

---

*Roadmap created: 2026-06-28*
*Last updated: 2026-06-28 after FINAL scope ingest — Phase 3 expanded with rule editing, custom rules, conflict resolution (PATT-06/07/08, NOTIF-02); NOTIF-01 added to Phase 4; coverage 19→27*
*Phase 1 plans finalized: 2026-06-28 — 3 plans, 2 waves*
*Phase 2 plans finalized: 2026-06-28 — 3 plans, 2 waves*
*Phase 3 plans finalized: 2026-06-28 — 5 plans, 4 waves*
*Phase 4 plans finalized: 2026-06-29 — 5 plans, 2 waves (04-01/02/05 parallel Wave 1; 04-03/04 parallel Wave 2)*
*Phase 4 plans reconciled (reviews mode): 2026-06-29 — 6 plans, 2 waves (04-01/02/05 parallel Wave 1; 04-03/04/06 parallel Wave 2). 04-03/04-04 rewritten to match shipped popup-consolidated UI; 04-06 added for notification ID guard fix.*
