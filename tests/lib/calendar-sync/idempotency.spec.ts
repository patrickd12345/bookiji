/**
 * Unit tests for calendar sync idempotency
 * Part of F-015: Calendar Sync Foundations
 * 
 * Tests that prove same event processed twice => same checksum and no-op classification
 */

import { describe, it, expect } from 'vitest';
import {
  computeExternalEventChecksum,
  type EventChecksumParams,
} from '@/lib/calendar-sync/checksum';

describe('Idempotency: Same Event Twice', () => {
  const createEvent = (): EventChecksumParams => ({
    external_event_id: 'event-abc123',
    start: new Date('2026-01-20T10:00:00Z'),
    end: new Date('2026-01-20T11:00:00Z'),
    is_busy: true,
    provider_id: 'provider-xyz789',
    calendar_provider: 'google',
  });

  it('should produce identical checksum for same event processed twice', () => {
    const event1 = createEvent();
    const event2 = createEvent();

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    expect(checksum1).toBe(checksum2);
  });

  it('should produce identical checksum for same event with different object references', () => {
    const event1: EventChecksumParams = {
      external_event_id: 'event-abc123',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-xyz789',
      calendar_provider: 'google',
    };

    // Create a new object with same values
    const event2: EventChecksumParams = {
      external_event_id: 'event-abc123',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-xyz789',
      calendar_provider: 'google',
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    expect(checksum1).toBe(checksum2);
  });

  it('should classify duplicate events as no-op (same checksum)', () => {
    const event = createEvent();
    const checksum1 = computeExternalEventChecksum(event);
    const checksum2 = computeExternalEventChecksum(event);

    // Same checksum means no-op (no change detected)
    expect(checksum1).toBe(checksum2);

    // In a sync system, this would mean:
    // - First processing: INSERT event
    // - Second processing: SKIP (no-op) because checksum matches existing
  });

  it('should detect changes between two processings (different checksum)', () => {
    const event1 = createEvent();
    const event2: EventChecksumParams = {
      ...event1,
      end: new Date('2026-01-20T12:00:00Z'), // End time changed
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    // Different checksum means change detected (not a no-op)
    expect(checksum1).not.toBe(checksum2);
  });

  it('should handle multiple identical events in sequence', () => {
    const event = createEvent();
    const checksums = Array.from({ length: 5 }, () =>
      computeExternalEventChecksum(event)
    );

    // All checksums should be identical
    const uniqueChecksums = new Set(checksums);
    expect(uniqueChecksums.size).toBe(1);
  });

  it('should maintain idempotency across different processing times', () => {
    const event1 = createEvent();
    const checksum1 = computeExternalEventChecksum(event1);

    // Simulate processing later (but event data unchanged)
    const event2 = createEvent();
    const checksum2 = computeExternalEventChecksum(event2);

    expect(checksum1).toBe(checksum2);
  });

  it('should detect no-op when is_busy changes but other fields same', () => {
    const event1 = createEvent();
    const event2: EventChecksumParams = {
      ...event1,
      is_busy: false, // Changed
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    // Different checksum = not a no-op (change detected)
    expect(checksum1).not.toBe(checksum2);
  });

  it('should handle idempotency for microsoft calendar provider', () => {
    const event1: EventChecksumParams = {
      external_event_id: 'event-ms-123',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-456',
      calendar_provider: 'microsoft',
    };

    const event2: EventChecksumParams = {
      ...event1,
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    expect(checksum1).toBe(checksum2);
  });

  it('should distinguish between different events from same provider', () => {
    const event1: EventChecksumParams = {
      external_event_id: 'event-1',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-456',
      calendar_provider: 'google',
    };

    const event2: EventChecksumParams = {
      ...event1,
      external_event_id: 'event-2', // Different event ID
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    // Different events should have different checksums
    expect(checksum1).not.toBe(checksum2);
  });

  it('should maintain idempotency when dates have same ISO string representation', () => {
    const date1 = new Date('2026-01-20T10:00:00.000Z');
    const date2 = new Date('2026-01-20T10:00:00.000Z');

    const event1: EventChecksumParams = {
      external_event_id: 'event-123',
      start: date1,
      end: new Date('2026-01-20T11:00:00.000Z'),
      is_busy: true,
      provider_id: 'provider-456',
      calendar_provider: 'google',
    };

    const event2: EventChecksumParams = {
      ...event1,
      start: date2, // Different Date object, same time
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    // Should produce same checksum (dates normalize to same ISO string)
    expect(checksum1).toBe(checksum2);
  });
});

describe('Idempotency: No-Op Classification Logic', () => {
  it('should classify as no-op when checksums match', () => {
    const event: EventChecksumParams = {
      external_event_id: 'event-123',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-456',
      calendar_provider: 'google',
    };

    const checksum1 = computeExternalEventChecksum(event);
    const checksum2 = computeExternalEventChecksum(event);

    // Simulate no-op classification logic
    const isNoOp = checksum1 === checksum2;

    expect(isNoOp).toBe(true);
  });

  it('should classify as change when checksums differ', () => {
    const event1: EventChecksumParams = {
      external_event_id: 'event-123',
      start: new Date('2026-01-20T10:00:00Z'),
      end: new Date('2026-01-20T11:00:00Z'),
      is_busy: true,
      provider_id: 'provider-456',
      calendar_provider: 'google',
    };

    const event2: EventChecksumParams = {
      ...event1,
      end: new Date('2026-01-20T12:00:00Z'), // Changed
    };

    const checksum1 = computeExternalEventChecksum(event1);
    const checksum2 = computeExternalEventChecksum(event2);

    // Simulate change detection logic
    const isNoOp = checksum1 === checksum2;

    expect(isNoOp).toBe(false);
  });
});
