/**
 * PaymentIntent Double-Capture/Refund Prevention Tests
 * 
 * Ensures invariants are enforced:
 * - Cannot capture already-captured PaymentIntent
 * - Cannot refund already-refunded PaymentIntent
 * - Cannot transition from terminal states
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  insertPaymentIntent, 
  updateStatus,
  markCaptured,
  markRefunded
} from '@/lib/payments/repository'
import { insertLedgerEntry } from '@/lib/credits/ledger'
import { randomUUID } from 'crypto'

describe('PaymentIntent Double-Capture/Refund Prevention', () => {
  const testOwnerId = randomUUID()
  const testCreditIntentId = randomUUID()

  beforeEach(async () => {
    // Create a test ledger entry before each test
    await insertLedgerEntry({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: -1000,
      currency: 'USD',
      reason_code: 'redeemed',
    })
  })

  it('should prevent double-capture', async () => {
    const idempotencyKey = `test-double-capture-${Date.now()}`
    
    // Create and authorize PaymentIntent
    const insertResult = await insertPaymentIntent({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: 1000,
      idempotency_key: idempotencyKey,
    })

    expect(insertResult.success).toBe(true)
    const paymentIntentId = insertResult.paymentIntent!.id

    // Authorize
    await updateStatus(paymentIntentId, 'authorized')

    // First capture (should succeed)
    const capture1 = await markCaptured(paymentIntentId)
    expect(capture1.success).toBe(true)
    expect(capture1.paymentIntent?.status).toBe('captured')

    // Second capture attempt (should fail - already captured)
    const capture2 = await markCaptured(paymentIntentId)
    expect(capture2.success).toBe(false)
    expect(capture2.error).toContain('Invalid status transition')
  })

  it('should prevent double-refund', async () => {
    const idempotencyKey = `test-double-refund-${Date.now()}`
    
    // Create PaymentIntent
    const insertResult = await insertPaymentIntent({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: 1000,
      idempotency_key: idempotencyKey,
    })

    expect(insertResult.success).toBe(true)
    const paymentIntentId = insertResult.paymentIntent!.id

    // Authorize -> Capture -> Refund
    await updateStatus(paymentIntentId, 'authorized')
    await markCaptured(paymentIntentId)

    // First refund (should succeed)
    const refund1 = await markRefunded(paymentIntentId)
    expect(refund1.success).toBe(true)
    expect(refund1.paymentIntent?.status).toBe('refunded')

    // Second refund attempt (should fail - terminal state)
    const refund2 = await markRefunded(paymentIntentId)
    expect(refund2.success).toBe(false)
    expect(refund2.error).toContain('Invalid status transition')
  })

  it('should prevent transition from terminal states', async () => {
    const idempotencyKey = `test-terminal-${Date.now()}`
    
    // Create PaymentIntent
    const insertResult = await insertPaymentIntent({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: 1000,
      idempotency_key: idempotencyKey,
    })

    expect(insertResult.success).toBe(true)
    const paymentIntentId = insertResult.paymentIntent!.id

    // Cancel PaymentIntent (terminal state)
    await updateStatus(paymentIntentId, 'cancelled')
    
    // Try to transition from cancelled (should fail)
    const transitionResult = await updateStatus(paymentIntentId, 'authorized')
    expect(transitionResult.success).toBe(false)
    expect(transitionResult.error).toContain('Invalid status transition')

    // Try to capture from cancelled (should fail)
    const captureResult = await markCaptured(paymentIntentId)
    expect(captureResult.success).toBe(false)
    expect(captureResult.error).toContain('Invalid status transition')
  })

  it('should prevent capture without authorization', async () => {
    const idempotencyKey = `test-capture-unauth-${Date.now()}`
    
    // Create PaymentIntent (status: 'created')
    const insertResult = await insertPaymentIntent({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: 1000,
      idempotency_key: idempotencyKey,
    })

    expect(insertResult.success).toBe(true)
    const paymentIntentId = insertResult.paymentIntent!.id

    // Try to capture directly from 'created' (should fail - must authorize first)
    const captureResult = await markCaptured(paymentIntentId)
    expect(captureResult.success).toBe(false)
    expect(captureResult.error).toContain('Invalid status transition')
  })

  it('should prevent refund without capture', async () => {
    const idempotencyKey = `test-refund-uncaptured-${Date.now()}`
    
    // Create PaymentIntent
    const insertResult = await insertPaymentIntent({
      owner_type: 'customer',
      owner_id: testOwnerId,
      credit_intent_id: testCreditIntentId,
      amount_cents: 1000,
      idempotency_key: idempotencyKey,
    })

    expect(insertResult.success).toBe(true)
    const paymentIntentId = insertResult.paymentIntent!.id

    // Authorize
    await updateStatus(paymentIntentId, 'authorized')

    // Try to refund without capturing (should fail)
    const refundResult = await markRefunded(paymentIntentId)
    expect(refundResult.success).toBe(false)
    expect(refundResult.error).toContain('Invalid status transition')
  })
})
