import { describe, it, expect } from 'vitest';
import { mergeIntervals } from '@/lib/calendar-sync/merge';
import type { TimeInterval } from '@/lib/calendar-sync/normalize';

describe('mergeIntervals', () => {
  it('merges two overlapping intervals', () => {
    const intervals: TimeInterval[] = [
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') },
      { start: new Date('2026-01-20T11:00:00Z'), end: new Date('2026-01-20T13:00:00Z') },
    ];

    const result = mergeIntervals(intervals);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T13:00:00.000Z');
  });

  it('merges touching intervals (end == start)', () => {
    const intervals: TimeInterval[] = [
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') },
      { start: new Date('2026-01-20T12:00:00Z'), end: new Date('2026-01-20T13:00:00Z') },
    ];

    const result = mergeIntervals(intervals);
    expect(result).toHaveLength(1);
    expect(result[0].start.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    expect(result[0].end.toISOString()).toBe('2026-01-20T13:00:00.000Z');
  });

  it('preserves non-overlapping intervals', () => {
    const intervals: TimeInterval[] = [
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
      { start: new Date('2026-01-20T12:00:00Z'), end: new Date('2026-01-20T13:00:00Z') },
    ];

    const result = mergeIntervals(intervals);
    expect(result).toHaveLength(2);
    expect(result[0].start.toISOString()).toBe('2026-01-20T10:00:00.000Z');
    expect(result[1].start.toISOString()).toBe('2026-01-20T12:00:00.000Z');
  });

  it('is idempotent', () => {
    const intervals: TimeInterval[] = [
      { start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
      { start: new Date('2026-01-20T10:30:00Z'), end: new Date('2026-01-20T12:00:00Z') },
    ];

    const once = mergeIntervals(intervals);
    const twice = mergeIntervals(once);
    expect(JSON.stringify(once)).toBe(JSON.stringify(twice));
  });

  it('does not mutate input', () => {
    const intervals: TimeInterval[] = [
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T12:00:00Z') },
      { start: new Date('2026-01-20T11:00:00Z'), end: new Date('2026-01-20T13:00:00Z') },
    ];
    const original0Start = intervals[0].start.getTime();
    mergeIntervals(intervals);
    expect(intervals[0].start.getTime()).toBe(original0Start);
  });

  it('returns empty array for empty input', () => {
    const result = mergeIntervals([]);
    expect(result).toEqual([]);
  });
});

