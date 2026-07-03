import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { handleDeterminingFilename, shouldOpenUpgradeUrl } from '../entrypoints/background';
import { storageRules } from '../src/lib/storage';

beforeEach(async () => {
  fakeBrowser.reset();
  // fakeBrowser.reset() resets API listeners but not storage data — clear explicitly
  await fakeBrowser.storage.local.clear();
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.useRealTimers();
});

const makeDownloadItem = (
  filename: string,
  extra?: Partial<chrome.downloads.DownloadItem>
): chrome.downloads.DownloadItem =>
  ({ filename, id: 1, mime: 'application/pdf', fileSize: 12345, ...extra } as chrome.downloads.DownloadItem);

describe('handleDeterminingFilename — rename engine', () => {
  it('cache hit: applies stored rule locally, no fetch called', async () => {
    // @wxt-dev/storage strips the 'local:' prefix when writing to chrome.storage.local
    await fakeBrowser.storage.local.set({
      enabled: true,
      hasConsented: true,
      rules: { 'invoice.pdf': { tag: 'invoice', renameFormat: '{tag}-{date}-{index}', matchCount: 2 } },
    });
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('invoice-jan-2024.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    // matchCount was 2, incremented to 3
    expect(suggest.mock.calls[0][0]?.filename).toMatch(/^invoice-\d{4}-\d{2}-\d{2}-3\.pdf$/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('cache miss: calls Worker relay and renames with suggestedName + ext', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, hasConsented: true });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          suggestedName: 'expense-report',
          tag: 'receipt',
          renameFormat: '{tag}-{date}-{index}',
        }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('receipt-2024-03-15.pdf'), suggest);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]?.filename).toBe('expense-report.pdf');
  });

  it('cache miss: stores rule with matchCount: 1 after first Worker call', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, hasConsented: true });
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          suggestedName: 'bank-statement',
          tag: 'statement',
          renameFormat: '{tag}-{date}-{index}',
        }),
    });
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    // Use a unique filename not used in other tests to avoid cross-test storage collision
    await handleDeterminingFilename(makeDownloadItem('bank-statement-2024-12.pdf'), suggest);

    const rules = await storageRules.getValue();
    // computeFingerprint('bank-statement-2024-12.pdf') → strips date → 'bank-statement.pdf'
    expect(rules['bank-statement.pdf']).toBeDefined();
    expect(rules['bank-statement.pdf'].matchCount).toBe(1);
  });

  it('Worker fetch throws: suggest() called with no args (download uses original filename)', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, hasConsented: true });
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('Worker fetch times out: suggest() called with no args after timeout', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false });
    await fakeBrowser.storage.local.set({ enabled: true, hasConsented: true });
    const mockFetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    const promise = handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);
    // Advance past the 5000ms timeout
    await vi.advanceTimersByTimeAsync(6000);
    await promise;

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  }, 15000);

  it('disabled: suggest() called with no args immediately', async () => {
    await fakeBrowser.storage.local.set({ enabled: false, hasConsented: true });
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('suggest() always called exactly once on error path (double-call guard)', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, hasConsented: true });
    const mockFetch = vi.fn().mockRejectedValue(new Error('some error'));
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    // Exactly once — not zero (download would hang), not two (API violation)
    expect(suggest).toHaveBeenCalledTimes(1);
  });
});

describe('shouldOpenUpgradeUrl — notification button-click guard', () => {
  it('returns true for limitReached notification with button index 0', () => {
    expect(shouldOpenUpgradeUrl('limitReached', 0)).toBe(true);
  });

  it('returns false for a non-matching notification ID with button index 0', () => {
    expect(shouldOpenUpgradeUrl('someOtherNotification', 0)).toBe(false);
  });

  it('returns false for limitReached notification with a non-zero button index', () => {
    expect(shouldOpenUpgradeUrl('limitReached', 1)).toBe(false);
  });
});
