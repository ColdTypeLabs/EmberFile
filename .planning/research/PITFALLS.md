# Domain Pitfalls

**Domain:** Chrome MV3 extension — download watching + Claude AI rename + freemium
**Researched:** 2026-06-28

---

## Critical Pitfalls

Mistakes that cause rewrites, store rejection, or broken core functionality.

---

### Pitfall 1: Using the Wrong Rename API

**What goes wrong:** Developers discover `chrome.downloads.rename()` in blog posts or older docs — it does not exist in the current Chrome Downloads API. The correct approach is `chrome.downloads.onDeterminingFilename`, which fires before the file lands on disk and lets you call `suggest({ filename: newName })` to override the name. If you instead listen to `onChanged` for `state === 'complete'` and try to rename via the filesystem — there is no filesystem API in MV3 — the extension simply cannot rename files.

**Why it happens:** Outdated tutorials, hallucinated API surface, confusion with MV2-era patterns.

**Consequences:** Core feature doesn't work. Requires architectural redo after initial build.

**Prevention:**
- Use `chrome.downloads.onDeterminingFilename` exclusively for renaming. The listener receives `(item, suggest)` and must call `suggest()` synchronously or return `true` and call it asynchronously.
- Note: if any extension has registered an `onDeterminingFilename` listener, the `filename` field in `chrome.downloads.download()` is ignored entirely — own this event or lose rename ability to a conflicting extension.
- Only one listener can win; if multiple extensions compete, the last one registered wins. Document this limitation for users.

**Warning signs:** Code that calls `onChanged` and hopes to rename after completion; any reference to `chrome.downloads.rename`.

**Phase:** Phase 1 (Foundation) — lock in the correct API call before any logic builds on top of it.

---

### Pitfall 2: Service Worker State Loss (the 30-Second Killer)

**What goes wrong:** MV3 service workers are terminated after ~30 seconds of inactivity. Any JavaScript variable — usage counters, cached rules, in-progress rename state — vanishes. A user who has hit their 5-file free tier limit appears to be on the free tier again after the worker restarts, because the counter was in memory.

**Why it happens:** MV2 background pages were persistent. MV3 service workers are not. Developers port MV2 patterns without adapting.

**Consequences:**
- Free tier counter resets mid-month → paying customers aren't needed → revenue model broken.
- In-flight API calls (awaiting Claude response) are abandoned if the worker dies mid-request.
- `chrome.runtime.sendMessage` from popup to service worker silently fails or hangs if the worker is not alive.

**Prevention:**
- Never store state in module-level variables. Write everything — usage counts, pattern cache, current download queue — to `chrome.storage.local` immediately on mutation.
- For long-running Claude API calls (typically < 2s for Haiku but network variance can push past 5s), call an extension API (e.g., `chrome.storage.local.get`) at the start of the handler to reset the 30s idle timer before awaiting the fetch.
- Use `chrome.alarms` for any periodic work (monthly counter reset) — alarms wake a dead worker. Do not use `setInterval`.
- Wrap all message handlers in `event.waitUntil()` or keep a reference to prevent premature termination during async work.

**Warning signs:** Counter or state behaves inconsistently; premium users see free-tier UI; unit tests pass but manual tests fail after a few minutes of inactivity.

**Phase:** Phase 1 (Foundation) — establish the storage-first state pattern before any feature code is written.

---

### Pitfall 3: Chrome Web Store Rejection for Permissions or Policy Violations

**What goes wrong:** The extension is rejected during review — typically within 1–3 weeks, but sometimes 3–4 for new developer accounts — for policy violations that are hard to appeal.

**Common rejection triggers for this extension:**

| Trigger | Detail |
|---------|--------|
| Excessive permissions | Requesting `<all_urls>` or `tabs` when only `downloads` + `storage` are needed |
| Unused permissions | Requesting a permission that the submitted code demonstrably does not use |
| Remotely-hosted code | Any `eval()`, `new Function()`, or `<script src="https://...">` in extension pages |
| Single-purpose violation | Extension does something unrelated to the stated renaming purpose |
| Misleading description | Claiming AI capabilities not demonstrated or overstating privacy guarantees |
| Missing privacy policy | Required for any extension that sends data externally (filename → Claude API qualifies) |
| Keyword stuffing | Store listing stuffed with competitor names or generic keywords |

