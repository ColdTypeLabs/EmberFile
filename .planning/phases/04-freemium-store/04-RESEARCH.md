# Phase 4: Freemium + Store Submission - Research

**Researched:** 2026-06-29
**Domain:** Chrome Extension APIs (notifications, alarms), Cloudflare Workers + KV, Chrome Web Store submission
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Freemium Gate**
- D-01: Gate lives in `handleDeterminingFilename` in `entrypoints/background.ts`. Before any rename logic runs, check `storageMonthlyCount >= 5` and `!isPremium`. If true: call `suggest()` with original filename, fire the upgrade notification, return early.
- D-02: `isPremium` is derived from `local:licenseKey` in storage. If a stored key exists (was previously validated by the Worker), `isPremium = true`. No re-validation on every download — only at key entry time.
- D-03: Free tier limit is 5 renames/month (MON-01). The 6th attempt is blocked.

**Upgrade Notification (chrome.notifications)**
- D-04: Use `chrome.notifications` API for the upgrade prompt. Fires from the background service worker when the gate blocks a download.
- D-05: Notification structure: `type: 'basic'`, title: `"Download Renamer — Limit reached"`, message: `"You've used your 5 free renames this month. Upgrade for unlimited."`, one button: `"Upgrade to Premium"`.
- D-06: Clicking the notification button opens the payment URL via `chrome.tabs.create()`. URL is a placeholder (`https://example.com/upgrade`) — Trevor replaces before submission.
- D-07: `notifications` permission added to manifest (not restricted by QUAL-04 which only forbids `tabs` and broad host_permissions).

**Popup UI at Limit**
- D-08: Popup rename count label changes format when free user is at limit: `"5/5 files this month"`. Normal format is `"{N} files renamed this month"`.
- D-09: When `monthlyCount >= 5` and free tier, popup shows an upgrade banner below the count: `"Monthly limit reached — Upgrade to Premium"`. Banner links to payment URL.
- D-10: AccountBadge styles unchanged — FREE badge stays blue. Banner is the only limit-state indicator in popup.

**Monthly Counter Reset (chrome.alarms)**
- D-11: Register `chrome.alarms.create('monthlyReset', { when: firstOfNextMonth, periodInMinutes: 43200 })` in background's `defineBackground()` setup. On alarm fire, reset `storageMonthlyCount` to 0 and update `storageMonthlyResetDate`.
- D-12: `storageMonthlyResetDate` already exists in `src/lib/storage.ts` — use it to compute next reset timestamp.
- D-13: On background startup, also check if `storageMonthlyResetDate` is in the past. If past, reset immediately.

**Premium Verification**
- D-14: Validation via Cloudflare Worker: user enters key → extension POSTs to `/validate-key` Worker endpoint → Worker checks key against Cloudflare KV → returns `{ valid: boolean }`.
- D-15: On success: store key in `local:licenseKey`. `isPremium` is derived from `!!storedLicenseKey` on every load.
- D-16: Valid keys live in Cloudflare KV (not hardcoded). Trevor adds keys via Wrangler CLI or dashboard without redeploying.
- D-17: `/validate-key` route added to existing Worker (`workers/rename-relay/index.ts`). Same `VITE_WORKER_URL` base.
- D-18: Network failure during validation: show inline error `"Activation failed — check your connection and try again."` Key not stored.

**Key Redemption UX (Options Page)**
- D-19: Free-tier AccountSection shows: `"Upgrade to Premium"` button + secondary `"Have a key?"` link below.
- D-20: Clicking `"Have a key?"` expands text input + `"Activate"` button inline in AccountSection. No modal.
- D-21: On successful activation: `isPremium` flips to true via storage update, AccountBadge updates to `PREMIUM ✓` (indigo), key input disappears. No page reload.
- D-22: Invalid key: show inline error below the input. Input stays visible for retry.

**Store Submission Artifacts**
- D-23: Privacy policy hosted via GitHub Pages. `PRIVACY.md` converted to `docs/privacy.html`. URL: `https://{username}.github.io/{repo}/privacy`.
- D-24: Store listing copy produced in `STORE-LISTING.md`.
- D-25: `SCREENSHOTS.md` with step-by-step capture instructions (no automated Playwright).
- D-26: Icons (16×16, 48×48, 128×128 PNGs) provided by Trevor as manual step; expected at `public/icons/`.

### Claude's Discretion
- Exact Cloudflare Worker route structure for `/validate-key` (HTTP method, request/response shape beyond `{ valid: boolean }`)
- KV namespace naming and binding name in `wrangler.toml`
- Exact alarm timing logic (first-of-month calculation)
- React state management for inline key input expand/collapse in AccountSection
- Tailwind classes for upgrade banner and key input UI

