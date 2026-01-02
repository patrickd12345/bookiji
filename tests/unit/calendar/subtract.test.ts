import { describe, it, expect } from 'vitest';
import { subtractIntervals } from '@/lib/calendar-sync/subtract';
import { mergeIntervals } from '@/lib/calendar-sync/merge';
import type { TimeInterval } from '@/lib/calendar-sync/normalize';

describe('subtractIntervals', () => {
  it('subtracts a busy interval in the middle', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T17:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T12:00:00Z'), end: new Date('2026-01-20T13:00:00Z') }];

    const result = subtractIntervals(base, busy);
    expect(result).toHaveLength(2);
    expect(result[0].start.toISOString()).toBe('2026-01-20T09:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T12:00:00.000Z');
    expect(result[1].start.toISOString()).toBe('2026-01-20T13:00:00.000Z');
    expect(result[1].end.toISOString()).toBe('2026-01-20T17:00:00.000Z');
  });

  it('returns empty when busy fully covers base', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T13:00:00Z') }];
    const result = subtractIntervals(base, busy);
    expect(result).toHaveLength(0);
  });

  it('handles edge overlaps (start)', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') }];
    const result = subtractIntervals(base, busy);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-01-20T11:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T12:00:00.000Z');
  });

  it('handles edge overlaps (end)', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T11:00:00Z'), end: new Date('2026-01-20T12:00:00Z') }];
    const result = subtractIntervals(base, busy);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T11:00:00.000Z');
  });

  it('ignores busy intervals outside the base', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T08:00:00Z'), end: new Date('2026-01-20T09:00:00Z') }];
    const result = subtractIntervals(base, busy);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T12:00:00.000Z');
  });

  it('handles multiple overlapping busy intervals', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T08:00:00Z'), end: new Date('2026-01-20T18:00:00Z') };
    const busy: TimeInterval[] = [
      { start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T10:30:00Z') },
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
      { start: new Date('2026-01-20T13:00:00Z'), end: new Date('2026-01-20T14:00:00Z') },
    ];
    // Ensure busy intervals will be merged internally
    const mergedBusy = mergeIntervals(busy);
    expect(mergedBusy.length).toBeGreaterThan(0);

    const result = subtractIntervals(base, busy);
    // Expect gaps where busy intervals were
    expect(result.some(r => r.start.getTime() === new Date('2026-01-20T08:00:00Z').getTime())).toBe(true);
    expect(result.some(r => r.start.getTime() === new Date('2026-01-20T11:00:00Z').getTime())).toBe(true);
    expect(result.some(r => r.start.getTime() === new Date('2026-01-20T14:00:00Z').getTime())).toBe(true);
  });

  it('does not mutate inputs', () => {
    const base: TimeInterval = { start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T17:00:00Z') };
    const busy: TimeInterval[] = [{ start: new Date('2026-01-20T12:00:00Z'), end: new Date('2026-01-20T13:00:00Z') }];
    const originalBaseStart = base.start.getTime();
    subtractIntervals(base, busy);
    expect(base.start.getTime()).toBe(originalBaseStart);
    expect(busy[0].start.getTime()).toBe(new Date('2026-01-20T12:00:00Z').getTime());
  });
});

