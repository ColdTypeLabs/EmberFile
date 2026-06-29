# Phase 2: Rename Engine - Pattern Map

**Mapped:** 2026-06-28
**Files analyzed:** 10
**Analogs found:** 8 / 10

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `entrypoints/background.ts` | service / event handler | event-driven, request-response | `entrypoints/background.ts` (current) | self — modify in place |
| `src/lib/fingerprint.ts` | utility | transform | `entrypoints/background.ts` lines 39-40 (stem extraction stub) | partial — same domain |
| `src/lib/renameEngine.ts` | utility | transform | `entrypoints/background.ts` lines 41-42 (rename stub) | partial — same domain |
| `workers/rename-relay/index.ts` | service | request-response | RESEARCH.md Pattern 1 (no codebase analog) | none — new pattern |
| `workers/rename-relay/wrangler.toml` | config | — | RESEARCH.md Pattern 2 (no codebase analog) | none — new pattern |
| `workers/rename-relay/.dev.vars` | config | — | none | none |
| `wxt.config.ts` | config | — | `wxt.config.ts` (current) | self — modify in place |
| `.env` | config | — | none (create new) | none |
| `tests/fingerprint.test.ts` | test | — | `tests/storage-schema.test.ts` | role-match |
| `tests/renameEngine.test.ts` | test | — | `tests/suggest-guard.test.ts` | role-match |

---

## Pattern Assignments

### `entrypoints/background.ts` (modify — replace stub body)

**Analog:** `entrypoints/background.ts` (current file — preserve outer shell, replace stub body of `handleDeterminingFilename`)

**Imports to add** (after line 1):
```typescript
import { computeFingerprint } from '../src/lib/fingerprint';
import { applyTemplate } from '../src/lib/renameEngine';
```

**Storage items — keep unchanged** (lines 4-21). The `storageRules` type already matches Phase 2 rule schema.

**Handler shell — preserve exactly** (lines 28-50). Replace only the stub body (lines 38-43). The function signature, `let suggested = false`, `try/catch/finally`, and `if (!suggested) suggest()` pattern are the critical invariant.

**Existing try/finally pattern to preserve** (lines 34-50):
```typescript
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    const enabled = await storageEnabled.getValue();
    if (!enabled) return; // finally calls suggest() with no args

    // ... replace stub body here ...

    suggest({ filename: newName, conflictAction: 'uniquify' });
    suggested = true;
  } catch {
    // Storage or other errors must not hang downloads — fall through to finally
  } finally {
    if (!suggested) {
      suggest(); // no-arg = Chrome uses its default filename; releases the download
    }
  }
}
```

**Original filename extraction — copy this exact pattern** (line 39):
```typescript
const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;
```

**Extension extraction pattern** (derive from originalName — add after line 39):
```typescript
const extIndex = originalName.lastIndexOf('.');
const ext = extIndex > 0 ? originalName.slice(extIndex) : '';
```

**Storage read-modify-write — copy from RESEARCH.md Pattern 5** (D-15):
```typescript
// Cache hit path
const rules = await storageRules.getValue();
if (rules[fingerprint]) {
  const rule = rules[fingerprint];
  rule.matchCount++;
  await storageRules.setValue(rules);
  const newStem = applyTemplate(rule.renameFormat, rule.tag, rule.matchCount);
  suggest({ filename: newStem + ext, conflictAction: 'uniquify' });
  suggested = true;
} else {
  // Cache miss — relay fetch, then storeRule (see renameEngine.ts)
  const updatedRules = await storageRules.getValue();
  updatedRules[fingerprint] = { tag, renameFormat, matchCount: 1 };
  await storageRules.setValue(updatedRules);
}
```

**Worker URL env var** (line before try block):
```typescript
const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;
```

**Listener registration — keep exactly** (lines 53-57):
```typescript
export default defineBackground(() => {
  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    handleDeterminingFilename(downloadItem, suggest);
    return true; // signal Chrome to wait for async suggest() call
  });
});
```

---

### `src/lib/fingerprint.ts` (create — pure utility)

**Analog:** No direct codebase analog. Pattern from RESEARCH.md Pattern 3.

**File structure — pure export, no side effects:**
```typescript
// src/lib/fingerprint.ts

const STRIP_PATTERNS: RegExp[] = [
  /\b\d{4}[-]?\d{2}[-]?\d{2}\b/gi,        // ISO dates
  /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi, // US dates
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi, // month names
  /\b[0-9a-f]{8,}(?:-[0-9a-f]{4,}){0,4}\b/gi, // UUIDs / hashes
  /[-_\s(v]*\d+[)\s]*$/gi,                  // trailing numeric suffixes
  /\b\d+\b/g,                               // remaining standalone numbers
];

export function computeFingerprint(filename: string): string {
  // ... implementation
}
```

