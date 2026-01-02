/**
 * Layer-1 Unit Tests: Checksum Determinism
 * F-015.1 Foundations — Pure logic only
 * 
 * Tests define invariants, not implementations.
 */

import { describe, it, expect } from 'vitest';
import {
  computeExternalEventChecksum,
  validateChecksumParams,
  type EventChecksumParams,
} from '@/lib/calendar-sync/checksum';

describe('Checksum Determinism', () => {
  const baseParams: EventChecksumParams = {
    external_event_id: 'event-123',
    start: new Date('2026-01-20T10:00:00Z'),
    end: new Date('2026-01-20T11:00:00Z'),
    is_busy: true,
    provider_id: 'provider-456',
    calendar_provider: 'google',
  };

  describe('computeExternalEventChecksum', () => {
    it('should produce same checksum for same semantic intervals', () => {
      const params1: EventChecksumParams = {
        ...baseParams,
        start: new Date('2026-01-20T10:00:00.000Z'),
        end: new Date('2026-01-20T11:00:00.000Z'),
      };

      const params2: EventChecksumParams = {
        ...baseParams,
        start: new Date('2026-01-20T10:00:00.000Z'),
        end: new Date('2026-01-20T11:00:00.000Z'),
      };

      const checksum1 = computeExternalEventChecksum(params1);
      const checksum2 = computeExternalEventChecksum(params2);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksum when any boundary changes', () => {
      const checksum1 = computeExternalEventChecksum(baseParams);
      const checksum2 = computeExternalEventChecksum({
        ...baseParams,
        start: new Date('2026-01-20T10:01:00Z'), // 1 minute later
      });

      expect(checksum1).not.toBe(checksum2);
    });

    it('should produce same checksum for same times in different timezones after normalization', () => {
      // Same wall-clock time in different timezones should normalize to same UTC
      // and produce same checksum
      const params1: EventChecksumParams = {
        ...baseParams,
        start: new Date('2026-01-20T10:00:00Z'), // UTC
        end: new Date('2026-01-20T11:00:00Z'),
      };

      // If we had a helper that normalizes timezone-aware dates to UTC before checksum,
      // these would produce the same checksum. For now, we test that same UTC times
      // produce same checksum.
      const params2: EventChecksumParams = {
        ...baseParams,
        start: new Date('2026-01-20T10:00:00Z'), // Same UTC time
        end: new Date('2026-01-20T11:00:00Z'),
      };

      const checksum1 = computeExternalEventChecksum(params1);
      const checksum2 = computeExternalEventChecksum(params2);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce deterministic output across multiple calls', () => {
      const checksums = Array.from({ length: 10 }, () =>
        computeExternalEventChecksum(baseParams)
      );

      const uniqueChecksums = new Set(checksums);
      expect(uniqueChecksums.size).toBe(1);
    });

    it('should produce valid SHA-256 hex string format', () => {
      const checksum = computeExternalEventChecksum(baseParams);
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should not mutate input parameters', () => {
      const params: EventChecksumParams = {
        ...baseParams,
      };

      const originalStart = params.start.getTime();
      const originalEnd = params.end.getTime();

      computeExternalEventChecksum(params);

      expect(params.start.getTime()).toBe(originalStart);
      expect(params.end.getTime()).toBe(originalEnd);
    });

    it('should produce stable JSON serialization', () => {
      const checksum1 = computeExternalEventChecksum(baseParams);
      const checksum2 = computeExternalEventChecksum(baseParams);

      expect(JSON.stringify(checksum1)).toBe(JSON.stringify(checksum2));
    });
  });

  describe('validateChecksumParams', () => {
    it('should validate correct parameters', () => {
      const result = validateChecksumParams(baseParams);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject invalid start date', () => {
      const result = validateChecksumParams({
        ...baseParams,
        start: new Date('invalid'),
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('start');
    });

    it('should reject invalid end date', () => {
      const result = validateChecksumParams({
        ...baseParams,
        end: new Date('invalid'),
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('end');
    });

    it('should reject end time before start time', () => {
      const result = validateChecksumParams({
        ...baseParams,
        start: new Date('2026-01-20T11:00:00Z'),
        end: new Date('2026-01-20T10:00:00Z'),
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('end time must be after start time');
    });

    it('should not mutate input parameters', () => {
      const params: EventChecksumParams = {
        ...baseParams,
      };

      const originalStart = params.start.getTime();
      validateChecksumParams(params);

      expect(params.start.getTime()).toBe(originalStart);
    });
  });
});

/**
 * NOTE: Missing Layer-1 helpers that must be implemented before tests can be written:
 * 
 * 1. computeIntervalSetChecksum(intervals: TimeInterval[]): string
 *    - Computes deterministic checksum for a set of intervals
 *    - Must be order-independent (same intervals in different order = same checksum)
 *    - Must normalize intervals to UTC before checksumming
 *    - Must handle empty sets
 * 
 * 2. mergeIntervals(intervals: TimeInterval[]): TimeInterval[]
 *    - Merges overlapping intervals deterministically
 *    - Defines behavior for "touching" intervals (end == start)
 *    - Preserves gaps
 *    - Is idempotent (merge(merge(x)) === merge(x))
 *    - Does not mutate input
 * 
 * 3. subtractIntervals(base: TimeInterval, busy: TimeInterval[]): TimeInterval[]
 *    - Subtracts busy intervals from a base interval
 *    - Handles inside, edge, outside, and full-cover cases
 *    - Produces deterministic ordering
 *    - Produces empty set when fully covered
 *    - Does not mutate input
 */
