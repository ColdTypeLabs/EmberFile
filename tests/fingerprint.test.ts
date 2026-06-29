import { describe, it, expect } from 'vitest';
import { computeFingerprint } from '../src/lib/fingerprint';

describe('computeFingerprint', () => {
  it('strips month name and ISO date from invoice filename', () => {
    expect(computeFingerprint('invoice-jan-2024.pdf')).toBe('invoice.pdf');
  });

  it('strips ISO date from report filename', () => {
    expect(computeFingerprint('report-2024-01-31.pdf')).toBe('report.pdf');
  });

  it('strips UUID/hex hash from screenshot filename', () => {
    expect(computeFingerprint('screenshot-abc1234567890.png')).toBe('screenshot.png');
  });

  it('numeric suffix stripped — file-001.pdf and file.pdf produce the same key', () => {
    expect(computeFingerprint('file-001.pdf')).toBe(computeFingerprint('file.pdf'));
  });

  it('strips underscore-separated date from receipt filename', () => {
    expect(computeFingerprint('receipt_2024_03_15.pdf')).toBe('receipt.pdf');
  });

  it('strips version number from document', () => {
    expect(computeFingerprint('document v3.docx')).toBe('document.docx');
  });

  it('returns only ext when stem is all-date tokens (IMG_ prefix)', () => {
    // IMG_20240101_123456 — IMG survives but numbers stripped
    expect(computeFingerprint('IMG_20240101_123456.jpg')).toBe('img.jpg');
  });

  it('returns stem only when no extension present', () => {
    expect(computeFingerprint('noextension')).toBe('noextension');
  });

  it('returns ext only (no leading dot) when stem is fully stripped', () => {
    expect(computeFingerprint('2024-01-01.pdf')).toBe('pdf');
  });
});
