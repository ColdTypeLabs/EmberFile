import { storage } from '@wxt-dev/storage';

// --- Storage items (from Plan 01 — do not modify key names) ---
export const storageEnabled = storage.defineItem<boolean>('local:enabled', {
  fallback: true,
});

export const storageMonthlyCount = storage.defineItem<number>('local:monthlyCount', {
  fallback: 0,
});

export const storageMonthlyResetDate = storage.defineItem<string>('local:monthlyResetDate', {
  init: () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
  },
});

export const storageRules = storage.defineItem<
  Record<string, { tag: string; renameFormat: string; matchCount: number }>
>('local:rules', { fallback: {} });

// --- In-memory hook counter (D-02: intentionally resets on SW restart) ---
let hookCounter = 0;
export const resetHookCounter = () => { hookCounter = 0; };

// --- Extracted handler for unit testability ---
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    const enabled = await storageEnabled.getValue();
    if (!enabled) return; // finally calls suggest() with no args

    hookCounter++;
    const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;
    const newName = `[HOOK-OK-${hookCounter}]-${originalName}`;

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

export default defineBackground(() => {
  chrome.downloads.onDeterminingFilename.addListener(handleDeterminingFilename);
});
