# Architecture Patterns

**Domain:** Chrome MV3 Extension — AI-powered download renamer
**Researched:** 2026-06-28
**Confidence:** HIGH (all findings verified against official Chrome Extensions documentation via Context7)

---

## MV3 Extension Structure

A Manifest V3 extension has four core contexts. Only the service worker has direct access to Chrome APIs like `chrome.downloads`. The others communicate with it via message passing.

| Context | File | Role | Lifecycle |
|---------|------|------|-----------|
| Service Worker | `background.js` | Event hub, downloads API, IndexedDB, Claude API calls | Spawned on events, terminated after 30s idle |
| Popup | `popup.html` + React | Stats display, enable/disable toggle, upgrade prompt | Lives only while popup is open |
| Options Page | `options.html` + React | API key input, rule viewer, usage history | Lives only while tab is open |
| Manifest | `manifest.json` | Declares permissions, registers service worker, sets icons | Static |

No content scripts are needed. The `downloads` permission grants the service worker direct visibility into the Downloads folder — no page injection required.

Required permissions (minimal footprint):
```json
{
  "permissions": ["downloads", "storage", "alarms"],
  "host_permissions": ["https://api.anthropic.com/*"]
}
```

---

## Component Boundaries

```
┌─────────────────────────────────────────────────────────┐
│                    SERVICE WORKER                        │
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Download     │  │ Rule Engine  │  │ Claude API   │  │
│  │ Listener     │→ │ (pattern     │→ │ Client       │  │
│  │              │  │  matcher)    │  │              │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                  │           │
│         ▼                ▼                  ▼           │
│  ┌─────────────────────────────────────────────────┐   │
│  │              IndexedDB (pattern store)           │   │
│  └─────────────────────────────────────────────────┘   │
│         │                                               │
│  ┌──────────────┐                                       │
│  │ Freemium     │                                       │
│  │ Gate         │                                       │
│  └──────────────┘                                       │
└─────────────────────────────────────────────────────────┘
          ▲                          ▲
          │ chrome.runtime.sendMessage│ chrome.runtime.sendMessage
          │                          │
   ┌──────────┐               ┌──────────────┐
   │  Popup   │               │ Options Page │
   │ (React)  │               │   (React)    │
   └──────────┘               └──────────────┘
```

**Rule of thumb:** The service worker owns all state mutations and API calls. The popup and options page are read/write UIs that delegate everything through messages.

---

## Data Flow

### Happy Path: Known Pattern (no API call)

```
File downloaded
  → chrome.downloads.onDeterminingFilename fires in service worker
  → Rule Engine queries IndexedDB for matching pattern
  → Match found → apply naming template → call suggest(newFilename)
  → File saved with clean name. Done.
```

### New Pattern Path (Claude API call)

```
File downloaded
  → onDeterminingFilename fires
  → Rule Engine: no match in IndexedDB
  → Freemium Gate: check monthly count vs tier limit
    → Over limit: suggest() with original name, notify popup
    → Under limit: continue
  → Claude Haiku called with filename + extension + URL domain
  → Response: { tag, naming_template }
  → IndexedDB: store new rule (pattern → tag + template)
  → Increment monthly usage counter
  → suggest(generatedFilename)
```

### Popup → Service Worker

```
User opens popup
  → popup sends: chrome.runtime.sendMessage({ type: 'GET_STATS' })
  → service worker reads from chrome.storage.local, responds
  → popup renders stats

User toggles enable/disable
  → popup sends: chrome.runtime.sendMessage({ type: 'SET_ENABLED', value: false })
  → service worker updates chrome.storage.local
  → service worker removes/re-adds download listener accordingly
```

---

## Key API: onDeterminingFilename vs onCreated

**Use `onDeterminingFilename`, not `onCreated`.** This is the critical architectural decision.

- `onCreated` fires when a download starts but the file hasn't been written yet. Renaming after the fact with `chrome.downloads.rename` is a separate API call that runs after download completes — fragile, requires polling for completion, and fights with the OS file lock.
- `onDeterminingFilename` fires during the Chrome-controlled filename selection phase, before the file is written. The extension calls `suggest({ filename: 'new-name.pdf' })` to set the name atomically. The download completes with the correct name. No post-hoc rename needed.

**Constraint:** Only one extension can register a listener for `onDeterminingFilename`. If another download-manager extension is installed, they conflict. Document this in the store listing.

**Async requirement:** If `suggest` is called asynchronously (which it will be — we need to await IndexedDB and possibly Claude), the listener must `return true` to signal the async path:

