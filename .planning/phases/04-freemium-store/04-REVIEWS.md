---
phase: 4
reviewers: [codex]
reviewed_at: 2026-06-30T04:39:19Z
plans_reviewed: [04-01-PLAN.md, 04-02-PLAN.md, 04-03-PLAN.md, 04-04-PLAN.md, 04-05-PLAN.md]
---

# Cross-AI Plan Review — Phase 4

## Reviewer Availability

- **Gemini CLI**: detected but not authenticated (`GEMINI_API_KEY` / Auth method not set in `C:\Users\maccl\.gemini\settings.json`) — skipped.
- **Claude CLI**: skipped intentionally — this review was run from inside Claude Code itself, so an independent Claude-session review would not be a meaningfully separate perspective.
- **Codex CLI**: available and invoked successfully.
- **CodeRabbit / OpenCode / Qwen / Cursor**: not installed on this system — skipped.

Only one independent reviewer (Codex) was available for this run. Treat the findings below as a single strong opinion, not a consensus — there's nothing to cross-check it against this time. Authenticating Gemini CLI (`gemini`) would let a future `/gsd:review --phase4` run get genuine cross-AI consensus.

## Codex Review

### Summary

Overall, the Phase 4 plan set is directionally sound and maps well to the freemium/store-submission goals. The architecture keeps enforcement in the background service worker, persists state in `chrome.storage.local`, uses `chrome.alarms` for monthly reset, and separates UI/account work from enforcement. The main risks are around correctness of the monthly counter path, duplicated upgrade URL configuration, weak license lifecycle semantics, and a few MV3/Chrome API edge cases that should be tightened before implementation. Treat this as a solid plan set with a few required fixes before execution.

### Strengths

- The freemium gate is placed in `handleDeterminingFilename`, which matches the requirement that gating must happen in the service worker rather than popup/options UI.
- `suggest()` is still called before returning from the limit gate, which protects the downloads API flow from hanging.
- Monthly reset uses `chrome.alarms` plus startup missed-reset recovery, which fits MV3 service worker constraints.
- License state is stored locally and read by the service worker, so premium behavior survives restarts.
- Worker `/validate-key` is intentionally narrow and keeps key validation out of the extension bundle.
- Store artifacts are explicitly planned instead of being left as launch cleanup.
- Human checkpoints are correctly called out for Cloudflare KV, deployment, GitHub Pages, privacy URL, and manual screenshots.

### Concerns

- **HIGH: 04-01 does not explicitly preserve or define `monthlyCount` increment behavior.** The phase depends on free users getting exactly 5 successful renames per calendar month. The gate only checks `monthlyCount >= 5`; if the increment is missing, moved incorrectly, or happens before a failed rename, the core monetization requirement breaks.
- **HIGH: Reset scheduling needs exact date semantics.** `periodInMinutes: 43200` approximates 30 days, not "first day of each calendar month." If paired with `when: getFirstOfNextMonthMs()` and the alarm handler recomputes the next month each time, that is fine. If it relies on the period, it will drift across 28/29/31-day months.
- **HIGH: `notifications` permission is Phase 4-required, but permission justification and Web Store copy must stay aligned.** Adding the permission is correct, but Chrome Web Store reviewers are sensitive to notification usage. The listing should clearly say notifications are only used for limit/upgrade status, not promotional spam.
- **MEDIUM: `chrome.notifications.onButtonClicked` should be registered defensively.** In MV3, listener registration must be synchronous and top-level. The plan does that, but the implementation should guard the notification ID or button index so unrelated future notifications do not open the upgrade URL accidentally.
- **MEDIUM: `UPGRADE_URL` triplication is fragile.** Three placeholders across background, popup, and options are acceptable for a one-off MVP only if there is a clear pre-submission checklist. But this is exactly the kind of value likely to be forgotten in one location.
- **MEDIUM: Popup `isPremium` staleness is a minor UX issue, not an enforcement issue.** Since popup/options are separate extension contexts, mount-only reads mean the popup may keep showing the upgrade state until reopened after activation. Acceptable for MVP if activation happens in options and the options page updates immediately. It should not affect actual renaming because the service worker reads storage directly.
- **MEDIUM: No server-side re-validation creates a real revocation gap.** A once-valid key grants premium forever unless manually removed locally. Acceptable only because D-15 explicitly accepts it for v1 — refunds, chargebacks, leaked keys, or revoked subscriptions cannot be enforced client-side.
- **MEDIUM: Worker `/validate-key` response codes are slightly inconsistent.** Missing key should probably be `400`, malformed JSON `400`, invalid key `200 { valid:false }`, and unexpected errors `500`. Returning `500` for normal client mistakes makes debugging and monitoring noisier.
- **MEDIUM: Options activation depends on `WORKER_URL`, but the plan does not say where it lives.** If this becomes another hardcoded placeholder, it should be included in the same launch replacement checklist as `UPGRADE_URL`.
- **LOW: No live storage sync in popup/options is acceptable, but document the expected refresh behavior.** A storage change listener would polish the UX, but it is not necessary for phase success.
- **LOW: Manual screenshot capture is acceptable, but the plan should define acceptance criteria.** `SCREENSHOTS.md` should specify required dimensions, visible states, and which UI state proves freemium behavior.

