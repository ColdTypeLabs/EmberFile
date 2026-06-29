# Phase 2: Rename Engine - Research

**Researched:** 2026-06-28
**Domain:** Cloudflare Workers relay, Claude Haiku API, fingerprint algorithm, chrome.storage.local concurrency
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Fingerprint dimensions: normalized stem keywords + extension. Strip dates, numbers, UUIDs, and hashes. Keep semantic nouns. `invoice-jan-2024.pdf` → `invoice.pdf`.
- **D-02:** Normalization strips: dates (YYYY-MM-DD, MM-DD-YYYY, month names), numeric sequences, UUIDs (hex runs 8+ chars), hash strings.
- **D-03:** Fingerprint key format: `'{keywords}.{ext}'` plain string.
- **D-04:** Context sent to Claude: filename + MIME type + file size. URL NOT sent.
- **D-05:** Claude returns `{ suggestedName: string, tag: string, renameFormat: string }`.
- **D-06:** Zero-shot prompting with schema in system prompt. JSON parse failure → original filename.
- **D-07:** `renameFormat` is a template: `{tag}`, `{date}`, `{index}` slots.
- **D-08:** Slot fill at apply-time: `{tag}` = rule.tag, `{date}` = ISO YYYY-MM-DD, `{index}` = rule.matchCount.
- **D-09:** Extension appends original extension after template render.
- **D-10:** Anthropic API key NOT in extension. Extension calls Cloudflare Worker relay.
- **D-11:** Relay lives in same repo under `workers/` subfolder. Wrangler handles its build/deploy.
- **D-12:** Extension `host_permissions` changes to Cloudflare Worker URL (not api.anthropic.com).
- **D-13:** Worker URL: `.dev.vars` for local; `VITE_WORKER_URL` env var for production URL in WXT.
- **D-14:** Rules state in `chrome.storage.local` under `rules` key. No IndexedDB.
- **D-15:** Rule write pattern: read full rules object → mutate → write full object back immediately.

### Claude's Discretion

- Exact regex patterns for date/UUID/number stripping (D-02 specifies what to strip, not the regex).
- Worker CORS configuration specifics.
- TypeScript type layout for the Worker.
- Test file structure for the new modules.

### Deferred Ideas (OUT OF SCOPE)

- Relay rate limiting / auth (Phase 4).
- Few-shot prompt examples (deferred; add if zero-shot compliance is poor in practice).
- IndexedDB for rules.

</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| CORE-03 | When no pattern matches, send filename + metadata to hosted Claude Haiku endpoint; receive suggested name + tag | Cloudflare Worker relay pattern, Anthropic API call from Worker |
| CORE-04 | Claude-suggested name is applied and rule stored for future matches | storageRules read-modify-write, renameFormat template apply |
| PATT-03 | Pattern matching runs entirely locally for known patterns — no network request | Fingerprint lookup in storageRules before any fetch |

</phase_requirements>

---

## Summary

Phase 2 replaces the `[HOOK-OK-{n}]-` stub inside `handleDeterminingFilename` with real logic: compute a fingerprint, check `storageRules`, and either apply a cached rule immediately or call a Cloudflare Worker relay that calls Claude Haiku and returns a structured response. The relay lives in `workers/` alongside the extension source, built and deployed separately with Wrangler.

The three technical problems are well-understood. (1) Fingerprinting is pure string manipulation — strip noise tokens from the stem with regex, combine with extension. (2) The Cloudflare Worker pattern is a standard module-syntax TypeScript Worker with one secret binding (`ANTHROPIC_API_KEY`), a CORS-aware fetch handler, and a straight `POST /v1/messages` call to Anthropic. (3) The chrome.storage.local write pattern from Phase 1 (read → mutate → write-all) is safe for this access pattern because only one service worker instance writes rules at a time per download event.