**Prevention:**
- Declare only `downloads` and `storage` — the project spec already calls this out. Do not add `tabs`, `webRequest`, or `<all_urls>` even for debugging.
- Write the privacy policy before submission. It must explicitly state: only filenames (not file contents) are sent to Anthropic's Claude API, what is stored locally, and that no data is sold.
- Run `web-ext lint` or Chrome's own extension review checklist before submission.
- Keep the store listing honest: "renames files using AI" not "AI-powered intelligent file management system."
- Budget 2–4 weeks for first submission review in the project timeline (current 3-week timeline needs padding).

**Warning signs:** Any `eval()` in the codebase; any permission that isn't actively used in code; no privacy policy URL ready at submission time.

**Phase:** Phase 3 (Polish + Store Submission) — but the privacy policy and permission audit should be planned in Phase 1.

---

### Pitfall 4: Claude API Call Fails Silently During Download Rename Window

**What goes wrong:** `onDeterminingFilename` must call `suggest()` to rename the file. If the Claude API call (even fast Haiku) times out, errors, or hits a rate limit, `suggest()` is never called and Chrome uses the original filename — silently. The user sees no feedback and the extension appears to have done nothing.

**Failure modes:**
- `429 Too Many Requests` — user downloads many files quickly (burst), Haiku free-tier rate limit hit.
- Network timeout — Claude API unavailable; the service worker is awaiting `fetch()` while Chrome is waiting for `suggest()`.
- Invalid API key — user entered a typo; error is swallowed.
- Response fails JSON parse or returns an unexpected shape.

**Prevention:**
- Always call `suggest()` — either with the AI-generated name or, on any error, with a safe fallback (original name or a timestamped version). Use try/catch around the entire API call with a guaranteed `finally { suggest(fallback) }`.
- Set a hard timeout (e.g., 5 seconds) on the Claude API fetch. `Promise.race([claudeFetch, timeout(5000)])` — on timeout, call `suggest(originalName)`.
- Log errors to `chrome.storage.local` so the settings panel can surface "last error: API key invalid."
- Implement exponential backoff with a cap for 429 errors, but do not block the rename — fall back immediately and retry the pattern learning in the background.
- Validate the API key format before the first API call; show a settings panel warning immediately if the key looks wrong (Anthropic keys start with `sk-ant-`).

**Warning signs:** Files that should be renamed keep their original names with no error shown; no error logging in the extension; Claude call wraps a bare `await fetch()` with no timeout.

**Phase:** Phase 2 (Core Logic) — this is the spine of the feature.

---

## Moderate Pitfalls

---

### Pitfall 5: Freemium Counter Trivially Bypassed

**What goes wrong:** The 5-files/month limit is enforced by a counter in `chrome.storage.local`. Since the extension is local code running on the user's machine, a technically curious user can open DevTools → Application → Extension Storage and set `monthlyCalls: 0`. The freemium wall evaporates.

**Why it matters:** Most users won't do this, but the extension's commercial model depends on some conversion rate. If bypass is well-known and simple, the conversion rate collapses.

**Prevention:**
- Accept that local-only enforcement is inherently bypassable — do not over-engineer a solution that adds complexity or server infrastructure in v1.
- Store the counter with a checksum or hash alongside it to detect tampering. On mismatch, reset to the limit (not zero). This raises the bar without adding a backend.
- The more important defense is UX: make the upgrade flow frictionless enough that honest users pay. A $2.99/mo impulse buy is the real protection.
- In v2, if bypass becomes a revenue problem, move enforcement server-side with a lightweight validation call.

**Warning signs:** Conversion rate significantly below benchmarks (typical freemium SaaS: 2–5%); user forum posts describing how to reset the counter.

**Phase:** Phase 2 (Core Logic) for the checksum; Phase 3 for the upgrade UX.

---

### Pitfall 6: IndexedDB Transaction Errors and Data Loss

**What goes wrong:** IndexedDB in Chrome extensions has two specific failure modes beyond the generic web API:

