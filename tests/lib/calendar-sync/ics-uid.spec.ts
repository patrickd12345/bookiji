import { describe, it, expect } from 'vitest';
import { generateIcsUid, generateIcsUidSuffix } from '@/lib/calendar-sync/ics-uid';

describe('generateIcsUid', () => {
  it('is deterministic for same inputs', () => {
    const a = generateIcsUid('b1', 'p1', 'google');
    const b = generateIcsUid('b1', 'p1', 'google');
    expect(a).toBe(b);
  });

  it('produces different UIDs for different bookings or providers', () => {
    const a = generateIcsUid('b1', 'p1', 'google');
    const b = generateIcsUid('b2', 'p1', 'google');
    const c = generateIcsUid('b1', 'p2', 'google');
    const d = generateIcsUid('b1', 'p1', 'microsoft');
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(d);
  });

  it('allows deterministic suffix for collision handling', () => {
    const suf1 = generateIcsUidSuffix('b1', 'p1', 'google');
    const suf2 = generateIcsUidSuffix('b1', 'p1', 'google');
    expect(suf1).toBe(suf2);
    expect(suf1.length).toBeGreaterThan(0);
  });
});

