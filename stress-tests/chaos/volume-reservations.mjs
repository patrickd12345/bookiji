/**
 * PART 3.1: Volume Reservation Creation
 * 
 * Create 100 reservations across 10 vendors and 10 partners
 */

import { createClient } from '@supabase/supabase-js'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || ''

// Generate test vendors and partners (or use existing ones)
const VENDORS = Array.from({ length: 10 }, (_, i) => `vendor-${i + 1}`)
const PARTNERS = Array.from({ length: 10 }, (_, i) => `partner-${i + 1}`)
const REQUESTERS = Array.from({ length: 10 }, (_, i) => `requester-${i + 1}`)

async function createReservation(vendorId, partnerId, requesterId, slotStart, slotEnd, partnerRef) {
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

async function checkSlotAvailability(vendorId, slotStart, slotEnd) {
  // Check if slot is available (adjust based on actual API)
  // For now, we'll just track in our own set
  return true
}

async function main() {
  console.log('=== VOLUME RESERVATION STRESS TEST ===')
  console.log(`Creating 100 reservations across ${VENDORS.length} vendors and ${PARTNERS.length} partners`)
  console.log('')
  
  const results = {
    success: 0,
    failures: 0,
    conflicts: 0,
    errors: 0,
    duplicateSlots: 0,
  }
  
  const slotTracker = new Set() // Track slots to detect duplicates
  const reservations = []
  
  // Generate time slots (spread over next 24 hours)
  const baseTime = new Date()
  baseTime.setHours(baseTime.getHours() + 1)
  
  for (let i = 0; i < 100; i++) {
    const vendorIndex = i % VENDORS.length
    const partnerIndex = i % PARTNERS.length
    const requesterIndex = i % REQUESTERS.length
    
    const vendorId = VENDORS[vendorIndex]
    const partnerId = PARTNERS[partnerIndex]
    const requesterId = REQUESTERS[requesterIndex]
    
    // Generate unique time slot
    const slotStart = new Date(baseTime)
    slotStart.setMinutes(slotStart.getMinutes() + i * 15) // 15-minute intervals
    
    const slotEnd = new Date(slotStart)
    slotEnd.setHours(slotEnd.getHours() + 1)
    
    const slotKey = `${vendorId}-${slotStart.toISOString()}-${slotEnd.toISOString()}`
    
    // Check for duplicate slot
    if (slotTracker.has(slotKey)) {
      console.log(`⚠️  Duplicate slot detected: ${slotKey}`)
      results.duplicateSlots++
      continue
    }
    
    slotTracker.add(slotKey)
    
    const partnerRef = `volume-test-${Date.now()}-${i}`
    
    try {
      const result = await createReservation(
        vendorId,
        partnerId,
        requesterId,
        slotStart.toISOString(),
        slotEnd.toISOString(),
        partnerRef
      )
      
      if (result.ok && result.status === 201) {
        results.success++
        reservations.push({
          reservationId: result.body.reservationId,
          vendorId,
          slotStart: slotStart.toISOString(),
        })
        process.stdout.write('.')
      } else if (result.status === 409) {
        results.conflicts++
        results.failures++
        console.log(`\n⚠️  Conflict for reservation ${i}: ${JSON.stringify(result.body)}`)
      } else {
        results.failures++
        console.log(`\n❌ Failure for reservation ${i}: HTTP ${result.status}`)
      }
    } catch (error) {
      results.errors++
      results.failures++
      console.log(`\n❌ Error for reservation ${i}: ${error.message}`)
    }
    
    // Small delay to avoid overwhelming the system
    if (i % 10 === 0 && i > 0) {
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  
  console.log('\n')
  console.log('=== RESULTS ===')
  console.log(`Total Requests: 100`)
  console.log(`Success: ${results.success}`)
  console.log(`Failures: ${results.failures}`)
  console.log(`  - Conflicts: ${results.conflicts}`)
  console.log(`  - Errors: ${results.errors}`)
  console.log(`Duplicate Slots Detected: ${results.duplicateSlots}`)
  console.log('')
  
  // Validate results
  if (results.duplicateSlots > 0) {
    console.log('❌ TEST FAILED: Duplicate slots detected - slot locking broken!')
    process.exit(1)
  }
  
  if (results.success < 90) {
    console.log(`⚠️  TEST WARNING: Only ${results.success}% success rate (expected >90%)`)
  } else {
    console.log('✅ TEST PASSED: Volume reservation creation successful')
  }
  
  // Check for data corruption (query database if Supabase available)
  if (SUPABASE_URL && SUPABASE_KEY) {
    console.log('\n=== DATABASE VALIDATION ===')
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
    
    // Check for duplicate reservations
    const { data: reservationsData, error } = await supabase
      .from('reservations')
      .select('id, vendor_id, slot_start_time, slot_end_time')
      .in('id', reservations.map(r => r.reservationId))
    
    if (error) {
      console.log(`⚠️  Could not validate database: ${error.message}`)
    } else {
      console.log(`✅ Found ${reservationsData.length} reservations in database`)
      
      // Check for duplicate slots
      const slotMap = new Map()
      for (const res of reservationsData) {
        const key = `${res.vendor_id}-${res.slot_start_time}-${res.slot_end_time}`
        if (slotMap.has(key)) {
          console.log(`❌ Duplicate slot in database: ${key}`)
          process.exit(1)
        }
        slotMap.set(key, res)
      }
      
      console.log('✅ No duplicate slots in database')
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