### Deferred Ideas (OUT OF SCOPE)
- Backend-verified subscription (PREM-01 in v2)
- Automated Playwright screenshot capture
- KV key management dashboard / bulk key generation tooling
- Promo tile (440×280) — not required for initial submission (but required for high store ranking)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| MON-01 | Free tier: 5 renames/month max; counter auto-resets 1st of each month | Gate pattern in background.ts; chrome.alarms for reset; missed-alarm catch-up on startup |
| MON-02 | Free tier shows upgrade prompt and upgrade button | chrome.notifications API; popup banner; AccountSection upgrade button already scaffolded |
| MON-03 | Premium ($2.99/mo) unlocks unlimited; verified via client-side license key in v1 | Cloudflare Worker `/validate-key` + KV; `local:licenseKey` storage item |
| MON-04 | Free-tier counter written to storage immediately; chrome.alarms triggers monthly reset | storage.ts pattern already established; alarms API verified |
| NOTIF-01 | Toast notification when free tier limit reached; file stays unrenamed; upgrade CTA | chrome.notifications basic type with button; onButtonClicked listener |
| QUAL-03 | Privacy policy page documents filename-only sending; no actual filenames logged | PRIVACY.md already exists; needs docs/privacy.html conversion + GitHub Pages enable |
</phase_requirements>

---

## Summary

Phase 4 wires three independent capabilities into the existing codebase: (1) freemium enforcement in the service worker, (2) license key validation via a new Cloudflare KV-backed Worker route, and (3) Chrome Web Store submission artifacts. All three can be planned and executed in parallel waves with a final integration pass.

The existing codebase is in excellent shape for this phase. `storageMonthlyCount`, `storageMonthlyResetDate`, and the `isPremium = false` stubs in both popup and options are already in place. The Cloudflare Worker (`workers/rename-relay/index.ts`) only needs a second route added — the routing pattern is straightforward `if/else` on `url.pathname`. The `chrome.alarms` permission is already declared in `wxt.config.ts`. The only new manifest permission needed is `notifications`.

The store submission work is purely artifact creation (HTML page, markdown copy, screenshot instructions) — no code. GitHub Pages serves directly from the `docs/` folder of the main branch, which means enabling it is a repository settings click plus creating `docs/privacy.html` from the existing `PRIVACY.md`.

**Primary recommendation:** Wave 1 — freemium gate + alarms (background.ts) and KV Worker route in parallel. Wave 2 — popup/options UI wiring. Wave 3 — store artifacts.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Freemium gate (block 6th rename) | API / Background (service worker) | — | Must live in background.ts per D-01; popup can be bypassed via DevTools |
| Monthly counter reset | API / Background (service worker) | — | chrome.alarms runs in service worker context; setInterval does not survive SW termination |
| Upgrade notification | API / Background (service worker) | — | chrome.notifications can only be called from background in MV3 service worker context |
| isPremium derivation | Frontend (popup + options) | Background | Derived from `local:licenseKey` on storage read; not computed in background |
| License key validation | Cloudflare Worker (external) | Options page UI | Network call from options page; Worker checks KV and returns `{ valid: boolean }` |
| Key redemption UX | Frontend (options page) | — | AccountSection expand/collapse is pure React state; result written to storage |
| Popup upgrade banner | Frontend (popup) | — | Reads `monthlyCount` and `isPremium` from storage already loaded in popup |
| Privacy policy hosting | Static / CDN (GitHub Pages) | — | PRIVACY.md → docs/privacy.html; served from main branch /docs |
| Store listing artifacts | Static files | — | Markdown files committed to repo; no runtime component |

---

## Standard Stack

### Core (no new npm installs — all capabilities use existing browser APIs and existing packages)

| Library / API | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| `chrome.notifications` | MV3 built-in | Upgrade prompt notification | Only Chrome API for extension notifications; already declared-adjacent (`alarms` is in manifest) |
| `chrome.alarms` | MV3 built-in | Monthly counter reset | CLAUDE.md architectural constraint; already declared in manifest |
| `@wxt-dev/storage` | ^1.0.1 (installed) | `local:licenseKey` new storage item | Established pattern across all prior phases |
| Cloudflare KV | Cloudflare platform | License key store | KV is Trevor's existing Worker platform; no new infra needed |
| `wrangler` | ^4.105.0 (installed) | KV namespace management CLI | Already a devDependency |

### No New npm Packages Required

This phase adds zero new npm dependencies. All capabilities use:
- Chrome extension built-in APIs (`chrome.notifications`, `chrome.alarms`)
- Existing `@wxt-dev/storage` pattern
- Cloudflare KV accessed via the existing Worker

### Installation

```bash
# No npm installs needed for Phase 4.
# Wrangler KV namespace creation (one-time, run from workers/rename-relay/):
npx wrangler kv namespace create LICENSE_KEYS
# Then add the returned ID to workers/rename-relay/wrangler.toml
```

