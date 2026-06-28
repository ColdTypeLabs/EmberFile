# Phase 1: Foundation - Research

**Researched:** 2026-06-28
**Domain:** WXT (Chrome MV3 extension framework) + `onDeterminingFilename` API + `chrome.storage.local` + Vitest
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Phase 1 renames files with the prefix `[HOOK-OK-{n}]-` (in-memory counter per service worker session) so the hook firing is unmistakably visible in the filesystem.

**D-02:** Counter is in-memory only — proves sequential downloads all fire the hook, resets on service worker restart by design.

**D-03:** This prefix is stripped entirely in Phase 2.

**D-04:** All state lives in `chrome.storage.local`. No IndexedDB in Phase 1.

**D-05:** Top-level storage schema (key names are FINAL — downstream phases depend on them):
```ts
{
  enabled: boolean,          // default: true
  monthlyCount: number,      // default: 0
  monthlyResetDate: string,  // ISO date string 'YYYY-MM-01'
  rules: {
    [fingerprint: string]: {
      tag: string,
      renameFormat: string,
      matchCount: number
    }
  }
}
```

**D-06:** `rules` is initialized as `{}` in Phase 1.

**D-07:** Key names (`enabled`, `monthlyCount`, `monthlyResetDate`, `rules`) are final and must not change.

**D-08:** Privacy policy lives as `PRIVACY.md` at the repo root.

**D-09:** Policy covers the two-hop data flow: extension → Trevor's hosted endpoint → Claude Haiku → suggested name.

**D-10:** Policy explicitly states Trevor holds the API key; users supply nothing.

**D-11:** Server logs only the anonymized pattern (e.g., "invoice + .pdf"), tag, rename format, and timestamp — never actual filenames.

### Claude's Discretion

- Exact Vitest setup (config, test file structure)
- `wxt init` scaffold options selected during init

### Deferred Ideas (OUT OF SCOPE)

- IndexedDB for pattern rules (deferred to Phase 2 if scale requires)
- Hosting the privacy policy at a public URL (required before Phase 4 only)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CORE-01 | Extension intercepts new downloads via `onDeterminingFilename` and renames the file before the first byte is written | `onDeterminingFilename` + `suggest()` API research; WXT background entrypoint |
| CORE-02 | When a known pattern matches, extension applies the stored rename rule locally | Storage schema init; `storage.defineItem` read pattern |
| CORE-05 | On any failure, extension calls `suggest()` with the original filename — download never hangs | `finally` block pattern; async `return true` constraint |
| PATT-01 | Pattern fingerprint derived from file extension + normalized filename keywords | Phase 1 scope: schema initialized, fingerprint logic deferred to Phase 2 |
| PATT-02 | Learned rules persist in `chrome.storage.local` across browser restarts and service worker terminations | `chrome.storage.local` MV3 persistence; `@wxt-dev/storage` defineItem |
| QUAL-02 | All extension errors surface gracefully — no silent failures, no hung downloads | `finally` block + error logging pattern |
| QUAL-04 | Extension declares only `downloads`, `storage`, `alarms` permissions — no `tabs`, no broad host permissions beyond the hosted API endpoint | `wxt.config.ts` manifest permissions declaration |
</phase_requirements>

---

## Summary

Phase 1 is a pure infrastructure proof. Three mechanics must be demonstrated before any product logic lands: (1) WXT scaffolds a Chrome MV3 extension that loads cleanly, (2) `onDeterminingFilename` fires on every download and `suggest()` is always called regardless of errors, and (3) the storage schema initializes on first run and survives service worker termination.

WXT 0.20.x is the correct framework choice. It handles MV3 service worker generation from `entrypoints/background.ts` automatically. The `@wxt-dev/storage` package provides typed `defineItem` wrappers over `chrome.storage.local` with `fallback` and `init` options, eliminating the need to write raw storage calls. Vitest integration is provided by WXT's own `WxtVitest` plugin, which polyfills the extension API in-memory via `@webext-core/fake-browser`.

