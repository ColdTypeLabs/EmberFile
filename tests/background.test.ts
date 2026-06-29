import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { handleDeterminingFilename, storageRules } from '../entrypoints/background';

beforeEach(() => {
  fakeBrowser.reset();
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
    // Pre-seed a rule for 'invoice.pdf' fingerprint
    await fakeBrowser.storage.local.set({
      'local:rules': { 'invoice.pdf': { tag: 'invoice', renameFormat: '{tag}-{date}-{index}', matchCount: 2 } },
      'local:enabled': true,
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
    await fakeBrowser.storage.local.set({ 'local:enabled': true });
    const mockFetch = vi.fn().mockResolvedValue({
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
    await fakeBrowser.storage.local.set({ 'local:enabled': true });
    const mockFetch = vi.fn().mockResolvedValue({
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

    const rules = await storageRules.getValue();
    expect(rules['receipt.pdf']).toBeDefined();
    expect(rules['receipt.pdf'].matchCount).toBe(1);
  });

  it('Worker fetch throws: suggest() called with no args (download uses original filename)', async () => {
    await fakeBrowser.storage.local.set({ 'local:enabled': true });
    const mockFetch = vi.fn().mockRejectedValue(new Error('network error'));
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('Worker fetch times out: suggest() called with no args after timeout', async () => {
    await fakeBrowser.storage.local.set({ 'local:enabled': true });
    vi.useFakeTimers();
    const mockFetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    const promise = handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);
    vi.advanceTimersByTime(6000);
    await promise;

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('disabled: suggest() called with no args immediately', async () => {
    await fakeBrowser.storage.local.set({ 'local:enabled': false });
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('suggest() always called exactly once on error path (double-call guard)', async () => {
    await fakeBrowser.storage.local.set({ 'local:enabled': true });
    const mockFetch = vi.fn().mockRejectedValue(new Error('some error'));
    vi.stubGlobal('fetch', mockFetch);
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('document.pdf'), suggest);

    // Exactly once — not zero (download would hang), not two (API violation)
    expect(suggest).toHaveBeenCalledTimes(1);
  });
});