```javascript
chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  processDownload(downloadItem, suggest); // async
  return true; // required: signals async suggest call
});
```

---

## Pattern-Matching Engine Data Model

Store rules in IndexedDB. One object store: `rules`.

**Rule schema:**

```typescript
interface Rule {
  id: string;               // auto-generated UUID
  pattern: string;          // regex string matching original filename
  extension: string;        // e.g. "pdf", "png" — matched separately for speed
  sourceDomain: string;     // e.g. "notion.so" — optional, narrows matching
  tag: string;              // e.g. "invoice", "screenshot", "report"
  namingTemplate: string;   // e.g. "{tag}_{date}_{index}" or literal like "Invoice_{date}"
  createdAt: number;        // timestamp
  useCount: number;         // for analytics and pruning
  lastUsed: number;         // timestamp
}
```

**Matching algorithm (service worker, ordered by specificity):**

1. Filter by `extension` match (fast — avoids regex for most misses)
2. Filter by `sourceDomain` match if present
3. Test `pattern` regex against filename
4. First match wins (rules sorted by `useCount DESC` for locality)

**Template variables available to `namingTemplate`:**

| Variable | Value |
|----------|-------|
| `{tag}` | Rule tag |
| `{date}` | YYYY-MM-DD of download |
| `{domain}` | Source domain (e.g. "notion") |
| `{ext}` | File extension |
| `{index}` | Auto-increment for collisions |

**IndexedDB indexes needed:**

- `extension` (non-unique) — primary filter
- `useCount` (non-unique) — for sorting hot rules first
- `lastUsed` (non-unique) — for pruning old rules when approaching 10MB cap

---

## Service Worker Lifecycle: Implications

**The termination problem.** Chrome terminates the service worker after 30 seconds of idle. This has two implications for this extension:

**Implication 1: Event listener registration must be synchronous and top-level.**

```javascript
// CORRECT — registers synchronously at module load time
chrome.downloads.onDeterminingFilename.addListener(handleDownload);

// WRONG — listener may not be registered when event fires after SW restart
async function init() {
  await loadConfig();
  chrome.downloads.onDeterminingFilename.addListener(handleDownload); // too late
}
init();
```

**Implication 2: In-memory state is lost between invocations.** Every time the service worker wakes to handle a download event, it reads fresh from IndexedDB. There is no persistent in-memory rule cache. This is fine — IndexedDB reads are fast (< 5ms for indexed lookups).

**The Claude API call window.** `onDeterminingFilename` holds the download open until `suggest()` is called. A Claude Haiku API call takes ~500ms–2s. The download is visibly paused in Chrome's downloads bar during this time. This is acceptable UX — file naming is the point of the extension. However, set a timeout (e.g. 5 seconds) and fall back to original filename if the API call fails or hangs.

**Do not use a heartbeat for this extension.** The download event itself keeps the service worker alive while handling is in progress. Heartbeats add complexity and are only needed for polling use cases. This extension is purely event-driven.

**Use `chrome.alarms` for monthly usage reset**, not `setTimeout` (which dies with the service worker):

```javascript
chrome.alarms.create('monthly-reset', { periodInMinutes: 60 * 24 * 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'monthly-reset') resetMonthlyCount();
});
```

---

## Freemium Gating: Service Worker Owns It

**Gating logic lives exclusively in the service worker.** The popup reads and displays the gate state but never enforces it. This prevents trivial bypass via popup manipulation.

**State stored in `chrome.storage.local`:**

```javascript
{
  enabled: true,
  tier: 'free' | 'premium',
  monthlyCount: 4,       // files renamed this month via API (not from cache)
  monthlyLimit: 5,       // 5 for free, Infinity for premium
  monthlyResetDate: '2026-07-01',
  apiKey: null,          // stored here — see security note below
}
```

**Gate check in service worker:**

```javascript
async function checkGate() {
  const { tier, monthlyCount, monthlyLimit } = await chrome.storage.local.get([...]);
  if (tier === 'premium') return { allowed: true };
  if (monthlyCount >= monthlyLimit) return { allowed: false, reason: 'limit_reached' };
  return { allowed: true };
}
```

**When limit is reached:** call `suggest()` with the original filename (no rename), then send a message to the popup to show the upgrade prompt. The popup only shows the badge if it's open — also consider `chrome.action.setBadgeText({ text: '!' })` as a persistent signal.

---

## API Key Storage

**Recommended approach: `chrome.storage.local` with a user acknowledgment.**

