# Technology Stack

**Project:** Download Renamer Web Extension
**Researched:** 2026-06-28
**Confidence:** MEDIUM-HIGH (framework comparison HIGH, service worker constraints HIGH, storage recommendation HIGH, testing MEDIUM)

---

## Recommended Stack

### Build Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| WXT | 0.20.x | Extension build framework | Actively maintained (vs Plasmo in maintenance mode, CRXJS stalled). Vite-based (fast builds). Built-in service worker entrypoint auto-config for MV3. Has `@wxt-dev/storage` wrapper and built-in HMR. Framework-agnostic — works with React. |
| Vite | 5.x (via WXT) | Bundler | Included via WXT. Near-instant dev server, esbuild pre-bundling. Do not configure separately. |

**Why not Plasmo:** Parcel bundler (slower builds), appears to be in maintenance mode with minimal active maintainers as of 2025. React-first design feels like a pro but locks you in and adds abstraction you don't need.

**Why not CRXJS:** Vite plugin only — no entrypoint discovery, cannot create extension ZIPs, development appears stalled. Adds low-level wiring you have to maintain yourself.

**Why not raw Vite + manual manifest:** Works but you hand-wire service worker registration, manifest generation, and HMR yourself. WXT is 1-2 hours of setup saved per entrypoint.

### UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React | 18.x | Popup + Settings UI | Specified in project. WXT has `@wxt-dev/module-react` for first-class integration. |
| TailwindCSS | 3.x | Styling | Specified in project. Works cleanly with WXT — add as PostCSS plugin. No runtime overhead, all purged at build. |

**CSP gotcha:** MV3 bans inline scripts and `unsafe-eval`. React 18 in production mode does not use eval, so this is safe. Tailwind's JIT also has no runtime eval. The risk is dev mode — WXT handles this correctly by generating a proper production build for the extension package. Never load the extension from a raw Vite dev server without WXT's MV3-aware output mode.

### Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@wxt-dev/storage` | latest | Pattern storage (learned rename rules) | Typed wrapper around `chrome.storage.local`. Extension service workers CANNOT use `localStorage` or standard Web Storage API — `chrome.storage.local` is the correct surface. Supports watchers, versioning, and type safety out of the box. |