**Primary recommendation:** Build `workers/rename-relay/index.ts` as a standalone Wrangler project; build `src/lib/fingerprint.ts` and `src/lib/renameEngine.ts` as pure functions importable by both background.ts and tests. Replace the stub body in `handleDeterminingFilename` only after both modules have unit tests passing.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Fingerprint computation | Extension — Service Worker | — | Pure local computation; no network |
| Rule cache lookup | Extension — Service Worker | chrome.storage.local | Read from storage, apply template; PATT-03 requires zero network |
| Claude API call | Cloudflare Worker | — | API key must not ship in extension bundle (D-10) |
| Rename suggestion parsing | Extension — Service Worker | — | Worker returns JSON; extension validates and applies |
| Rule persistence | chrome.storage.local | — | Storage-first mandate; D-14 |
| suggest() call | Extension — Service Worker | — | Must be in finally; Chrome blocks download until called |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `wrangler` | 4.105.0 | Cloudflare Worker CLI — dev server, deploy, secret management | Official Cloudflare SDK; no alternative |
| `@cloudflare/workers-types` | 4.20260628.1 | TypeScript types for Worker env, Request, Response, ExportedHandler | Generated from workerd; authoritative |
| `@webext-core/fake-browser` | 1.5.2 | Already in use (suggest-guard.test.ts); mocks chrome.storage for Vitest | Already proven in project tests |

[VERIFIED: npm registry] — all three pass slopcheck [OK] and confirmed on npm registry.

### Supporting

No new runtime dependencies needed in the extension itself — the fingerprint and rename engine are pure TypeScript modules. The Worker has no runtime dependencies; it uses the global `fetch` built into the Workers runtime.

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw Anthropic fetch in Worker | `@anthropic-ai/sdk` npm package | SDK adds ~40KB to Worker bundle; unnecessary for a single endpoint call; raw fetch is simpler and has zero dependencies |
| Wrangler in root package.json | Workspace/monorepo tooling | Overkill for one Worker; wrangler.toml in `workers/rename-relay/` is self-contained and deployable independently |

**Installation (devDependencies — Worker build only, not extension bundle):**
```bash
# From project root
npm install -D wrangler @cloudflare/workers-types
```

---

## Package Legitimacy Audit

| Package | Registry | slopcheck | Disposition |
|---------|----------|-----------|-------------|
| `wrangler` | npm | [OK] | Approved |
| `@cloudflare/workers-types` | npm | [OK] | Approved |
| `@webext-core/fake-browser` | npm (already installed) | [OK] | Approved |

