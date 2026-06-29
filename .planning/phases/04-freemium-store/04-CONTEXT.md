# Phase 4: Freemium + Store Submission - Context

**Gathered:** 2026-06-29
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase wires real freemium enforcement into the service worker (gate at 5 renames/month), implements premium license key verification via Cloudflare Worker + Cloudflare KV, adds a `chrome.notifications` upgrade prompt on the 6th download attempt, wires the `chrome.alarms` monthly counter reset, adds key redemption UX to the options page, and produces all Chrome Web Store submission artifacts (GitHub Pages privacy policy, store listing copy, screenshot instructions).

</domain>

<decisions>
## Implementation Decisions

### Freemium Gate
- **D-01:** Gate lives in `handleDeterminingFilename` in `entrypoints/background.ts`. Before any rename logic runs, check `storageMonthlyCount >= 5` and `!isPremium`. If true: call `suggest()` with original filename, fire the upgrade notification, return early. Download never hangs.
- **D-02:** `isPremium` is derived from `local:licenseKey` in storage. If a stored key exists (was previously validated by the Worker), `isPremium = true`. No re-validation on every download — only at key entry time.
- **D-03:** Free tier limit is 5 renames/month (MON-01). The 6th attempt is blocked.

### Upgrade Notification (chrome.notifications)
- **D-04:** Use `chrome.notifications` API for the upgrade prompt. Fires from the background service worker when the gate blocks a download.
- **D-05:** Notification structure: `type: 'basic'`, title: `"Download Renamer — Limit reached"`, message: `"You've used your 5 free renames this month. Upgrade for unlimited."`, one button: `"Upgrade to Premium"`.
- **D-06:** Clicking the notification button opens the payment URL via `chrome.tabs.create()`. URL is a placeholder (`https://example.com/upgrade`) — Trevor replaces before submission.
- **D-07:** `notifications` permission added to manifest (not restricted by QUAL-04 which only forbids `tabs` and broad host_permissions).

### Popup UI at Limit
- **D-08:** Popup rename count label changes format when free user is at limit: `"5/5 files this month"`. Normal format is `"{N} files renamed this month"` (used when under limit or premium).
- **D-09:** When `monthlyCount >= 5` and free tier, popup shows an upgrade banner below the count: `"Monthly limit reached — Upgrade to Premium"`. Banner links to payment URL.
- **D-10:** AccountBadge styles unchanged — FREE badge stays blue regardless of limit status. The banner is the only limit-state indicator in the popup.

### Monthly Counter Reset (chrome.alarms)
- **D-11:** Register a `chrome.alarms.create('monthlyReset', { when: firstOfNextMonth, periodInMinutes: 43200 })` call in the background's `defineBackground()` setup. On alarm fire, reset `storageMonthlyCount` to 0 and update `storageMonthlyResetDate`.
- **D-12:** `storageMonthlyResetDate` already exists in `src/lib/storage.ts` — use it to compute the next reset timestamp.
- **D-13:** On background startup, also check if `storageMonthlyResetDate` is in the past (handles cases where the alarm was missed due to browser being closed). If past, reset immediately.

### Premium Verification
- **D-14:** Validation via Cloudflare Worker: user enters key → extension POSTs to new `/validate-key` Worker endpoint → Worker checks key against Cloudflare KV store → returns `{ valid: boolean }`.
- **D-15:** On success: store key in `local:licenseKey`. `isPremium` is derived from `!!storedLicenseKey` on every load — no re-validation at startup.
- **D-16:** Valid keys live in Cloudflare KV (not hardcoded in Worker code). Trevor adds keys via Wrangler CLI or the Cloudflare dashboard without redeploying.
- **D-17:** Validation uses the existing Worker domain (same `VITE_WORKER_URL` base). The `/validate-key` route is added to the existing Worker (`workers/index.ts` or equivalent).
- **D-18:** Network failure during validation: show inline error `"Activation failed — check your connection and try again."` Key is not stored. User stays on free tier.

### Key Redemption UX (Options Page)
- **D-19:** Free-tier AccountSection shows: `"Upgrade to Premium"` button (opens payment URL) + a secondary `"Have a key?"` link below it.
- **D-20:** Clicking `"Have a key?"` expands a text input + `"Activate"` button inline in AccountSection. No modal.
- **D-21:** On successful activation: `isPremium` flips to true via storage update, AccountBadge updates to `PREMIUM ✓` (indigo), key input and `"Have a key?"` link disappear. No page reload.
- **D-22:** Invalid key response from Worker: show inline error below the input. Input stays visible for retry.