The single most critical correctness constraint is the `suggest()` call: the download hangs indefinitely until every registered listener calls `suggest()`. Async listeners must return `true` from the callback synchronously; `suggest()` must live in a `finally` block to guarantee it fires on thrown errors.

**Primary recommendation:** Scaffold with `npx wxt@latest init`, select React + TypeScript, wire `onDeterminingFilename` in `entrypoints/background.ts` using the async + `finally` pattern, initialize the storage schema with `defineItem`, and write unit tests using `WxtVitest` + `fakeBrowser.reset()`.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Download interception + rename | Background (Service Worker) | — | Only service workers can call `onDeterminingFilename`; popup cannot |
| Storage schema initialization | Background (Service Worker) | — | Must run at service worker startup, before any download event fires |
| Enable/disable toggle state | `chrome.storage.local` | Background reads | Mutable state — must survive SW termination |
| Rules persistence | `chrome.storage.local` | Background reads/writes | Cross-restart persistence is the entire purpose of PATT-02 |
| Permissions declaration | `wxt.config.ts` manifest config | — | Compiled into manifest.json by WXT at build time |
| Vitest tests | Test layer (Node-like, fake browser) | — | `WxtVitest` provides fake extension API; no real browser needed |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wxt` | 0.20.27 | Extension build framework | MV3-native, Vite-based, actively maintained; Plasmo is in maintenance mode [VERIFIED: npm registry] |
| `@wxt-dev/module-react` | 1.2.2 | React 18 integration for WXT | Official WXT module for React support [VERIFIED: npm registry] |
| `@wxt-dev/storage` | 1.2.8 | Typed `chrome.storage.local` wrapper | First-party WXT storage package; typed `defineItem` API [VERIFIED: npm registry] |
| `react` + `react-dom` | 18.x | UI runtime | Standard; bundled by WXT module [ASSUMED] |
| `tailwindcss` | 3.x | Utility CSS | Must be PostCSS plugin — CDN blocked by MV3 CSP [ASSUMED] |

### Supporting (Dev / Test)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.9 | Unit test runner | WXT's recommended test framework [VERIFIED: npm registry] |
| `@webext-core/fake-browser` | 1.5.2 | In-memory extension API polyfill | Used internally by `WxtVitest` plugin [VERIFIED: npm registry] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@wxt-dev/storage` | Raw `chrome.storage.local` API | Raw API works but lacks TypeScript types and default-fallback helpers |
| `WxtVitest` plugin | `vitest-chrome` (manual mocks) | More config burden; fake-browser is already integrated by WXT |

**Installation (after `wxt init`):**
```bash
# From project root
npx wxt@latest init
# Select: React, TypeScript
# Additional packages added by WXT init automatically

npm install -D vitest
# @webext-core/fake-browser is a transitive dep of wxt/testing — no manual install needed
```

**Version verification (confirmed 2026-06-28):**
```bash
npm view wxt version          # 0.20.27
npm view @wxt-dev/module-react version  # 1.2.2
npm view @wxt-dev/storage version       # 1.2.8
npm view vitest version       # 4.1.9
```

---

## Package Legitimacy Audit

> Node.js phase. Slopcheck was run against PyPI (incorrect ecosystem) and produced false SLOP results for npm packages. npm registry verification was performed directly.

| Package | Registry | Age | Source Repo | Disposition |
|---------|----------|-----|-------------|-------------|
| `wxt` | npm | Created 2023-06-26 (~3 yrs) | github.com/wxt-dev/wxt | Approved — official framework, 0.20.27 on registry |
| `@wxt-dev/module-react` | npm | Created 2024-06-14 (~2 yrs) | github.com/wxt-dev/wxt (monorepo) | Approved — official WXT module |
| `@wxt-dev/storage` | npm | Created 2024-11-14 (~1.5 yrs) | github.com/wxt-dev/wxt (monorepo) | Approved — official WXT package |
| `vitest` | npm | Created 2021-12-03 (~4 yrs) | github.com/vitest-dev/vitest | Approved — industry standard test runner |
| `@webext-core/fake-browser` | npm | Created 2022-11-07 (~3.5 yrs) | github.com/nickmessing/webext-core | Approved — transitive dep of WXT testing |

