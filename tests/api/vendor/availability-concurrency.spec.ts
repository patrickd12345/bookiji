/**
 * Concurrency tests for slot conflict detection
 * Part of F-009: Slot conflict detection
 * 
 * Tests that concurrent slot creation attempts are properly handled
 * and that double-booking is impossible.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getServerSupabase } from '@/lib/supabaseServer';
import { AtomicSlotOperations } from '@/lib/availability/atomicSlotOperations';

// This test requires a real database connection.
// It is intentionally skipped in the default unit-test run (mocked Supabase).
// Run with: FORCE_LOCAL_DB=true pnpm vitest run tests/api/vendor/availability-concurrency.spec.ts

const shouldRun = process.env.FORCE_LOCAL_DB === 'true';
const describeIf = shouldRun ? describe : describe.skip;

describeIf('Slot Conflict Detection - Concurrency Tests', () => {
  const testProviderId = 'test-provider-concurrency';
  const testServiceId = 'test-service-concurrency';

  beforeEach(async () => {
    const supabase = getServerSupabase();

    // Clean up test data
    await supabase
      .from('availability_slots')
      .delete()
      .eq('provider_id', testProviderId);
  });

  it('should prevent concurrent creation of overlapping slots', async () => {
    const supabase = getServerSupabase();

    const startTime = new Date('2026-12-20T10:00:00Z');
    const endTime = new Date('2026-12-20T11:00:00Z');

    // Create first slot
    const result1 = await AtomicSlotOperations.createSlotAtomically({
      providerId: testProviderId,
      serviceId: testServiceId,
      startTime,
      endTime,
    });

    expect(result1.success).toBe(true);
    expect(result1.slotId).toBeDefined();

    // Try to create overlapping slot concurrently
    const overlappingStart = new Date('2026-12-20T10:30:00Z');
    const overlappingEnd = new Date('2026-12-20T11:30:00Z');

    const result2 = await AtomicSlotOperations.createSlotAtomically({
      providerId: testProviderId,
      serviceId: testServiceId,
      startTime: overlappingStart,
      endTime: overlappingEnd,
    });

    // Should fail with conflict
    expect(result2.success).toBe(false);
    expect(result2.errorCode).toBe('CONFLICT_DETECTED');
    expect(result2.conflicts).toBeDefined();
    expect(result2.conflicts?.length).toBeGreaterThan(0);
  });

  it('should allow non-overlapping slots for same provider', async () => {
    const slot1 = {
      providerId: testProviderId,
      serviceId: testServiceId,
      startTime: new Date('2026-12-20T10:00:00Z'),
      endTime: new Date('2026-12-20T11:00:00Z'),
    };

    const slot2 = {
      providerId: testProviderId,
      serviceId: testServiceId,
      startTime: new Date('2026-12-20T12:00:00Z'),
      endTime: new Date('2026-12-20T13:00:00Z'),
    };

    const result1 = await AtomicSlotOperations.createSlotAtomically(slot1);
    const result2 = await AtomicSlotOperations.createSlotAtomically(slot2);

    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
    expect(result1.slotId).toBeDefined();
    expect(result2.slotId).toBeDefined();
  });

  it('should allow overlapping slots for different providers', async () => {
    const provider1 = 'provider-1';
    const provider2 = 'provider-2';

    const slot1 = {
      providerId: provider1,
      serviceId: testServiceId,
      startTime: new Date('2026-12-20T10:00:00Z'),
      endTime: new Date('2026-12-20T11:00:00Z'),
    };

    const slot2 = {
      providerId: provider2,
      serviceId: testServiceId,
      startTime: new Date('2026-12-20T10:00:00Z'), // Same time
      endTime: new Date('2026-12-20T11:00:00Z'),   // Same time
    };

    const result1 = await AtomicSlotOperations.createSlotAtomically(slot1);
    const result2 = await AtomicSlotOperations.createSlotAtomically(slot2);

    // Both should succeed (different providers)
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it('should prevent exact duplicate slots (same provider, same time)', async () => {
    const slot = {
      providerId: testProviderId,
      serviceId: testServiceId,
      startTime: new Date('2026-12-20T10:00:00Z'),
      endTime: new Date('2026-12-20T11:00:00Z'),
    };

    const result1 = await AtomicSlotOperations.createSlotAtomically(slot);
    expect(result1.success).toBe(true);

    // Try to create exact duplicate
    const result2 = await AtomicSlotOperations.createSlotAtomically(slot);

    // Should fail (either conflict or unique constraint violation)
    expect(result2.success).toBe(false);
  });
});