1. **Eviction is all-or-nothing.** If the extension's origin exceeds its storage quota, Chrome evicts all storage for that origin simultaneously — IndexedDB, `chrome.storage.local`, everything. All learned patterns vanish.
2. **Transactions are not durable across worker restarts.** If the service worker is terminated while a write transaction is open, the transaction is silently rolled back. A "clear then repopulate" pattern can leave the database empty.
3. **Version upgrade errors.** If the IndexedDB schema version changes (during an extension update) and the upgrade migration fails, the database may be stuck in an unusable state with no recovery path unless you handle `onblocked` and `onerror` on the open request.

**Prevention:**
- Cap stored patterns at 10MB as the spec already states. Implement a simple LRU eviction: when the count exceeds a threshold (e.g., 500 patterns), delete the least-recently-used entries before writing new ones.
- Never use "clear then repopulate" in a single transaction. Use upsert (put) per record so a partial write leaves the DB in a valid state.
- Wrap every IndexedDB open/write in try/catch. On `QuotaExceededError`, prune the oldest 20% of entries and retry once before showing an error.
- Handle `onupgradeneeded` carefully during extension updates: add new object stores but do not delete old ones until data is migrated.

**Warning signs:** Users report "patterns stopped working after Chrome update"; no error handling around `indexedDB.open()`; migration code deletes the old store before creating the new one.

**Phase:** Phase 1 (Foundation) for schema design; Phase 2 for LRU eviction.

---

### Pitfall 7: Privacy Perception Destroys Reviews

**What goes wrong:** Even if the extension only sends filenames to Claude (not file contents), users who see the extension making network calls to `api.anthropic.com` may panic and leave 1-star reviews: "This extension sends your files to AI." Reddit threads amplify this. The extension gets flagged for review by Google.

**Why it happens:** Users conflate "watching downloads" with "uploading files." The extension is technically doing the right thing but fails to communicate it.

**Prevention:**
- The privacy policy must be written in plain English: "We send only the filename (e.g., `invoice_march.pdf`), never the file contents, to Anthropic's Claude API."
- The settings panel should show a live log or at minimum a "last renamed" entry that demonstrates what was sent.
- In the Chrome Web Store listing, the very first sentence of the description should address privacy: "Only filenames — never file contents — are processed."
- The permissions requested (`downloads`, `storage`) are verifiably narrow. Highlight this in the listing.

**Warning signs:** No privacy statement in store listing; settings panel shows no transparency about API calls; any use of broad permissions that contradict the narrow-purpose claim.

**Phase:** Phase 3 (Polish) for copy, but the transparency log in settings should be Phase 2.

---

### Pitfall 8: React/Tailwind Bundling Breaks MV3 CSP

**What goes wrong:** MV3 enforces a strict Content Security Policy that blocks `eval()`, inline scripts, and remotely loaded code. React's development build uses `eval()` for source maps. Tailwind's JIT mode (when misconfigured) can inject inline `<style>` tags. Both break under MV3's default CSP.

**Specific failures:**
- Using Create React App (CRA) — its dev server and build output include `eval()`. CRA is also effectively unmaintained.
- Configuring Vite without the `@crxjs/vite-plugin` — the plugin handles manifest injection, content script entry points, and HMR in a CSP-safe way. Without it, HMR uses `eval()`.
- Tailwind's CDN script (`<script src="https://cdn.tailwindcss.com">`) is remotely-hosted code — instant MV3 rejection.
- React portals rendered outside the popup root can fail silently if the DOM target doesn't exist in the extension page context.

**Prevention:**
- Use **Vite + `@crxjs/vite-plugin`** as the build toolchain. This is the community-standard MV3 setup as of 2025–2026.
- Use Tailwind as a PostCSS plugin with a build step, never the CDN script.
- Build in production mode before testing in Chrome — development mode errors don't represent production CSP behavior.
- Add `"content_security_policy": { "extension_pages": "script-src 'self'; object-src 'self'" }` explicitly in the manifest to lock down and verify no violations before submission.

**Warning signs:** Extension loads in dev but breaks when loaded as an unpacked production build; Chrome DevTools console shows CSP violations; any `cdn.tailwind` reference in HTML files.

**Phase:** Phase 1 (Foundation) — get the build pipeline right before writing any feature code.

---

## Minor Pitfalls

---

### Pitfall 9: API Key Stored in Plain Text Raises Store Reviewer Concern

