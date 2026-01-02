/**
 * PaymentIntent Repository Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { 
  insertPaymentIntent, 
  findByExternalId, 
  findById,
  updateStatus,
  markCaptured,
  markRefunded
} from '@/lib/payments/repository'
import { insertLedgerEntry } from '@/lib/credits/ledger'
import { randomUUID } from 'crypto'

describe('PaymentIntent Repository', () => {
  const testOwnerId = randomUUID()
  const testCreditIntentId = randomUUID()
  const testBookingId = randomUUID()

  beforeEach(async () => {
    // Create a test ledger entry before each test
    await insertLedgerEntry({
      owner_type: 'customer',
      owner_id: testOwnerId,
      booking_id: testBookingId,
      credit_intent_id: testCreditIntentId,
      amount_cents: -1000, // Negative for payment
      currency: 'USD',
      reason_code: 'redeemed',
    })
  })

  describe('insertPaymentIntent', () => {
    it('should create a new PaymentIntent', async () => {
      const idempotencyKey = `test-${Date.now()}`
      const result = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        booking_id: testBookingId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        currency: 'USD',
        idempotency_key: idempotencyKey,
      })

      expect(result.success).toBe(true)
      expect(result.paymentIntent).toBeDefined()
      expect(result.paymentIntent?.status).toBe('created')
      expect(result.paymentIntent?.credit_intent_id).toBe(testCreditIntentId)
    })

    it('should be idempotent when same idempotency_key is used', async () => {
      const idempotencyKey = `test-idempotent-${Date.now()}`
      
      const result1 = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      const result2 = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      expect(result1.paymentIntent?.id).toBe(result2.paymentIntent?.id)
    })

    it('should fail if credit_intent_id does not exist', async () => {
      const fakeCreditIntentId = randomUUID()
      const result = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: fakeCreditIntentId,
        amount_cents: 1000,
      })

      expect(result.success).toBe(false)
      expect(result.error).toContain('does not exist')
    })
  })

  describe('findByExternalId', () => {
    it('should find PaymentIntent by external provider and ID', async () => {
      const idempotencyKey = `test-find-${Date.now()}`
      const externalId = `stripe_pi_${Date.now()}`
      
      const insertResult = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(insertResult.success).toBe(true)
      const paymentIntentId = insertResult.paymentIntent!.id

      // Update with external_id
      await updateStatus(paymentIntentId, 'authorized', {
        external_id: externalId,
        external_provider: 'stripe',
      })

      const found = await findByExternalId('stripe', externalId)
      expect(found).toBeDefined()
      expect(found?.id).toBe(paymentIntentId)
      expect(found?.external_id).toBe(externalId)
    })

    it('should return null if not found', async () => {
      const found = await findByExternalId('stripe', 'nonexistent_id')
      expect(found).toBeNull()
    })
  })

  describe('updateStatus', () => {
    it('should update status with valid transition', async () => {
      const idempotencyKey = `test-update-${Date.now()}`
      const insertResult = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(insertResult.success).toBe(true)
      const paymentIntentId = insertResult.paymentIntent!.id

      const updateResult = await updateStatus(paymentIntentId, 'authorized')
      expect(updateResult.success).toBe(true)
      expect(updateResult.paymentIntent?.status).toBe('authorized')
    })

    it('should reject invalid status transition', async () => {
      const idempotencyKey = `test-invalid-${Date.now()}`
      const insertResult = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(insertResult.success).toBe(true)
      const paymentIntentId = insertResult.paymentIntent!.id

      // Try invalid transition: created -> refunded (should fail)
      const updateResult = await updateStatus(paymentIntentId, 'refunded')
      expect(updateResult.success).toBe(false)
      expect(updateResult.error).toContain('Invalid status transition')
    })

    it('should be idempotent for same status', async () => {
      const idempotencyKey = `test-idempotent-status-${Date.now()}`
      const insertResult = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(insertResult.success).toBe(true)
      const paymentIntentId = insertResult.paymentIntent!.id

      // Update to authorized
      await updateStatus(paymentIntentId, 'authorized')
      
      // Try to update to authorized again (should succeed - idempotent)
      const updateResult = await updateStatus(paymentIntentId, 'authorized')
      expect(updateResult.success).toBe(true)
    })
  })

  describe('markCaptured', () => {
    it('should mark PaymentIntent as captured', async () => {
      const idempotencyKey = `test-capture-${Date.now()}`
      const insertResult = await insertPaymentIntent({
        owner_type: 'customer',
        owner_id: testOwnerId,
        credit_intent_id: testCreditIntentId,
        amount_cents: 1000,
        idempotency_key: idempotencyKey,
      })

      expect(insertResult.success).toBe(true)
      const paymentIntentId = insertResult.paymentIntent!.id

      // First authorize
      await updateStatus(paymentIntentId, 'authorized')

      // Then capture
      const captureResult = await markCaptured(paymentIntentId, 'capture_123')
      expect(captureResult.success).toBe(true)
      expect(captureResult.paymentIntent?.status).toBe('captured')
    })
  })

  describe('markRefunded', () => {
    it('should mark PaymentIntent as refunded', async () => {
      const idempotencyKey = `test-refund-${Date.now()}`
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

      const refundResult = await markRefunded(paymentIntentId, 'refund_123')
      expect(refundResult.success).toBe(true)
      expect(refundResult.paymentIntent?.status).toBe('refunded')
    })

    it('should prevent double-refund', async () => {
      const idempotencyKey = `test-double-refund-${Date.now()}`
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
      await markRefunded(paymentIntentId)

      // Try to refund again (should fail - terminal state)
      const refundResult2 = await markRefunded(paymentIntentId)
      expect(refundResult2.success).toBe(false)
      expect(refundResult2.error).toContain('Invalid status transition')
    })
  })
})