**Packages removed due to [SLOP]:** none
**Packages flagged [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
  [Chrome download event]
         |
         v
  handleDeterminingFilename()
         |
         v
  computeFingerprint(filename, ext)
         |
         v
  storageRules.getValue()
         |
    +---------+
    | cached? |
    +---------+
       |    |
      YES   NO
       |    |
       |    v
       |  fetch(VITE_WORKER_URL, { filename, mimeType, fileSize })
       |         |
       |    [Cloudflare Worker]
       |         |
       |    POST https://api.anthropic.com/v1/messages
       |         |
       |    parse { suggestedName, tag, renameFormat }
       |         |
       |    store new rule → storageRules
       |         |
       v         v
  applyTemplate(rule, downloadItem)
         |
         v
  suggest({ filename: renderedName, conflictAction: 'uniquify' })
         |
  [finally: suggest() if not yet called]
```

### Recommended Project Structure

```
workers/
└── rename-relay/
    ├── wrangler.toml          # Worker config (name, main, compat date)
    ├── .dev.vars              # Local secrets (ANTHROPIC_API_KEY) — gitignored
    ├── worker-configuration.d.ts  # Generated by `wrangler types`
    └── index.ts               # Worker entry point

src/
└── lib/
    ├── fingerprint.ts         # Pure function: computeFingerprint(stem, ext) → string
    └── renameEngine.ts        # applyTemplate(rule, context) → string

entrypoints/
└── background.ts              # Replace stub body; import from src/lib/

tests/
├── fingerprint.test.ts        # New: unit tests for computeFingerprint
├── renameEngine.test.ts       # New: unit tests for applyTemplate
├── background.test.ts         # Update: replace HOOK-OK tests with real rename tests
├── storage-schema.test.ts     # Existing — unchanged
└── suggest-guard.test.ts      # Existing — partially superseded by background.test.ts
```

### Pattern 1: Cloudflare Worker Module Syntax (TypeScript)

**What:** ES module export with typed `Env` interface for secret bindings.
**When to use:** Every Cloudflare Worker — this is the mandatory modern syntax.

```typescript
// workers/rename-relay/index.ts
// Source: https://developers.cloudflare.com/workers/runtime-apis/request/

export interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    const { filename, mimeType, fileSize } = await request.json<{
      filename: string;
      mimeType: string;
      fileSize: number;
    }>();

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'x-api-key': env.ANTHROPIC_API_KEY,
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 256,
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `filename: ${filename}\nmimeType: ${mimeType}\nfileSize: ${fileSize}`,
          },
        ],
      }),
    });

    const data = await anthropicRes.json<{ content: Array<{ text: string }> }>();
    const text = data.content[0]?.text ?? '{}';
    const parsed = JSON.parse(text); // let extension handle parse errors

    return new Response(JSON.stringify(parsed), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  },
} satisfies ExportedHandler<Env>;
```

[CITED: https://developers.cloudflare.com/workers/runtime-apis/request/]

### Pattern 2: wrangler.toml for Subfolder Worker

```toml
# workers/rename-relay/wrangler.toml
# Source: https://developers.cloudflare.com/workers/wrangler/configuration/
name = "download-renamer-relay"
main = "index.ts"
compatibility_date = "2026-06-28"
```

Secrets are set via CLI (never in wrangler.toml):
```bash
# Production
wrangler secret put ANTHROPIC_API_KEY
# Local dev — .dev.vars file (gitignored):
# ANTHROPIC_API_KEY="sk-ant-..."
```

[CITED: https://developers.cloudflare.com/workers/wrangler/configuration/]

### Pattern 3: Fingerprint Algorithm

```typescript
// src/lib/fingerprint.ts
// [ASSUMED] — regex patterns derived from D-02 spec; verify edge cases during implementation

const STRIP_PATTERNS = [
  // ISO dates: 2024-01-31, 20240131
  /\b\d{4}[-]?\d{2}[-]?\d{2}\b/gi,
  // US dates: 01-31-2024, 01/31/24
  /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/gi,
  // Month names (abbrev + full)
  /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/gi,
  // UUIDs: 8+ contiguous hex chars (covers MD5-style hashes and UUIDs)
  /\b[0-9a-f]{8,}(?:-[0-9a-f]{4,}){0,4}\b/gi,
  // Trailing numeric suffixes: _1, -001, (2), v3
  /[-_\s(v]*\d+[)\s]*$/gi,
  // Remaining standalone numbers
  /\b\d+\b/g,
];

export function computeFingerprint(filename: string): string {
  const lastDot = filename.lastIndexOf('.');
  const stem = lastDot > 0 ? filename.slice(0, lastDot) : filename;
  const ext = lastDot > 0 ? filename.slice(lastDot + 1).toLowerCase() : '';

  let normalized = stem.toLowerCase();
  for (const pattern of STRIP_PATTERNS) {
    normalized = normalized.replace(pattern, ' ');
  }

  // Collapse whitespace/separators, keep only alpha tokens
  const keywords = normalized
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .join('-');

  return keywords ? `${keywords}.${ext}` : ext;
}
```

### Pattern 4: WXT Environment Variable for Worker URL

```typescript
// .env (project root — committed with placeholder)
VITE_WORKER_URL=https://download-renamer-relay.your-subdomain.workers.dev

// .env.local (gitignored — override for local dev pointing at wrangler dev server)
VITE_WORKER_URL=http://127.0.0.1:8787

// Usage in background.ts:
const WORKER_URL = import.meta.env.VITE_WORKER_URL;
```

[CITED: https://wxt.dev/guide/essentials/config/environment-variables.html]

### Pattern 5: Rule Read-Modify-Write

```typescript
// D-15: full read → mutate → write-back; no partial writes
async function storeRule(
  fingerprint: string,
  tag: string,
  renameFormat: string
): Promise<void> {
  const rules = await storageRules.getValue();
  rules[fingerprint] = { tag, renameFormat, matchCount: 0 };
  await storageRules.setValue(rules);
}

