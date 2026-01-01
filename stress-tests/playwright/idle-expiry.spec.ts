/**
 * PART 2.3: Idle Reservation Expiry
 * 
 * Test that reservations expire automatically when idle past timeout.
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''
const VENDOR_ID = process.env.VENDOR_ID || ''
const REQUESTER_ID = process.env.REQUESTER_ID || ''

test.describe('Idle Reservation Expiry Stress Test', () => {
  test('reservation expires automatically after vendor confirmation timeout', async ({ request }) => {
    // Step 1: Create reservation
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 2)
    const slotStart = futureDate.toISOString()
    
    const endDate = new Date(futureDate)
    endDate.setHours(endDate.getHours() + 1)
    const slotEnd = endDate.toISOString()
    
    const partnerRef = `test-idle-expiry-${Date.now()}`
    const idempotencyKey = `idempotency-${partnerRef}`
    
    const createResponse = await request.post(`${BASE_URL}/api/v1/reservations`, {
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
      data: {
        vendorId: VENDOR_ID,
        slotStartTime: slotStart,
        slotEndTime: slotEnd,
        requesterId: REQUESTER_ID,
        partnerBookingRef: partnerRef,
        idempotencyKey,
      },
    })
    
    expect(createResponse.ok()).toBeTruthy()
    const reservation = await createResponse.json()
    const reservationId = reservation.reservationId
    const expiresAt = new Date(reservation.expiresAt)
    
    console.log(`Created reservation ${reservationId}, expires at ${expiresAt.toISOString()}`)
    
    // Step 2: Let it sit idle past vendor confirmation timeout (10 minutes)
    // Wait 11 minutes to ensure expiry
    const waitTime = 11 * 60 * 1000 // 11 minutes
    console.log(`Waiting ${waitTime}ms for expiry...`)
    await new Promise(resolve => setTimeout(resolve, waitTime))
    
    // Step 3: Observe automatic expiry
    const getResponse = await request.get(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    expect(getResponse.ok()).toBeTruthy()
    const expiredReservation = await getResponse.json()
    
    // Validate: Reservation should be expired
    expect(['EXPIRED', 'FAILED_VENDOR_TIMEOUT', 'CANCELLED']).toContain(expiredReservation.state)
    
    // Validate: Slot should be released (check via availability API if available)
    // This depends on actual API structure
    
    // Validate: No held funds (check payment state)
    if (expiredReservation.paymentState) {
      // Payment state should indicate no funds held
      expect(expiredReservation.paymentState.vendorPaymentIntentId).toBeUndefined()
      expect(expiredReservation.paymentState.requesterPaymentIntentId).toBeUndefined()
    }
    
    console.log(`✅ Reservation ${reservationId} expired correctly, state: ${expiredReservation.state}`)
  })
})
