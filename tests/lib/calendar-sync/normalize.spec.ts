/**
 * Unit tests for calendar sync normalization helpers
 * Part of F-015: Calendar Sync Foundations
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBusyIntervalsToUTC,
  validateIntervals,
  sortIntervalsByStart,
  type TimeInterval,
} from '@/lib/calendar-sync/normalize';

describe('normalizeBusyIntervalsToUTC', () => {
  it('should normalize intervals from America/New_York to UTC', () => {
    // January 20, 2026, 10:00 AM EST (UTC-5) = 3:00 PM UTC
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T10:00:00'),
        end: new Date('2026-01-20T11:00:00'),
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

    expect(result).toHaveLength(1);
    // EST is UTC-5, so 10:00 EST = 15:00 UTC
    expect(result[0].start.getUTCHours()).toBe(15);
    expect(result[0].end.getUTCHours()).toBe(16);
  });

  it('should normalize intervals from Europe/London to UTC', () => {
    // January 20, 2026, 2:00 PM GMT (UTC+0) = 2:00 PM UTC
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T14:00:00'),
        end: new Date('2026-01-20T15:00:00'),
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'Europe/London');

    expect(result).toHaveLength(1);
    // GMT is UTC+0, so times should be the same
    expect(result[0].start.getUTCHours()).toBe(14);
    expect(result[0].end.getUTCHours()).toBe(15);
  });

  it('should handle DST boundary (spring forward)', () => {
    // March 13, 2026 - DST transition in America/New_York
    // 2:00 AM EST becomes 3:00 AM EDT (skips 2:00-3:00 AM)
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-03-13T01:00:00'), // 1 AM EST
        end: new Date('2026-03-13T04:00:00'), // 4 AM EDT
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

    expect(result).toHaveLength(1);
    // Should handle DST transition correctly
    expect(result[0].start).toBeInstanceOf(Date);
    expect(result[0].end).toBeInstanceOf(Date);
    expect(result[0].end.getTime()).toBeGreaterThan(result[0].start.getTime());
  });

  it('should handle DST boundary (fall back)', () => {
    // November 1, 2026 - DST transition in America/New_York
    // 2:00 AM EDT becomes 1:00 AM EST (repeats 1:00-2:00 AM)
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-11-01T00:00:00'), // Midnight EDT
        end: new Date('2026-11-01T03:00:00'), // 3 AM EST
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

    expect(result).toHaveLength(1);
    // Should handle DST transition correctly
    expect(result[0].start).toBeInstanceOf(Date);
    expect(result[0].end).toBeInstanceOf(Date);
    expect(result[0].end.getTime()).toBeGreaterThan(result[0].start.getTime());
  });

  it('should handle multiple intervals', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T10:00:00'),
        end: new Date('2026-01-20T11:00:00'),
      },
      {
        start: new Date('2026-01-20T14:00:00'),
        end: new Date('2026-01-20T15:00:00'),
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

    expect(result).toHaveLength(2);
    expect(result[0].start).toBeInstanceOf(Date);
    expect(result[1].start).toBeInstanceOf(Date);
  });

  it('should return empty array for empty input', () => {
    const result = normalizeBusyIntervalsToUTC([], 'America/New_York');
    expect(result).toEqual([]);
  });

  it('should handle Pacific timezone', () => {
    // January 20, 2026, 9:00 AM PST (UTC-8) = 5:00 PM UTC
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T09:00:00'),
        end: new Date('2026-01-20T10:00:00'),
      },
    ];

    const result = normalizeBusyIntervalsToUTC(intervals, 'America/Los_Angeles');

    expect(result).toHaveLength(1);
    // PST is UTC-8, so 9:00 PST = 17:00 UTC
    expect(result[0].start.getUTCHours()).toBe(17);
    expect(result[0].end.getUTCHours()).toBe(18);
  });
});

describe('validateIntervals', () => {
  it('should validate correct intervals', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      },
      {
        start: new Date('2026-01-20T14:00:00Z'),
        end: new Date('2026-01-20T15:00:00Z'),
      },
    ];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should reject intervals where end <= start', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T11:00:00Z'),
        end: new Date('2026-01-20T10:00:00Z'), // End before start
      },
    ];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('must be after start time');
  });

  it('should reject intervals with equal start and end', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T10:00:00Z'), // Same time
      },
    ];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject NaN dates', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('invalid'),
        end: new Date('2026-01-20T11:00:00Z'),
      },
    ];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('invalid (NaN)');
  });

  it('should reject non-Date objects', () => {
    const intervals = [
      {
        start: '2026-01-20T10:00:00Z',
        end: new Date('2026-01-20T11:00:00Z'),
      },
    ] as unknown as TimeInterval[];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('must be a Date object');
  });

  it('should reject null/undefined intervals', () => {
    const intervals = [null, undefined] as unknown as TimeInterval[];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should reject non-array input', () => {
    const result = validateIntervals(null as unknown as TimeInterval[]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Intervals must be an array');
  });

  it('should provide specific error messages for each invalid interval', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      },
      {
        start: new Date('2026-01-20T14:00:00Z'),
        end: new Date('2026-01-20T13:00:00Z'), // Invalid: end before start
      },
      {
        start: new Date('invalid'),
        end: new Date('2026-01-20T15:00:00Z'), // Invalid: NaN start
      },
    ];

    const result = validateIntervals(intervals);

    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe('sortIntervalsByStart', () => {
  it('should sort intervals by start time ascending', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T14:00:00Z'),
        end: new Date('2026-01-20T15:00:00Z'),
      },
      {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      },
      {
        start: new Date('2026-01-20T12:00:00Z'),
        end: new Date('2026-01-20T13:00:00Z'),
      },
    ];

    const result = sortIntervalsByStart(intervals);

    expect(result).toHaveLength(3);
    expect(result[0].start.getTime()).toBeLessThan(result[1].start.getTime());
    expect(result[1].start.getTime()).toBeLessThan(result[2].start.getTime());
    expect(result[0].start.getTime()).toBe(
      new Date('2026-01-20T10:00:00Z').getTime()
    );
  });

  it('should not mutate original array', () => {
    const intervals: TimeInterval[] = [
      {
        start: new Date('2026-01-20T14:00:00Z'),
        end: new Date('2026-01-20T15:00:00Z'),
      },
      {
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
      },
    ];

    const original = intervals[0].start.getTime();
    sortIntervalsByStart(intervals);

    expect(intervals[0].start.getTime()).toBe(original);
  });
});
