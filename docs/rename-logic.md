# Emberfile — Naming & Tagging Logic

How the extension decides what to rename your file and how it learns to do it faster every time.

---

## The Two-Path Model

Every download goes through one of two paths:

```
Download arrives
       │
       ▼
Compute fingerprint ──── Cache hit? ──── YES ──▶ Apply saved template locally
       │                                              (no AI, no network)
       NO
       │
       ▼
Ask Claude Haiku ──▶ Save rule to cache ──▶ Apply result
```

**First encounter:** the extension calls Claude. Claude returns three things (see below), and the rule is saved locally.

**Every repeat:** the rule is applied instantly from local storage — zero API calls, zero cost, zero latency.

---

## Step 1 — Fingerprinting

Before anything else, the raw filename is converted to a stable fingerprint. This is what makes the cache resilient to dates, hash suffixes, and version numbers that change with every download.

**What gets stripped:**
| Pattern | Example stripped |
|---------|-----------------|
| ISO dates | `2024-01-31`, `20240131` |
| US dates | `01/31/24`, `12-25-2023` |
| Month names | `january`, `sep` |
| UUIDs / MD5 hashes | `a3f9b2c1-...` |
| Trailing counters | `_1`, `-001`, `(2)`, `v3` |
| Standalone numbers | `42`, `100` |

**Example:**

| Raw filename | Fingerprint |
|-------------|-------------|
| `Invoice_2024-01-31_Acme_001.pdf` | `invoice-acme.pdf` |
| `Invoice_2024-06-15_Acme_003.pdf` | `invoice-acme.pdf` ← same fingerprint! |
| `screenshot_20240615_143201.png` | `screenshot.png` |
| `report-Q1-2024-final-v2.docx` | `report-q-final.docx` |

After stripping, only lowercase alpha tokens remain, joined with hyphens. The file extension is preserved separately.

**Source:** [`src/lib/fingerprint.ts`](../src/lib/fingerprint.ts)

---

## Step 2 — Cache Lookup

The fingerprint is looked up in `chrome.storage.local` (key: `local:rules`).

**Cache hit:** a saved rule exists. The extension applies the rename template locally and increments the match counter. No network call is made.

**Cache miss:** no rule found. Proceed to Claude.

---

## Step 3 — The Claude AI Call (cache miss only)

On a cache miss the extension sends the filename, MIME type, and file size to a Cloudflare Worker relay. The Worker holds the Anthropic API key and forwards the request to Claude Haiku.

### What Claude is told (system prompt)

```
You are a file rename assistant. Given a filename, MIME type, and file size,
return ONLY valid JSON with this exact schema:
{
  "suggestedName": "string — the specific new filename for this file, no extension",
  "tag": "string — short category label (e.g. invoice, receipt, screenshot, report)",
  "renameFormat": "string — reusable template using only {tag}, {date}, {index} slots"
}
Do not include any text outside the JSON object.
```

### What Claude receives (user message)

```
filename: Invoice_2024-01-31_Acme_001.pdf
mimeType: application/pdf
fileSize: 84321
```

Claude sees the **original, unmodified filename** — not the fingerprint. The fingerprint is only used as a cache key internally.

### What Claude returns (example)

```json
{
  "suggestedName": "acme-invoice-2024-01-31",
  "tag": "invoice",
  "renameFormat": "{tag}-{date}"
}
```

**The three fields:**

| Field | Purpose | Example |
|-------|---------|---------|
| `suggestedName` | The specific name for *this* file (no extension) | `acme-invoice-2024-01-31` |
| `tag` | Short category label — stored with the rule | `invoice` |
| `renameFormat` | Reusable template for future files with the same fingerprint | `{tag}-{date}` |

**Template slots:**

| Slot | Resolves to |
|------|------------|
| `{tag}` | The category label from the saved rule |
| `{date}` | Today's date in `YYYY-MM-DD` format |
| `{index}` | How many times this rule has matched (starts at 1) |

**Source:** [`workers/rename-relay/index.ts`](../workers/rename-relay/index.ts)

---

## Step 4 — Applying the Result

**On first encounter (AI response):**
The `suggestedName` from Claude is used directly as the filename stem. The original extension is appended. The rule `{ tag, renameFormat, matchCount: 1 }` is saved to local storage under the fingerprint.

**On repeat encounters (saved rule):**
`applyTemplate(renameFormat, tag, matchCount)` replaces the slots and returns the new stem. The match counter increments. Example:

| matchCount | renameFormat | tag | date | Result |
|-----------|-------------|-----|------|--------|
| 2 | `{tag}-{date}` | `invoice` | `2024-06-29` | `invoice-2024-06-29` |
| 3 | `{tag}-{index}` | `receipt` | — | `receipt-3` |
| 1 | `{tag}-{date}-{index}` | `report` | `2024-06-29` | `report-2024-06-29-1` |

If Chrome detects a filename conflict, it appends a number automatically (`conflictAction: 'uniquify'`).

**Source:** [`src/lib/renameEngine.ts`](../src/lib/renameEngine.ts)

---

## Full Example — Same File Downloaded Twice

**First download:** `Invoice_2024-01-31_Acme_001.pdf`

1. Fingerprint computed → `invoice-acme.pdf`
2. Cache miss → Claude called
3. Claude returns `{ suggestedName: "acme-invoice-2024-01-31", tag: "invoice", renameFormat: "{tag}-{date}" }`
4. File saved as `acme-invoice-2024-01-31.pdf`
5. Rule stored: `{ "invoice-acme.pdf": { tag: "invoice", renameFormat: "{tag}-{date}", matchCount: 1 } }`

**Second download (3 months later):** `Invoice_2024-04-30_Acme_002.pdf`

1. Fingerprint computed → `invoice-acme.pdf` (same!)
2. Cache hit → `applyTemplate("{tag}-{date}", "invoice", 2)`
3. Date is today → `invoice-2024-04-30`
4. File saved as `invoice-2024-04-30.pdf` instantly, no API call

---

## Constraints & Design Decisions

- **Filename only, never file contents.** Claude sees the filename, MIME type, and size — nothing inside the file.
- **5-second timeout.** If Claude or the Worker doesn't respond in 5 seconds, the download proceeds with its original filename.
- **Suggest always fires.** The `suggest()` call is wrapped in a `finally` block — Chrome waits for it before writing the file, so a crash or error never hangs a download.
- **Freemium gate.** Free users get 5 renames per month. On the 6th attempt, the original filename is returned and a Chrome notification fires. The gate lives in the service worker, not the popup, so it can't be bypassed via DevTools.
- **Max 256 tokens.** Claude Haiku is capped at 256 output tokens — the JSON response is small and this keeps cost and latency minimal.
