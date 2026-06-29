import { describe, it, expect } from 'vitest';
import { applyTemplate } from '../src/lib/renameEngine';

describe('applyTemplate', () => {
  it('fills all three slots: tag, date, index', () => {
    const result = applyTemplate('{tag}-{date}-{index}', 'invoice', 3);
    expect(result).toMatch(/^invoice-\d{4}-\d{2}-\d{2}-3$/);
  });

  it('fills tag and index when no date slot', () => {
    expect(applyTemplate('{tag}-{index}', 'receipt', 0)).toBe('receipt-0');
  });

  it('fills only tag slot', () => {
    expect(applyTemplate('{tag}', 'screenshot', 1)).toBe('screenshot');
  });

  it('fills tag and date slots', () => {
    const result = applyTemplate('{tag}-{date}', 'report', 5);
    expect(result).toMatch(/^report-\d{4}-\d{2}-\d{2}$/);
  });

  it('returns literal string when no slots present', () => {
    expect(applyTemplate('fixed-name', 'any-tag', 0)).toBe('fixed-name');
  });

  it('date slot produces exactly 10-character ISO date', () => {
    const result = applyTemplate('{date}', 'x', 0);
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(result).toHaveLength(10);
  });

  it('does not append file extension (caller responsibility)', () => {
    expect(applyTemplate('{tag}', 'x', 0)).toBe('x');
  });
});
