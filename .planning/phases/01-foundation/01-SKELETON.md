# Walking Skeleton: Download Renamer Web Extension

**Phase:** 1 — Foundation
**Produced:** 2026-06-28
**Purpose:** Architectural decisions locked here. Subsequent phases build on this skeleton without renegotiating these choices.

---

## What the Skeleton Demonstrates

A loadable Chrome MV3 extension that:
1. Intercepts every download via `onDeterminingFilename`
2. Applies a visible no-op rename (`[HOOK-OK-{n}]-{originalFilename}`) proving the hook fires
3. Reads an `enabled` flag from `chrome.storage.local` before renaming
4. Always calls `suggest()` — even on error — so downloads never hang

This is the thinnest possible slice that proves all three critical MV3 mechanics: build pipeline, event hook, and storage persistence.

---

## Architecture Decisions (Locked)

### Framework

| Decision | Value | Rationale |
|----------|-------|-----------|
| Extension framework | WXT 0.20.27 | MV3-native, Vite-based, actively maintained. Plasmo is maintenance mode. CRXJS stalled. |
| UI runtime | React 18 + TailwindCSS | Official WXT module. Tailwind via PostCSS plugin only — CDN blocked by MV3 CSP. |
| Storage abstraction | `@wxt-dev/storage` `defineItem` | First-party WXT package. Type-safe, fallback semantics, no hand-rolled wrappers. |
| Test framework | Vitest 4.1.9 + WxtVitest plugin | Official WXT testing integration. Fake browser polyfill eliminates manual chrome mock setup. |

### Storage

| Decision | Value | Rationale |
|----------|-------|-----------|
| Storage backend | `chrome.storage.local` | Survives service worker termination. IndexedDB deferred to Phase 2 if scale requires. |
| Key names | `enabled`, `monthlyCount`, `monthlyResetDate`, `rules` | Final — downstream UI and logic depend on these exact names (D-07). |
| Schema | See below | Initialized in Phase 1; Phase 2 writes real `rules` entries. |

**Storage schema (final):**
```ts
{
  enabled: boolean,          // default: true
  monthlyCount: number,      // default: 0
  monthlyResetDate: string,  // 'YYYY-MM-01' (init on first read)
  rules: {
    [fingerprint: string]: {
      tag: string,
      renameFormat: string,
      matchCount: number
    }
  }                          // default: {}
}
```

### Rename API

| Decision | Value | Rationale |
|----------|-------|-----------|
| Rename mechanism | `onDeterminingFilename` + `suggest()` | The only valid rename path in Chrome MV3. `chrome.downloads.rename()` does not exist. |
| `suggest()` guarantee | Always in `finally` block with `suggested` boolean guard | Download hangs indefinitely if `suggest()` is never called. Guard prevents double-call. |
| Async signal | `async` function (returns Promise, which is truthy) | Chrome accepts truthy return as async signal. If downloads hang: switch to non-async with explicit `return true`. |

### Permissions

```
downloads, storage, alarms
host_permissions: https://api.anthropic.com/*
```

No `tabs`. No broad `<all_urls>`. (QUAL-04)

### Directory Layout

```
/                            ← repo root
├── entrypoints/
│   └── background.ts        ← service worker; ALL download hook logic
├── public/                  ← static assets (icons)
├── wxt.config.ts            ← manifest permissions, WXT module config
├── vitest.config.ts         ← WxtVitest plugin
├── tsconfig.json            ← WXT-generated
├── package.json
├── tests/
│   ├── storage-schema.test.ts   ← CORE-02, PATT-01, PATT-02
│   └── suggest-guard.test.ts    ← CORE-01, CORE-05, QUAL-02
└── PRIVACY.md               ← privacy policy draft (D-08)
```

### Deployment

| Decision | Value |
|----------|-------|
| Dev mode | `npx wxt dev` — loads unpacked extension at `.output/chrome-mv3/` |
| Manual Chrome load | chrome://extensions → Developer mode → Load unpacked → select `.output/chrome-mv3/` |
| Background reload | After `background.ts` changes: manual "Reload" click in chrome://extensions (WXT hot reload does not cover service workers) |

---

## Freemium Architecture Note

Freemium gating is enforced in the service worker (`background.ts`), never in the popup. The popup is bypassable via DevTools — the service worker is not.

---

## What Phase 2 Builds On

- `entrypoints/background.ts` — adds Claude call in the `try` block; strips `[HOOK-OK-{n}]-` prefix
- `storageRules` defineItem — Phase 2 writes real `{ tag, renameFormat, matchCount }` entries
- `storageEnabled` / `storageMonthlyCount` — read by Phase 3 popup
- `vitest.config.ts` — test suite grows; config does not change
- `PRIVACY.md` — hosted at public URL before Phase 4 Web Store submission

---

*Skeleton produced: 2026-06-28 | Phase 1 Foundation*
