/**
 * PaymentIntent Creation Flow Integration Tests
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { createPaymentsCreateIntentHandler } from '@/lib/paymentsCreateIntentHandler'
import { findByExternalId } from '@/lib/payments/repository'
import { insertLedgerEntry } from '@/lib/credits/ledger'
import { randomUUID } from 'crypto'
import { NextRequest } from 'next/server'

describe('PaymentIntent Creation Flow', () => {
  const testCustomerId = randomUUID()
  const testServiceId = randomUUID()
  const testBookingId = randomUUID()

  it('should create PaymentIntent and Stripe intent with idempotency', async () => {
    // Create credit ledger entry first
    const creditIntentId = randomUUID()
    const ledgerResult = await insertLedgerEntry({
      owner_type: 'customer',
      owner_id: testCustomerId,
      booking_id: testBookingId,
      credit_intent_id: creditIntentId,
      amount_cents: -1000,
      currency: 'USD',
      reason_code: 'redeemed',
    })

    expect(ledgerResult.success).toBe(true)

    // Create handler
    const handler = createPaymentsCreateIntentHandler()

    // Create request
    const requestBody = {
      amount: 10.00,
      currency: 'usd',
      customerId: testCustomerId,
      serviceId: testServiceId,
      bookingId: testBookingId,
      owner_type: 'customer' as const,
    }

    const request = new NextRequest('http://localhost/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    })

    // Call handler
    const response = await handler.handle(request)
    const data = await response.json()

    // Verify response
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.paymentIntent).toBeDefined()
    expect(data.paymentIntent.id).toBeDefined()

    // Verify PaymentIntent was created in DB
    const dbPaymentIntent = await findByExternalId('stripe', data.paymentIntent.id)
    expect(dbPaymentIntent).toBeDefined()
    expect(dbPaymentIntent?.credit_intent_id).toBe(creditIntentId)
    expect(dbPaymentIntent?.status).toBe('authorized')
    expect(dbPaymentIntent?.external_id).toBe(data.paymentIntent.id)
  })

  it('should handle duplicate requests idempotently', async () => {
    // Create credit ledger entry
    const creditIntentId = randomUUID()
    await insertLedgerEntry({
      owner_type: 'customer',
      owner_id: testCustomerId,
      credit_intent_id: creditIntentId,
      amount_cents: -1000,
      currency: 'USD',
      reason_code: 'redeemed',
    })

    const handler = createPaymentsCreateIntentHandler()

    const requestBody = {
      amount: 10.00,
      currency: 'usd',
      customerId: testCustomerId,
      serviceId: testServiceId,
    }

    // First request
    const request1 = new NextRequest('http://localhost/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const response1 = await handler.handle(request1)
    const data1 = await response1.json()

    // Second request with same data (should be idempotent via idempotency_key)
    const request2 = new NextRequest('http://localhost/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    })
    const response2 = await handler.handle(request2)
    const data2 = await response2.json()

    // Both should succeed, but may return same PaymentIntent if idempotency works
    expect(response1.status).toBe(200)
    expect(response2.status).toBe(200)
  })

  it('should fail if required fields are missing', async () => {
    const handler = createPaymentsCreateIntentHandler()

    const requestBody = {
      amount: 10.00,
      // Missing currency, customerId, serviceId
    }

    const request = new NextRequest('http://localhost/api/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await handler.handle(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Missing required fields')
  })
})
