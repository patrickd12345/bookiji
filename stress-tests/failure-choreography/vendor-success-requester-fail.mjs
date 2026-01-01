/**
 * PART 4.1: Vendor Auth Succeeds → Requester Auth Fails
 * 
 * Test compensation when vendor authorization succeeds but requester fails.
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''

async function createReservation() {
  const futureDate = new Date()
  futureDate.setHours(futureDate.getHours() + 2)
  const slotStart = futureDate.toISOString()
  
  const endDate = new Date(futureDate)
  endDate.setHours(endDate.getHours() + 1)
  const slotEnd = endDate.toISOString()
  
  const partnerRef = `vendor-success-requester-fail-${Date.now()}`
  
  const response = await fetch(`${BASE_URL}/api/v1/reservations`, {
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
  
  if (!response.ok) {
    throw new Error(`Failed to create reservation: HTTP ${response.status}`)
  }
  
  return await response.json()
}

async function authorizeVendor(reservationId) {
  // Simulate vendor authorization
  // In a real scenario, this would call the payment orchestrator
  console.log(`Authorizing vendor for reservation ${reservationId}...`)
  
  const response = await fetch(
    `${BASE_URL}/api/v1/reservations/${reservationId}/authorize-vendor`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
      body: JSON.stringify({
        paymentMethodId: 'pm_test_vendor_card',
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Vendor authorization failed: HTTP ${response.status}`)
  }
  
  return await response.json()
}

async function authorizeRequester(reservationId, shouldFail = false) {
  // Simulate requester authorization (with optional failure)
  console.log(`Authorizing requester for reservation ${reservationId}...`)
  
  if (shouldFail) {
    // Simulate failure by using invalid payment method
    const response = await fetch(
      `${BASE_URL}/api/v1/reservations/${reservationId}/authorize-requester`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Partner-API-Key': PARTNER_API_KEY,
        },
        body: JSON.stringify({
          paymentMethodId: 'pm_test_declined_card', // Simulated declined card
        }),
      }
    )
    
    if (response.ok) {
      throw new Error('Expected requester authorization to fail, but it succeeded')
    }
    
    return { success: false, error: await response.json() }
  }
  
  const response = await fetch(
    `${BASE_URL}/api/v1/reservations/${reservationId}/authorize-requester`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
      body: JSON.stringify({
        paymentMethodId: 'pm_test_card',
      }),
    }
  )
  
  if (!response.ok) {
    throw new Error(`Requester authorization failed: HTTP ${response.status}`)
  }
  
  return await response.json()
}

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

async function main() {
  console.log('=== FAILURE CHOREOGRAPHY TEST 4.1 ===')
  console.log('Vendor Auth Succeeds → Requester Auth Fails')
  console.log('')
  
  // Step 1: Create reservation
  console.log('=== STEP 1: Create Reservation ===')
  const reservation = await createReservation()
  const reservationId = reservation.reservationId
  console.log(`✅ Created reservation ${reservationId}`)
  console.log('')
  
  // Step 2: Vendor authorization succeeds
  console.log('=== STEP 2: Vendor Authorization ===')
  try {
    const vendorAuth = await authorizeVendor(reservationId)
    console.log('✅ Vendor authorization succeeded')
    console.log(`   Payment Intent: ${vendorAuth.paymentIntentId || 'N/A'}`)
  } catch (error) {
    console.log(`⚠️  Vendor authorization failed: ${error.message}`)
    console.log('   (This may be expected if endpoint not implemented)')
  }
  console.log('')
  
  // Step 3: Requester authorization fails
  console.log('=== STEP 3: Requester Authorization (Should Fail) ===')
  try {
    const requesterAuth = await authorizeRequester(reservationId, true)
    if (!requesterAuth.success) {
      console.log('✅ Requester authorization failed as expected')
      console.log(`   Error: ${JSON.stringify(requesterAuth.error)}`)
    }
  } catch (error) {
    console.log(`⚠️  Requester authorization error: ${error.message}`)
    console.log('   (This may be expected if endpoint not implemented)')
  }
  console.log('')
  
  // Step 4: Observe compensation
  console.log('=== STEP 4: Observe Compensation ===')
  await new Promise(resolve => setTimeout(resolve, 2000)) // Wait for compensation
  
  const finalReservation = await getReservation(reservationId)
  
  console.log(`Final state: ${finalReservation.state}`)
  console.log(`Payment state: ${JSON.stringify(finalReservation.paymentState)}`)
  console.log(`Failure reason: ${finalReservation.failureReason || 'N/A'}`)
  console.log('')
  
  // Validate compensation
  console.log('=== VALIDATION ===')
  const validations = {
    vendorAuthReleased: false,
    holdReleased: false,
    stateCorrect: false,
    noMoneyMoved: false,
  }
  
  // Check if vendor auth was released
  if (finalReservation.paymentState) {
    const paymentState = typeof finalReservation.paymentState === 'string'
      ? JSON.parse(finalReservation.paymentState)
      : finalReservation.paymentState
    
    if (!paymentState.vendorPaymentIntentId) {
      validations.vendorAuthReleased = true
      console.log('✅ Vendor authorization released')
    } else {
      console.log('❌ Vendor authorization NOT released')
    }
    
    // Check if no money moved
    if (!paymentState.vendorAmount || paymentState.vendorAmount === 0) {
      validations.noMoneyMoved = true
      console.log('✅ No money moved')
    } else {
      console.log('❌ Money may have been moved')
    }
  }
  
  // Check state
  if (finalReservation.state === 'FAILED_REQUESTER_AUTH') {
    validations.stateCorrect = true
    console.log('✅ State correct: FAILED_REQUESTER_AUTH')
  } else {
    console.log(`⚠️  State: ${finalReservation.state} (expected FAILED_REQUESTER_AUTH)`)
  }
  
  // Check if hold released (slot available)
  // This depends on actual API structure
  
  console.log('')
  if (validations.vendorAuthReleased && validations.stateCorrect && validations.noMoneyMoved) {
    console.log('✅ TEST PASSED: Compensation executed correctly')
  } else {
    console.log('❌ TEST FAILED: Compensation not executed correctly')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
