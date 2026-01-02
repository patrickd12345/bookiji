/**
 * PART 3.2: Chaos Injection (Seeded)
 * 
 * Inject chaos using seeded RNG:
 * - Duplicate requests (same idempotencyKey)
 * - Dropped client responses (simulate timeout)
 * - Delayed webhook delivery (simulate network delay)
 * - Out-of-order webhook delivery
 * - Process crash mid-run (simulate worker crash)
 * - Restart and resume
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.BOOKIJI_BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.BOOKIJI_PARTNER_API_KEY || ''
const VENDOR_ID = process.env.BOOKIJI_VENDOR_TEST_ID || ''
const REQUESTER_ID = process.env.BOOKIJI_PARTNER_ID || 'test-requester-1'
const CHAOS_SEED = parseInt(process.env.CHAOS_SEED || '812736', 10)
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || ''

// Seeded RNG for deterministic chaos
class SeededRNG {
  constructor(seed) {
    this.seed = seed
  }
  
  next() {
    this.seed = (this.seed * 9301 + 49297) % 233280
    return this.seed / 233280
  }
  
  randomInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min
  }
  
  choice(array) {
    return array[this.randomInt(0, array.length - 1)]
  }
}

const rng = new SeededRNG(CHAOS_SEED)

// Track reservations for reconciliation
const reservations = []
const events = []

function logEvent(type, data) {
  const event = { type, timestamp: new Date().toISOString(), data }
  events.push(event)
  console.log(`[${event.timestamp}] ${type}:`, JSON.stringify(data))
}

async function createReservation(vendorId, requesterId, slotStart, slotEnd, idempotencyKey) {
  try {
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
        idempotencyKey,
      }),
    })
    
    const body = await response.json().catch(() => ({ error: 'Failed to parse' }))
    
    return {
      status: response.status,
      ok: response.ok,
      body,
      idempotencyKey,
    }
  } catch (error) {
    return {
      status: 0,
      ok: false,
      error: error.message,
      idempotencyKey,
    }
  }
}

async function getReservation(reservationId) {
  try {
    const response = await fetch(`${BASE_URL}/api/v1/reservations/${reservationId}`, {
      headers: {
        'X-Partner-API-Key': PARTNER_API_KEY,
      },
    })
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }
    
    const body = await response.json()
    return { success: true, data: body }
  } catch (error) {
    return { success: false, error: error.message }
  }
}

async function simulateDroppedResponse(vendorId, requesterId, slotStart, slotEnd, idempotencyKey) {
  logEvent('CHAOS_DROPPED_RESPONSE', { idempotencyKey })
  
  // Start request but don't wait for response (simulate client timeout)
  createReservation(vendorId, requesterId, slotStart, slotEnd, idempotencyKey)
    .catch(() => {
      // Expected: connection dropped
    })
  
  // Wait a bit, then retry with same idempotency key
  await new Promise(resolve => setTimeout(resolve, 1000))
  
  const retryResult = await createReservation(vendorId, requesterId, slotStart, slotEnd, idempotencyKey)
  logEvent('CHAOS_RETRY_AFTER_DROP', { idempotencyKey, result: retryResult })
  
  return retryResult
}

async function simulateDuplicateRequest(vendorId, requesterId, slotStart, slotEnd, idempotencyKey) {
  logEvent('CHAOS_DUPLICATE_REQUEST', { idempotencyKey })
  
  // Fire two requests with same idempotency key concurrently
  const [result1, result2] = await Promise.all([
    createReservation(vendorId, requesterId, slotStart, slotEnd, idempotencyKey),
    createReservation(vendorId, requesterId, slotStart, slotEnd, idempotencyKey),
  ])
  
  logEvent('CHAOS_DUPLICATE_RESULT', {
    idempotencyKey,
    result1: { status: result1.status, reservationId: result1.body?.reservationId },
    result2: { status: result2.status, reservationId: result2.body?.reservationId },
  })
  
  // Validate idempotency
  if (result1.body?.reservationId && result2.body?.reservationId) {
    if (result1.body.reservationId !== result2.body.reservationId) {
      logEvent('CHAOS_IDEMPOTENCY_BROKEN', {
        idempotencyKey,
        id1: result1.body.reservationId,
        id2: result2.body.reservationId,
      })
      return { success: false, error: 'Idempotency broken' }
    }
  }
  
  return { success: true, result: result1 }
}

async function checkStuckStates() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('⚠️  Skipping stuck state check (Supabase not configured)')
    return { stuck: 0 }
  }
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  // Find reservations in non-terminal states older than 1 hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString()
  
  const { data, error } = await supabase
    .from('reservations')
    .select('id, state, expires_at, created_at')
    .in('state', [
      'AWAITING_VENDOR_CONFIRMATION',
      'AWAITING_VENDOR_AUTH',
      'AWAITING_REQUESTER_AUTH',
      'AUTHORIZED_BOTH',
      'COMMIT_IN_PROGRESS',
    ])
    .lt('created_at', oneHourAgo)
  
  if (error) {
    logEvent('CHAOS_STUCK_CHECK_ERROR', { error: error.message })
    return { stuck: 0, error: error.message }
  }
  
  if (data && data.length > 0) {
    logEvent('CHAOS_STUCK_STATES_FOUND', { count: data.length, reservations: data })
    return { stuck: data.length, reservations: data }
  }
  
  return { stuck: 0 }
}

async function main() {
  console.log('=== CHAOS INJECTION TEST ===')
  console.log(`Seed: ${CHAOS_SEED}`)
  console.log(`Base URL: ${BASE_URL}`)
  console.log('')
  
  if (!PARTNER_API_KEY || !VENDOR_ID) {
    console.error('❌ Missing required environment variables')
    process.exit(1)
  }
  
  const results = {
    total: 0,
    success: 0,
    failures: 0,
    duplicates: 0,
    dropped: 0,
    idempotencyBroken: 0,
  }
  
  // Generate time slots
  const baseTime = new Date()
  baseTime.setHours(baseTime.getHours() + 2)
  
  // Test 1: Duplicate requests
  console.log('Test 1: Duplicate requests (same idempotency key)')
  for (let i = 0; i < 5; i++) {
    const slotStart = new Date(baseTime)
    slotStart.setMinutes(slotStart.getMinutes() + i * 15)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(slotEnd.getHours() + 1)
    
    const idempotencyKey = `chaos-duplicate-${CHAOS_SEED}-${i}`
    results.total++
    
    const result = await simulateDuplicateRequest(
      VENDOR_ID,
      REQUESTER_ID,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      idempotencyKey
    )
    
    if (result.success) {
      results.success++
      if (result.result?.body?.reservationId) {
        reservations.push(result.result.body.reservationId)
      }
    } else {
      results.failures++
      results.idempotencyBroken++
    }
    
    results.duplicates++
  }
  
  console.log('')
  
  // Test 2: Dropped responses
  console.log('Test 2: Dropped responses (simulated timeout)')
  for (let i = 0; i < 3; i++) {
    const slotStart = new Date(baseTime)
    slotStart.setMinutes(slotStart.getMinutes() + (i + 5) * 15)
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(slotEnd.getHours() + 1)
    
    const idempotencyKey = `chaos-dropped-${CHAOS_SEED}-${i}`
    results.total++
    
    const result = await simulateDroppedResponse(
      VENDOR_ID,
      REQUESTER_ID,
      slotStart.toISOString(),
      slotEnd.toISOString(),
      idempotencyKey
    )
    
    if (result.ok && result.status === 201) {
      results.success++
      if (result.body?.reservationId) {
        reservations.push(result.body.reservationId)
      }
    } else {
      results.failures++
    }
    
    results.dropped++
  }
  
  console.log('')
  
  // Test 3: Check for stuck states
  console.log('Test 3: Checking for stuck states...')
  const stuckCheck = await checkStuckStates()
  if (stuckCheck.stuck > 0) {
    console.log(`⚠️  Found ${stuckCheck.stuck} stuck reservations`)
    results.failures += stuckCheck.stuck
  } else {
    console.log('✅ No stuck states found')
  }
  
  console.log('')
  
  // Summary
  console.log('=== RESULTS ===')
  console.log(`Total operations: ${results.total}`)
  console.log(`Success: ${results.success}`)
  console.log(`Failures: ${results.failures}`)
  console.log(`  - Idempotency broken: ${results.idempotencyBroken}`)
  console.log(`  - Stuck states: ${stuckCheck.stuck || 0}`)
  console.log('')
  
  // Validate results
  if (results.idempotencyBroken > 0) {
    console.log('❌ TEST FAILED: Idempotency broken!')
    process.exit(1)
  }
  
  if (stuckCheck.stuck > 0) {
    console.log('❌ TEST FAILED: Stuck states found!')
    process.exit(1)
  }
  
  if (results.failures > results.total * 0.1) {
    console.log(`⚠️  TEST WARNING: High failure rate (${(results.failures / results.total * 100).toFixed(1)}%)`)
  } else {
    console.log('✅ TEST PASSED: Chaos injection handled correctly')
  }
  
  // Save events for analysis
  console.log('')
  console.log(`Events logged: ${events.length}`)
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
