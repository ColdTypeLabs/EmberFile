import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { handleDeterminingFilename } from '../entrypoints/background';

beforeEach(async () => {
  fakeBrowser.reset();
  await fakeBrowser.storage.local.clear();
  vi.unstubAllGlobals();
  // Stub fetch so cache-miss tests don't hang
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch not expected in suggest-guard tests')));
});

const makeDownloadItem = (filename: string): chrome.downloads.DownloadItem =>
  ({ filename, id: 1 } as chrome.downloads.DownloadItem);

describe('onDeterminingFilename suggest() guard', () => {
  it('calls suggest with no args when enabled=false', async () => {
    await fakeBrowser.storage.local.set({ enabled: false, hasConsented: true });
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('report.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    // When disabled, suggest() called with no args (Chrome uses default)
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('calls suggest exactly once when storage read throws', async () => {
    await fakeBrowser.storage.local.set({ hasConsented: true });
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValueOnce(
      new Error('storage failure')
    );
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('report.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('never calls suggest more than once (double-call guard)', async () => {
    await fakeBrowser.storage.local.set({ enabled: false, hasConsented: true });
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('test.zip'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
  });
});