---

## Package Legitimacy Audit

No new npm packages are introduced in Phase 4. The existing packages (`wxt`, `@wxt-dev/storage`, `wrangler`, `vitest`) were validated in prior phases.

**Packages removed due to slopcheck [SLOP] verdict:** none  
**Packages flagged as suspicious [SUS]:** none

---

## Architecture Patterns

### System Architecture Diagram

```
[Download event]
      |
      v
[background.ts: handleDeterminingFilename]
      |
      +-- read storageMonthlyCount, local:licenseKey
      |
      +-- isPremium? (!!licenseKey) -- YES --> [proceed to rename engine (Phase 2)]
      |
      +-- NO: count >= 5? ------------> YES --> [suggest(originalFilename)]
      |                                             |
      |                                        [chrome.notifications.create()]
      |                                             |
      |                                        [onButtonClicked → chrome.tabs.create(UPGRADE_URL)]
      |
      +-- NO (count < 5) --> [rename engine] --> [storageMonthlyCount + 1]

[chrome.alarms 'monthlyReset']
      |
      v
[onAlarm listener in background.ts]
      |
      +-- storageMonthlyCount.setValue(0)
      +-- storageMonthlyResetDate.setValue(newDate)
      +-- reschedule alarm for next month

[defineBackground() startup]
      |
      +-- check storageMonthlyResetDate < today? --> reset immediately
      +-- chrome.alarms.get('monthlyReset') -- exists? skip : create alarm

[Options Page: AccountSection]
      |
      +-- isPremium? --> show PREMIUM badge only
      +-- NO --> show "Upgrade" button + "Have a key?" link
                      |
                      v
              [expand: text input + Activate]
                      |
                      v
              [POST VITE_WORKER_URL/validate-key { key }]
                      |
              Worker: url.pathname === '/validate-key'
                      |
                      +-- env.LICENSE_KEYS.get(key) -- truthy? { valid: true } : { valid: false }
                      |
              [{ valid: true }] --> storageLocalLicenseKey.setValue(key)
                      |
              [isPremium = true, badge flips to PREMIUM ✓]

[GitHub Pages: docs/privacy.html]
      Served at: https://{user}.github.io/{repo}/privacy
      Source: PRIVACY.md converted to HTML in docs/ folder
      Branch: main, folder: /docs
```

### Recommended Project Structure Changes

```
workers/rename-relay/
├── index.ts          # Add /validate-key route alongside existing POST /
├── wrangler.toml     # Add [[kv_namespaces]] binding for LICENSE_KEYS
└── .dev.vars.example # Unchanged

src/lib/
└── storage.ts        # Add storageLocalLicenseKey item

entrypoints/
└── background.ts     # Add: gate logic, alarms registration, notifications listener

entrypoints/popup/
└── App.tsx           # Wire isPremium from storage; upgrade banner when at limit

entrypoints/options/
└── App.tsx           # Wire isPremium from storage; key redemption UX in AccountSection

docs/
└── privacy.html      # New: converted from PRIVACY.md for GitHub Pages

STORE-LISTING.md      # New: store title, description, category
SCREENSHOTS.md        # New: capture instructions for Trevor
```

### Pattern 1: Freemium Gate in handleDeterminingFilename

**What:** Read `licenseKey` and `monthlyCount` at the top of the try block. If count >= 5 and no license key, fire notification, call `suggest()` with original name, and return.

**When to use:** This is the only valid location per D-01. Must be before `computeFingerprint()`.

```typescript
// Source: CONTEXT.md D-01, D-02; existing background.ts pattern
const licenseKey = await storageLocalLicenseKey.getValue();
const isPremium = !!licenseKey;
const monthlyCount = await storageMonthlyCount.getValue();

if (!isPremium && monthlyCount >= 5) {
  suggest({ filename: originalName }); // no rename
  suggested = true;
  chrome.notifications.create('limitReached', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon/128.png'),
    title: 'Download Renamer — Limit reached',
    message: "You've used your 5 free renames this month. Upgrade for unlimited.",
    buttons: [{ title: 'Upgrade to Premium' }],
  });
  return; // exits try block; finally calls suggest() if !suggested — but we set suggested=true
}
```

**Critical:** `suggest()` must still be called in the `finally` block for the non-gate path. The gate path sets `suggested = true` so finally skips the fallback call. [VERIFIED: developer.chrome.com/docs/extensions/reference/api/notifications]

### Pattern 2: chrome.notifications Registration in defineBackground()