async function incrementMatchCount(fingerprint: string): Promise<void> {
  const rules = await storageRules.getValue();
  if (rules[fingerprint]) {
    rules[fingerprint].matchCount++;
    await storageRules.setValue(rules);
  }
}
```

### Pattern 6: Template Apply

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

### Anti-Patterns to Avoid

- **Calling `suggest()` outside finally:** Chrome blocks the download until suggest() fires. Any throw before suggest() causes a hung download. The existing `try/finally` pattern in background.ts MUST be preserved.
- **Storing the API key in the extension bundle:** Any value in `wxt.config.ts`, `manifest`, or `VITE_*` env vars is visible in the unpacked extension. The key must stay in Cloudflare's secret store only.
- **Returning `suggest()` from inside try without setting `suggested = true`:** The existing guard pattern must be maintained — double-call to suggest() is benign but the guard makes intent clear.
- **Using `wrangler.toml` `[vars]` for `ANTHROPIC_API_KEY`:** The docs explicitly warn against this. Use `wrangler secret put` for production and `.dev.vars` locally.
- **Sending the download URL to Claude:** Violates the privacy policy's "filename only" claim (D-04).

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Worker TypeScript types | Manual `Request`/`Response` interfaces | `@cloudflare/workers-types` + `wrangler types` | Generated from workerd source; manual types drift |
| Chrome API mocking in tests | Custom chrome.storage stub | `@webext-core/fake-browser` (already in project) | Already proven; handles @wxt-dev/storage integration |
| CORS boilerplate | Per-request manual headers | Inline CORS_HEADERS constant + OPTIONS branch | Simple enough to inline; no library needed for one endpoint |

**Key insight:** The Worker is intentionally thin. Its only job is to proxy one API call with the secret key injected. Complexity belongs in the extension modules (fingerprint, renameEngine) where it's testable without Workers runtime.

---

## Common Pitfalls

### Pitfall 1: Workers Global `fetch` vs Node `fetch`

**What goes wrong:** If you run `wrangler dev` and your Worker imports from `node:*` or assumes Node.js globals, it fails — Workers runtime is not Node.
**Why it happens:** TypeScript compiles fine; the error only surfaces at runtime in the Workers environment.
**How to avoid:** Use only Web APIs (`fetch`, `Request`, `Response`, `JSON`) in the Worker. No `node:https`, no `Buffer`.
**Warning signs:** `Cannot find module 'node:...'` or `ReferenceError: Buffer is not defined` in wrangler dev output.

### Pitfall 2: `VITE_WORKER_URL` Missing at Build Time Causes Silent Undefined

**What goes wrong:** If `.env` is missing or the variable name is wrong, `import.meta.env.VITE_WORKER_URL` is `undefined`. The extension silently falls through to the original filename (the error path), and no downloads are renamed.
**Why it happens:** WXT/Vite replaces `import.meta.env.*` at build time with string literals. Missing = `undefined` literal baked in.
**How to avoid:** Add a runtime assertion in background.ts during dev: `if (!WORKER_URL) throw new Error('VITE_WORKER_URL not set')`. Catch in the existing try/catch.
**Warning signs:** All downloads keep their original names; no console errors (error is swallowed by the catch block).

### Pitfall 3: Claude JSON Parse Failures on Non-JSON Preamble

**What goes wrong:** Claude occasionally prefixes JSON with prose ("Here is the JSON: `{...}`"). `JSON.parse()` throws. D-06 says fall through to original filename — correct, but it should be explicit.
**Why it happens:** Zero-shot JSON compliance is high but not 100%, especially on unexpected file types.
**How to avoid:** In the Worker, attempt to extract a JSON object with a simple regex before `JSON.parse`: extract first `{...}` substring. Log the raw text for debugging in the first week.
**Warning signs:** Periodic downloads not renamed; Cloudflare Worker logs showing parse errors.

### Pitfall 4: chrome.storage.local Concurrent Write Clobbering

**What goes wrong:** Two downloads fire `handleDeterminingFilename` in rapid succession. Both read the same rules object, both add their new rule, both write back — the second write overwrites the first rule.
**Why it happens:** `chrome.storage.local` has no transactions. Read-modify-write is inherently non-atomic.
**How to avoid:** For Phase 2, concurrent downloads hitting the API path (cache miss) simultaneously are unlikely (requires same fingerprint, both unknown). The risk is low enough that a simple read-modify-write is acceptable per D-15. If it becomes a problem in Phase 3+, serialize writes with a queue. Document this as a known limitation.
**Warning signs:** Occasional "missing" rules in DevTools storage inspector after downloading multiple files in quick succession.

### Pitfall 5: wrangler.toml `name` Must Match Worker Subdomain

**What goes wrong:** The `name` field in `wrangler.toml` becomes the subdomain prefix on `workers.dev`. If you change it after first deploy, you create a new Worker and the old one keeps running.
**Why it happens:** Cloudflare ties the Worker identity to the name at first deploy.
**How to avoid:** Decide on `download-renamer-relay` now and commit. Update `host_permissions` in `wxt.config.ts` to match the final workers.dev URL.

### Pitfall 6: `host_permissions` Must Match Worker URL Exactly

**What goes wrong:** Extension's `host_permissions` still lists `https://api.anthropic.com/*` (from Phase 1 scaffold). Fetch to Worker URL fails with network error (no permission).
**Why it happens:** MV3 requires explicit host permission for every origin the service worker fetches.
**How to avoid:** Update `wxt.config.ts` manifest to replace `https://api.anthropic.com/*` with the Worker URL pattern (e.g., `https://*.workers.dev/*` during dev; lock to specific URL before store submission).

