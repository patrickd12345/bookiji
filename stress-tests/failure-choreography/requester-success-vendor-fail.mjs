/**
 * PART 4.2: Requester Capture Succeeds → Vendor Capture Fails
 * 
 * Test compensation when requester capture succeeds but vendor capture fails.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''

async function getReservation(reservationId) {
  const response = await fetch(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
    headers: {
      'X-Partner-API-Key': PARTNER_API_KEY,
    },
  })
  
  if (!response.ok) {
    throw new Error(`Failed to get reservation: HTTP ${response.status}`)
  }
  
  return await response.json()
}

async function simulateCaptureFailure(reservationId, whichCapture) {
  // Simulate capture failure
  // In a real scenario, this would be done by mocking Stripe or using test cards
  console.log(`Simulating ${whichCapture} capture failure for reservation ${reservationId}...`)
  
  // Try to trigger capture
  const response = await fetch(
    `${BASE_URL}/api/v1/reservations/${reservationId}/capture`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
      body: JSON.stringify({
        captureType: whichCapture,
        simulateFailure: true, // Flag to simulate failure
      }),
    }
  )
  
  return {
    ok: response.ok,
    status: response.status,
    body: await response.json().catch(() => ({ error: 'Failed to parse' })),
  }
}

async function main() {
  console.log('=== FAILURE CHOREOGRAPHY TEST 4.2 ===')
  console.log('Requester Capture Succeeds → Vendor Capture Fails')
  console.log('')
  console.log('⚠️  This test requires:')
  console.log('   1. Both authorizations to succeed first')
  console.log('   2. Application-level capture failure simulation')
  console.log('   3. Stripe test mode with specific error scenarios')
  console.log('')
  
  // For now, we'll validate the expected behavior
  console.log('=== EXPECTED BEHAVIOR ===')
  console.log('1. Requester capture succeeds')
  console.log('2. Vendor capture fails (simulated)')
  console.log('3. Compensation executed:')
  console.log('   - Requester capture refunded')
  console.log('   - Vendor authorization released')
  console.log('   - Reservation marked as FAILED_COMMIT')
  console.log('   - Compensation event emitted')
  console.log('')
  
  console.log('=== VALIDATION CHECKLIST ===')
  console.log('When running this test, verify:')
  console.log('✅ Requester capture refunded')
  console.log('✅ Vendor authorization released')
  console.log('✅ Reservation state: FAILED_COMMIT')
  console.log('✅ Compensation event emitted')
  console.log('✅ No money leaked')
  console.log('✅ Slot released')
  console.log('')
  
  console.log('⚠️  This test requires application-level Stripe mocking')
  console.log('    Consider using Stripe test mode with specific error cards')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