**What:** Register `onButtonClicked` listener synchronously at module top level (NOT inside defineBackground's callback function), per MV3 service worker listener rules.

**When to use:** All Chrome event listeners must be registered synchronously at the module top level so they survive service worker termination/restart.

```typescript
// Source: [CITED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle]
// Register OUTSIDE defineBackground — at module top level
const UPGRADE_URL = 'https://example.com/upgrade'; // Trevor replaces before submission

chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) {
    chrome.tabs.create({ url: UPGRADE_URL });
  }
});

export default defineBackground(() => {
  // alarms and downloads listeners here
});
```

**Note:** `chrome.tabs.create` requires the `tabs` permission OR... actually, `chrome.tabs.create` does NOT require the `tabs` permission — it only requires `tabs` for reading tab properties. Opening a new tab is available to all extensions. [VERIFIED: developer.chrome.com/docs/extensions/reference/api/tabs] This does not violate QUAL-04.

### Pattern 3: chrome.alarms Monthly Reset

**What:** Create alarm targeting first-of-next-month timestamp; on fire, reset counter and reschedule.

**When to use:** On `defineBackground()` startup — check if alarm exists first to avoid duplicate creation.

```typescript
// Source: [CITED: developer.chrome.com/docs/extensions/reference/api/alarms]
function getFirstOfNextMonthMs(): number {
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  return next.getTime();
}

// In defineBackground():
async function setupAlarms() {
  const existing = await chrome.alarms.get('monthlyReset');
  if (!existing) {
    chrome.alarms.create('monthlyReset', {
      when: getFirstOfNextMonthMs(),
      periodInMinutes: 43200, // 30 days fallback repeat; actual reschedule happens in handler
    });
  }
}

// Top-level listener (outside defineBackground):
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'monthlyReset') {
    await storageMonthlyCount.setValue(0);
    const now = new Date();
    const resetDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(resetDate);
    // Reschedule to first of next month (more precise than relying on periodInMinutes)
    chrome.alarms.create('monthlyReset', { when: getFirstOfNextMonthMs() });
  }
});
```

**Missed alarm catch-up (D-13):** In `defineBackground()` startup, read `storageMonthlyResetDate`. If it's before today's month-year, reset immediately.

```typescript
// Missed-alarm catch-up on startup
async function checkMissedReset() {
  const resetDate = await storageMonthlyResetDate.getValue();
  const [year, month] = resetDate.split('-').map(Number);
  const now = new Date();
  if (year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1)) {
    await storageMonthlyCount.setValue(0);
    const newReset = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(newReset);
  }
}
```

**Alarm behavior when browser is closed:** Chrome alarms persist across browser restarts. If the alarm fires while the browser is closed, it fires once on next browser open (missed alarms fire once, not repeatedly). The catch-up check in `defineBackground()` is a belt-and-suspenders defense for edge cases where the alarm ID was cleared. [VERIFIED: developer.chrome.com/docs/extensions/reference/api/alarms]

### Pattern 4: Cloudflare Worker Multi-Route Handler

**What:** Add `/validate-key` route to the existing `fetch` handler in `workers/rename-relay/index.ts`.

**When to use:** Add alongside the existing `POST /` handler with pathname routing.

```typescript
// Source: [CITED: developers.cloudflare.com/kv/get-started]
export interface Env {
  ANTHROPIC_API_KEY: string;
  LICENSE_KEYS: KVNamespace; // new KV binding
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // New route: license key validation
    if (request.method === 'POST' && url.pathname === '/validate-key') {
      try {
        const { key } = await request.json<{ key: string }>();
        if (!key || typeof key !== 'string') {
          return new Response(JSON.stringify({ valid: false }), {
            status: 400,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
          });
        }
        const value = await env.LICENSE_KEYS.get(key.trim());
        return new Response(JSON.stringify({ valid: value !== null }), {
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      } catch {
        return new Response(JSON.stringify({ valid: false }), {
          status: 500,
          headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
      }
    }

    // Existing rename route (method !== 'POST' guard unchanged)
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }
    // ... existing rename logic ...
  },
} satisfies ExportedHandler<Env>;
```

**wrangler.toml addition:**
```toml
name = "download-renamer-relay"
main = "index.ts"
compatibility_date = "2026-06-28"

[[kv_namespaces]]
binding = "LICENSE_KEYS"
id = "<generated-by-wrangler-kv-namespace-create>"
```

**Adding a license key via Wrangler CLI** (run from `workers/rename-relay/`):
```bash
npx wrangler kv key put --binding=LICENSE_KEYS "SOME-LICENSE-KEY-VALUE" "active" --remote
```

### Pattern 5: storageLocalLicenseKey Storage Item

```typescript
// Add to src/lib/storage.ts
export const storageLocalLicenseKey = storage.defineItem<string | null>('local:licenseKey', {
  fallback: null,
});
```

**isPremium derivation in UI components:**
```typescript
// Replace: const isPremium = false;
// With (in popup App.tsx and options App.tsx):
const [isPremium, setIsPremium] = useState(false);
useEffect(() => {
  storageLocalLicenseKey.getValue().then((key) => setIsPremium(!!key));
}, []);
```

Options page needs `isPremium` as reactive state (not a const) since it changes on successful key activation without a page reload.

### Pattern 6: Key Redemption UX (Options AccountSection)

```typescript
// In options/App.tsx AccountSection — React state for inline expand
const [showKeyInput, setShowKeyInput] = useState(false);
const [keyValue, setKeyValue] = useState('');
const [activating, setActivating] = useState(false);
const [keyError, setKeyError] = useState<string | null>(null);

async function handleActivate() {
  setActivating(true);
  setKeyError(null);
  try {
    const res = await Promise.race([
      fetch(`${WORKER_URL}/validate-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: keyValue.trim() }),
      }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000)),
    ]);
    const { valid } = await res.json() as { valid: boolean };
    if (valid) {
      await storageLocalLicenseKey.setValue(keyValue.trim());
      setIsPremium(true);
      setShowKeyInput(false);
    } else {
      setKeyError('Invalid key — please check and try again.');
    }
  } catch {
    setKeyError('Activation failed — check your connection and try again.');
  } finally {
    setActivating(false);
  }
}
```

Note: `WORKER_URL` is `import.meta.env.VITE_WORKER_URL` — already available in options page context.

### Pattern 7: Popup Upgrade Banner

```tsx
// In popup App.tsx, below RenameCountLabel
{!isPremium && state.count >= 5 && (
  <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded flex items-center justify-between">
    <span>Monthly limit reached</span>
    <button
      className="font-semibold underline"
      onClick={() => chrome.tabs.create({ url: 'https://example.com/upgrade' })}
    >
      Upgrade to Premium
    </button>
  </div>
)}
```

Count label format change (D-08):
```tsx
// RenameCountLabel: when at limit and free user
const atLimit = !isPremium && count >= 5;
const label = atLimit ? `${count}/5 files this month` : `${count} files renamed this month`;
```

### Anti-Patterns to Avoid

- **Registering event listeners inside defineBackground() callback:** MV3 service workers only wake for listeners registered at the top level. `chrome.alarms.onAlarm.addListener` inside `defineBackground(() => { ... })` WILL miss events after the service worker sleeps. [VERIFIED: developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle]
- **Using relative path strings for iconUrl:** `chrome.notifications.create` requires `chrome.runtime.getURL('icon/128.png')` — a relative path like `'icons/128.png'` will fail silently or show no icon. [CITED: developer.chrome.com/docs/extensions/mv3/richNotifications]
- **Re-validating license key on every download:** D-02 explicitly says no. Storage read is enough; key presence = premium.
- **Using `periodInMinutes: 43200` as the sole reset trigger:** `periodInMinutes` counts from the initial `when`, not from calendar month boundaries. The `onAlarm` handler should reschedule with a fresh `getFirstOfNextMonthMs()` call to stay aligned with calendar months.
- **Skipping the missed-alarm startup check:** If the browser was closed on the 1st and the alarm fired while closed, `storageMonthlyResetDate` won't have updated. The startup check (D-13) is required.
- **Forgetting `notifications` permission in manifest:** `chrome.notifications.create()` will throw silently without it. Add to `wxt.config.ts` manifest permissions array.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Monthly calendar date math | Custom day-counting loops | `new Date(year, month + 1, 1)` | JS Date handles month overflow correctly (Dec+1 = Jan next year) |
| Notification dismissal tracking | Custom state to track which notifications exist | `chrome.notifications.clear(notifId)` if needed | Chrome manages notification lifecycle |
| KV existence check | Hash comparison or encoding | `env.LICENSE_KEYS.get(key) !== null` | KV `get()` returns null for missing keys — this is the canonical check |
| Service worker keep-alive | `setInterval`, WebSocket ping | `chrome.alarms` | CLAUDE.md constraint; alarms are the MV3 standard |
| License key format validation on Worker side | Regex patterns in Worker | Accept any non-empty string; let KV miss return `{ valid: false }` | Simpler, no format lock-in, KV is the source of truth |

**Key insight:** The freemium gate is intentionally bypassable in v1 (client-side key check). The goal is friction reduction for paying users and cost signaling for free users — not cryptographic enforcement. Do not over-engineer.

---

## Common Pitfalls

### Pitfall 1: onAlarm Listener Registered Inside defineBackground()

**What goes wrong:** The alarm fires but `onAlarm` listener is not registered because the service worker woke up cold and `defineBackground()` hasn't been called yet. Counter never resets.

**Why it happens:** MV3 service workers register listeners during initialization. `defineBackground(() => { chrome.alarms.onAlarm.addListener(...) })` means the listener only exists after the callback runs — but Chrome only wakes the SW if it sees top-level listener registration.

**How to avoid:** Register `chrome.alarms.onAlarm.addListener` AND `chrome.notifications.onButtonClicked.addListener` at the module top level, outside `defineBackground()`.

**Warning signs:** Alarm fires (visible in `chrome://extensions` > Service Worker > Inspect > console) but handler never logs.