---

## Code Examples

### Worker: CORS Preflight + Anthropic Relay

```typescript
// workers/rename-relay/index.ts
// Source: https://developers.cloudflare.com/workers/runtime-apis/request/

const SYSTEM_PROMPT = `You are a file rename assistant. Given a filename, MIME type, and file size,
return ONLY valid JSON with this exact schema:
{
  "suggestedName": "string — the specific new filename for this file, no extension",
  "tag": "string — short category label (e.g. invoice, receipt, screenshot, report)",
  "renameFormat": "string — reusable template using only {tag}, {date}, {index} slots"
}
Do not include any text outside the JSON object.`;

export interface Env {
  ANTHROPIC_API_KEY: string;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') return new Response(null, { headers: CORS });
    if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405 });

    try {
      const body = await request.json<{ filename: string; mimeType: string; fileSize: number }>();

      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'x-api-key': env.ANTHROPIC_API_KEY,
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 256,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: `filename: ${body.filename}\nmimeType: ${body.mimeType}\nfileSize: ${body.fileSize}`,
            },
          ],
        }),
      });

      if (!res.ok) {
        return new Response(JSON.stringify({ error: 'upstream_error' }), {
          status: 502,
          headers: { ...CORS, 'Content-Type': 'application/json' },
        });
      }

      const data = await res.json<{ content: Array<{ text: string }> }>();
      const text = data.content[0]?.text ?? '{}';

      // Extract first JSON object in case model adds preamble prose
      const match = text.match(/\{[\s\S]*\}/);
      const jsonStr = match ? match[0] : '{}';

      return new Response(jsonStr, {
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    } catch {
      return new Response(JSON.stringify({ error: 'worker_error' }), {
        status: 500,
        headers: { ...CORS, 'Content-Type': 'application/json' },
      });
    }
  },
} satisfies ExportedHandler<Env>;
```

### Updated background.ts handleDeterminingFilename (skeleton)