### Store Submission Artifacts
- **D-23:** Privacy policy hosted via GitHub Pages on this repo. `PRIVACY.md` converted to `docs/privacy.html` (or served directly via Pages). URL format: `https://{username}.github.io/{repo}/privacy`.
- **D-24:** Store listing copy produced by Claude in `STORE-LISTING.md`: title (max 45 chars), short description (max 132 chars), long description, category (`Productivity`). Trevor reviews and edits before submission.
- **D-25:** Screenshots approach: Phase 4 produces `SCREENSHOTS.md` with step-by-step instructions for Trevor to capture each required screenshot (1280×800 or 640×400) from the loaded extension in Chrome. No automated Playwright capture.
- **D-26:** Extension icons (16×16, 48×48, 128×128 PNGs) are provided by Trevor as manual step. Phase 4 plan includes a placeholder note in `STORE-LISTING.md` and references `public/icons/` as the expected location.

### Claude's Discretion
- Exact Cloudflare Worker route structure for `/validate-key` (HTTP method, request/response shape beyond `{ valid: boolean }`)
- KV namespace naming and binding name in `wrangler.toml`
- Exact alarm timing logic (first-of-month calculation)
- React state management for the inline key input expand/collapse in AccountSection
- Tailwind classes for the upgrade banner and key input UI within the established blue/indigo style

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — MON-01 through MON-04, NOTIF-01, QUAL-03 are the Phase 4 requirements. Read for exact acceptance criteria.
- `.planning/ROADMAP.md` — Phase 4 success criteria (4 criteria that must be TRUE)

### Prior Phase Decisions (locked — inherit, do not override)
- `.planning/phases/01-foundation/01-CONTEXT.md` — Storage schema: key names `local:enabled`, `local:monthlyCount`, `local:monthlyResetDate`
- `.planning/phases/02-rename-engine/02-CONTEXT.md` — Worker relay architecture, `VITE_WORKER_URL`, Worker file location
- `.planning/phases/03-settings-ui/03-CONTEXT.md` — D-11 (Upgrade button opens external URL), D-04 (blue/indigo color scheme), AccountBadge component, popup and options page structure

### Architecture Constraints
- `CLAUDE.md` (project root) — `chrome.alarms` for monthly reset (not setInterval), storage-first state, no module-level vars, `suggest()` always in finally block

### Existing Code (MUST read before planning)
- `src/lib/storage.ts` — All storage items; `local:licenseKey` is new and must be added here
- `entrypoints/background.ts` — Gate logic goes here; alarms registration goes in `defineBackground()`
- `entrypoints/popup/App.tsx` — `isPremium = false` stub at line 137 to replace; count label at line 171 area
- `entrypoints/options/App.tsx` — `isPremium = false` stub at line 7; AccountSection at line 586; upgrade button at line 594

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `storageMonthlyCount` (src/lib/storage.ts) — already defined, gate reads this directly
- `storageMonthlyResetDate` (src/lib/storage.ts) — already defined, alarms logic computes next reset from this
- `storageEnabled` (src/lib/storage.ts) — gate checks this first (if disabled, skip entirely)
- `AccountBadge` component (popup/App.tsx:74, options/App.tsx:20) — already renders FREE/PREMIUM; just needs real `isPremium` value wired in
- Cloudflare Worker (`workers/` directory) — existing relay; add `/validate-key` route alongside existing rename route

### Established Patterns
- Storage-first: every mutation written immediately via `.setValue()` — gate must write counter increment before returning
- All event listeners registered synchronously at module top level
- `Promise.race` with 5-second timeout on all Worker calls — apply same pattern to `/validate-key` call
- Error swallowed in catch → `suggest()` called in finally — gate must not break this invariant

### Integration Points
- `handleDeterminingFilename` (background.ts) — freemium gate inserted at top of try block, before fingerprint computation
- `defineBackground()` (background.ts) — alarms registration added here alongside the existing `onDeterminingFilename` listener
- `chrome.notifications.onButtonClicked` listener — registered in `defineBackground()` to handle upgrade button click
- AccountSection in options/App.tsx (~line 586) — key redemption UX inserted here; `isPremium` state lifted from const to `useState` driven by storage

</code_context>

<specifics>
## Specific Ideas

- Notification button click handler: `chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => { if (btnIdx === 0) chrome.tabs.create({ url: UPGRADE_URL }); })`
- `"Have a key?"` link style: small secondary text link below the Upgrade button, consistent with options page's existing muted text style (`text-sm text-gray-500 underline cursor-pointer`)
- Popup upgrade banner: strip below the count label, `bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded` — warns without alarming
- KV namespace suggested name: `LICENSE_KEYS` binding in `wrangler.toml`

</specifics>

<deferred>
## Deferred Ideas

- Backend-verified subscription (PREM-01 in v2) — real server-side enforcement replacing client-side key
- Automated Playwright screenshot capture — deferred; instructions-only approach chosen for v1
- KV key management dashboard / bulk key generation tooling — Trevor manages keys manually via Wrangler CLI in v1
- Promo tile (440×280) — nice-to-have for the store but not required for initial submission

</deferred>

---

*Phase: 4-Freemium-Store*
*Context gathered: 2026-06-29*