**What goes wrong:** The user's Claude API key is stored in `chrome.storage.local` in plain text. While this is common practice and Chrome isolates extension storage from other extensions, a reviewer (or a user inspecting their own storage) may flag it as a security concern. If the extension is ever compromised or a malicious extension gains access via a messaging vulnerability, the key is exposed.

**Prevention:** This is a known, accepted tradeoff for client-side extensions. Mitigate perception by:
- Never logging the key to console.
- Masking the key in the settings UI after entry (show `sk-ant-...••••••`).
- Documenting in the privacy policy that the key is stored locally and never transmitted to the extension developer's servers.
- Consider storing only the last 4 characters for display, keeping the full key only in storage.

**Phase:** Phase 2 (Settings UI).

---

### Pitfall 10: `onDeterminingFilename` Conflicts with Other Rename Extensions

**What goes wrong:** If the user has another extension that also listens to `onDeterminingFilename` (e.g., another download manager or rename tool), Chrome resolves conflicts by giving priority to the extension that called `addListener` last. The other extension's rename silently wins or loses.

**Prevention:** Detect conflicts gracefully — if `suggest()` is called but the resulting filename doesn't match what was suggested, log a warning to the settings panel: "Another extension may be overriding renames." This is a UX communication problem, not a code fix.

**Phase:** Phase 3 (Polish).

---

## Phase-Specific Warnings Summary

| Phase | Topic | Likely Pitfall | Mitigation |
|-------|-------|---------------|------------|
| Phase 1 | Build setup | React/Tailwind CSP violation in MV3 | Use Vite + @crxjs/vite-plugin from day one |
| Phase 1 | Storage architecture | State in memory variables lost on worker restart | Storage-first pattern for all state |
| Phase 1 | Core API | Using wrong rename API (`rename()` doesn't exist) | `onDeterminingFilename` + `suggest()` only |
| Phase 1 | DB schema | IndexedDB version migration breaks on extension update | Additive migrations only; handle `onerror` |
| Phase 2 | Core logic | Claude API failure silently skips rename | `suggest()` always called in `finally` block |
| Phase 2 | Core logic | Service worker killed mid-API call | Idle timer reset + hard 5s timeout on fetch |
| Phase 2 | Freemium | Counter easily manipulated in DevTools | Checksum + accept inherent bypass risk |
| Phase 2 | Settings UI | API key displayed or stored carelessly | Mask after entry; document in privacy policy |
| Phase 3 | Store submission | No privacy policy at submission time | Write policy in Phase 1, update in Phase 3 |
| Phase 3 | Store submission | 3-week timeline doesn't account for review | Budget 2–4 additional weeks for first review |
| Phase 3 | User trust | Privacy perception triggers review/removal | In-extension transparency log + clear store copy |

---

## Sources

- [chrome.downloads API Reference](https://developer.chrome.com/docs/extensions/reference/api/downloads) — HIGH confidence
- [Chrome Web Store Troubleshooting](https://developer.chrome.com/docs/webstore/troubleshooting) — HIGH confidence
- [MV3 Additional Requirements](https://developer.chrome.com/docs/webstore/program-policies/mv3-requirements) — HIGH confidence
- [Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — HIGH confidence
- [MV3 Migration Pitfalls — 17 Extensions](https://dev.to/_350df62777eb55e1/manifest-v3-migration-pitfalls-lessons-from-17-chrome-extensions-2j3h) — MEDIUM confidence
- [IndexedDB Max Storage Limits — RxDB](https://rxdb.info/articles/indexeddb-max-storage-limit.html) — MEDIUM confidence
- [MDN Storage Quotas and Eviction](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — HIGH confidence
- [Freemium Bypass via Client-Side Controls — OnSecurity](https://onsecurity.io/article/pentest-findings-bypassing-freemium-through-client-side-security-controls/) — MEDIUM confidence
- [API Key Security in Chrome Extensions — DEV Community](https://dev.to/notearthian/how-to-secure-api-keys-in-chrome-extension-3f19) — MEDIUM confidence
- [Building Chrome Extensions with Vite + CRXJS 2026](https://optymized.net/blog/building-chrome-extensions) — MEDIUM confidence
- [Chrome Extension Rejection Reasons — ExtensionRadar](https://www.extensionradar.com/blog/chrome-extension-rejected) — MEDIUM confidence
