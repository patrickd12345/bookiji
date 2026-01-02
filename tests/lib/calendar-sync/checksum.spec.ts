/**
 * Unit tests for calendar sync checksum helpers
 * Part of F-015: Calendar Sync Foundations
 */

import { describe, it, expect } from 'vitest';
import {
  computeExternalEventChecksum,
  validateChecksumParams,
  type EventChecksumParams,
} from '@/lib/calendar-sync/checksum';

describe('computeExternalEventChecksum', () => {
  const baseParams: EventChecksumParams = {
    external_event_id: 'event-123',
    start: new Date('2026-01-20T10:00:00Z'),
    end: new Date('2026-01-20T11:00:00Z'),
    is_busy: true,
    provider_id: 'provider-456',
    calendar_provider: 'google',
  };

  it('should produce deterministic checksums (same input = same output)', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum(baseParams);

    expect(checksum1).toBe(checksum2);
    expect(checksum1).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex string
  });

  it('should produce different checksum when external_event_id changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      external_event_id: 'event-456',
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce different checksum when start time changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      start: new Date('2026-01-20T10:30:00Z'),
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce different checksum when end time changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      end: new Date('2026-01-20T12:00:00Z'),
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce different checksum when is_busy changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      is_busy: false,
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce different checksum when provider_id changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      provider_id: 'provider-789',
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce different checksum when calendar_provider changes', () => {
    const checksum1 = computeExternalEventChecksum(baseParams);
    const checksum2 = computeExternalEventChecksum({
      ...baseParams,
      calendar_provider: 'microsoft',
    });

    expect(checksum1).not.toBe(checksum2);
  });

  it('should handle different events with same structure', () => {
    const params1: EventChecksumParams = {
      external_event_id: 'event-1',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-1',
      calendar_provider: 'google',
    };

    const params2: EventChecksumParams = {
      external_event_id: 'event-2',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-1',
      calendar_provider: 'google',
    };

    const checksum1 = computeExternalEventChecksum(params1);
    const checksum2 = computeExternalEventChecksum(params2);

    expect(checksum1).not.toBe(checksum2);
  });

  it('should produce consistent checksums across multiple calls', () => {
    const checksums = Array.from({ length: 10 }, () =>
      computeExternalEventChecksum(baseParams)
    );

    const uniqueChecksums = new Set(checksums);
    expect(uniqueChecksums.size).toBe(1);
  });

  it('should handle milliseconds precision in dates', () => {
    const params1: EventChecksumParams = {
      ...baseParams,
      start: new Date('2026-01-20T10:00:00.000Z'),
      end: new Date('2026-01-20T11:00:00.000Z'),
    };

    const params2: EventChecksumParams = {
      ...baseParams,
      start: new Date('2026-01-20T10:00:00.123Z'),
      end: new Date('2026-01-20T11:00:00.456Z'),
    };

    const checksum1 = computeExternalEventChecksum(params1);
    const checksum2 = computeExternalEventChecksum(params2);

    // Different millisecond precision should produce different checksums
    expect(checksum1).not.toBe(checksum2);
  });
});

describe('validateChecksumParams', () => {
  const validParams: EventChecksumParams = {
    external_event_id: 'event-123',
    start: new Date('2026-01-20T10:00:00Z'),
    end: new Date('2026-01-20T11:00:00Z'),
    is_busy: true,
    provider_id: 'provider-456',
    calendar_provider: 'google',
  };

  it('should validate correct parameters', () => {
    const result = validateChecksumParams(validParams);

    expect(result.valid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject missing external_event_id', () => {
    const result = validateChecksumParams({
      ...validParams,
      external_event_id: '',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('external_event_id');
  });

  it('should reject invalid start date', () => {
    const result = validateChecksumParams({
      ...validParams,
      start: new Date('invalid'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('start');
  });

  it('should reject invalid end date', () => {
    const result = validateChecksumParams({
      ...validParams,
      end: new Date('invalid'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('end');
  });

  it('should reject end time before start time', () => {
    const result = validateChecksumParams({
      ...validParams,
      start: new Date('2026-01-20T11:00:00Z'),
      end: new Date('2026-01-20T10:00:00Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('end time must be after start time');
  });

  it('should reject end time equal to start time', () => {
    const result = validateChecksumParams({
      ...validParams,
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T10:00:00Z'),
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('end time must be after start time');
  });

  it('should reject non-boolean is_busy', () => {
    const result = validateChecksumParams({
      ...validParams,
      is_busy: 'true' as unknown as boolean,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('is_busy');
  });

  it('should reject missing provider_id', () => {
    const result = validateChecksumParams({
      ...validParams,
      provider_id: '',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('provider_id');
  });

  it('should reject missing calendar_provider', () => {
    const result = validateChecksumParams({
      ...validParams,
      calendar_provider: '',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('calendar_provider');
  });

  it('should reject invalid calendar_provider', () => {
    const result = validateChecksumParams({
      ...validParams,
      calendar_provider: 'invalid',
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('must be one of');
  });

  it('should accept microsoft as calendar_provider', () => {
    const result = validateChecksumParams({
      ...validParams,
      calendar_provider: 'microsoft',
    });

    expect(result.valid).toBe(true);
  });

  it('should reject non-Date start', () => {
    const result = validateChecksumParams({
      ...validParams,
      start: '2026-01-20T10:00:00Z' as unknown as Date,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('start');
  });

  it('should reject non-Date end', () => {
    const result = validateChecksumParams({
      ...validParams,
      end: '2026-01-20T11:00:00Z' as unknown as Date,
    });

    expect(result.valid).toBe(false);
    expect(result.error).toContain('end');
  });
});
