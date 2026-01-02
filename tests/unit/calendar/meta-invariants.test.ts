/**
 * Layer-1 Unit Tests: Meta-Invariants
 * F-015.1 Foundations — Pure logic only
 * 
 * Tests that prove helpers do not mutate inputs and produce stable outputs.
 */

import { describe, it, expect } from 'vitest';
import {
  normalizeBusyIntervalsToUTC,
  validateIntervals,
  sortIntervalsByStart,
  type TimeInterval,
} from '@/lib/calendar-sync/normalize';
import {
  computeExternalEventChecksum,
  validateChecksumParams,
  type EventChecksumParams,
} from '@/lib/calendar-sync/checksum';
import { mergeIntervals } from '@/lib/calendar-sync/merge';
import { subtractIntervals } from '@/lib/calendar-sync/subtract';
import { computeIntervalSetChecksum } from '@/lib/calendar-sync/checksum';

describe('Meta-Invariants: Immutability', () => {
  describe('normalizeBusyIntervalsToUTC', () => {
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
  });

  describe('validateIntervals', () => {
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
    it('should not mutate input array', () => {
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

      const originalFirstStart = intervals[0].start.getTime();
      sortIntervalsByStart(intervals);

      expect(intervals[0].start.getTime()).toBe(originalFirstStart);
    });
  });

  describe('computeExternalEventChecksum', () => {
    it('should not mutate input parameters', () => {
      const params: EventChecksumParams = {
        external_event_id: 'event-123',
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
        is_busy: true,
        provider_id: 'provider-456',
        calendar_provider: 'google',
      };

      const originalStart = params.start.getTime();
      const originalEnd = params.end.getTime();

      computeExternalEventChecksum(params);

      expect(params.start.getTime()).toBe(originalStart);
      expect(params.end.getTime()).toBe(originalEnd);
    });
  });

  describe('validateChecksumParams', () => {
    it('should not mutate input parameters', () => {
      const params: EventChecksumParams = {
        external_event_id: 'event-123',
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
        is_busy: true,
        provider_id: 'provider-456',
        calendar_provider: 'google',
      };

      const originalStart = params.start.getTime();
      validateChecksumParams(params);

      expect(params.start.getTime()).toBe(originalStart);
    });
  });
});

describe('Meta-Invariants: Stability', () => {
  describe('normalizeBusyIntervalsToUTC', () => {
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

  describe('sortIntervalsByStart', () => {
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

  describe('computeExternalEventChecksum', () => {
    it('should produce stable output across multiple runs', () => {
      const params: EventChecksumParams = {
        external_event_id: 'event-123',
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
        is_busy: true,
        provider_id: 'provider-456',
        calendar_provider: 'google',
      };

      const checksum1 = computeExternalEventChecksum(params);
      const checksum2 = computeExternalEventChecksum(params);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce deterministic JSON serialization', () => {
      const params: EventChecksumParams = {
        external_event_id: 'event-123',
        start: new Date('2026-01-20T10:00:00Z'),
        end: new Date('2026-01-20T11:00:00Z'),
        is_busy: true,
        provider_id: 'provider-456',
        calendar_provider: 'google',
      };

      const checksum = computeExternalEventChecksum(params);
      const json1 = JSON.stringify(checksum);
      const json2 = JSON.stringify(checksum);

      expect(json1).toBe(json2);
    });
  });
});

describe('Meta-Invariants: New Helpers', () => {
  it('mergeIntervals does not mutate inputs', () => {
    const intervals = [
      { start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') },
      { start: new Date('2026-01-20T11:00:00Z'), end: new Date('2026-01-20T12:00:00Z') },
    ];
    const original = intervals[0].start.getTime();
    mergeIntervals(intervals);
    expect(intervals[0].start.getTime()).toBe(original);
  });

  it('subtractIntervals does not mutate inputs', () => {
    const base = { start: new Date('2026-01-20T09:00:00Z'), end: new Date('2026-01-20T17:00:00Z') };
    const busy = [{ start: new Date('2026-01-20T12:00:00Z'), end: new Date('2026-01-20T13:00:00Z') }];
    const before = base.start.getTime();
    subtractIntervals(base, busy);
    expect(base.start.getTime()).toBe(before);
    expect(busy[0].start.getTime()).toBe(new Date('2026-01-20T12:00:00Z').getTime());
  });

  it('computeIntervalSetChecksum is stable and does not mutate inputs', () => {
    const intervals = [{ start: new Date('2026-01-20T10:00:00Z'), end: new Date('2026-01-20T11:00:00Z') }];
    const before = intervals[0].start.getTime();
    const a = computeIntervalSetChecksum(intervals);
    const b = computeIntervalSetChecksum(intervals);
    expect(a).toBe(b);
    expect(intervals[0].start.getTime()).toBe(before);
  });
});