**No imports needed** — pure string manipulation, no chrome API, no storage.

**Testability requirement:** Function must be importable directly by Vitest without WXT context (no `defineBackground`, no `chrome.*` calls, no `import.meta.env`).

---

### `src/lib/renameEngine.ts` (create — pure utility)

**Analog:** No direct codebase analog. Pattern from RESEARCH.md Pattern 6.

**File structure — pure export, no side effects:**
```typescript
// src/lib/renameEngine.ts

export function applyTemplate(
  renameFormat: string,
  tag: string,
  matchCount: number
): string {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return renameFormat
    .replace('{tag}', tag)
    .replace('{date}', date)
    .replace('{index}', String(matchCount));
}
```

**No imports needed** — no chrome API, no storage, no env vars. Same testability requirement as fingerprint.ts.

---

### `workers/rename-relay/index.ts` (create — Cloudflare Worker)

**Analog:** No codebase analog. Use RESEARCH.md Code Examples (lines 448-523) as the authoritative pattern.

**Module syntax pattern — mandatory:**
```typescript
export interface Env {
  ANTHROPIC_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // ...
  },
} satisfies ExportedHandler<Env>;
```

**CORS headers constant — inline, no library:**
```typescript
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
```

**OPTIONS preflight branch — must be first check:**
```typescript
if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });
```

**JSON preamble extraction — copy this exact regex** (Pitfall 3 mitigation):
```typescript
const match = text.match(/\{[\s\S]*\}/);
const jsonStr = match ? match[0] : '{}';
```

**Error response pattern:**
```typescript
// Upstream (Anthropic) error:
return new Response(JSON.stringify({ error: 'upstream_error' }), {
  status: 502,
  headers: { ...CORS, 'Content-Type': 'application/json' },
});
// Worker-level catch:
return new Response(JSON.stringify({ error: 'worker_error' }), {
  status: 500,
  headers: { ...CORS, 'Content-Type': 'application/json' },
});
```

**Anthropic fetch headers — exact header names required:**
```typescript
headers: {
  'Content-Type': 'application/json',
  'anthropic-version': '2023-06-01',
  'x-api-key': env.ANTHROPIC_API_KEY,
},
```

**No Node.js globals** — use only `fetch`, `Request`, `Response`, `JSON`. No `Buffer`, no `node:*`.

---

### `workers/rename-relay/wrangler.toml` (create)

**Pattern from RESEARCH.md Pattern 2:**
```toml
name = "download-renamer-relay"
main = "index.ts"
compatibility_date = "2026-06-28"
```

**Never put secrets in wrangler.toml `[vars]`** — use `wrangler secret put` for production.

---

### `workers/rename-relay/.dev.vars` (create — gitignored)

```
ANTHROPIC_API_KEY=sk-ant-...
```

Must be listed in `.gitignore` before committing the `workers/` directory.

---

### `wxt.config.ts` (modify — update host_permissions)

**Analog:** `wxt.config.ts` (current file — lines 1-11)

**Current value to replace** (line 9):
```typescript
host_permissions: ['https://api.anthropic.com/*'],
```

**Replace with** (use wildcard during Phase 2 dev; lock to specific URL before store submission):
```typescript
host_permissions: ['https://*.workers.dev/*'],
```

All other config stays identical.

---

### `.env` (create — committed with placeholder)

```
VITE_WORKER_URL=https://download-renamer-relay.your-subdomain.workers.dev
```

Local dev override goes in `.env.local` (gitignored):
```
VITE_WORKER_URL=http://127.0.0.1:8787
```

Usage in background.ts:
```typescript
const WORKER_URL = import.meta.env.VITE_WORKER_URL as string;
```

---

### `tests/fingerprint.test.ts` (create)

**Analog:** `tests/storage-schema.test.ts` (lines 1-48) — same `describe/it/expect` structure, no chrome API needed.

**Imports pattern** (from `tests/storage-schema.test.ts` lines 1-8, simplified — no fakeBrowser needed):
```typescript
import { describe, it, expect } from 'vitest';
import { computeFingerprint } from '../src/lib/fingerprint';
```

No `beforeEach` / `fakeBrowser.reset()` needed — pure function, no storage.

