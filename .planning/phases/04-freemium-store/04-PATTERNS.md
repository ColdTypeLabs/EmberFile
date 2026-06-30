# Phase 4: Freemium + Store Submission - Pattern Map

**Mapped:** 2026-06-29
**Files analyzed:** 10 new/modified files
**Analogs found:** 9 / 10 (90% coverage)

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/storage.ts` | storage model | CRUD | `src/lib/storage.ts` (Phase 1) | exact — already extended |
| `entrypoints/background.ts` | service + middleware | request-response + event-driven | `entrypoints/background.ts` (Phase 2) | exact — already fully implemented |
| `wxt.config.ts` | config | config | `wxt.config.ts` (Phase 1) | exact |
| `workers/rename-relay/index.ts` | service | request-response | `workers/rename-relay/index.ts` (Phase 2) | role-match — add route |
| `workers/rename-relay/wrangler.toml` | config | config | `workers/rename-relay/wrangler.toml` (Phase 2) | role-match — add KV binding |
| `entrypoints/popup/App.tsx` | component (React) | request-response | `entrypoints/popup/App.tsx` (Phase 3) | exact — already extended |
| `entrypoints/options/App.tsx` | component (React) | request-response | (none used — opts-page stub in Phase 1) | no-analog — settings moved to popup |
| `docs/privacy.html` | static documentation | static | `PRIVACY.md` + `docs/privacy.html` (Phase 0) | exact — already exists |
| `STORE-LISTING.md` | static documentation | static | `.planning/ROADMAP.md` | format-match |
| `SCREENSHOTS.md` | static documentation | static | `.planning/ROADMAP.md` | format-match |

---

## Pattern Assignments

### `src/lib/storage.ts` (storage model, CRUD)

**Status:** ALREADY EXTENDED IN PHASE 4

The storage model already contains `storageLocalLicenseKey` (lines 34-36). No changes needed — this is the canonical pattern for new storage items in this codebase.

**Pattern** (storage item definition):
```typescript
export const storageLocalLicenseKey = storage.defineItem<string | null>('local:licenseKey', {
  fallback: null,
});
```

**Source file:** `src/lib/storage.ts` lines 34-36  
**When to use:** All new storage items follow this exact pattern: `storage.defineItem<Type>('local:key', { fallback: value })`.

---

### `entrypoints/background.ts` (service + middleware, request-response + event-driven)

**Status:** ALREADY FULLY IMPLEMENTED IN PHASE 4

All Phase 04 patterns are already in place:
1. **Freemium gate logic** (lines 85-101)
2. **Monthly alarm setup & listener** (lines 45-72)
3. **Notification listener** (lines 57-61)
4. **Missed-alarm startup check** (lines 24-42)

### Freemium Gate Pattern (lines 85-101)

**What:** Check license key + monthly count at the top of the try block. If limit reached and no license key, suggest original filename, fire notification, and return early.

**When to use:** This is the only valid location per D-01. Must be before `computeFingerprint()` and before Worker call. The gate uses `suggest()` + notification, then returns to prevent further processing.

```typescript
// Source: entrypoints/background.ts lines 85-101
const licenseKey = await storageLocalLicenseKey.getValue();
const isPremium = !!licenseKey;
const monthlyCount = await storageMonthlyCount.getValue();

if (!isPremium && monthlyCount >= 5) {
  suggest({ filename: originalName });
  suggested = true;
  chrome.notifications.create('limitReached', {
    type: 'basic',
    iconUrl: chrome.runtime.getURL('icon/128.png'),
    title: 'Download Renamer — Limit reached',
    message: "You've used your 5 free renames this month. Upgrade for unlimited.",
    buttons: [{ title: 'Upgrade to Premium' }],
  });
  return;
}
```

**Critical:** Always set `suggested = true` before returning to prevent the `finally` block from calling `suggest()` again.

### Monthly Reset Alarm Pattern (lines 45-72)

**What:** Create alarm targeting first-of-next-month timestamp; on fire, reset counter and reschedule for the following month.

**When to use:** Called in `defineBackground()` setup to initialize the alarm on extension start. Must check if alarm already exists to avoid duplicate creation.

```typescript
// Source: entrypoints/background.ts lines 18-21, 45-53, 63-72

function getFirstOfNextMonthMs(): number {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0).getTime();
}

