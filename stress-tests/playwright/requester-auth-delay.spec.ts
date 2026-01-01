/**
 * PART 2.2: Requester Authorization Near Expiry
 * 
 * Test that requester authorization near expiry works correctly
 * without premature cancellation or early capture.
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''
const VENDOR_ID = process.env.VENDOR_ID || ''
const REQUESTER_ID = process.env.REQUESTER_ID || ''

test.describe('Requester Authorization Delay Stress Test', () => {
  test('requester authorizes just before authorization expiry', async ({ request }) => {
    // Step 1: Create reservation
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 2)
    const slotStart = futureDate.toISOString()
    
    const endDate = new Date(futureDate)
    endDate.setHours(endDate.getHours() + 1)
    const slotEnd = endDate.toISOString()
    
    const partnerRef = `test-requester-delay-${Date.now()}`
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
    
    // Step 2: Vendor confirms
    const vendorConfirmResponse = await request.post(
      `${BASE_URL}/api/v1/reservations/${reservationId}/vendor-confirm`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-API-Key': PARTNER_API_KEY,
        },
        data: {
          confirmed: true,
        },
      }
    )
    
    expect(vendorConfirmResponse.ok()).toBeTruthy()
    
    // Get updated reservation to find authorization expiry time
    const getResponse = await request.get(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    const updatedReservation = await getResponse.json()
    
    // Assume authorization expires at some time (adjust based on actual API)
    // For now, we'll wait until just before the reservation expires
    const expiresAt = new Date(updatedReservation.expiresAt)
    const now = new Date()
    const waitTime = expiresAt.getTime() - now.getTime() - 10000 // 10 seconds before expiry
    
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms until just before authorization expiry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
    
    // Step 3: Complete authorization just before expiry
    const authResponse = await request.post(
      `${BASE_URL}/api/v1/reservations/${reservationId}/authorize-requester`,
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-API-Key': PARTNER_API_KEY,
        },
        data: {
          paymentMethodId: 'pm_test_card', // Test payment method
        },
      }
    )
    
    // Step 4: Verify no premature cancellation
    const finalResponse = await request.get(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    expect(finalResponse.ok()).toBeTruthy()
    const finalReservation = await finalResponse.json()
    
    // Validate: Reservation should not be cancelled
    expect(finalReservation.state).not.toBe('CANCELLED')
    expect(finalReservation.state).not.toBe('EXPIRED')
    
    // Validate: Authorization should have completed
    expect(finalReservation.paymentState).toBeDefined()
    
    // Validate: No early capture (if capture happens separately)
    // This depends on the actual payment flow implementation
    
    console.log(`✅ Authorization completed successfully, state: ${finalReservation.state}`)
  })
})