```typescript
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;
  try {
    const enabled = await storageEnabled.getValue();
    if (!enabled) return;

    const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;
    const fingerprint = computeFingerprint(originalName);
    const rules = await storageRules.getValue();

    if (rules[fingerprint]) {
      // Cache hit — apply locally, no network
      const rule = rules[fingerprint];
      rule.matchCount++;
      await storageRules.setValue(rules);
      const newStem = applyTemplate(rule.renameFormat, rule.tag, rule.matchCount);
      const ext = originalName.slice(originalName.lastIndexOf('.'));
      suggest({ filename: newStem + ext, conflictAction: 'uniquify' });
      suggested = true;
    } else {
      // Cache miss — call Worker relay
      const response = await fetch(import.meta.env.VITE_WORKER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: originalName,
          mimeType: downloadItem.mime ?? '',
          fileSize: downloadItem.fileSize ?? 0,
        }),
      });

      const { suggestedName, tag, renameFormat } = await response.json<{
        suggestedName: string;
        tag: string;
        renameFormat: string;
      }>();

      // Store new rule
      const updatedRules = await storageRules.getValue();
      updatedRules[fingerprint] = { tag, renameFormat, matchCount: 1 };
      await storageRules.setValue(updatedRules);

      const ext = originalName.slice(originalName.lastIndexOf('.'));
      suggest({ filename: suggestedName + ext, conflictAction: 'uniquify' });
      suggested = true;
    }
  } catch {
    // Any failure: fall through to finally, Chrome uses default filename
  } finally {
    if (!suggested) suggest();
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | Impact |
|--------------|------------------|--------|
| `claude-haiku-4-5` (short alias) | `claude-haiku-4-5-20251001` (pinned model ID) | Pinned ID avoids surprise behavior changes on Anthropic's side |
| Structured Outputs beta header | Zero-shot JSON in system prompt | Structured Outputs for Haiku not yet GA per Anthropic; zero-shot is the safe choice |
| `wrangler.toml` for secrets (`[vars]`) | `wrangler secret put` + `.dev.vars` | Cloudflare explicitly warns against vars for secrets |

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `claude-haiku-4-5-20251001` is a valid model ID for the Anthropic API | Code Examples | Request fails with 404; use `claude-haiku-4-5` fallback alias |
| A2 | Structured Outputs beta is not available for Haiku; zero-shot JSON is required | State of the Art | If Haiku gains structured outputs, could improve reliability; but zero-shot works fine |
| A3 | Regex patterns for date/UUID stripping in `computeFingerprint` (Pattern 3) | Code Examples | Edge cases in real filenames may over-strip (lose meaningful tokens) or under-strip (fingerprint collision) — verify with real download sample during Phase 2 |
| A4 | Single Worker instance; no need for Durable Objects or KV for Phase 2 | Architecture | If relay needs state in Phase 4 (rate limiting), add then |

---

## Open Questions

1. **Worker URL for host_permissions**
   - What we know: D-12 says change from `https://api.anthropic.com/*` to Worker URL
   - What's unclear: Whether to use a wildcard `https://*.workers.dev/*` during dev or the specific subdomain
   - Recommendation: Use the specific URL `https://download-renamer-relay.<account>.workers.dev/*` in the wxt.config.ts manifest; override via VITE_ env var pattern

2. **CORS origin — wildcard vs. extension ID**
   - What we know: `Access-Control-Allow-Origin: *` works for public Workers
   - What's unclear: Whether locking to the extension's `chrome-extension://` origin adds meaningful security given the relay is open in Phase 2
   - Recommendation: Use `*` for Phase 2. Add origin verification in Phase 4 when auth is added (D-11 relay is "open" for Phase 2 per CONTEXT.md deferred section)

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | wrangler CLI | ✓ | (project already uses Node via WXT) | — |
| wrangler CLI | Worker dev server + deploy | Install as devDep | 4.105.0 (npm) | None — required |
| Cloudflare account | Worker deploy | Trevor must create if not exists | — | Use wrangler dev locally only |
| Anthropic API key | Worker secret | Trevor holds it | — | None — required |

**Missing dependencies with no fallback:**
- Cloudflare account + Worker deployment (required for production; wrangler dev covers local development without it)