**Why not IndexedDB directly:** IndexedDB is async and accessible from service workers, but `chrome.storage.local` is the idiomatic choice for Chrome extensions. It has an identical async API, is accessible from all extension contexts (popup, service worker, content scripts), auto-handles serialization, and integrates with Chrome's sync infrastructure if you later add `chrome.storage.sync`. The 10 MB cap in the project spec aligns with `chrome.storage.local`'s default limit. Use `@wxt-dev/storage` as the abstraction layer — do not write raw IndexedDB unless you need structured queries (you don't, this is key-value pattern matching).

**Why not IndexedDB at all:** The stored data is a simple map of `{filename_pattern + extension} → {tag + naming_scheme}`. That is a flat key-value store. IndexedDB's transactional NoSQL model adds complexity with zero benefit here. Reserve IndexedDB for if/when you need relational queries or blobs.

### AI API Integration

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `fetch` | built-in | Call Anthropic Claude Haiku API | MV3 service workers support `fetch()` natively. No wrapper library needed. `XMLHttpRequest` is gone in service workers — `fetch` is the only option. |
| Anthropic Claude Haiku | `claude-haiku-4-5` | File rename generation | Specified. ~40 tokens/call. Direct HTTPS call from service worker to `https://api.anthropic.com`. |

**Service worker lifecycle constraints — critical:**

1. Chrome terminates idle service workers after 30 seconds. An active `fetch()` resets this timer while in-flight.
2. For a downloads listener (`chrome.downloads.onCreated`), the service worker wakes on the event, fires the fetch, and processes the response — all within one event lifecycle. This fits the pattern perfectly. No keep-alive hacks needed.
3. Do NOT store state in module-scope variables — they are lost on service worker termination. Persist all pattern data immediately to `chrome.storage.local` after each API response.
4. API responses for Haiku should return in well under 5 seconds, safely within the 30-second budget.

**API key storage concern (MEDIUM confidence):** `chrome.storage.local` is readable via DevTools by the user on their own machine. This is acceptable for a user-supplied API key (the user owns the key). Document this in onboarding. Do not store any server-side secret here.

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@wxt-dev/module-react` | latest | WXT + React integration | Required alongside WXT — handles React entrypoints |
| `zod` | 3.x | Runtime validation of AI API responses | Use to validate Claude's JSON response before writing to storage. Prevents corrupt pattern data from a malformed API response. |
| `webextension-polyfill` | 0.10.x | `browser.*` API compat shim | Optional — WXT includes its own `@wxt-dev/browser`. Only add if you need cross-browser Firefox support later (deferred per PROJECT.md). |

---

## Testing

| Tool | Version | Purpose | Scope |
|------|---------|---------|-------|
| Vitest | 2.x | Unit tests | Pure logic: pattern matching, rename algorithm, zod schema validation. Fast, Vite-native, no browser needed. |
| Playwright | 1.4x | E2E tests | Popup UI, full extension loaded into real Chromium. Use `--load-extension` flag via CDP. Playwright natively supports Chrome extension testing. |

**What not to test with jsdom/Jest:** Chrome extension APIs (`chrome.downloads`, `chrome.storage`) don't exist in jsdom. Mock them for unit tests with Vitest, but anything that touches actual extension behavior needs Playwright with a real browser.

**Testing priority for this project:** Given the 3-week timeline, Vitest for the rename logic and pattern-matching algorithm. Playwright E2E is a Phase 3 polish activity. Don't block shipping on E2E coverage.

---

## Installation

Run from the project root:

```bash
# Scaffold with WXT + React
npx wxt@latest init download-renamer --template react

# Core dependencies
npm install zod

# Dev dependencies (Tailwind)
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Add `@wxt-dev/module-react` to `wxt.config.ts` modules array (WXT scaffolding handles this if you use the React template).

---

## Manifest Permissions

```json
{
  "permissions": ["downloads", "storage"],
  "host_permissions": ["https://api.anthropic.com/*"]
}
```

`host_permissions` for `api.anthropic.com` is required in MV3 for cross-origin fetch from the service worker. Without it, the fetch will be blocked.

---

## What NOT to Use

| Technology | Why Not |
|------------|---------|
| Plasmo | Maintenance mode, Parcel bundler, slower builds |
| CRXJS | Development stalled, no ZIP generation, manual wiring |
| localStorage / sessionStorage | Not available in MV3 service workers |
| XMLHttpRequest | Not available in MV3 service workers — use fetch |
| Remote CDN scripts | Banned by MV3 CSP — all JS must be bundled |
| `unsafe-eval` in CSP | Banned in MV3 — React 18 prod mode is safe, don't add this |
| IndexedDB directly | Overkill for flat key-value pattern storage; chrome.storage.local is simpler and covers all extension contexts |

---

## Sources

- [2025 State of Browser Extension Frameworks: Plasmo, WXT, CRXJS](https://redreamality.com/blog/the-2025-state-of-browser-extension-frameworks-a-comparative-analysis-of-plasmo-wxt-and-crxjs/)
- [Chrome Extension Development in 2025: Plasmo vs WXT vs Boilerplate](https://www.devkit.best/blog/mdx/chrome-extension-framework-comparison-2025)
- [WXT Official Comparison](https://wxt.dev/guide/resources/compare.html) (HIGH confidence — official docs)
- [Chrome for Developers: Migrate to Service Workers](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) (HIGH confidence — official)
- [Chrome for Developers: Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage) (HIGH confidence — official)
- [Chrome for Developers: Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) (HIGH confidence — official)
- [MV3 Content Security Policy](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) (HIGH confidence — official)
- [Playwright Chrome Extension Testing](https://playwright.dev/docs/chrome-extensions) (HIGH confidence — official)
- [WXT on npm (v0.20.27)](https://www.npmjs.com/package/wxt) (HIGH confidence)
- [Persist Data Across Service Worker Lifetimes](https://mclintock.dev/2025/04/23/how-to-persist-data-across-service-worker-lifetimes-using-the-chrome-storage-api/) (MEDIUM confidence)