### Pitfall 2: iconUrl Missing or Using Relative Path

**What goes wrong:** Notification silently fails to appear, OR appears without icon (OS-dependent behavior).

**Why it happens:** `chrome.notifications.create` requires `iconUrl` and requires it be an absolute extension URL. Background service workers don't have a DOM document base URL, so relative paths don't resolve.

**How to avoid:** Always `chrome.runtime.getURL('icon/128.png')`. Ensure the icon file exists in `public/icons/128.png` (WXT copies `public/` to extension root).

**Warning signs:** No notification visible after gate triggers; no error in console (notifications failure is silent).

### Pitfall 3: Alarm Fires at Wrong Calendar Time After First Month

**What goes wrong:** `periodInMinutes: 43200` (30 days) drifts from calendar month boundaries over time. User who installed on June 15 gets reset on July 15, not July 1.

**Why it happens:** `periodInMinutes` counts from the initial `when`, not from the calendar.

**How to avoid:** On each alarm fire in `onAlarm`, call `chrome.alarms.create('monthlyReset', { when: getFirstOfNextMonthMs() })` to re-anchor to the next calendar first-of-month. The `periodInMinutes: 43200` on the initial creation is a fallback only.

**Warning signs:** Free user's counter doesn't reset on the 1st; it resets mid-month.