**Missing dependencies with fallback:**
- None for Phase 2 scope

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 with WxtVitest plugin |
| Config file | `vitest.config.ts` (exists) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PATT-03 | `computeFingerprint` returns stable key for same pattern | unit | `npm test -- fingerprint` | ❌ Wave 0: `tests/fingerprint.test.ts` |
| PATT-03 | Cache hit path: no fetch called when rule exists | unit | `npm test -- background` | ❌ Wave 0: update `tests/background.test.ts` |
| CORE-03 | Cache miss path: fetch called with correct body | unit (mock fetch) | `npm test -- background` | ❌ Wave 0: update `tests/background.test.ts` |
| CORE-04 | Rule stored after cache miss | unit | `npm test -- background` | ❌ Wave 0: update `tests/background.test.ts` |
| CORE-04 | `applyTemplate` fills all slots correctly | unit | `npm test -- renameEngine` | ❌ Wave 0: `tests/renameEngine.test.ts` |
| QUAL-02 | Worker fetch failure → suggest(original) | unit | `npm test -- background` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/fingerprint.test.ts` — covers PATT-03 (fingerprint stability, edge cases)
- [ ] `tests/renameEngine.test.ts` — covers CORE-04 (template slot fill)
- [ ] Update `tests/background.test.ts` — replace HOOK-OK assertions with cache-hit/miss/error path tests

*(No new framework install needed — Vitest + WxtVitest + @webext-core/fake-browser already present)*

---

## Security Domain

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No (Phase 2; Phase 4 adds auth) | — |
| V3 Session Management | No | — |
| V4 Access Control | No | — |
| V5 Input Validation | Yes | Worker validates request body fields exist before forwarding to Anthropic |
| V6 Cryptography | No | — |

### Known Threat Patterns

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| API key exfiltration from bundle | Information Disclosure | Key in Cloudflare secret only; never in extension bundle, never in VITE_ vars |
| Worker endpoint abuse (open relay) | Elevation of Privilege | Accepted for Phase 2; rate limiting + auth in Phase 4 per CONTEXT.md deferred |
| Malicious filename injection (prompt injection via filename) | Tampering | Worker sends filename as user message content, not interpolated into system prompt. Claude's response is parsed as structured data, not executed |

---

## Sources

### Primary (HIGH confidence)
- [Cloudflare Workers Wrangler Configuration](https://developers.cloudflare.com/workers/wrangler/configuration/) — required fields, .dev.vars, secrets vs vars
- [Cloudflare Workers Request API / TypeScript](https://developers.cloudflare.com/workers/runtime-apis/request/) — ExportedHandler, module syntax, Env bindings
- [WXT Environment Variables](https://wxt.dev/guide/essentials/config/environment-variables.html) — VITE_ prefix requirement, import.meta.env usage
- [Anthropic Messages API](https://platform.claude.com/docs/en/api/messages) — endpoint, headers, request body

### Secondary (MEDIUM confidence)
- [Cloudflare Workers TypeScript](https://developers.cloudflare.com/workers/languages/typescript/) — `wrangler types` command, worker-configuration.d.ts generation
- [Cloudflare Workers Environment Variables](https://developers.cloudflare.com/workers/configuration/environment-variables/) — env binding patterns

### Tertiary (LOW / ASSUMED)
- Model ID `claude-haiku-4-5-20251001` — from WebSearch aggregation; flagged as A1 — verify against Anthropic model list before first API call
- Structured Outputs not yet GA for Haiku — from WebSearch; flagged as A2

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified on npm registry, slopcheck OK
- Cloudflare Worker pattern: HIGH — from official Cloudflare docs
- WXT env vars: HIGH — from official WXT docs
- Anthropic API format: HIGH — from official API docs
- Fingerprint regex: LOW/ASSUMED — designed from spec (D-02), not from an authoritative source; needs real-world validation
- Claude model ID: MEDIUM — identified via WebSearch, requires confirmation

**Research date:** 2026-06-28
**Valid until:** 2026-07-28 (stable domain; Cloudflare and WXT APIs are stable)
