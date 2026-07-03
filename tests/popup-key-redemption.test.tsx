import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { fakeBrowser } from '@webext-core/fake-browser';
import App from '../entrypoints/popup/App';
import { storageLocalLicenseKey } from '../src/lib/storage';

beforeEach(async () => {
  fakeBrowser.reset();
  // fakeBrowser.reset() resets API listeners but not storage data — clear explicitly
  await fakeBrowser.storage.local.clear();
  vi.unstubAllGlobals();
  // chrome.tabs.create is not implemented by fakeBrowser — stub it manually
  (globalThis as any).chrome = {
    ...(globalThis as any).chrome,
    tabs: { create: vi.fn() },
  };
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

async function openSettingsAndRevealKeyInput() {
  render(<App />);
  const settingsButton = await screen.findByText('Settings');
  fireEvent.click(settingsButton);
  const haveKeyLink = await screen.findByText('Have a key?');
  fireEvent.click(haveKeyLink);
  const input = await screen.findByPlaceholderText('Enter your license key');
  return input;
}

describe('SettingsScreen — key redemption flow', () => {
  it('clicking "Have a key?" reveals the input row and the link disappears', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });

    render(<App />);
    const settingsButton = await screen.findByText('Settings');
    fireEvent.click(settingsButton);

    const haveKeyLink = await screen.findByText('Have a key?');
    fireEvent.click(haveKeyLink);

    expect(await screen.findByPlaceholderText('Enter your license key')).toBeTruthy();
    expect(screen.queryByText('Have a key?')).toBeNull();
  });

  it('Activate button is disabled when input is empty or whitespace-only', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });
    const input = await openSettingsAndRevealKeyInput();

    const activateButton = screen.getByText('Activate') as HTMLButtonElement;
    expect(activateButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: '   ' } });
    expect(activateButton.disabled).toBe(true);

    fireEvent.change(input, { target: { value: 'REAL-KEY' } });
    expect(activateButton.disabled).toBe(false);
  });

  it('successful activation writes the key, flips isPremium, and collapses the input', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: true }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const input = await openSettingsAndRevealKeyInput();
    fireEvent.change(input, { target: { value: 'GOOD-KEY-123' } });
    fireEvent.click(screen.getByText('Activate'));

    await screen.findByText('PREMIUM ✓');
    expect(screen.queryByPlaceholderText('Enter your license key')).toBeNull();
    expect(await storageLocalLicenseKey.getValue()).toBe('GOOD-KEY-123');
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/validate-key'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ key: 'GOOD-KEY-123' }),
      })
    );
  });

  it('invalid key response shows the invalid-key error and keeps the input visible', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });
    const mockFetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({ valid: false }),
    });
    vi.stubGlobal('fetch', mockFetch);

    const input = await openSettingsAndRevealKeyInput();
    fireEvent.change(input, { target: { value: 'BAD-KEY' } });
    fireEvent.click(screen.getByText('Activate'));

    expect(await screen.findByText('Invalid key — please check and try again.')).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your license key')).toBeTruthy();
    expect(await storageLocalLicenseKey.getValue()).toBeNull();
  });

  it('network failure (fetch rejects with TypeError) shows the network-error copy', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });
    const mockFetch = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', mockFetch);

    const input = await openSettingsAndRevealKeyInput();
    fireEvent.change(input, { target: { value: 'SOME-KEY' } });
    fireEvent.click(screen.getByText('Activate'));

    expect(
      await screen.findByText('Activation failed — check your connection and try again.')
    ).toBeTruthy();
    expect(screen.getByPlaceholderText('Enter your license key')).toBeTruthy();
  });

  it('a hung fetch past 5 seconds times out with the network-error copy and resets keyActivating', async () => {
    await fakeBrowser.storage.local.set({ enabled: true, monthlyCount: 0, licenseKey: null, hasConsented: true });
    const mockFetch = vi.fn().mockReturnValue(new Promise(() => {})); // never resolves
    vi.stubGlobal('fetch', mockFetch);

    // Reveal the key input under real timers first — fake timers would stall
    // testing-library's findBy* polling (which itself relies on setTimeout).
    const input = await openSettingsAndRevealKeyInput();

    vi.useFakeTimers({ shouldAdvanceTime: false });
    fireEvent.change(input, { target: { value: 'SLOW-KEY' } });
    fireEvent.click(screen.getByText('Activate'));

    expect(screen.getByText('Activating…')).toBeTruthy();

    await vi.advanceTimersByTimeAsync(6000);

    expect(
      screen.getByText('Activation failed — check your connection and try again.')
    ).toBeTruthy();
    // keyActivating reset to false — button shows "Activate" again, not the loading label
    expect(screen.getByText('Activate')).toBeTruthy();
  }, 15000);
});