### Pitfall 4: KV Namespace Not Created Before Deploy

**What goes wrong:** Worker deploys successfully but `/validate-key` throws on `env.LICENSE_KEYS.get()` because the binding has no associated namespace ID.

**Why it happens:** `[[kv_namespaces]]` in `wrangler.toml` with no `id` field (or wrong ID) causes the Worker to fail at startup on Cloudflare.

**How to avoid:** Run `npx wrangler kv namespace create LICENSE_KEYS` first, copy the returned ID into `wrangler.toml`, then deploy. Verify with `npx wrangler kv key put --binding=LICENSE_KEYS "test" "ok" --remote` before putting any real keys.

### Pitfall 5: chrome.tabs.create Blocked by Missing Permission Assumption

**What goes wrong:** Developer assumes `chrome.tabs.create` requires `tabs` permission and either adds the permission (flagging the extension in store review) or avoids it.

**Why it happens:** Common misunderstanding.

**How to avoid:** `chrome.tabs.create()` to open a new tab does NOT require `tabs` permission. `tabs` is only needed to read tab URL/title properties. Safe to use without permission change. QUAL-04 is not violated.

### Pitfall 6: GitHub Pages Serving docs/privacy.html as Raw Markdown

**What goes wrong:** GitHub Pages serves `PRIVACY.md` as raw text or a download, not a rendered HTML page.

**Why it happens:** GitHub Pages doesn't render arbitrary Markdown files as HTML unless Jekyll is enabled. The Chrome Web Store privacy policy field needs a proper HTML page URL.

**How to avoid:** Convert `PRIVACY.md` to `docs/privacy.html` (a complete HTML file with `<html>`, `<head>`, `<body>`). Enable GitHub Pages from the repo's Settings > Pages > Source: main branch, /docs folder. The URL `https://{user}.github.io/{repo}/privacy.html` (or `/privacy` with `<meta http-equiv="refresh">`) becomes the privacy policy URL.

---

## Code Examples

### chrome.notifications.create() — Full Call

```typescript
// Source: [CITED: developer.chrome.com/docs/extensions/reference/api/notifications]
chrome.notifications.create('limitReached', {
  type: 'basic',
  iconUrl: chrome.runtime.getURL('icon/128.png'),
  title: 'Download Renamer — Limit reached',
  message: "You've used your 5 free renames this month. Upgrade for unlimited.",
  buttons: [{ title: 'Upgrade to Premium' }],
});
```

### Alarm Creation — Calendar-Anchored

```typescript
// Source: [CITED: developer.chrome.com/docs/extensions/reference/api/alarms]
function getFirstOfNextMonthMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

chrome.alarms.create('monthlyReset', {
  when: getFirstOfNextMonthMs(),
  periodInMinutes: 43200, // 30-day fallback
});
```

### KV Worker Route

```typescript
// Source: [CITED: developers.cloudflare.com/kv/get-started]
if (request.method === 'POST' && url.pathname === '/validate-key') {
  const { key } = await request.json<{ key: string }>();
  const value = await env.LICENSE_KEYS.get(key?.trim() ?? '');
  return new Response(JSON.stringify({ valid: value !== null }), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
}
```

