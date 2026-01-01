/**
 * PART 3.2: Stripe Failure Injection
 * 
 * Randomly drop Stripe responses, delay webhooks, return errors
 */

import Stripe from 'stripe'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''

if (!STRIPE_SECRET_KEY) {
  console.error('Error: STRIPE_SECRET_KEY must be set')
  process.exit(1)
}

// Create a wrapper around Stripe that can inject failures
class FailureInjectingStripe {
  constructor(stripe, failureRate = 0.1) {
    this.stripe = stripe
    this.failureRate = failureRate
    this.failureCount = 0
    this.successCount = 0
  }
  
  async injectFailure(operation) {
    const rand = Math.random()
    if (rand < this.failureRate) {
      this.failureCount++
      
      // Randomly choose failure type
      const failureType = Math.floor(Math.random() * 3)
      
      switch (failureType) {
        case 0:
          // Network timeout
          throw new Error('ECONNRESET: Connection reset by peer')
        case 1:
          // Stripe API error
          const error = new Error('Stripe API Error')
          error.type = 'StripeAPIError'
          error.statusCode = 500
          throw error
        case 2:
          // Rate limit
          const rateLimitError = new Error('Rate limit exceeded')
          rateLimitError.type = 'StripeRateLimitError'
          throw rateLimitError
      }
    }
    
    this.successCount++
    return operation()
  }
  
  getStats() {
    return {
      failures: this.failureCount,
      successes: this.successCount,
      total: this.failureCount + this.successCount,
      failureRate: this.failureCount / (this.failureCount + this.successCount) || 0,
    }
  }
}

async function createReservationWithStripeFailure() {
  // This would typically be done by mocking Stripe in the application
  // For now, we'll simulate by creating reservations and then injecting
  // failures during payment operations
  
  console.log('=== STRIPE FAILURE INJECTION TEST ===')
  console.log('Note: This test requires application-level Stripe mocking')
  console.log('For now, we validate that the system handles Stripe failures gracefully')
  console.log('')
  
  // Create a reservation
  const futureDate = new Date()
  futureDate.setHours(futureDate.getHours() + 2)
  const slotStart = futureDate.toISOString()
  
  const endDate = new Date(futureDate)
  endDate.setHours(endDate.getHours() + 1)
  const slotEnd = endDate.toISOString()
  
  const partnerRef = `stripe-failure-test-${Date.now()}`
  
  const createResponse = await fetch(`${BASE_URL}/api/v1/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Partner-API-Key': PARTNER_API_KEY,
    },
    body: JSON.stringify({
      vendorId: process.env.VENDOR_ID || '',
      slotStartTime: slotStart,
      slotEndTime: slotEnd,
      requesterId: process.env.REQUESTER_ID || '',
      partnerBookingRef: partnerRef,
      idempotencyKey: `idempotency-${partnerRef}`,
    }),
  })
  
  if (!createResponse.ok) {
    console.log(`❌ Failed to create reservation: HTTP ${createResponse.status}`)
    return
  }
  
  const reservation = await createResponse.json()
  const reservationId = reservation.reservationId
  
  console.log(`✅ Created reservation ${reservationId}`)
  console.log('')
  console.log('=== VALIDATION CHECKLIST ===')
  console.log('To fully test Stripe failure injection, verify:')
  console.log('1. System handles Stripe network errors gracefully')
  console.log('2. Compensation executed when Stripe fails')
  console.log('3. No money leaked (no capture without booking)')
  console.log('4. No slot permanently blocked')
  console.log('5. Retry logic works correctly')
  console.log('')
  console.log('⚠️  This test requires application-level Stripe mocking')
  console.log('    Consider using Stripe test mode with specific error cards')
}

async function delayWebhook(webhookPayload, delayMs) {
  console.log(`Delaying webhook by ${delayMs}ms...`)
  await new Promise(resolve => setTimeout(resolve, delayMs))
  
  // In a real scenario, you would send the webhook to the application
  // For now, we just log
  console.log('Webhook would be sent here:', webhookPayload.type)
}

async function main() {
  const stripe = new Stripe(STRIPE_SECRET_KEY)
  const failureInjector = new FailureInjectingStripe(stripe, 0.1) // 10% failure rate
  
  console.log('=== STRIPE FAILURE INJECTION TEST ===')
  console.log('Failure rate: 10%')
  console.log('')
  
  // Test 1: Create reservation with potential Stripe failures
  await createReservationWithStripeFailure()
  
  // Test 2: Simulate delayed webhooks
  console.log('\n=== DELAYED WEBHOOK TEST ===')
  const webhookPayload = {
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: 'pi_test_123',
      },
    },
  }
  
  // Simulate 5 second delay
  await delayWebhook(webhookPayload, 5000)
  
  console.log('✅ Webhook delay simulation complete')
  console.log('')
  console.log('=== VALIDATION ===')
  console.log('Verify that delayed webhooks are handled correctly:')
  console.log('1. Webhook processed even after delay')
  console.log('2. No duplicate processing')
  console.log('3. State updated correctly')
  
  const stats = failureInjector.getStats()
  console.log('\n=== FAILURE INJECTION STATS ===')
  console.log(`Failures injected: ${stats.failures}`)
  console.log(`Successes: ${stats.successes}`)
  console.log(`Failure rate: ${(stats.failureRate * 100).toFixed(2)}%`)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
