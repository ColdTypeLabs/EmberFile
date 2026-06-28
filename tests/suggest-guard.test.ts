import { describe, it, expect, beforeEach, vi } from 'vitest';
import { fakeBrowser } from '@webext-core/fake-browser';
import { handleDeterminingFilename, resetHookCounter } from '../entrypoints/background';

beforeEach(() => {
  fakeBrowser.reset();
  resetHookCounter();
});

const makeDownloadItem = (filename: string): chrome.downloads.DownloadItem =>
  ({ filename, id: 1 } as chrome.downloads.DownloadItem);

describe('onDeterminingFilename suggest() guard', () => {
  it('prefixes filename with [HOOK-OK-1]- when enabled=true', async () => {
    await fakeBrowser.storage.local.set({ enabled: true });
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('report.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    const call = suggest.mock.calls[0][0];
    expect(call?.filename).toMatch(/^\[HOOK-OK-1\]-report\.pdf$/);
  });

  it('calls suggest with original filename when enabled=false', async () => {
    await fakeBrowser.storage.local.set({ enabled: false });
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('report.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    // When disabled, suggest() called with no args (Chrome uses default)
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('calls suggest exactly once when storage read throws', async () => {
    vi.spyOn(fakeBrowser.storage.local, 'get').mockRejectedValueOnce(
      new Error('storage failure')
    );
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('report.pdf'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
    expect(suggest.mock.calls[0][0]).toBeUndefined();
  });

  it('never calls suggest more than once (double-call guard)', async () => {
    await fakeBrowser.storage.local.set({ enabled: true });
    const suggest = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('test.zip'), suggest);

    expect(suggest).toHaveBeenCalledTimes(1);
  });

  it('hookCounter increments across calls', async () => {
    await fakeBrowser.storage.local.set({ enabled: true });
    const suggest1 = vi.fn();
    const suggest2 = vi.fn();

    await handleDeterminingFilename(makeDownloadItem('a.pdf'), suggest1);
    await handleDeterminingFilename(makeDownloadItem('b.pdf'), suggest2);

    expect(suggest1.mock.calls[0][0]?.filename).toMatch(/^\[HOOK-OK-1\]-/);
    expect(suggest2.mock.calls[0][0]?.filename).toMatch(/^\[HOOK-OK-2\]-/);
  });
});
