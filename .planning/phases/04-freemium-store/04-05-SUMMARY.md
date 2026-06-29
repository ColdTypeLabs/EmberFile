---
phase: 04-freemium-store
plan: 05
subsystem: docs
tags: [chrome-web-store, privacy-policy, github-pages, store-listing, screenshots]

# Dependency graph
requires:
  - phase: 04-freemium-store
    provides: Completed freemium gate and license key infrastructure (04-01 through 04-04)
provides:
  - docs/privacy.html — self-contained HTML privacy policy page ready for GitHub Pages hosting
  - STORE-LISTING.md — complete Chrome Web Store listing copy with permission justifications and pre-submission checklist
  - SCREENSHOTS.md — step-by-step screenshot capture guide for 4 required store screenshots
affects: [store-submission, github-pages-setup]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "docs/ directory for GitHub Pages static hosting (privacy policy)"

key-files:
  created:
    - docs/privacy.html
    - STORE-LISTING.md
    - SCREENSHOTS.md
  modified: []

key-decisions:
  - "Privacy policy hosted via GitHub Pages /docs folder — no separate hosting required"
  - "Store listing name is 34 chars (well within 45-char limit), short desc is 105 chars (within 132-char limit)"
  - "Upgrade URL and privacy URL left as explicit PLACEHOLDERs — must be replaced before submission"

patterns-established:
  - "docs/ folder used for GitHub Pages static assets"

requirements-completed: [QUAL-03]

# Metrics
duration: 2min
completed: 2026-06-29
---

# Phase 4 Plan 05: Store Submission Artifacts Summary

**Privacy policy HTML page, store listing copy, and screenshot capture guide — all Chrome Web Store non-code deliverables complete pending GitHub Pages activation**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-06-29T15:01:03Z
- **Completed:** 2026-06-29T15:02:05Z
- **Tasks:** 3 of 4 complete (Task 4 is checkpoint:human-action)
- **Files modified:** 3

## Accomplishments

- Created `docs/privacy.html` — fully self-contained HTML conversion of PRIVACY.md with no external resources; ready to serve via GitHub Pages
- Created `STORE-LISTING.md` — complete store listing with title (34 chars), short description (105 chars), 4-paragraph long description, all 4 permission justifications, icon/tile specs, URL placeholders, and 9-item pre-submission checklist
- Created `SCREENSHOTS.md` — numbered step-by-step capture instructions for all 4 required screenshots including storage console commands for each state

## Task Commits

Each task was committed atomically:

1. **Task 1: Create docs/privacy.html from PRIVACY.md content** — `db675c7` (docs)
2. **Task 2: Write STORE-LISTING.md with store copy and permission justifications** — `42a8569` (docs)
3. **Task 3: Write SCREENSHOTS.md with capture instructions** — `5a1acbb` (docs)

Task 4 (GitHub Pages activation) is a `checkpoint:human-action` — awaiting Trevor.

## Files Created/Modified

- `docs/privacy.html` — Self-contained HTML privacy policy page for GitHub Pages hosting
- `STORE-LISTING.md` — Chrome Web Store listing copy, permission justifications, icon requirements, URL placeholders, pre-submission checklist
- `SCREENSHOTS.md` — Step-by-step screenshot capture instructions for 4 store screenshots

## Decisions Made

- Privacy policy hosted via GitHub Pages `/docs` folder — no separate hosting infrastructure required
- Store listing name kept at 34 characters (well within the 45-char limit), short description at 105 characters (within 132-char limit)
- Upgrade URL and privacy policy URL are left as explicit `PLACEHOLDER:` markers in STORE-LISTING.md — Trevor must replace both before submission

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

**GitHub Pages activation required (Task 4 checkpoint).**

Steps:
1. Push commits to `main` branch on GitHub (if not already done via `git push`)
2. Go to repository Settings → Pages
3. Set Source: Deploy from a branch → Branch: `main` → Folder: `/docs` → Save
4. Wait 1-2 minutes, then confirm the privacy policy is live at `{your-pages-url}/privacy.html`
5. Update the `PLACEHOLDER` URL in `STORE-LISTING.md` with the confirmed live URL

Resume signal: Type `"pages-live"` and paste the confirmed privacy policy URL.

## Next Phase Readiness

All non-code store submission artifacts are ready. Remaining pre-submission items (tracked in `STORE-LISTING.md` checklist):

- GitHub Pages activation + privacy URL confirmation (this checkpoint)
- Icon PNGs (16, 48, 128 px) — Trevor provides
- 440×280 promo tile — Trevor creates
- Upgrade URL replacement in `background.ts`, `popup/App.tsx`, `options/App.tsx`
- Wrangler KV namespace ID filled in (04-02 plan)
- Worker deployed with real `LICENSE_KEYS` KV namespace

---
*Phase: 04-freemium-store*
*Completed: 2026-06-29*