**Test structure pattern** (from `tests/storage-schema.test.ts` lines 14-34):
```typescript
describe('computeFingerprint', () => {
  it('strips ISO date from stem', () => {
    expect(computeFingerprint('invoice-2024-01-31.pdf')).toBe('invoice.pdf');
  });
  it('strips month name', () => {
    expect(computeFingerprint('invoice-jan-2024.pdf')).toBe('invoice.pdf');
  });
  // ... edge cases
});
```

---

### `tests/renameEngine.test.ts` (create)

**Analog:** `tests/suggest-guard.test.ts` (lines 1-68) — `vi.fn()` mock pattern and `describe/it/expect` structure.

**Imports pattern** (no fakeBrowser, no vi mocks needed — pure function):
```typescript
import { describe, it, expect } from 'vitest';
import { applyTemplate } from '../src/lib/renameEngine';
```

**Test structure pattern:**
```typescript
describe('applyTemplate', () => {
  it('fills {tag} slot', () => {
    const result = applyTemplate('{tag}-file', 'invoice', 0);
    expect(result).toBe('invoice-file');
  });
  it('fills {date} slot with YYYY-MM-DD', () => {
    const result = applyTemplate('{tag}-{date}', 'receipt', 0);
    expect(result).toMatch(/^receipt-\d{4}-\d{2}-\d{2}$/);
  });
  it('fills {index} slot with matchCount', () => {
    const result = applyTemplate('{tag}-{index}', 'report', 5);
    expect(result).toBe('report-5');
  });
});
```

---

## Shared Patterns

### try/finally suggest() Guard
**Source:** `entrypoints/background.ts` lines 31-50
**Apply to:** `entrypoints/background.ts` (preserve during modification)

The `let suggested = false` / `try { ... suggested = true } catch {} finally { if (!suggested) suggest() }` structure is a hard constraint from CLAUDE.md. Any new branch that calls `suggest()` must set `suggested = true` immediately after.

### Storage Read-Modify-Write
**Source:** `entrypoints/background.ts` lines 19-21 (storageRules definition) + RESEARCH.md Pattern 5
**Apply to:** `entrypoints/background.ts` (cache hit increment + cache miss store)

```typescript
// Pattern: always read full object, mutate, write full object back
const rules = await storageRules.getValue();
rules[fingerprint] = { tag, renameFormat, matchCount: 0 };
await storageRules.setValue(rules);
```

Never write a partial rules object. Never cache rules in a module-level variable.

### Test File Imports (extension tests)
**Source:** `tests/storage-schema.test.ts` lines 1-8 and `tests/suggest-guard.test.ts` lines 1-8
**Apply to:** `tests/fingerprint.test.ts`, `tests/renameEngine.test.ts`

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
// fakeBrowser only needed when testing chrome.storage calls
```

For pure utility tests (fingerprint, renameEngine), omit `fakeBrowser` and `beforeEach` entirely.

### makeDownloadItem Helper
**Source:** `tests/suggest-guard.test.ts` line 10-11
**Apply to:** Updated `tests/background.test.ts` (Phase 2 background tests)

```typescript
const makeDownloadItem = (filename: string, overrides?: Partial<chrome.downloads.DownloadItem>): chrome.downloads.DownloadItem =>
  ({ filename, id: 1, mime: 'application/pdf', fileSize: 12345, ...overrides } as chrome.downloads.DownloadItem);
```

Add `mime` and `fileSize` overrides so Phase 2 tests can exercise those fields.

### WXT defineBackground Listener Registration
**Source:** `entrypoints/background.ts` lines 53-57
**Apply to:** `entrypoints/background.ts` (keep unchanged)

```typescript
export default defineBackground(() => {
  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    handleDeterminingFilename(downloadItem, suggest);
    return true; // signal Chrome to wait for async suggest() call
  });
});
```

The `return true` on line 56 is mandatory — Chrome requires it for async `suggest()` calls.

---

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `workers/rename-relay/index.ts` | service | request-response | No Cloudflare Workers exist in this codebase yet |
| `workers/rename-relay/wrangler.toml` | config | — | No Wrangler config exists yet |

For these files, use the RESEARCH.md Code Examples section (lines 448-523 and Pattern 2) as the authoritative pattern source.

---

## Metadata

**Analog search scope:** `entrypoints/`, `tests/`, project root config files
**Files read:** background.ts, wxt.config.ts, vitest.config.ts, storage-schema.test.ts, suggest-guard.test.ts
**Pattern extraction date:** 2026-06-28