### Suggestions

- In 04-01, add an explicit implementation step for the counter lifecycle: read count before gate; only increment after a successful rename decision/action; write to `chrome.storage.local` immediately after increment; don't increment when the file remains unrenamed due to the limit.
- Add a targeted test/manual validation case for the 5th and 6th downloads (count 4→success→5; count 5, free→blocked+notification; count 5, premium→success).
- Make monthly reset scheduling calendar-accurate: create the alarm with `when: getFirstOfNextMonthMs()`, and in the alarm handler reset count, write next reset date, then create the next one-shot alarm — avoid relying on a fixed 30-day period.
- Centralize launch constants if feasible — a simple `src/lib/urls.ts` exporting `UPGRADE_URL` (and maybe `WORKER_URL`) would reduce submission risk. If that's awkward given WXT/background import boundaries, keep duplication but add a pre-submission grep checklist.
- Tighten notification handling: use a stable notification ID like `free-tier-limit`, only open the upgrade URL when that ID and button index match, handle `chrome.runtime.lastError` after notification creation.
- For 04-02, normalize validation responses: `400` for malformed JSON or missing/empty key, `200 { valid:false }` for well-formed but unknown key, `500` only for unexpected Worker/KV failures.
- For the revocation gap, add a clear code comment and internal note: "v1 validates keys once on activation; subscription revocation enforcement is deferred." Keeps the accepted risk visible.
- For popup staleness, accept it for MVP (recommended) or add a storage listener. The important part is that options updates immediately after activation and the background service worker enforces based on latest storage.
- In 04-05, add a final release checklist item: `rg "example.com/upgrade|WORKER_URL|placeholder|TODO" .`, confirm privacy URL is live, confirm icons are present, confirm permissions in manifest match store justifications.

### Risk Assessment

**Overall risk: MEDIUM.** The plan is not over-scoped and mostly respects the MV3 architecture constraints. The biggest risk is not architectural complexity — it's small monetization correctness bugs around counter increment/reset behavior and launch-time placeholder drift. The accepted client-side bypass and no-revalidation model are meaningful security limitations, but they are conscious v1 trade-offs rather than plan defects. Recommend tightening 04-01 counter semantics, calendar reset behavior, Worker response codes, and placeholder/config handling before/during execution.

---

## Consensus Summary

Only one reviewer ran successfully, so there is no cross-reviewer consensus to synthesize. The findings above stand as a single independent opinion. Highest-priority items to verify during/after 04-01 execution, since they weren't fully specified in the plan text itself:

1. Confirm `monthlyCount` is actually incremented on successful rename and that increment/gate ordering can't double-count or skip-count a download.
2. Confirm the monthly alarm reset relies on `when: getFirstOfNextMonthMs()` recomputed each fire, not on `periodInMinutes` drift.
3. Confirm there's a pre-submission grep/checklist step that catches all 3 `UPGRADE_URL` placeholders (background.ts, popup/App.tsx, options/App.tsx) plus `WORKER_URL`.

### Divergent Views

N/A — single reviewer.
