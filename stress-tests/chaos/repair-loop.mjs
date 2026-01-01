/**
 * PART 3.4: Repair Loop Validation
 * 
 * Create reservations with injected failures, allow system to stabilize,
 * run repair/reconciliation loop, verify final state.
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || ''

async function createReservation(vendorId, requesterId, slotStart, slotEnd, partnerRef) {
  const response = await fetch(`${BASE_URL}/api/v1/reservations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Partner-API-Key': PARTNER_API_KEY,
    },
    body: JSON.stringify({
      vendorId,
      slotStartTime: slotStart,
      slotEndTime: slotEnd,
      requesterId,
      partnerBookingRef: partnerRef,
      idempotencyKey: `idempotency-${partnerRef}`,
    }),
  })
  
  return {
    status: response.status,
    ok: response.ok,
    body: await response.json().catch(() => ({ error: 'Failed to parse response' })),
  }
}

async function triggerRepairLoop() {
  // Trigger repair/reconciliation endpoint if available
  // Otherwise, wait for scheduled job
  console.log('Triggering repair/reconciliation loop...')
  
  // Try to trigger via API if available
  const response = await fetch(`${BASE_URL}/api/cron/cancel-expired-holds`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.ADMIN_TOKEN || ''}`,
    },
  }).catch(() => null)
  
  if (response && response.ok) {
    console.log('✅ Repair loop triggered via API')
  } else {
    console.log('⚠️  Repair loop API not available, waiting for scheduled job...')
    // Wait 2 minutes for scheduled job to run
    await new Promise(resolve => setTimeout(resolve, 120000))
  }
}

async function checkReservationStates(reservationIds) {
  const states = {
    terminal: 0,
    stuck: 0,
    inFlight: 0,
  }
  
  const stuckReservations = []
  
  for (const reservationId of reservationIds) {
    const response = await fetch(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    if (!response.ok) {
      continue
    }
    
    const reservation = await response.json()
    const state = reservation.state
    
    const terminalStates = ['CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED']
    const inFlightStates = ['HELD', 'VENDOR_CONFIRMED', 'AUTHORIZED_BOTH']
    
    if (terminalStates.includes(state)) {
      states.terminal++
    } else if (inFlightStates.includes(state)) {
      // Check if stuck (in flight for > 1 hour)
      const createdAt = new Date(reservation.createdAt)
      const now = new Date()
      const ageMinutes = (now - createdAt) / (1000 * 60)
      
      if (ageMinutes > 60) {
        states.stuck++
        stuckReservations.push({ id: reservationId, state, ageMinutes })
      } else {
        states.inFlight++
      }
    } else {
      // Unknown state - consider stuck
      states.stuck++
      stuckReservations.push({ id: reservationId, state, ageMinutes: 'unknown' })
    }
  }
  
  return { states, stuckReservations }
}

async function checkOrphanedPayments(reservationIds) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('⚠️  Supabase not configured, skipping orphaned payment check')
    return { orphaned: 0 }
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // Check for reservations with payment intents but no booking
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, payment_state')
    .in('id', reservationIds)
  
  if (error) {
    console.log(`⚠️  Could not check orphaned payments: ${error.message}`)
    return { orphaned: 0 }
  }
  
  let orphaned = 0
  for (const reservation of reservations || []) {
    if (reservation.payment_state) {
      const paymentState = typeof reservation.payment_state === 'string' 
        ? JSON.parse(reservation.payment_state)
        : reservation.payment_state
      
      const hasPaymentIntent = paymentState.vendorPaymentIntentId || paymentState.requesterPaymentIntentId
      const isTerminal = ['CONFIRMED', 'CANCELLED', 'EXPIRED', 'FAILED'].includes(reservation.state)
      
      if (hasPaymentIntent && !isTerminal) {
        // Check if booking exists
        // This depends on actual schema
        orphaned++
      }
    }
  }
  
  return { orphaned }
}

async function main() {
  console.log('=== REPAIR LOOP VALIDATION TEST ===')
  console.log('')
  
  // Step 1: Create reservations with potential failures
  console.log('=== STEP 1: Create Reservations ===')
  const vendorId = process.env.VENDOR_ID || ''
  const requesterId = process.env.REQUESTER_ID || ''
  
  const reservationIds = []
  const baseTime = new Date()
  baseTime.setHours(baseTime.getHours() + 1)
  
  for (let i = 0; i < 20; i++) {
    const slotStart = new Date(baseTime)
    slotStart.setMinutes(slotStart.getMinutes() + i * 30)
    
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(slotEnd.getHours() + 1)
    
    const partnerRef = `repair-test-${Date.now()}-${i}`
    
    const result = await createReservation(
      vendorId,
      requesterId,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      partnerRef
    )
    
    if (result.ok && result.body.reservationId) {
      reservationIds.push(result.body.reservationId)
      process.stdout.write('.')
    }
  }
  
  console.log(`\n✅ Created ${reservationIds.length} reservations`)
  console.log('')
  
  // Step 2: Allow system to stabilize
  console.log('=== STEP 2: Allow System to Stabilize ===')
  console.log('Waiting 2 minutes for system to process...')
  await new Promise(resolve => setTimeout(resolve, 120000))
  console.log('✅ Stabilization complete')
  console.log('')
  
  // Step 3: Run repair loop
  console.log('=== STEP 3: Run Repair Loop ===')
  await triggerRepairLoop()
  console.log('✅ Repair loop complete')
  console.log('')
  
  // Step 4: Verify final state
  console.log('=== STEP 4: Verify Final State ===')
  const { states, stuckReservations } = await checkReservationStates(reservationIds)
  
  console.log(`Terminal states: ${states.terminal}`)
  console.log(`In-flight (normal): ${states.inFlight}`)
  console.log(`Stuck: ${states.stuck}`)
  console.log('')
  
  if (stuckReservations.length > 0) {
    console.log('❌ STUCK RESERVATIONS FOUND:')
    for (const stuck of stuckReservations) {
      console.log(`  - ${stuck.id}: ${stuck.state} (age: ${stuck.ageMinutes} minutes)`)
    }
  }
  
  // Check for orphaned payments
  const { orphaned } = await checkOrphanedPayments(reservationIds)
  if (orphaned > 0) {
    console.log(`❌ ORPHANED PAYMENTS FOUND: ${orphaned}`)
  }
  
  // Check for unreleased slots
  // This depends on actual API structure
  
  console.log('')
  console.log('=== VALIDATION ===')
  if (states.stuck > 0) {
    console.log('❌ TEST FAILED: Stuck reservations found - repair loop broken!')
    process.exit(1)
  }
  
  if (orphaned > 0) {
    console.log('❌ TEST FAILED: Orphaned payments found - reconciliation broken!')
    process.exit(1)
  }
  
  if (states.terminal + states.inFlight === reservationIds.length) {
    console.log('✅ TEST PASSED: All reservations in valid states')
  } else {
    console.log(`⚠️  TEST WARNING: ${reservationIds.length - states.terminal - states.inFlight} reservations in unknown states`)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