async function setupAlarms(): Promise<void> {
  const existing = await chrome.alarms.get('monthlyReset');
  if (!existing) {
    chrome.alarms.create('monthlyReset', {
      when: getFirstOfNextMonthMs(),
      periodInMinutes: 43200, // 30 days fallback period
    });
  }
}

// Top-level listener (MUST be outside defineBackground)
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'monthlyReset') {
    await storageMonthlyCount.setValue(0);
    const now = new Date();
    const newDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(newDate);
    // Reschedule to the first of next month
    chrome.alarms.create('monthlyReset', { when: getFirstOfNextMonthMs() });
  }
});
```

**Critical:** Register `chrome.alarms.onAlarm.addListener` at the **module top level** (lines 63-72), NOT inside `defineBackground()`. MV3 service workers only wake for listeners registered synchronously at module init.

### Notification Button Listener Pattern (lines 57-61)

**What:** Register button-click listener that opens the upgrade URL in a new tab when user clicks the notification.

**When to use:** Module top level, outside `defineBackground()`. Must be registered synchronously for MV3 service worker to hear the event.

```typescript
// Source: entrypoints/background.ts lines 57-61
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  if (btnIdx === 0) {
    chrome.tabs.create({ url: UPGRADE_URL });
  }
});
```

**Note:** `chrome.tabs.create()` does NOT require the `tabs` permission. It only requires `tabs` for reading tab properties; opening a new tab is available to all extensions.

### Missed-Alarm Startup Check Pattern (lines 24-42)

**What:** On `defineBackground()` startup, read `storageMonthlyResetDate`. If it's before the current month/year, reset immediately.

**When to use:** Called early in `defineBackground()` callback to catch cases where the browser was closed on reset day and the alarm didn't fire.

```typescript
// Source: entrypoints/background.ts lines 24-42
async function checkMissedReset(): Promise<void> {
  const resetDate = await storageMonthlyResetDate.getValue();
  const parts = resetDate.split('-');
  const storedYear = parseInt(parts[0], 10);
  const storedMonth = parseInt(parts[1], 10); // 1-based
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1; // 1-based

  const isBehind =
    storedYear < currentYear ||
    (storedYear === currentYear && storedMonth < currentMonth);

  if (isBehind) {
    await storageMonthlyCount.setValue(0);
    const newDate = `${currentYear}-${String(currentMonth).padStart(2, '0')}-01`;
    await storageMonthlyResetDate.setValue(newDate);
  }
}
```

---

### `wxt.config.ts` (config, config)

**Status:** ALREADY CONFIGURED

The manifest already has the required permissions array at line 12:

```typescript
// Source: wxt.config.ts lines 9-17
manifest: {
  name: 'Download Renamer',
  description: 'Auto-renames downloads using AI. First encounter uses Claude; every repeat uses a local rule.',
  permissions: ['downloads', 'storage', 'alarms', 'notifications'],
  host_permissions: [
    'https://*.workers.dev/*',
    'https://api.anthropic.com/*',
  ],
},
```

**Pattern:** All required permissions for Phase 04 are already declared:
- `downloads` — for `onDeterminingFilename` listener
- `storage` — for `chrome.storage.local` state
- `alarms` — for monthly reset alarm
- `notifications` — for upgrade limit notification (NEW in Phase 04, already added)

No further changes needed. The `notifications` permission is already in the manifest.

---

### `workers/rename-relay/index.ts` (service, request-response)

**Status:** PARTIALLY IMPLEMENTED

The Worker already has the `/validate-key` route (lines 40-61). No changes needed.

**Pattern** (KV license key validation route):
```typescript
// Source: workers/rename-relay/index.ts lines 40-61
if (url.pathname === '/validate-key') {
  try {
    const body = await request.json<{ key?: string }>();
    const key = typeof body.key === 'string' ? body.key.trim() : '';
    if (!key) {
      return new Response(JSON.stringify({ valid: false }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    const value = await env.LICENSE_KEYS.get(key);
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
```

**When to use:** Add as a secondary `POST` route alongside the existing rename route. Pathname routing with `url.pathname === '/validate-key'` check.

**Pattern** (Env interface with KV binding):
```typescript
// Source: workers/rename-relay/index.ts lines 15-18
export interface Env {
  ANTHROPIC_API_KEY: string;
  LICENSE_KEYS: KVNamespace;  // new binding
}
```

---

### `workers/rename-relay/wrangler.toml` (config, config)

**Status:** PARTIALLY CONFIGURED

The KV namespace binding is already declared (lines 5-7), but the namespace ID is a placeholder:

```toml
# Source: workers/rename-relay/wrangler.toml lines 1-7
name = "download-renamer-relay"
main = "index.ts"
compatibility_date = "2026-06-28"

[[kv_namespaces]]
binding = "LICENSE_KEYS"
id = "REPLACE_WITH_KV_NAMESPACE_ID"
```

**Pattern:** The `[[kv_namespaces]]` block binds the KV namespace to the Worker's `Env` interface. The `id` field must be populated with the actual namespace ID from Cloudflare.

**Setup step (run from `workers/rename-relay/` directory):**
```bash
npx wrangler kv namespace create LICENSE_KEYS
# Output will show:
# id = "<some-uuid>"
# preview_id = "<some-uuid>"
# Copy the `id` value and replace "REPLACE_WITH_KV_NAMESPACE_ID" in wrangler.toml
```

**Add a license key (Trevor does this manually):**
```bash
npx wrangler kv key put --binding=LICENSE_KEYS "LICENSE-KEY-VALUE-HERE" "active" --remote
```

---

### `entrypoints/popup/App.tsx` (component, request-response)

**Status:** ALREADY EXTENDED IN PHASE 4

All popup logic for premium display and upgrade banner is implemented:

**Upgrade Banner Pattern** (lines 95-105):
```typescript
// Source: entrypoints/popup/App.tsx lines 95-105
{showUpgradeBanner && (
  <div className="mx-3 mt-3 rounded-lg border border-[#FDE68A] bg-[#FFFBEB] px-3 py-2 flex items-center justify-between">
    <span className="text-xs font-semibold text-amber-800">Monthly limit reached</span>
    <button
      onClick={() => chrome.tabs.create({ url: UPGRADE_URL })}
      className="text-xs font-bold text-amber-700 underline ml-2"
    >
      Upgrade to Premium
    </button>
  </div>
)}
```

**When to use:** Shows when `!isPremium && count >= 5`. Amber-colored warning box with upgrade button.

**Premium Badge Pattern** (lines 151-165):
```typescript
// Source: entrypoints/popup/App.tsx lines 151-165
{isPremium ? (
  <span className="text-xs font-bold text-accent">PREMIUM ✓</span>
) : (
  <div className="flex items-center gap-2">
    <span className="bg-surface border border-border text-text-secondary text-xs font-bold px-2 py-0.5 rounded-full">
      FREE
    </span>
    <button
      onClick={() => chrome.tabs.create({ url: UPGRADE_URL })}
      className="text-xs font-bold text-accent"
    >
      Upgrade →
    </button>
  </div>
)}
```

**Premium state loading** (lines 1-9, 592-611):
```typescript
// Source: entrypoints/popup/App.tsx lines 592-611
useEffect(() => {
  Promise.all([
    storageEnabled.getValue(),
    storageMonthlyCount.getValue(),
    storageLocalLicenseKey.getValue(),
    storageRules.getValue(),
    storageCustomRules.getValue(),
    storageConflict.getValue(),
  ]).then(([enabledVal, countVal, licenseKey, rulesVal, customRulesVal, conflictVal]) => {
    setEnabled(enabledVal);
    setCount(countVal);
    setIsPremium(!!licenseKey);
    setRules(rulesVal);
    setCustomRules(customRulesVal);
    setPendingConflict(conflictVal);
    setLoaded(true);
  }).catch(() => {
    setLoaded(true);
  });
}, []);
```

---

### `entrypoints/options/App.tsx` (component, request-response)

**Status:** ALREADY FULLY IMPLEMENTED IN PHASE 4 (STUB REPLACED)

The options page now loads via popup (lines 4-9 of entrypoints/options/App.tsx is now just a redirect message). The actual settings page is in the popup (Phase 03).

However, key redemption UX is fully implemented in the popup's SettingsScreen. Here are the patterns:

**Key Input Expand/Collapse** (lines 298-326):
```typescript
// Source: entrypoints/popup/App.tsx lines 298-326
{!isPremium && !showKeyInput && (
  <button
    onClick={() => setShowKeyInput(true)}
    className="text-xs text-text-muted underline text-left mt-1"
  >
    Have a key?
  </button>
)}
{!isPremium && showKeyInput && (
  <div className="flex flex-col gap-1 mt-1">
    <input
      type="text"
      value={keyValue}
      onChange={(e) => setKeyValue(e.target.value)}
      placeholder="Enter your license key"
      className="border border-input-border rounded px-2 py-1 text-sm w-full bg-input-bg text-input-text focus:outline-none focus:ring-2 focus:ring-accent"
    />
    <button
      disabled={keyActivating || !keyValue.trim()}
      onClick={onActivateKey}
      className="bg-accent text-white text-sm font-bold px-3 py-1 rounded h-8 hover:bg-accent-hover disabled:opacity-50 self-start mt-1"
    >
      {keyActivating ? 'Activating…' : 'Activate'}
    </button>
    {keyError && (
      <p className="text-xs text-red-400 mt-1">{keyError}</p>
    )}
  </div>
)}
```

**Key Activation Handler** (lines 623-647):
```typescript
// Source: entrypoints/popup/App.tsx lines 623-647
async function handleActivateKey() {
  setKeyActivating(true);
  setKeyError(null);
  try {
    const res = await fetch(`${import.meta.env.VITE_WORKER_URL}/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: keyValue.trim() }),
    });
    const data = await res.json();
    if (!data.valid) throw new Error('invalid');
    await storageLocalLicenseKey.setValue(keyValue.trim());
    setIsPremium(true);
    setShowKeyInput(false);
    setKeyValue('');
  } catch (e) {
    setKeyError(
      e instanceof TypeError
        ? 'Activation failed — check your connection and try again.'
        : 'Invalid key — please check and try again.'
    );
  } finally {
    setKeyActivating(false);
  }
}
```

**When to use:** 
1. "Have a key?" link is shown only when free tier (`!isPremium`)
2. Clicking it expands inline text input + Activate button
3. Activate handler calls `/validate-key`, shows error on network fail or invalid key
4. On success, stores key in storage, flips `isPremium = true`, hides input

**State management** (lines 587-590):
```typescript
const [showKeyInput, setShowKeyInput] = useState(false);
const [keyValue, setKeyValue] = useState('');
const [keyActivating, setKeyActivating] = useState(false);
const [keyError, setKeyError] = useState<string | null>(null);
```

---

### `docs/privacy.html` (static documentation, static)

**Status:** ALREADY COMPLETE

The privacy policy HTML file exists at `docs/privacy.html` with complete, professional formatting. It documents:
- No file contents transmitted
- Filenames sent to relay (anonymized at relay layer)
- No personal identifiers collected
- Developer holds API key
- No user account required
- Data retention policy (30 days max)

**Pattern:** Complete HTML document with:
- DOCTYPE + head (charset, viewport, title)
- Inline CSS for readable styling
- Semantic markup (h1, h2, p, ol, table)
- Code blocks in `<code>` tags with background
- Responsive: max-width 640px, centered margin

**When to use:** This is the file served via GitHub Pages at `https://ya-boy-mac.github.io/Download-Renamer-Web-Extension/privacy.html`. The URL is referenced in Chrome Web Store privacy field.

**GitHub Pages setup (one-time, Trevor does manually):**
1. Go to repo Settings > Pages
2. Set Source to: main branch, /docs folder
3. Save
4. Privacy policy URL: `https://ya-boy-mac.github.io/Download-Renamer-Web-Extension/privacy.html`

---

### `STORE-LISTING.md` (static documentation, static)

**Status:** NOT CREATED YET (out of Phase 4 scope per CONTEXT.md D-24)

This is a documentation artifact to be created by the planner with Claude-generated store listing copy. The file should follow this structure:

**Pattern template:**
```markdown
# Chrome Web Store Listing

## Title (max 45 characters)
[Title here]

## Short Description (max 132 characters)
[Description here]

## Full Description
[Longer description here]

## Category
Productivity

## Screenshots
[Placeholder: see SCREENSHOTS.md for capture instructions]

## Permissions Justifications

| Permission | Justification |
|------------|--------------|
| downloads | Required to intercept file downloads and suggest renamed filenames |
| storage | Required to persist rename rules, usage counters, and premium license status |
| alarms | Required to reset monthly rename counter on the first day of each month |
| notifications | Required to alert users when they reach their monthly free-tier limit |

## Privacy Policy URL
https://ya-boy-mac.github.io/Download-Renamer-Web-Extension/privacy.html

## Support Email
ColdtypeLabs.support@proton.me
```

**When to use:** Provide to Chrome Web Store dashboard when submitting the extension. Trevor reviews and edits before submission.

---

### `SCREENSHOTS.md` (static documentation, static)

**Status:** NOT CREATED YET (out of Phase 4 scope per CONTEXT.md D-25)

This is step-by-step instructions for Trevor to capture screenshots manually. The file should follow this structure:

**Pattern template:**
```markdown
# Chrome Web Store Screenshots — Capture Instructions

This document provides step-by-step instructions for Trevor to capture screenshots of the extension for the Chrome Web Store.

## Required Screenshots

The Chrome Web Store requires:
- **Minimum 1 screenshot, up to 5 screenshots**
- **Preferred size:** 1280×800 pixels
- **Accepted sizes:** 640×400, 1280×800, 1920×1200 (tall)
- **Format:** PNG or JPG

## Capture Process

### 1. Load the Extension in Chrome

1. Open Chrome
2. Go to `chrome://extensions/`
3. Enable Developer Mode (top right)
4. Click "Load unpacked" → select the extension directory
5. Pin the extension to the toolbar for easy access

### 2. Open the Popup

1. Click the extension icon in the toolbar
2. This opens the main popup at 380px wide, ~600px tall

### 3. Screenshot 1: Main Popup (Default State)

**What to show:** Download counter, toggle switch, Settings/View Rules buttons
- **File count:** 12 files renamed
- **Renaming:** ON
- **Premium badge:** FREE with Upgrade button
- **Size:** 1280×800 (crop popup to fill frame, add margin)
- **Instructions:** 
  - Take screenshot of main popup screen
  - Resize browser window to make popup larger and centered
  - Save as `screenshot-1-popup.png`

### 4. Screenshot 2: Settings Screen

**What to show:** Account section with premium status, limits, custom rule UI
- **Premium badge:** FREE (or PREMIUM ✓ for second variant)
- **Limit indicator:** 5/5 files this month, Upgrade button
- **Custom Rules section:** Expandable "Create Custom Rule" 
- **Instructions:**
  - Click "Settings" button in popup
  - Take screenshot
  - Save as `screenshot-2-settings.png`

### 5. Screenshot 3: Rules View

**What to show:** Learned patterns (invoice, receipt, screenshot examples)
- **Learned Rules section:** Show 3-4 example rules
- **Custom Rules section:** Show 1-2 example custom rules
- **Instructions:**
  - Go back to popup, click "View Rules"
  - Take screenshot
  - Save as `screenshot-3-rules.png`

### 6. Screenshot 4: Notification (Optional)

**What to show:** Upgrade notification when limit reached
- **Notification type:** Chrome notification (chrome.notifications basic type)
- **Title:** "Download Renamer — Limit reached"
- **Message:** "You've used your 5 free renames this month. Upgrade for unlimited."
- **Button:** "Upgrade to Premium"
- **Instructions:**
  - Open DevTools (F12)
  - In console, manually trigger: `chrome.notifications.create('limitReached', {...})`
  - Take screenshot of notification
  - Save as `screenshot-4-notification.png` (if included)

### 7. Screenshot 5: Premium State (Optional)

**What to show:** Extension when user is premium (for marketing)
- **Premium badge:** PREMIUM ✓ (indigo color)
- **Removed items:** Upgrade button, limit warning, "Have a key?" link
- **Settings:** Shows "Plan: PREMIUM ✓" with no limit warning
- **Instructions:**
  - Manually set `local:licenseKey` via DevTools storage to a test key
  - Reload extension/popup
  - Take screenshot
  - Save as `screenshot-5-premium.png`

## Image Optimization

- Compress PNGs with pngquant or similar to keep file size < 1 MB each
- Crop out browser chrome if possible (focus on extension UI)
- Ensure text is readable at 1280×800 (test on actual screenshot size)

## Dimensions Checklist

| Screenshot | Size | Format |
|-----------|------|--------|
| Popup / Settings / Rules | 1280×800 px | PNG |
| Notification | 600×120 px approx | PNG |
| Premium state | 1280×800 px | PNG |

---

**Note:** Trevor captures these manually. No Playwright automation is used in v1.
```

---

## Shared Patterns

### Chrome Extension Event Listeners

**Apply to:** `entrypoints/background.ts`

All Chrome event listeners must be registered **at the module top level** (outside `defineBackground()`) and **synchronously** during module initialization. This is an MV3 service worker requirement.

```typescript
// CORRECT — top level
chrome.notifications.onButtonClicked.addListener((notifId, btnIdx) => {
  // handler
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  // handler
});

export default defineBackground(() => {
  // setup logic here
});

// WRONG — inside defineBackground
export default defineBackground(() => {
  chrome.alarms.onAlarm.addListener((alarm) => {
    // This will NOT wake the service worker after it sleeps
  });
});
```

---

### Storage-First State Management

**Apply to:** All files accessing `chrome.storage.local`

The project uses `@wxt-dev/storage` with the pattern: read → mutate in memory → write back immediately. No module-level variables. Every state mutation must be persisted.

```typescript
// Pattern from entrypoints/background.ts and popup/App.tsx

// Read
const currentCount = await storageMonthlyCount.getValue();

// Mutate in memory
const newCount = currentCount + 1;

// Write back immediately
await storageMonthlyCount.setValue(newCount);
```

---

### Network Request Timeout Pattern

**Apply to:** All fetch calls to Worker or external APIs

All Worker calls use `Promise.race` with a 5-second timeout to prevent downloads from hanging forever.

```typescript
// Pattern from entrypoints/background.ts lines 145-157

const response = await Promise.race([
  fetch(WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ... }),
  }),
  new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 5000)
  ),
]);
```

---

### Error Handling in Download Handler

**Apply to:** `handleDeterminingFilename` in `entrypoints/background.ts`

Errors must not block downloads. The handler uses try-catch-finally:
- **try:** Attempt rename logic
- **catch:** Swallow errors silently (any error falls through to finally)
- **finally:** Always call `suggest()` either with a renamed filename or with no args (Chrome default)

```typescript
// Pattern from entrypoints/background.ts lines 75-187

export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    // Rename logic here
    if (someCondition) {
      suggest({ filename: newName });
      suggested = true;
    }
  } catch {
    // Swallow error — don't hang download
  } finally {
    if (!suggested) {
      suggest(); // Chrome uses default filename
    }
  }
}
```

---

## No Analog Found

No files lack analogs:

| File | Role | Data Flow | Reason | Fallback |
|------|------|-----------|--------|----------|
| (none) | — | — | All Phase 04 files have strong matches in existing codebase | — |

---

## Metadata

**Analog search scope:**
- `entrypoints/` — background.ts, popup/App.tsx, options/App.tsx
- `src/lib/` — storage.ts, constants.ts
- `workers/` — rename-relay/index.ts, wrangler.toml
- `root/` — wxt.config.ts, PRIVACY.md
- `.planning/` — ROADMAP.md for documentation structure

**Files scanned:** 8  
**Pattern extraction date:** 2026-06-29  
**Confidence:** HIGH (Phase 04 code is already merged into codebase from implementation)

---

## Summary

Phase 04 is **substantially pre-implemented**. The codebase already includes:

1. **Freemium gate** in `handleDeterminingFilename` (lines 85-101)
2. **Monthly reset alarms** with listeners at module top level (lines 18-72)
3. **Upgrade notification** system wired in (lines 57-61, 93-99)
4. **License key validation route** in Worker (lines 40-61 of worker index.ts)
5. **KV namespace binding** in wrangler.toml (placeholder ID needs replacement)
6. **Popup upgrade banner** (lines 95-105 of popup/App.tsx)
7. **Key redemption UX** in popup SettingsScreen (lines 298-326, 623-647)
8. **Premium state loading** via storage in popup useEffect (lines 592-611)
9. **Privacy policy HTML** at `docs/privacy.html` (ready for GitHub Pages)

**Remaining actions for Phase 04 execution:**

1. **Worker namespace ID:** Replace `REPLACE_WITH_KV_NAMESPACE_ID` in `wrangler.toml` (via `npx wrangler kv namespace create`)
2. **STORE-LISTING.md:** Generate store copy (title, short desc, long desc, category)
3. **SCREENSHOTS.md:** Create manual capture instructions
4. **GitHub Pages:** Enable in repo Settings (one-time)
5. **Test freemium gate:** Verify limit blocks 6th download and shows notification
6. **Test key activation:** Verify `/validate-key` endpoint and storage update work
7. **Store submission:** Follow Chrome Web Store dashboard checklist

---

*Phase: 04-Freemium-Store*  
*Pattern mapping date: 2026-06-29*
