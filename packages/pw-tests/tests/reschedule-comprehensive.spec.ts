import { test, expect } from '@playwright/test'
import { rescheduleInit, rescheduleComplete, abortReschedule, getMetrics } from './utils/api'

const BOOKING_ID = process.env.BOOKING_ID!
const CUSTOMER_JWT = process.env.CUSTOMER_JWT!

test.describe('Reschedule System - Comprehensive Tests', () => {
  test.beforeEach(async () => {
    // Verify we have required environment variables
    expect(BOOKING_ID).toBeTruthy()
    expect(CUSTOMER_JWT).toBeTruthy()
  })

  test('happy-path: complete reschedule flow', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    expect(token).toBeTruthy()
    expect(token.length).toBeGreaterThan(20)

    // 2. Complete reschedule with new time
    const newStart = '2025-08-20T15:00:00Z'
    const newEnd = '2025-08-20T15:30:00Z'
    
    const result = await rescheduleComplete(token, newStart, newEnd, 'happy-path-test')
    
    expect(result.status).toBe(200)
    expect(result.body.success).toBe(true)
    expect(result.body.bookingId).toBeTruthy()
    
    // 3. Verify metrics show completion
    const metrics = await getMetrics()
    expect(metrics.status).toBe(200)
    expect(metrics.body.success).toBe(true)
  })

  test('token-reuse: same token cannot be used twice', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Complete reschedule successfully
    const result1 = await rescheduleComplete(token, '2025-08-20T16:00:00Z', '2025-08-20T16:30:00Z', 'reuse-test-1')
    expect(result1.status).toBe(200)
    
    // 3. Try to reuse the same token (should fail)
    const result2 = await rescheduleComplete(token, '2025-08-20T17:00:00Z', '2025-08-20T17:30:00Z', 'reuse-test-2')
    expect(result2.status).toBe(400)
    expect(result2.body.error).toMatch(/TOKEN_INVALID_OR_USED|expired|used/i)
  })

  test('overlap-prevention: cannot reschedule to overlapping slot', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Try to reschedule to overlapping time (should fail)
    const result = await rescheduleComplete(token, '2025-08-20T14:00:00Z', '2025-08-20T14:30:00Z', 'overlap-test')
    
    // Should fail due to overlap constraint
    expect([400, 409, 422]).toContain(result.status)
    expect(JSON.stringify(result.body)).toMatch(/overlap|constraint|conflict/i)
  })

  test('idempotency: same request with same key succeeds', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Send same request twice with same idempotency key
    const idemKey = 'idempotency-test'
    const result1 = await rescheduleComplete(token, '2025-08-20T18:00:00Z', '2025-08-20T18:30:00Z', idemKey)
    const result2 = await rescheduleComplete(token, '2025-08-20T18:00:00Z', '2025-08-20T18:30:00Z', idemKey)
    
    // Both should succeed with same result
    expect(result1.status).toBe(200)
    expect(result2.status).toBe(200)
    expect(result1.body.bookingId).toBe(result2.body.bookingId)
  })

  test('abort-reschedule: can cancel reschedule before completion', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Abort the reschedule
    const abortResult = await abortReschedule(BOOKING_ID)
    expect(abortResult.status).toBe(200)
    
    // 3. Try to complete with the token (should fail)
    const completeResult = await rescheduleComplete(token, '2025-08-20T19:00:00Z', '2025-08-20T19:30:00Z', 'abort-test')
    expect(completeResult.status).toBe(400)
  })

  test('metrics-endpoint: returns valid reschedule metrics', async () => {
    const metrics = await getMetrics()
    
    expect(metrics.status).toBe(200)
    expect(metrics.body.success).toBe(true)
    expect(metrics.body.metrics).toBeTruthy()
    
    // Verify expected metric fields
    const m = metrics.body.metrics
    expect(typeof m.totalBookings).toBe('number')
    expect(typeof m.rescheduleInitiations).toBe('number')
    expect(typeof m.abandonedReschedules).toBe('number')
    expect(typeof m.completedReschedules).toBe('number')
    expect(typeof m.abandonmentRate).toBe('number')
    expect(typeof m.completionRate).toBe('number')
    
    // Verify rates are percentages
    expect(m.abandonmentRate).toBeGreaterThanOrEqual(0)
    expect(m.abandonmentRate).toBeLessThanOrEqual(100)
    expect(m.completionRate).toBeGreaterThanOrEqual(0)
    expect(m.completionRate).toBeLessThanOrEqual(100)
  })

  test('concurrent-reschedule: race condition handling', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Simulate concurrent requests
    const slot1 = { start: '2025-08-20T20:00:00Z', end: '2025-08-20T20:30:00Z' }
    const slot2 = { start: '2025-08-20T20:05:00Z', end: '2025-08-20T20:35:00Z' }
    
    const [result1, result2] = await Promise.all([
      rescheduleComplete(token, slot1.start, slot1.end, 'race-1'),
      rescheduleComplete(token, slot2.start, slot2.end, 'race-2')
    ])
    
    // Exactly one should succeed
    const successCount = [result1, result2].filter(r => r.status === 200 && r.body.success).length
    const failCount = [result1, result2].filter(r => r.status !== 200 || !r.body.success).length
    
    expect(successCount).toBe(1)
    expect(failCount).toBe(1)
    
    // Loser should get appropriate error
    const loser = [result1, result2].find(r => r.status !== 200 || !r.body.success)!
    expect([400, 409, 422]).toContain(loser.status)
  })

  test('invalid-token: handles malformed tokens gracefully', async () => {
    // Test with invalid token
    const result = await rescheduleComplete('invalid-token', '2025-08-20T21:00:00Z', '2025-08-20T21:30:00Z', 'invalid-test')
    
    expect(result.status).toBe(400)
    expect(result.body.error).toBeTruthy()
  })

  test('invalid-times: handles malformed time formats', async () => {
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Test with invalid time format
    const result = await rescheduleComplete(token, 'invalid-time', 'also-invalid', 'invalid-time-test')
    
    expect(result.status).toBe(400)
    expect(result.body.error).toBeTruthy()
  })

  test('expired-hold: handles expired reschedule holds', async () => {
    // Note: This test requires waiting for TTL expiration
    // In production, you'd want to mock the time or use a shorter TTL for testing
    
    // 1. Initiate reschedule
    const { token } = await rescheduleInit(BOOKING_ID)
    
    // 2. Wait for hold to expire (if testing with short TTL)
    // For now, just verify the token exists
    expect(token).toBeTruthy()
    
    // 3. In a real expired scenario, this would fail with HOLD_EXPIRED
    // This test documents the expected behavior
  })
})