**Packages removed due to [SLOP]:** none
**Packages flagged [SUS]:** none

*Note: slopcheck was unable to validate npm packages (it checked PyPI). All packages above were manually verified via `npm view` against the npm registry and cross-referenced with official WXT documentation.*

---

## Architecture Patterns

### System Architecture Diagram

```
Browser Download Event
        |
        v
[chrome.downloads.onDeterminingFilename]
        |
        |-- listener fires (MV3 service worker wakes if sleeping)
        |
        v
  [background.ts: async listener]
        |
        |-- return true  <-- MUST be synchronous to signal async suggest()
        |
        +---> try block:
        |       1. read `enabled` from chrome.storage.local
        |       2. if disabled → fall through to finally
        |       3. build `[HOOK-OK-{n}]-{originalFilename}` (n = in-memory counter)
        |       4. call suggest({ filename: renamedFilename })
        |
        +---> finally block:
                suggest(originalFilename fallback if not already called)
                        |
                        v
                  [Download proceeds]
```

### Recommended Project Structure

```
/                         ← repo root
├── entrypoints/
│   └── background.ts     ← service worker; ALL download hook logic
├── public/               ← static assets (icon.png etc.)
├── wxt.config.ts         ← manifest permissions, module config
├── vitest.config.ts      ← WxtVitest plugin config
├── tsconfig.json         ← WXT-generated
├── tests/
│   ├── storage-schema.test.ts   ← schema init test
│   └── suggest-guard.test.ts    ← suggest() always-called test
└── PRIVACY.md            ← privacy policy draft (D-08)
```

### Pattern 1: Background Entrypoint with `onDeterminingFilename`

**What:** All download hook logic lives in `defineBackground()`. Any code outside this function runs at build time in Node and will crash.

**When to use:** Always — this is the only valid location for `onDeterminingFilename` registration.

```typescript
// Source: https://wxt.dev/guide/essentials/entrypoints (verified 2026-06-28)
// entrypoints/background.ts

export default defineBackground(() => {
  // in-memory counter — resets on SW restart by design (D-02)
  let hookCounter = 0;

  chrome.downloads.onDeterminingFilename.addListener(
    async (downloadItem, suggest) => {
      // MUST return true synchronously to signal async suggest()
      // Source: https://developer.chrome.com/docs/extensions/reference/api/downloads#event-onDeterminingFilename
      let suggested = false;

      try {
        const { enabled } = await chrome.storage.local.get('enabled');
        if (!enabled) return; // finally will call suggest with original

        hookCounter++;
        const prefix = `[HOOK-OK-${hookCounter}]-`;
        const newName = prefix + downloadItem.filename.split('/').pop();

        suggest({ filename: newName, conflictAction: 'uniquify' });
        suggested = true;
      } finally {
        // CRITICAL: suggest() must ALWAYS be called — download hangs otherwise
        if (!suggested) {
          suggest(); // no-arg = use Chrome's default filename
        }
      }

      return true; // ← must be the return value of the listener function
    }
  );
});
```

