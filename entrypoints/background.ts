import { storage } from '@wxt-dev/storage';
import { computeFingerprint } from '../src/lib/fingerprint';
import { applyTemplate } from '../src/lib/renameEngine';

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

const WORKER_URL = import.meta.env.VITE_WORKER_URL;

// --- Extracted handler for unit testability ---
export async function handleDeterminingFilename(
  downloadItem: chrome.downloads.DownloadItem,
  suggest: (suggestion?: chrome.downloads.FilenameSuggestion) => void
): Promise<void> {
  let suggested = false;

  try {
    const enabled = await storageEnabled.getValue();
    if (!enabled) return; // finally calls suggest() with no args

    if (!WORKER_URL) throw new Error('VITE_WORKER_URL not set');

    const originalName = downloadItem.filename.split(/[/\\]/).pop() ?? downloadItem.filename;
    const fingerprint = computeFingerprint(originalName);
    const ext = originalName.includes('.') ? originalName.slice(originalName.lastIndexOf('.')) : '';

    const rules = await storageRules.getValue();

    if (rules[fingerprint]) {
      // Cache hit — apply locally, no network request
      const rule = rules[fingerprint];
      rule.matchCount++;
      await storageRules.setValue(rules);
      const newStem = applyTemplate(rule.renameFormat, rule.tag, rule.matchCount);
      suggest({ filename: newStem + ext, conflictAction: 'uniquify' });
      suggested = true;
    } else {
      // Cache miss — call Worker relay with 5-second timeout
      const response = await Promise.race([
        fetch(WORKER_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: originalName,
            mimeType: downloadItem.mime ?? '',
            fileSize: downloadItem.fileSize ?? 0,
          }),
        }),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Worker fetch timeout')), 5000)
        ),
      ]);

      const { suggestedName, tag, renameFormat } = await response.json() as {
        suggestedName: string;
        tag: string;
        renameFormat: string;
      };

      // D-15: full read → mutate → write-back
      const updatedRules = await storageRules.getValue();
      updatedRules[fingerprint] = { tag, renameFormat, matchCount: 1 };
      await storageRules.setValue(updatedRules);

      suggest({ filename: suggestedName + ext, conflictAction: 'uniquify' });
      suggested = true;
    }
  } catch {
    // Storage or network errors must not hang downloads — fall through to finally
  } finally {
    if (!suggested) {
      suggest(); // no-arg = Chrome uses its default filename; releases the download
    }
  }
}

export default defineBackground(() => {
  chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
    handleDeterminingFilename(downloadItem, suggest);
    return true; // signal Chrome to wait for async suggest() call
  });
});