### wrangler.toml Addition

```toml
# Source: [CITED: developers.cloudflare.com/kv/get-started]
[[kv_namespaces]]
binding = "LICENSE_KEYS"
id = "<output-of-wrangler-kv-namespace-create>"
```

### Adding a Key via Wrangler CLI

```bash
# Run from workers/rename-relay/
# Source: [CITED: developers.cloudflare.com/kv/reference/kv-commands/]
npx wrangler kv key put --binding=LICENSE_KEYS "LICENSE-KEY-HERE" "active" --remote
```

### Startup Missed-Reset Check

```typescript
// Handles browser-was-closed-on-reset-day case
async function checkMissedReset(): Promise<void> {
  const stored = await storageMonthlyResetDate.getValue();
  const [yr, mo] = stored.split('-').map(Number);
  const now = new Date();
  if (yr < now.getFullYear() || mo < now.getMonth() + 1) {
    await storageMonthlyCount.setValue(0);
    await storageMonthlyResetDate.setValue(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
    );
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `chrome.notifications` required rich notification format | `type: 'basic'` is fully supported in MV3 with buttons | MV3 launch | Can use simple basic type; no need for image/list types |
| `kv:key put` wrangler syntax | `kv key put` (space, no colon) | Wrangler 3.60.0+ | Project uses wrangler ^4.105.0 — use space syntax |
| `periodInMinutes` as sole monthly reset | `when` + reschedule on fire | Best practice, always | Calendar-accurate resets require explicit reschedule |

**Deprecated/outdated:**
- `wrangler kv:key put` (colon syntax): deprecated in Wrangler 3.60+, removed in a future major. Project uses wrangler ^4.x — use `kv key put` (space). [VERIFIED: developers.cloudflare.com/kv/reference/kv-commands/]

---

## Store Submission Artifacts (QUAL-03 + D-23 to D-26)

### Required Assets Summary (from official Chrome Web Store docs)

| Asset | Dimensions | Format | Required? |
|-------|-----------|--------|-----------|
| Store icon | 128×128 px | PNG | YES (in extension ZIP) |
| Extension icon 48×48 | 48×48 | PNG | YES (shown in chrome://extensions) |
| Extension icon 16×16 | 16×16 | PNG | YES (toolbar) |
| Screenshot | 1280×800 px (preferred) or 640×400 | PNG/JPG | YES (at least 1, up to 5) |
| Small promo tile | 440×280 px | PNG/JPG | YES (required for store listing; affects ranking) |
| Marquee promo tile | 1400×560 px | PNG/JPG | Optional (featured placement only) |

[VERIFIED: developer.chrome.com/docs/webstore/images]

**Important note on the 440×280 promo tile:** The docs say it is required for the listing. D-26 / deferred says "promo tile is nice-to-have." Planner should flag this as a risk — the store may not allow submission without it. If submission fails without it, Trevor creates a simple 440×280 branded image.

### Privacy Policy (QUAL-03)

- `PRIVACY.md` already exists and contains complete accurate content.
- Phase 4 action: create `docs/privacy.html` from `PRIVACY.md` content (full HTML, not raw markdown).
- Enable GitHub Pages: repository Settings > Pages > Source: main branch, folder: /docs.
- Privacy policy URL: `https://ya-boy-mac.github.io/Download-Renamer-Web-Extension/privacy.html` (Trevor's GitHub username needs confirmation — use repo Settings > Pages URL once enabled).
- Chrome Web Store dashboard: fill in privacy policy URL field + per-permission justifications.

### Store Listing Copy Constraints

- Title: max 45 characters [ASSUMED — Chrome docs page did not display character limit; 45 is widely cited by community sources]
- Short description: max 132 characters [VERIFIED: developer.chrome.com/docs/webstore — 132 char limit mentioned in listing requirements]
- Long description: max 16,000 characters [ASSUMED — widely cited limit; official page did not confirm]
- Category: `Productivity` [appropriate for a download management tool]

### Chrome Web Store Permission Justifications Required

For each permission in the manifest, the dashboard requires a written justification:
- `downloads` — "Required to intercept file downloads and suggest renamed filenames before the file is written to disk"
- `storage` — "Required to persist rename rules, usage counters, and premium status locally"
- `alarms` — "Required to reset the monthly rename counter on the first day of each calendar month"
- `notifications` — "Required to alert users when they reach the monthly free-tier limit"

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `wrangler` CLI | KV namespace creation, Worker deploy | ✓ | ^4.105.0 (devDependency) | — |
| Cloudflare account + Worker | `/validate-key` endpoint | ✓ | Existing (deploy in Phase 2) | — |
| GitHub Pages | Privacy policy hosting | ✓ (needs enabling) | — | Alternative: host `privacy.html` on any static host |
| Chrome (for manual testing) | Extension load test | ✓ (assumed) | — | — |
| Extension icons (PNG files) | Store submission | ✗ (Trevor provides manually) | — | Trevor creates/sources before submission |