`chrome.storage.local` persists across browser restarts, which is necessary — users should not have to re-enter their API key every session. `chrome.storage.session` would be simpler but clears on browser close, creating poor UX.

**Security reality:** No Chrome extension can truly "secure" an API key. `chrome.storage.local` data can be read by anyone with filesystem access to the Chrome profile directory. The key is held client-side because there is no backend. The correct mitigations are:

1. Document this clearly in the privacy policy and store listing
2. Recommend users use a Claude API key scoped to low spend limits (e.g. $1/month hard limit via Anthropic console)
3. Never log or transmit the key anywhere except `api.anthropic.com`

**Storage call:**

```javascript
await chrome.storage.local.set({ claudeApiKey: userEnteredKey });
// Retrieve in service worker:
const { claudeApiKey } = await chrome.storage.local.get('claudeApiKey');
```

Do not use `chrome.storage.sync` — it has a 8KB per-item limit and syncs to the cloud, which is worse for security and unnecessary.

---

## Recommended Build Order

Dependencies determine sequence. Each layer requires the previous.

| Phase | What to Build | Why This Order |
|-------|--------------|----------------|
| 1 | `manifest.json`, service worker shell, `onDeterminingFilename` listener | Nothing works without the event hook. Validate the extension loads and the listener fires. |
| 2 | IndexedDB schema + rule CRUD | Pattern engine needs storage before it can read or write rules. |
| 3 | Rule matching engine + `suggest()` call | Core rename logic. Can be tested with hard-coded rules before Claude integration. |
| 4 | Claude Haiku API client | Depends on rule engine knowing when no rule matches. |
| 5 | Freemium gate + `chrome.storage.local` state | Needs Claude client to gate. Needs IndexedDB to track monthly count. |
| 6 | Popup UI (React) | Reads gate state and stats. Needs phase 5 storage to be defined. |
| 7 | Options page UI (React) | API key input needs storage (phase 5). Rule viewer needs IndexedDB (phase 2). |
| 8 | Error handling + fallback paths | Hardening layer. Needs all components in place to know what can fail. |

**Critical dependency:** Phases 1–3 form a testable vertical slice (rename with hard-coded rules, no AI). Ship this internally before wiring Claude. It proves the core mechanic works before adding external API complexity.

---

## Anti-Patterns to Avoid

### Using onCreated + post-hoc rename

**What:** Listen for `onCreated`, wait for download to complete, call `chrome.downloads.rename`.
**Why bad:** Race conditions with OS file lock, requires polling `chrome.downloads.search` to detect completion, rename can fail silently, adds a visible name flicker in the downloads bar.
**Instead:** Use `onDeterminingFilename` exclusively. The file is named correctly from first write.

### Storing mutable state as service worker module-level variables

**What:** `let rules = []; // populated from IndexedDB on first call`
**Why bad:** Service worker terminates; next invocation has an empty array. The "first call" initialization never runs because the SW was restarted.
**Instead:** Read from IndexedDB on every invocation. It's fast enough.

### Registering event listeners inside async functions

**What:** `async function init() { await something(); chrome.downloads.onDeterminingFilename.addListener(...); }`
**Why bad:** If the service worker restarts and the event fires before `await something()` resolves, the listener is not registered and the event is missed.
**Instead:** Register all listeners synchronously at module top level, before any `await`.

### Gating logic in the popup

**What:** Popup checks the monthly count and refuses to send the rename command.
**Why bad:** Popup can be bypassed by sending messages directly to the service worker via DevTools.
**Instead:** Gate lives in the service worker. Popup is display-only.

---

## Sources

- [Chrome Extension Service Worker Lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — HIGH confidence, official docs
- [Migrate to Service Workers (keep-alive patterns)](https://developer.chrome.com/docs/extensions/develop/migrate/to-service-workers) — HIGH confidence, official docs
- [chrome.downloads API Reference](https://developer.chrome.com/docs/extensions/reference/api/downloads) — HIGH confidence, official docs via Context7
- [chrome.runtime Message Passing](https://developer.chrome.com/docs/extensions/reference/api/runtime) — HIGH confidence, official docs via Context7
- [chrome.storage API Reference](https://developer.chrome.com/docs/extensions/reference/api/storage) — HIGH confidence, official docs via Context7
- [How to Secure API Keys in Chrome Extension](https://dev.to/notearthian/how-to-secure-api-keys-in-chrome-extension-3f19) — MEDIUM confidence, community source corroborating official storage docs
