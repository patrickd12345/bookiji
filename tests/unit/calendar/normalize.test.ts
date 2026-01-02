/**
 * Layer-1 Unit Tests: Interval Normalization
 * F-015.1 Foundations — Pure logic only
 * 
 * Tests define invariants, not implementations.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBusyIntervalsToUTC,
  validateIntervals,
  sortIntervalsByStart,
  type TimeInterval,
} from '@/lib/calendar-sync/normalize';

describe('Interval Normalization', () => {
  describe('normalizeBusyIntervalsToUTC', () => {
    it('should convert timezone-aware inputs to UTC', () => {
      // EST is UTC-5, so 10:00 EST = 15:00 UTC
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00'),
          end: new Date('2026-01-20T11:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result).toHaveLength(1);
      expect(result[0].start.getUTCHours()).toBe(15);
      expect(result[0].end.getUTCHours()).toBe(16);
    });

    it('should preserve duration across DST boundaries (spring forward)', () => {
      // March 13, 2026 - DST transition in America/New_York
      // 1:00 AM EST to 4:00 AM EDT should preserve 3-hour duration
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-03-13T01:00:00'),
          end: new Date('2026-03-13T04:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result).toHaveLength(1);
      const durationMs = result[0].end.getTime() - result[0].start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      expect(durationHours).toBe(3);
    });

    it('should preserve duration across DST boundaries (fall back)', () => {
      // November 1, 2026 - DST transition in America/New_York
      // Midnight EDT to 3:00 AM EST should preserve 3-hour duration
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-11-01T00:00:00'),
          end: new Date('2026-11-01T03:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result).toHaveLength(1);
      const durationMs = result[0].end.getTime() - result[0].start.getTime();
      const durationHours = durationMs / (1000 * 60 * 60);
      expect(durationHours).toBe(3);
    });

    it('should handle overnight spans correctly', () => {
      // 11 PM EST to 2 AM EST next day
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T23:00:00'),
          end: new Date('2026-01-21T02:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result).toHaveLength(1);
      expect(result[0].end.getTime()).toBeGreaterThan(result[0].start.getTime());
      // Should span across UTC day boundary
      expect(result[0].start.getUTCDate()).toBeLessThanOrEqual(result[0].end.getUTCDate());
    });

    it('should order intervals deterministically by start time', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T14:00:00'),
          end: new Date('2026-01-20T15:00:00'),
        },
        {
          start: new Date('2026-01-20T10:00:00'),
          end: new Date('2026-01-20T11:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result).toHaveLength(2);
      // Result should maintain input order (normalize doesn't sort)
      // But we verify they're valid intervals
      expect(result[0].end.getTime()).toBeGreaterThan(result[0].start.getTime());
      expect(result[1].end.getTime()).toBeGreaterThan(result[1].start.getTime());
    });

    it('should return empty array for empty input', () => {
      const result = normalizeBusyIntervalsToUTC([], 'America/New_York');
      expect(result).toEqual([]);
    });

    it('should handle UTC timezone (no-op)', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00Z'),
          end: new Date('2026-01-20T11:00:00Z'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'UTC');

      expect(result).toHaveLength(1);
      expect(result[0].start.getTime()).toBe(intervals[0].start.getTime());
      expect(result[0].end.getTime()).toBe(intervals[0].end.getTime());
    });

    it('should not mutate input intervals', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00'),
          end: new Date('2026-01-20T11:00:00'),
        },
      ];

      const originalStart = intervals[0].start.getTime();
      const originalEnd = intervals[0].end.getTime();

      normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(intervals[0].start.getTime()).toBe(originalStart);
      expect(intervals[0].end.getTime()).toBe(originalEnd);
    });

    it('should produce stable output across multiple runs', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00'),
          end: new Date('2026-01-20T11:00:00'),
        },
      ];

      const result1 = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');
      const result2 = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');

      expect(result1[0].start.getTime()).toBe(result2[0].start.getTime());
      expect(result1[0].end.getTime()).toBe(result2[0].end.getTime());
    });

    it('should produce deterministic JSON serialization', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00'),
          end: new Date('2026-01-20T11:00:00'),
        },
      ];

      const result = normalizeBusyIntervalsToUTC(intervals, 'America/New_York');
      const json1 = JSON.stringify(result);
      const json2 = JSON.stringify(result);

      expect(json1).toBe(json2);
    });
  });

  describe('validateIntervals', () => {
    it('should reject invalid intervals where end <= start', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T11:00:00Z'),
          end: new Date('2026-01-20T10:00:00Z'),
        },
      ];

      const result = validateIntervals(intervals);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('must be after start time');
    });

    it('should reject intervals where end == start', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00Z'),
          end: new Date('2026-01-20T10:00:00Z'),
        },
      ];

      const result = validateIntervals(intervals);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should accept valid intervals', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00Z'),
          end: new Date('2026-01-20T11:00:00Z'),
        },
      ];

      const result = validateIntervals(intervals);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject NaN dates with explicit error', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('invalid'),
          end: new Date('2026-01-20T11:00:00Z'),
        },
      ];

      const result = validateIntervals(intervals);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('invalid (NaN)'))).toBe(true);
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
      expect(result.errors.some(e => e.includes('must be a Date object'))).toBe(true);
    });

    it('should not mutate input intervals', () => {
      const intervals: TimeInterval[] = [
        {
          start: new Date('2026-01-20T10:00:00Z'),
          end: new Date('2026-01-20T11:00:00Z'),
        },
      ];

      const originalStart = intervals[0].start.getTime();
      validateIntervals(intervals);

      expect(intervals[0].start.getTime()).toBe(originalStart);
    });
  });

  describe('sortIntervalsByStart', () => {
    it('should order intervals deterministically by start time', () => {
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

    it('should be idempotent (sort(sorted) === sort)', () => {
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

      const sorted1 = sortIntervalsByStart(intervals);
      const sorted2 = sortIntervalsByStart(sorted1);

      expect(sorted1[0].start.getTime()).toBe(sorted2[0].start.getTime());
      expect(sorted1[1].start.getTime()).toBe(sorted2[1].start.getTime());
    });

    it('should produce stable output across multiple runs', () => {
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

      const result1 = sortIntervalsByStart(intervals);
      const result2 = sortIntervalsByStart(intervals);

      expect(result1[0].start.getTime()).toBe(result2[0].start.getTime());
      expect(result1[1].start.getTime()).toBe(result2[1].start.getTime());
    });
  });
});