**Missing dependencies with no fallback:**
- Extension icon PNG files (16, 48, 128 px) — must be provided by Trevor before store submission. Plan includes a checklist item.

**Missing dependencies with fallback:**
- GitHub Pages (if repo is private): use any public static host for `privacy.html` (Netlify drop, Vercel, etc.)

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Title max 45 characters for Chrome Web Store | Store Submission Artifacts | Store listing may reject or truncate; easy to fix by shortening title |
| A2 | Long description max 16,000 characters | Store Submission Artifacts | Low risk — extension descriptions are always much shorter |
| A3 | `chrome.tabs.create()` does not require `tabs` permission | Architecture Patterns / Pitfall 5 | If wrong: notification button click silently fails; fix: add `tabs` to permissions (though this has store review implications). Highly confident this is correct based on Chrome docs. |
| A4 | 440×280 small promo tile is optional for initial submission | Store Submission Artifacts | If required: submission blocked until Trevor creates the image; low effort to produce a basic branded image |
| A5 | Trevor's GitHub username for Pages URL is `ya-boy-mac` | Store Submission Artifacts | Wrong URL in privacy policy field; fix: check repo Settings > Pages |

---

## Open Questions

1. **GitHub username / Pages URL**
   - What we know: privacy policy will be at `https://{username}.github.io/{repo}/privacy.html`
   - What's unclear: Trevor's exact GitHub username (guessed `ya-boy-mac` from git log)
   - Recommendation: Plan includes step to enable Pages and verify URL; placeholder in `docs/privacy.html`

2. **440×280 promo tile requirement**
   - What we know: Chrome docs say it affects store ranking; some sources say required for listing
   - What's unclear: Whether store submission is blocked without it
   - Recommendation: Plan includes it as a `checkpoint:human-verify` — if store rejects submission without it, Trevor creates simple branded image

3. **Payment URL for upgrade**
   - What we know: D-06 says placeholder `https://example.com/upgrade`
   - What's unclear: Whether Trevor intends to set up Stripe/Gumroad before Phase 4 ships
   - Recommendation: Plan leaves `UPGRADE_URL` as a const at top of background.ts and options/App.tsx; Trevor replaces the string before submission. Document this in `STORE-LISTING.md`.

---

## Sources

### Primary (HIGH confidence)
- [developer.chrome.com/docs/extensions/reference/api/notifications](https://developer.chrome.com/docs/extensions/reference/api/notifications) — notifications API, create() signature, onButtonClicked, iconUrl requirements
- [developer.chrome.com/docs/extensions/reference/api/alarms](https://developer.chrome.com/docs/extensions/reference/api/alarms) — create(), AlarmCreateInfo, onAlarm, missed alarm behavior
- [developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) — top-level listener registration requirement
- [developers.cloudflare.com/kv/get-started/](https://developers.cloudflare.com/kv/get-started/) — KV namespace creation, wrangler.toml binding, get/put API, TypeScript Env interface
- [developers.cloudflare.com/kv/reference/kv-commands/](https://developers.cloudflare.com/kv/reference/kv-commands/) — wrangler CLI kv commands, v4 syntax (space not colon)
- [developer.chrome.com/docs/webstore/images](https://developer.chrome.com/docs/webstore/images) — required store image assets and dimensions

### Secondary (MEDIUM confidence)
- [developer.chrome.com/docs/webstore/cws-dashboard-listing](https://developer.chrome.com/docs/webstore/cws-dashboard-listing) — listing fields (description limit not explicitly stated on page)
- [developer.chrome.com/docs/webstore/cws-dashboard-privacy](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy) — privacy fields, permission justification requirements
- [developer.chrome.com/docs/extensions/mv3/richNotifications](https://developer.chrome.com/docs/extensions/mv3/richNotifications) — iconUrl must use chrome.runtime.getURL()

### Tertiary (LOW confidence)
- Community sources for title max 45 characters (marked [ASSUMED] in Assumptions Log)

---

## Metadata

**Confidence breakdown:**
- Standard Stack: HIGH — no new packages; existing platform APIs verified against official docs
- Architecture: HIGH — patterns derived from existing codebase + official Chrome/Cloudflare docs
- Pitfalls: HIGH — all verified against official documentation sources
- Store submission: MEDIUM — asset dimensions verified; character limits partially assumed

**Research date:** 2026-06-29
**Valid until:** 2026-09-29 (Chrome extension APIs are stable; Cloudflare KV API stable; Web Store requirements occasionally update)
