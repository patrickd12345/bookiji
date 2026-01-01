/**
 * PART 2.1: Vendor Confirmation Near TTL Expiry
 * 
 * Test that vendor confirmation near TTL expiry extends TTL correctly
 * and state transitions work properly.
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''
const VENDOR_ID = process.env.VENDOR_ID || ''
const REQUESTER_ID = process.env.REQUESTER_ID || ''

test.describe('Vendor Confirmation Delay Stress Test', () => {
  test('vendor confirms reservation 30 seconds before TTL expiry', async ({ request }) => {
    // Step 1: Create reservation (10-minute TTL)
    const futureDate = new Date()
    futureDate.setHours(futureDate.getHours() + 2)
    const slotStart = futureDate.toISOString()
    
    const endDate = new Date(futureDate)
    endDate.setHours(endDate.getHours() + 1)
    const slotEnd = endDate.toISOString()
    
    const partnerRef = `test-vendor-delay-${Date.now()}`
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
    const createdAt = new Date(reservation.createdAt)
    
    console.log(`Created reservation ${reservationId}, expires at ${expiresAt.toISOString()}`)
    
    // Step 2: Wait until 30 seconds before expiry
    const now = new Date()
    const waitTime = expiresAt.getTime() - now.getTime() - 30000 // 30 seconds before expiry
    
    if (waitTime > 0) {
      console.log(`Waiting ${waitTime}ms until 30 seconds before expiry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    } else {
      console.log('Warning: TTL already expired or very close')
    }
    
    // Step 3: Vendor confirms reservation
    // Note: This assumes there's a vendor confirmation endpoint
    // Adjust based on actual API structure
    const confirmResponse = await request.post(
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
    
    // Step 4: Observe TTL extension and state transition
    const getResponse = await request.get(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    expect(getResponse.ok()).toBeTruthy()
    const updatedReservation = await getResponse.json()
    
    // Validate: TTL should be extended
    const newExpiresAt = new Date(updatedReservation.expiresAt)
    expect(newExpiresAt.getTime()).toBeGreaterThan(expiresAt.getTime())
    
    // Validate: State should transition correctly
    expect(updatedReservation.state).toBe('VENDOR_CONFIRMED')
    
    // Validate: Reservation should not be expired
    const currentTime = new Date()
    expect(newExpiresAt.getTime()).toBeGreaterThan(currentTime.getTime())
    
    console.log(`✅ Reservation ${reservationId} confirmed, new expiry: ${newExpiresAt.toISOString()}`)
  })
})
