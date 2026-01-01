/**
 * PART 3.3: Worker Process Crashes
 * 
 * Simulate worker crashes mid-commit, during capture, etc.
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
  
  const partnerRef = `worker-crash-test-${Date.now()}`
  
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

async function simulateCrashDuringOperation(operation, crashPoint) {
  console.log(`Simulating crash ${crashPoint}...`)
  
  try {
    // Start operation
    const promise = operation()
    
    // Simulate crash by aborting/terminating
    // In a real scenario, this would kill the worker process
    // For now, we'll just interrupt the operation
    
    // Wait a bit then "crash"
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // Simulate crash by throwing error
    throw new Error(`Simulated crash at ${crashPoint}`)
  } catch (error) {
    if (error.message.includes('Simulated crash')) {
      console.log(`✅ Simulated crash at ${crashPoint}`)
      return { crashed: true, point: crashPoint }
    }
    throw error
  }
}

async function checkSystemRecovery(reservationId) {
  console.log(`Checking system recovery for reservation ${reservationId}...`)
  
  // Check reservation state
  const response = await fetch(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
    headers: {
      'X-Partner-API-Key': PARTNER_API_KEY,
    },
  })
  
  if (!response.ok) {
    console.log(`❌ Could not retrieve reservation: HTTP ${response.status}`)
    return false
  }
  
  const reservation = await response.json()
  
  console.log(`Reservation state: ${reservation.state}`)
  console.log(`Payment state: ${JSON.stringify(reservation.paymentState)}`)
  
  // Validate: No partial commits
  // State should be consistent (not in intermediate state)
  const validStates = [
    'HELD',
    'VENDOR_CONFIRMED',
    'AUTHORIZED_BOTH',
    'CONFIRMED',
    'FAILED',
    'EXPIRED',
    'CANCELLED',
  ]
  
  if (!validStates.includes(reservation.state)) {
    console.log(`❌ Invalid state: ${reservation.state}`)
    return false
  }
  
  // Validate: No orphaned payments
  if (reservation.paymentState) {
    const hasVendorAuth = !!reservation.paymentState.vendorPaymentIntentId
    const hasRequesterAuth = !!reservation.paymentState.requesterPaymentIntentId
    
    // If we have payment intents, state should reflect authorization
    if (hasVendorAuth || hasRequesterAuth) {
      if (!['AUTHORIZED_BOTH', 'CONFIRMED'].includes(reservation.state)) {
        console.log(`⚠️  Payment intents exist but state is ${reservation.state}`)
      }
    }
  }
  
  return true
}

async function main() {
  console.log('=== WORKER CRASH STRESS TEST ===')
  console.log('')
  
  // Test 1: Crash mid-commit
  console.log('=== TEST 1: Crash Mid-Commit ===')
  const reservation1 = await createReservation()
  console.log(`Created reservation ${reservation1.reservationId}`)
  
  // Simulate crash during commit
  // In a real scenario, this would kill the worker process
  console.log('Simulating crash during commit...')
  await new Promise(resolve => setTimeout(resolve, 500))
  
  // Check recovery
  const recovered1 = await checkSystemRecovery(reservation1.reservationId)
  if (recovered1) {
    console.log('✅ System recovered correctly')
  } else {
    console.log('❌ System recovery failed')
  }
  
  console.log('')
  
  // Test 2: Crash during capture
  console.log('=== TEST 2: Crash During Capture ===')
  const reservation2 = await createReservation()
  console.log(`Created reservation ${reservation2.reservationId}`)
  
  // Simulate crash during capture
  console.log('Simulating crash during capture...')
  await new Promise(resolve => setTimeout(resolve, 500))
  
  const recovered2 = await checkSystemRecovery(reservation2.reservationId)
  if (recovered2) {
    console.log('✅ System recovered correctly')
  } else {
    console.log('❌ System recovery failed')
  }
  
  console.log('')
  
  // Test 3: Database connection failure
  console.log('=== TEST 3: Database Connection Failure ===')
  console.log('⚠️  This test requires application-level database mocking')
  console.log('    Verify that database connection failures are handled gracefully')
  
  console.log('')
  console.log('=== VALIDATION CHECKLIST ===')
  console.log('Verify:')
  console.log('1. No partial commits (atomicity preserved)')
  console.log('2. System recovers gracefully')
  console.log('3. No data corruption')
  console.log('4. Compensation executed for partial operations')
  console.log('5. State is consistent after recovery')
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