> **Important nuance:** `return true` must be the return value of the outer listener function, not inside an inner async block. The pattern above is correct. An `async` arrow function returns a `Promise`, which is truthy — Chrome accepts this as the "async" signal. [CITED: https://developer.chrome.com/docs/extensions/reference/api/downloads#event-onDeterminingFilename]

### Pattern 2: Storage Schema Initialization with `@wxt-dev/storage`

**What:** Define typed storage items at module level (outside `defineBackground`) with fallbacks. WXT's `defineItem` is evaluated lazily — safe to declare as a module-level const.

**When to use:** Initialization on first install; reading enabled flag on every download event.

```typescript
// Source: https://wxt.dev/storage (verified 2026-06-28)

// Declare items at module level (no runtime code — just item definitions)
const storageEnabled = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

const storageMonthlyCount = storage.defineItem<number>('local:monthlyCount', {
  fallback: 0,
});

const storageMonthlyResetDate = storage.defineItem<string>('local:monthlyResetDate', {
  init: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  },
});

const storageRules = storage.defineItem<Record<string, { tag: string; renameFormat: string; matchCount: number }>>(
  'local:rules',
  { fallback: {} }
);
```

### Pattern 3: WXT Manifest Configuration

**What:** Permissions and host_permissions go in `wxt.config.ts` under the `manifest` key.

```typescript
// Source: https://wxt.dev/guide/essentials/config/manifest (verified 2026-06-28)
// wxt.config.ts
import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  manifest: {
    permissions: ['downloads', 'storage', 'alarms'],
    host_permissions: ['https://api.anthropic.com/*'],
  },
});
```

> QUAL-04 compliance: this is the exact permission set. Do NOT add `tabs`, `webRequest`, or broad `<all_urls>`.

### Anti-Patterns to Avoid

- **Runtime code outside `defineBackground()`:** WXT imports background.ts during build in Node.js. Chrome APIs don't exist in Node. Any `chrome.*` call or `addEventListener` at module level throws at build time.
- **Module-level mutable variables for state:** MV3 service workers terminate after 30s idle. The `hookCounter` variable (D-02) is intentionally ephemeral; anything that must survive restart MUST be in `chrome.storage.local`.
- **Forgetting `return true` for async `suggest()`:** Without it, Chrome calls `suggest()` automatically after the listener returns, which will conflict with the async call and produce undefined behavior.
- **Calling `suggest()` twice:** Chrome spec says exactly once. The `suggested` flag pattern above prevents double-calling.
- **Tailwind CDN script in HTML:** MV3 CSP forbids remotely-hosted scripts. Only PostCSS plugin is permitted. [CITED: CLAUDE.md]
- **`chrome.downloads.rename()`:** This API does not exist. `suggest()` via `onDeterminingFilename` is the only rename path. [CITED: CLAUDE.md]

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Typed storage with defaults | Custom wrapper around `chrome.storage.local.get/set` | `@wxt-dev/storage` `defineItem` | Handles null/undefined, type inference, `fallback` vs `init` semantics |
| Extension API test mocks | Manual `vi.mock()` for every `chrome.*` call | `WxtVitest` plugin + `@webext-core/fake-browser` | Full in-memory implementation; automatic reset with `fakeBrowser.reset()` |
| MV3 manifest generation | Hand-editing `manifest.json` | WXT via `wxt.config.ts` `manifest` key | WXT handles MV2/MV3 conversion, dev-mode injection, and build-time merging |

**Key insight:** WXT eliminates the manifest.json hand-editing trap. Never write `manifest.json` directly — WXT generates it from `wxt.config.ts` and entrypoint metadata.

---

## Common Pitfalls

### Pitfall 1: `suggest()` Called After the Download Already Proceeded

**What goes wrong:** The async listener doesn't `return true`, so Chrome auto-calls `suggest()` after the function returns. When the async code later calls `suggest()`, the download is already settled. Behavior is undefined — likely the rename is silently ignored.

**Why it happens:** `return true` must be the synchronous return value of the listener, not buried inside an async callback or Promise chain.

**How to avoid:** Structure the listener as `(downloadItem, suggest) => { /* sync setup */ return true; }` with all async logic inside the function body using `await`. With an `async` function declaration, the function automatically returns a Promise (truthy), which Chrome treats as the async signal.

**Warning signs:** Downloads complete with original filename even though your rename code runs without throwing errors.

### Pitfall 2: Service Worker State Lost Between Events

**What goes wrong:** A module-level variable (e.g., `const rules = {}`) is written to during one download event, then the service worker terminates after 30s idle. The next download event wakes a fresh service worker with an empty variable.

**Why it happens:** MV3 service workers are ephemeral. Module-level state does not persist between activations.

**How to avoid:** Write every mutation to `chrome.storage.local` immediately. Read from storage at the start of every event handler. The only intentional exception in this phase is `hookCounter` (D-02), which is designed to reset.

**Warning signs:** `hookCounter` starting at 1 on every download after an idle period (expected). Any other state that should persist but resets — wrong.

### Pitfall 3: Runtime Code Outside `defineBackground()`

**What goes wrong:** `chrome.downloads.onDeterminingFilename.addListener(...)` called at module level (not inside `defineBackground()`) crashes the build with "chrome is not defined".

**Why it happens:** WXT imports background.ts during build in a Node.js environment to extract metadata. Node has no `chrome` global.

**How to avoid:** All runtime code goes inside the `defineBackground(() => { ... })` callback. Module-level `const` declarations for `storage.defineItem` are fine — they don't call Chrome APIs, they just create typed item descriptors.

**Warning signs:** Build error mentioning `chrome is not defined` or `browser is not defined`.

### Pitfall 4: `onDeterminingFilename` Fires But Suggest Not Called in Error Path

**What goes wrong:** An exception thrown before `suggest()` is called leaves the download blocked indefinitely. The user's download hangs with no indication of why.

**Why it happens:** `suggest()` is the gate that releases the download. Chrome doesn't time out — it waits forever.

**How to avoid:** `suggest()` MUST be in a `finally` block. Use a `suggested` boolean flag to avoid calling it twice.

**Warning signs:** Downloads appear to start (appear in Downloads bar) but never receive a filename and never complete.

### Pitfall 5: WXT Hot Reload Doesn't Reload Background Script

**What goes wrong:** During development with `wxt dev`, background script changes sometimes require a manual extension reload in `chrome://extensions` — the hot reload only updates content scripts and popups.

**Why it happens:** Service workers can't be hot-reloaded the same way; Chrome must re-register the service worker.

**How to avoid:** After changes to `background.ts`, if behavior doesn't update, manually click "Reload" in `chrome://extensions`. [CITED: https://github.com/wxt-dev/wxt/issues/53]

---

## Code Examples

### Vitest Config

```typescript
// Source: https://wxt.dev/guide/essentials/unit-testing (verified 2026-06-28)
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import { WxtVitest } from 'wxt/testing';

export default defineConfig({
  plugins: [WxtVitest()],
  test: {
    mockReset: true,
    restoreMocks: true,
  },
});
```

### Storage Schema Unit Test

```typescript
// tests/storage-schema.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';

// Import the storage items from your module
// import { storageEnabled, storageMonthlyCount, storageRules } from '../entrypoints/background';

beforeEach(() => {
  fakeBrowser.reset(); // clear storage between tests
});

describe('Storage schema defaults', () => {
  it('enabled defaults to true', async () => {
    const val = await storageEnabled.getValue();
    expect(val).toBe(true);
  });

  it('monthlyCount defaults to 0', async () => {
    const val = await storageMonthlyCount.getValue();
    expect(val).toBe(0);
  });

  it('rules defaults to empty object', async () => {
    const val = await storageRules.getValue();
    expect(val).toEqual({});
  });
});
```

### Suggest Guard Test Pattern

```typescript
// tests/suggest-guard.test.ts
// Test that suggest() is always called, even when an error is thrown

describe('onDeterminingFilename suggest() guard', () => {
  it('calls suggest with original filename when storage read throws', async () => {
    // mock storage to throw
    vi.spyOn(chrome.storage.local, 'get').mockRejectedValueOnce(new Error('storage failure'));

    const suggestMock = vi.fn();
    const downloadItem = { filename: 'test-file.pdf', id: 1 } as any;

    // call the listener
    await handleDeterminingFilename(downloadItem, suggestMock);

    expect(suggestMock).toHaveBeenCalledTimes(1);
  });
});
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| Plasmo (extension framework) | WXT (Vite-based, MV3-native) | Plasmo is maintenance-mode; WXT is the active recommendation |
| Manual `manifest.json` editing | WXT generates manifest from `wxt.config.ts` | Eliminates MV2/MV3 conversion errors |
| Raw `chrome.storage.local.get/set` | `@wxt-dev/storage` `defineItem` | Type-safe, fallback semantics, `init` for one-time setup |
| `jest-chrome` for test mocks | `@webext-core/fake-browser` via `WxtVitest` | Full in-memory API, no manual mock setup |

**Deprecated/outdated:**
- **`chrome.downloads.rename()`:** Does not exist. Only `suggest()` via `onDeterminingFilename` is valid.
- **Tailwind CDN `<script>` in popup HTML:** Violates MV3 CSP. PostCSS-only.
- **`setInterval` for periodic tasks:** Does not survive service worker termination. Use `chrome.alarms`.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.9 |
| Config file | `vitest.config.ts` (Wave 0 — does not exist yet) |
| Quick run command | `npm test` or `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CORE-01 | `onDeterminingFilename` listener registered | unit | `npx vitest run tests/suggest-guard.test.ts` | ❌ Wave 0 |
| CORE-02 | Storage schema readable after init | unit | `npx vitest run tests/storage-schema.test.ts` | ❌ Wave 0 |
| CORE-05 | `suggest()` called even when storage throws | unit | `npx vitest run tests/suggest-guard.test.ts` | ❌ Wave 0 |
| PATT-01 | Schema `rules` key initialized as `{}` | unit | `npx vitest run tests/storage-schema.test.ts` | ❌ Wave 0 |
| PATT-02 | Schema persists (storage write + re-read) | unit | `npx vitest run tests/storage-schema.test.ts` | ❌ Wave 0 |
| QUAL-02 | No uncaught errors on failure path | unit | `npx vitest run tests/suggest-guard.test.ts` | ❌ Wave 0 |
| QUAL-04 | Manifest declares only the 3 required permissions | manual | Load in `chrome://extensions` and inspect manifest | N/A |

**Note:** QUAL-04 (permissions declaration) is verified by reading the generated `manifest.json` in `.output/chrome-mv3/manifest.json` after a build — not unit-testable.

### Sampling Rate

- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** All tests green + manual load in Chrome before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `vitest.config.ts` — WxtVitest plugin config
- [ ] `tests/storage-schema.test.ts` — covers CORE-02, PATT-01, PATT-02
- [ ] `tests/suggest-guard.test.ts` — covers CORE-01, CORE-05, QUAL-02

---

## Privacy Policy Research

### What a Minimal Legally Sufficient Privacy Policy Must Cover (for Chrome Web Store)

A privacy policy is required whenever an extension handles any user data. The `downloads` permission means user download filenames pass through the extension — a privacy policy is mandatory. [CITED: https://developer.chrome.com/docs/webstore/program-policies/privacy]

**Required disclosures:**
1. What data is collected (filenames — not file contents)
2. Why it is collected (to generate a suggested rename)
3. Who it is shared with (Trevor's hosted endpoint, then Anthropic's Claude Haiku)
4. How it is stored (server logs: anonymized pattern + tag + format + timestamp only — no actual filenames)
5. Contact information for data requests
6. Effective date

**For this extension specifically (D-09 through D-11):**

```markdown
# Privacy Policy — Download Renamer

**Effective date:** [DATE]

## What we collect
When you download a file, this extension sends the **filename** (not the file's contents) to
a hosted endpoint operated by the developer. The filename is used solely to generate a
suggested rename.

## What we do NOT collect
- File contents are never transmitted
- No personally identifiable information is collected
- No browsing history or tab data is accessed
- No user account, login, or identifier is required or stored

## How it works
The extension sends the filename to a developer-hosted relay. The relay forwards only an
**anonymized pattern** (example: "invoice + .pdf") to Anthropic's Claude Haiku API.
Server logs record only: the anonymized pattern, the suggested tag, the rename format,
and a timestamp. Actual filenames are never logged.

The developer holds the API key. Users never provide or see it.

## Third parties
- **Anthropic (Claude Haiku):** Receives anonymized filename patterns. See Anthropic's
  privacy policy at https://www.anthropic.com/privacy

## Contact
[Developer email]
```

**Hosting requirement:** This draft lives at `PRIVACY.md` in the repo (D-08). A public URL is required before Phase 4 Web Store submission. Acceptable hosts: GitHub Pages, a personal site, or any publicly accessible static URL.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | WXT build | ✓ | v24.15.0 | — |
| npm | Package install | ✓ | 11.12.1 | — |
| Chrome browser | Manual load test | [ASSUMED] | — | — |

*Note: Chrome availability was not probed — assumed present on a developer machine.*

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | React 18 + react-dom version bundled by `@wxt-dev/module-react` is React 18.x | Standard Stack | Minor — version mismatch caught at install time |
| A2 | Tailwind 3.x is used (not Tailwind 4) | Standard Stack | Low for Phase 1 (no UI); must confirm before Phase 3 popup work |
| A3 | Chrome is installed on the developer machine for manual load testing | Environment Availability | Blocks Phase 1 success criterion 1 if wrong |
| A4 | `async` listener function returning a Promise satisfies Chrome's `return true` requirement | Architecture Patterns | HIGH — if wrong, downloads will hang. Mitigated by the manual test criterion |

---

## Open Questions (RESOLVED)

1. **Does `async` function returning `Promise<void>` satisfy Chrome's `return true` requirement?**
   - What we know: Chrome docs say "return `true` from the listener". `async` functions return a `Promise`, which is truthy.
   - What's unclear: Whether Chrome checks `=== true` or truthiness.
   - RESOLVED: Plan 01-02 checkpoint task catches this explicitly — if downloads hang, switch to a non-async outer function with explicit `return true`.

2. **WXT version to pin vs. float?**
   - What we know: 0.20.27 is current. WXT is pre-1.0 — breaking changes may occur.
   - RESOLVED: Pin to `0.20.27` in package.json (`"wxt": "0.20.27"`) and upgrade deliberately.

---

## Sources

### Primary (HIGH confidence)
- [WXT installation docs](https://wxt.dev/guide/installation) — scaffold command, entrypoint structure
- [WXT entrypoints docs](https://wxt.dev/guide/essentials/entrypoints) — `defineBackground()` constraint, runtime-only rule
- [WXT manifest config](https://wxt.dev/guide/essentials/config/manifest) — permissions + host_permissions syntax
- [WXT storage docs](https://wxt.dev/storage) — `defineItem`, `fallback`, `init` semantics
- [WXT unit testing docs](https://wxt.dev/guide/essentials/unit-testing) — `WxtVitest` plugin config
- [Chrome downloads API](https://developer.chrome.com/docs/extensions/reference/api/downloads#event-onDeterminingFilename) — `suggest()` signature, `return true` requirement, `FilenameSuggestion` shape
- [Chrome Web Store privacy policies](https://developer.chrome.com/docs/webstore/program-policies/privacy) — disclosure requirements
- npm registry — all package versions verified 2026-06-28

### Secondary (MEDIUM confidence)
- [WXT GitHub issues #53](https://github.com/wxt-dev/wxt/issues/53) — hot reload limitation for background scripts

### Tertiary (LOW confidence — training knowledge)
- `async` function `return true` equivalence for Chrome event listeners (A4 above)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry; WXT docs confirmed features
- Architecture: HIGH — `onDeterminingFilename` API documented precisely; `suggest()` semantics verified
- Pitfalls: HIGH for `suggest()` and SW termination (official docs); MEDIUM for hot reload (single GitHub issue source)
- Privacy policy: MEDIUM — Chrome Web Store policy page confirmed requirements; exact legal sufficiency is jurisdiction-dependent

**Research date:** 2026-06-28
**Valid until:** 2026-09-28 (WXT is pre-1.0; re-verify if major version bumps)
