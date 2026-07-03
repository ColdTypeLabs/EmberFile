# Emberfile — Extended Roadmap (v2 Ideas)

*Captured: 2026-07-03. These are brainstorm-level ideas, not committed plans.*

---

## v2 Concept: Local LLM + Content-Aware Renaming

### The Core Idea

Emberfile v1 only sees the **filename and metadata** before a download completes. v2 would read the **actual file contents** — PDFs, images, documents — and use a local model to generate a dramatically more accurate rename with zero data leaving the device.

**Example of what becomes possible:**
- `invoice_final_v3.pdf` → reads text → sees "Chase Bank, Statement March 2026" → renames to `chase-bank-statement-2026-03.pdf`
- `IMG_4829.jpg` → looks at image → sees a birthday party → renames to `trevor-birthday-party-2025.jpg`
- `download (1).pdf` → reads content → sees a lease agreement → renames to `lease-agreement-oak-st-2026.pdf`

### Why This Is a Real Differentiator

- Nobody is doing **content-aware renaming locally** as a browser extension
- Privacy story flips completely — nothing ever leaves the device
- Accuracy ceiling is far higher than metadata-only approach
- Removes the "you're sending my filenames to a server" objection entirely
- Apple Intelligence does some of this natively, but not as a cross-platform browser tool

---

## Architecture Options

### Option A: Native Companion App (Recommended)

A small background process (Electron or Python + llama.cpp) the user installs once. The Chrome extension talks to it via `localhost`.

**Pros:**
- Works without GPU — CPU inference via llama.cpp
- No browser permission constraints
- Can handle large files, complex PDFs
- Full OS file access

**Cons:**
- Adds an install step — no longer "just a Chrome extension"
- Distribution changes: need a separate installer
- Cross-platform complexity (Mac/Windows/Linux)

### Option B: WebLLM / WebGPU (In-Browser)

Model runs inside the browser tab via WebGPU. No install needed.

**Pros:**
- Zero install friction
- Fully sandboxed

**Cons:**
- Requires a GPU (Chrome 113+)
- ~2GB model download on first use
- Slower than native
- WebGPU support still patchy on some machines

---

## Model Strategy

### Shrinking the Model

| Approach | Description | Size Reduction | Quality Impact |
|----------|-------------|---------------|----------------|
| **Quantization (4-bit GGUF)** | Run model in 4-bit instead of 32-bit | ~75% smaller | ~5% quality loss |
| **Task-specific fine-tune** | Fine-tune SmolLM2 1.7B on rename examples | Same size, better at task | Improves on-task quality |
| **Distillation** | Train tiny model using big model as teacher | Could reach ~100MB | High effort, very high ceiling |

**Most realistic starting point:** SmolLM2 1.7B quantized to 4-bit GGUF (~900MB) via llama.cpp. Runs on CPU, decent rename quality.

### The Spicy Alternative: No LLM at All

Instead of a general LLM, use a purpose-built pipeline:

1. **PDF text extraction** → pull key fields (dates, company names, amounts)
2. **Vision model** → describe image content in one sentence (e.g., `moondream2` at ~1.7GB)
3. **Tiny classifier** → map extracted info to a rename format

Total pipeline could be under 500MB and faster than any LLM approach. Better quality for structured docs (invoices, statements, contracts) where extraction beats generation.

---

## File Type Priority

| File Type | Approach | Complexity |
|-----------|----------|------------|
| **PDFs** | Text extraction → field parsing | Low — well-solved problem |
| **Images** | Vision model (moondream2 or similar) | Medium — model size tradeoff |
| **Office docs** | Text extraction (docx, xlsx) | Low |
| **Audio/Video** | Whisper for audio transcription | High — large models |

**Recommended order:** PDFs first (highest value, easiest), then images, then office docs.

---

## Distribution Implications

v2 is no longer purely a Chrome extension. Realistic distribution paths:

- **Chrome extension + companion app installer** — user installs both; extension detects if companion is running
- **Standalone desktop app** (Electron) that also injects into Chrome via native messaging — bigger scope
- **Homebrew / winget / apt** for power users who want CLI-only

The companion app approach keeps the Chrome extension as the UI and UX entry point, which is the right call — Emberfile's brand lives in the browser.

---

## Open Questions (for when v1 is live and validated)

1. What file types are users actually downloading most? (analytics will tell us)
2. Is the install-step friction a dealbreaker, or do users accept it for privacy?
3. Can we get model quality good enough on CPU without GPU requirement?
4. Does the fine-tuned/distilled approach beat the pipeline approach for real-world filenames?
5. Pricing: does local model justify a higher premium tier ($4.99/mo?) or is it a separate product?

---

## Status

**Not started.** These are brainstormed ideas captured 2026-07-03 during v1 testing period.
**Revisit after:** Emberfile v1 goes public (target 2026-07-17) and first user feedback comes in.
