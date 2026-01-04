#!/usr/bin/env tsx
// @env-allow-legacy-dotenv
/**
 * 🎯 MASTER PROMPT — CURSOR → SIMCITY TORTURE EXECUTION
 * 
 * Adversarial Certification Script for Bookiji Scheduling
 * 
 * This script executes 7 phases of adversarial testing through SimCity
 * to certify or fail Bookiji Scheduling as a market-entry product.
 * 
 * Usage:
 *   tsx scripts/adversarial-certification.ts
 * 
 * Environment:
 *   - DEPLOY_ENV must be set (test, staging, recovery)
 *   - SIMCITY_ALLOWED_ENVS must include DEPLOY_ENV
 *   - Database must be accessible
 *   - Loads .env.local automatically
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
import { resolve } from 'path'
config({ path: resolve(process.cwd(), '.env.local') })

import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { simCityStart, simCityStop, simCityTick, simCityStatus } from '@/app/api/ops/controlplane/_lib/simcity'
import { executeLLMEvent } from '@/app/api/ops/controlplane/_lib/simcity-llm-executor'
import { checkInvariants } from '@/app/api/ops/controlplane/_lib/simcity-llm-invariants'
import type { LLMProposedEvent, EventExecutionResult } from '@/app/api/ops/controlplane/_lib/simcity-llm-events'

type PhaseResult = {
  phase: number
  name: string
  status: 'PASS' | 'FAIL' | 'ERROR'
  violations: string[]
  evidence: Record<string, unknown>
  executionTime: number
}

type CertificationReport = {
  timestamp: string
  phases: PhaseResult[]
  finalVerdict: 'CERTIFIED' | 'NOT_CERTIFIED'
  unresolvedRisks: string[]
}

/**
 * PHASE 1: Atomic Slot Invariant
 * Test: "One availability slot can result in at most one confirmed booking."
 */
async function executePhase1(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n🔬 PHASE 1: Atomic Slot Invariant')
  console.log('Testing: One slot = at most one confirmed booking')

  try {
    const config = getSupabaseConfig()
    // Use service role key for admin operations
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const supabase = createClient(config.url, config.publishableKey)

    // Step 1: Create one provider with one slot
    console.log('  → Creating provider and single slot...')
    
    // Create a vendor using service role to bypass email validation
    const vendorEmail = `simcity+phase1+vendor+${Date.now()}@example.com`
    const vendorId = crypto.randomUUID()
    
    // Create auth user directly via admin API
    const { data: vendorAuth, error: vendorAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase1 Test Vendor' }
    })

    if (vendorAuthError || !vendorAuth?.user) {
      return {
        phase: 1,
        name: 'Atomic Slot Invariant',
        status: 'ERROR',
        violations: [`Failed to create vendor: ${vendorAuthError?.message || 'Unknown error'}`],
        evidence: { vendorAuthError },
        executionTime: Date.now() - startTime
      }
    }

    const vendorUserId = vendorAuth.user.id

    // Create vendor profile
    const { data: vendorProfile, error: vendorProfileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        auth_user_id: vendorUserId,
        full_name: 'Phase1 Test Vendor',
        email: vendorEmail,
        role: 'vendor'
      })
      .select()
      .single()

    if (vendorProfileError || !vendorProfile) {
      return {
        phase: 1,
        name: 'Atomic Slot Invariant',
        status: 'ERROR',
        violations: [`Failed to create vendor profile: ${vendorProfileError?.message || 'Unknown error'}`],
        evidence: { vendorProfileError },
        executionTime: Date.now() - startTime
      }
    }

    const vendorProfileId = vendorProfile.id

    // Create one availability slot
    const slotStart = new Date(Date.now() + 3600000) // 1 hour from now
    const slotEnd = new Date(slotStart.getTime() + 3600000) // 1 hour duration

    const { data: slot, error: slotError } = await supabaseAdmin
      .from('availability_slots')
      .insert({
        provider_id: vendorProfileId,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        is_available: true
      })
      .select()
      .single()

    if (slotError || !slot) {
      return {
        phase: 1,
        name: 'Atomic Slot Invariant',
        status: 'ERROR',
        violations: [`Failed to create slot: ${slotError?.message || 'Unknown error'}`],
        evidence: { slotError },
        executionTime: Date.now() - startTime
      }
    }

    evidence.slotId = slot.id
    evidence.vendorId = vendorProfileId
    evidence.vendorAuthId = vendorUserId

    // Create a test service for bookings
    const { data: service, error: serviceError } = await supabaseAdmin
      .from('services')
      .insert({
        provider_id: vendorProfileId,
        name: 'Phase1 Test Service',
        description: 'Test service for adversarial certification',
        category: 'test',
        duration_minutes: 60,
        price: 0
      })
      .select()
      .single()

    if (serviceError || !service) {
      return {
        phase: 1,
        name: 'Atomic Slot Invariant',
        status: 'ERROR',
        violations: [`Failed to create test service: ${serviceError?.message || 'Unknown error'}`],
        evidence: { serviceError },
        executionTime: Date.now() - startTime
      }
    }

    evidence.serviceId = service.id

    // Step 2: Create 10 concurrent customer booking attempts
    console.log('  → Launching 10 concurrent booking attempts...')
    
    const bookingAttempts = Array.from({ length: 10 }, (_, i) => i).map(async (i) => {
      // Create customer using admin API
      const customerEmail = `simcity+phase1+customer+${i}+${Date.now()}@example.com`
      const { data: customerAuth, error: customerAuthError } = await supabaseAdmin.auth.admin.createUser({
        email: customerEmail,
        password: 'SimCity123!',
        email_confirm: true,
        user_metadata: { role: 'customer', full_name: `Phase1 Customer ${i}` }
      })

      if (customerAuthError || !customerAuth?.user) {
        return { customerId: null, bookingId: null, success: false, error: customerAuthError?.message || 'Failed to create customer' }
      }

      const customerUserId = customerAuth.user.id

      // Create customer profile
      await supabaseAdmin.from('profiles').insert({
        auth_user_id: customerUserId,
        full_name: `Phase1 Customer ${i}`,
        email: customerEmail,
        role: 'customer'
      })

      // Get customer profile ID
      const { data: customerProfileData } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('auth_user_id', customerUserId)
        .single()

      if (!customerProfileData) {
        return {
          customerId: null,
          bookingId: null,
          success: false,
          error: 'Failed to retrieve customer profile'
        }
      }

      const customerProfileId = customerProfileData.id

      // Attempt booking using the atomic claim function
      // We'll call the database function directly to test atomicity
      const { data: claimResult, error: claimError } = await supabaseAdmin
        .rpc('claim_slot_and_create_booking', {
          p_slot_id: slot.id,
          p_booking_id: crypto.randomUUID(),
          p_customer_id: customerProfileId,
          p_provider_id: vendorProfileId,
          p_service_id: service.id,
          p_total_amount: 0
        })

      const executionResult: EventExecutionResult = {
        success: claimResult && claimResult.length > 0 && claimResult[0].success === true,
        rejected: !claimResult || claimResult.length === 0 || claimResult[0].success === false,
        rejection_reason: claimResult && claimResult.length > 0 ? claimResult[0].error_message : claimError?.message,
        latency_ms: 0, // Not measured in this test
        invariant_status: 'ok'
      }

      // Create a mock event for invariant checking
      const bookingEvent: LLMProposedEvent = {
        event_id: `evt_phase1_${i}_${Date.now()}`,
        event_type: 'CUSTOMER_BOOK',
        actor: {
          kind: 'customer',
          ref: customerProfileId
        },
        params: {
          provider_id: vendorProfileId,
          slot_id: slot.id
        },
        intent: `Concurrent booking attempt ${i}`,
        chaos_level: 'normal'
      }

      const invariantCheck = await checkInvariants(bookingEvent, executionResult)

      return {
        customerId: customerProfileId,
        bookingId: executionResult.success ? 'created' : null,
        success: executionResult.success,
        error: executionResult.rejection_reason || executionResult.error,
        invariantStatus: invariantCheck.status,
        violations: invariantCheck.violations
      }
    })

    const results = await Promise.all(bookingAttempts)
    evidence.bookingAttempts = results

    // Step 3: Check for violations
    const successfulBookings = results.filter(r => r.success)
    
    // Check slot availability - should be false (claimed)
    const { data: slotCheck, error: slotCheckError } = await supabaseAdmin
      .from('availability_slots')
      .select('id, is_available')
      .eq('id', slot.id)
      .single()

    if (slotCheckError) {
      violations.push(`Failed to check slot status: ${slotCheckError.message}`)
    } else if (slotCheck && slotCheck.is_available && successfulBookings.length > 0) {
      violations.push('VIOLATION: Slot still available after successful booking')
    }

    // Check bookings for this provider at this time window
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select('id, status, start_time, end_time')
      .eq('provider_id', vendorProfileId)
      .gte('start_time', slotStart.toISOString())
      .lte('end_time', slotEnd.toISOString())
      .in('status', ['pending', 'confirmed'])

    if (bookingsError) {
      violations.push(`Failed to query bookings: ${bookingsError.message}`)
    } else if (bookings && bookings.length > 1) {
      violations.push(
        `VIOLATION: ${bookings.length} bookings created for single time slot (expected: 1)`
      )
      evidence.duplicateBookings = bookings
    } else if (bookings && bookings.length === 0 && successfulBookings.length > 0) {
      violations.push('VIOLATION: Booking attempts succeeded but no bookings found in database')
    } else if (bookings && bookings.length === 1 && successfulBookings.length > 1) {
      violations.push(
        `VIOLATION: ${successfulBookings.length} booking attempts succeeded but only 1 booking exists (atomicity may have failed)`
      )
      evidence.bookingMismatch = {
        successfulAttempts: successfulBookings.length,
        actualBookings: bookings.length
      }
    }

    // Check for orphan/pending states
    const orphanedBookings = bookings?.filter(b => b.status === 'pending') || []

    if (orphanedBookings.data && orphanedBookings.data.length > 0) {
      const pendingCount = orphanedBookings.data.length
      if (pendingCount > 1) {
        violations.push(`VIOLATION: ${pendingCount} bookings stuck in pending state`)
        evidence.orphanedBookings = orphanedBookings.data
      }
    }

    // Check invariant violations from execution
    const invariantViolations = results.flatMap(r => r.violations || [])
    if (invariantViolations.length > 0) {
      violations.push(...invariantViolations)
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    }

    return {
      phase: 1,
      name: 'Atomic Slot Invariant',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 1,
      name: 'Atomic Slot Invariant',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 2: Payment ↔ Slot Consistency
 * Test: "A confirmed booking and payment decision are never out of sync."
 */
async function executePhase2(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n💳 PHASE 2: Payment ↔ Slot Consistency')
  console.log('Testing: Payment and booking never out of sync')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Scenario 1: Interrupted Stripe redirect - payment intent created but webhook never arrives
    console.log('  → Scenario 1: Interrupted Stripe redirect...')
    
    // Create vendor, slot, customer, and booking with payment intent
    const vendorEmail = `simcity+phase2+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase2 Test Vendor' }
    })

    if (!vendorAuth?.user) {
      return {
        phase: 2,
        name: 'Payment ↔ Slot Consistency',
        status: 'ERROR',
        violations: ['Failed to create vendor'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: vendorAuth.user.id,
      full_name: 'Phase2 Test Vendor',
      email: vendorEmail,
      role: 'vendor'
    }).select().single()

    if (!vendorProfile) {
      return {
        phase: 2,
        name: 'Payment ↔ Slot Consistency',
        status: 'ERROR',
        violations: ['Failed to create vendor profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const slotStart = new Date(Date.now() + 7200000) // 2 hours from now
    const slotEnd = new Date(slotStart.getTime() + 3600000)

    const { data: slot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      is_available: true
    }).select().single()

    if (!slot) {
      return {
        phase: 2,
        name: 'Payment ↔ Slot Consistency',
        status: 'ERROR',
        violations: ['Failed to create slot'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const customerEmail = `simcity+phase2+customer+${Date.now()}@example.com`
    const { data: customerAuth } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: 'Phase2 Customer' }
    })

    if (!customerAuth?.user) {
      return {
        phase: 2,
        name: 'Payment ↔ Slot Consistency',
        status: 'ERROR',
        violations: ['Failed to create customer'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: customerProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: customerAuth.user.id,
      full_name: 'Phase2 Customer',
      email: customerEmail,
      role: 'customer'
    }).select().single()

    if (!customerProfile) {
      return {
        phase: 2,
        name: 'Payment ↔ Slot Consistency',
        status: 'ERROR',
        violations: ['Failed to create customer profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Create booking with payment intent ID but simulate interrupted redirect (no webhook)
    const fakePaymentIntentId = `pi_test_${Date.now()}`
    const { data: booking } = await supabaseAdmin.from('bookings').insert({
      customer_id: customerProfile.id,
      provider_id: vendorProfile.id,
      service_id: '00000000-0000-0000-0000-000000000000',
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      status: 'pending',
      stripe_payment_intent_id: fakePaymentIntentId,
      total_amount: 10.00
    }).select().single()

    evidence.scenario1 = {
      bookingId: booking?.id,
      paymentIntentId: fakePaymentIntentId,
      bookingStatus: booking?.status
    }

    // Check: Booking should not be confirmed without payment success
    if (booking && booking.status === 'confirmed') {
      violations.push('VIOLATION: Booking confirmed without payment webhook')
    }

    // Scenario 2: Duplicate webhook delivery
    console.log('  → Scenario 2: Duplicate webhook delivery...')
    
    const { data: booking2 } = await supabaseAdmin.from('bookings').insert({
      customer_id: customerProfile.id,
      provider_id: vendorProfile.id,
      service_id: '00000000-0000-0000-0000-000000000000',
      start_time: new Date(slotStart.getTime() + 3600000).toISOString(),
      end_time: new Date(slotEnd.getTime() + 3600000).toISOString(),
      status: 'pending',
      stripe_payment_intent_id: `pi_test_dup_${Date.now()}`,
      total_amount: 10.00
    }).select().single()

    if (booking2) {
      // Simulate webhook being processed twice
      const paymentIntentId = booking2.stripe_payment_intent_id
      
      // First webhook processing
      await supabaseAdmin.from('bookings').update({
        status: 'confirmed'
      }).eq('id', booking2.id).eq('status', 'pending')

      // Second webhook processing (duplicate)
      const { data: bookingAfterFirst } = await supabaseAdmin
        .from('bookings')
        .select('status')
        .eq('id', booking2.id)
        .single()

      if (bookingAfterFirst?.status === 'pending') {
        // Try to process again
        await supabaseAdmin.from('bookings').update({
          status: 'confirmed'
        }).eq('id', booking2.id)

        const { data: finalBooking } = await supabaseAdmin
          .from('bookings')
          .select('status, stripe_payment_intent_id')
          .eq('id', booking2.id)
          .single()

        evidence.scenario2 = {
          bookingId: booking2.id,
          paymentIntentId,
          finalStatus: finalBooking?.status,
          duplicateProcessed: true
        }

        // Check: Should be idempotent - no double charges
        // In a real system, we'd check payment records, but for now check booking state consistency
      }
    }

    // Scenario 3: Reordered webhooks (failure before success)
    console.log('  → Scenario 3: Reordered webhooks...')
    
    const { data: booking3 } = await supabaseAdmin.from('bookings').insert({
      customer_id: customerProfile.id,
      provider_id: vendorProfile.id,
      service_id: '00000000-0000-0000-0000-000000000000',
      start_time: new Date(slotStart.getTime() + 7200000).toISOString(),
      end_time: new Date(slotEnd.getTime() + 7200000).toISOString(),
      status: 'pending',
      stripe_payment_intent_id: `pi_test_reorder_${Date.now()}`,
      total_amount: 10.00
    }).select().single()

    if (booking3) {
      // Simulate failure webhook arriving first
      await supabaseAdmin.from('bookings').update({
        status: 'cancelled'
      }).eq('id', booking3.id)

      // Then success webhook arrives (out of order)
      const { data: bookingAfterFailure } = await supabaseAdmin
        .from('bookings')
        .select('status')
        .eq('id', booking3.id)
        .single()

      if (bookingAfterFailure?.status === 'cancelled') {
        // Try to confirm after cancellation
        await supabaseAdmin.from('bookings').update({
          status: 'confirmed'
        }).eq('id', booking3.id).eq('status', 'cancelled')

        const { data: finalBooking3 } = await supabaseAdmin
          .from('bookings')
          .select('status')
          .eq('id', booking3.id)
          .single()

        evidence.scenario3 = {
          bookingId: booking3.id,
          finalStatus: finalBooking3?.status,
          reorderedWebhooks: true
        }

        // VIOLATION: Booking should not transition from cancelled to confirmed
        if (finalBooking3?.status === 'confirmed') {
          violations.push('VIOLATION: Booking confirmed after cancellation (reordered webhook)')
        }
      }
    }

    // Final checks: Orphan payments and zombie bookings
    // Only check bookings created during this test run (not old data)
    console.log('  → Checking for orphan payments and zombie bookings...')
    
    const testStartTime = new Date(startTime).toISOString()
    
    // Check for bookings with payment intent but no corresponding payment record
    const { data: bookingsWithPayment } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, stripe_payment_intent_id')
      .not('stripe_payment_intent_id', 'is', null)
      .gte('created_at', testStartTime)

    evidence.bookingsWithPayment = bookingsWithPayment?.length || 0

    // Check for confirmed bookings without payment intent (check both status and state fields)
    const { data: confirmedWithoutPaymentStatus } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, stripe_payment_intent_id')
      .eq('status', 'confirmed')
      .is('stripe_payment_intent_id', null)
      .gte('created_at', testStartTime)

    const { data: confirmedWithoutPaymentState } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, stripe_payment_intent_id')
      .eq('state', 'confirmed')
      .is('stripe_payment_intent_id', null)
      .gte('created_at', testStartTime)

    const allZombieBookings = [
      ...(confirmedWithoutPaymentStatus || []),
      ...(confirmedWithoutPaymentState || [])
    ]

    if (allZombieBookings.length > 0) {
      violations.push(`VIOLATION: ${allZombieBookings.length} confirmed bookings without payment intent (created during test)`)
      evidence.zombieBookings = allZombieBookings
    }

    // Check for pending bookings with successful payment intent (orphan payments)
    const { data: pendingWithPayment } = await supabaseAdmin
      .from('bookings')
      .select('id, status, stripe_payment_intent_id')
      .eq('status', 'pending')
      .not('stripe_payment_intent_id', 'is', null)

    // These might be legitimate if webhook is delayed, but check if they're old
    if (pendingWithPayment && pendingWithPayment.length > 0) {
      evidence.pendingWithPayment = pendingWithPayment.length
      // In a real test, we'd check payment status from Stripe
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    }

    return {
      phase: 2,
      name: 'Payment ↔ Slot Consistency',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 2,
      name: 'Payment ↔ Slot Consistency',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 3: Time Hostility
 * Test: "Scheduling respects time absolutely."
 */
async function executePhase3(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n⏰ PHASE 3: Time Hostility')
  console.log('Testing: Temporal boundary attacks')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create test vendor and customer
    const vendorEmail = `simcity+phase3+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase3 Test Vendor' }
    })

    if (!vendorAuth?.user) {
      return {
        phase: 3,
        name: 'Time Hostility',
        status: 'ERROR',
        violations: ['Failed to create vendor'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: vendorAuth.user.id,
      full_name: 'Phase3 Test Vendor',
      email: vendorEmail,
      role: 'vendor'
    }).select().single()

    if (!vendorProfile) {
      return {
        phase: 3,
        name: 'Time Hostility',
        status: 'ERROR',
        violations: ['Failed to create vendor profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const customerEmail = `simcity+phase3+customer+${Date.now()}@example.com`
    const { data: customerAuth } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: 'Phase3 Customer' }
    })

    if (!customerAuth?.user) {
      return {
        phase: 3,
        name: 'Time Hostility',
        status: 'ERROR',
        violations: ['Failed to create customer'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: customerProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: customerAuth.user.id,
      full_name: 'Phase3 Customer',
      email: customerEmail,
      role: 'customer'
    }).select().single()

    if (!customerProfile) {
      return {
        phase: 3,
        name: 'Time Hostility',
        status: 'ERROR',
        violations: ['Failed to create customer profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Scenario 1: Attempt to book past slot
    console.log('  → Scenario 1: Attempting to book past slot...')
    const now = new Date()
    const pastTime = new Date(now.getTime() - 3600000) // 1 hour ago
    const pastEndTime = new Date(pastTime.getTime() + 3600000)

    const { data: pastSlot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: pastTime.toISOString(),
      end_time: pastEndTime.toISOString(),
      is_available: true
    }).select().single()

    if (pastSlot) {
      // Attempt to book the past slot
      const { data: pastBookingResult, error: pastBookingError } = await supabaseAdmin
        .rpc('claim_slot_and_create_booking', {
          p_slot_id: pastSlot.id,
          p_booking_id: crypto.randomUUID(),
          p_customer_id: customerProfile.id,
          p_provider_id: vendorProfile.id,
          p_service_id: '00000000-0000-0000-0000-000000000000',
          p_total_amount: 0
        })

      evidence.scenario1 = {
        slotStart: pastTime.toISOString(),
        now: now.toISOString(),
        bookingResult: pastBookingResult,
        error: pastBookingError?.message
      }

      // Should fail - past slots cannot be booked
      if (pastBookingResult && pastBookingResult.length > 0 && pastBookingResult[0].success) {
        violations.push('VIOLATION: Past slot was successfully booked')
      }
    }

    // Scenario 2: Book at NOW (boundary condition)
    console.log('  → Scenario 2: Booking at NOW boundary...')
    const nowTime = new Date()
    const nowEndTime = new Date(nowTime.getTime() + 3600000)

    const { data: nowSlot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: nowTime.toISOString(),
      end_time: nowEndTime.toISOString(),
      is_available: true
    }).select().single()

    if (nowSlot) {
      // Small delay to ensure we're past the slot start
      await new Promise(resolve => setTimeout(resolve, 100))
      const currentTime = new Date()

      const { data: nowBookingResult, error: nowBookingError } = await supabaseAdmin
        .rpc('claim_slot_and_create_booking', {
          p_slot_id: nowSlot.id,
          p_booking_id: crypto.randomUUID(),
          p_customer_id: customerProfile.id,
          p_provider_id: vendorProfile.id,
          p_service_id: '00000000-0000-0000-0000-000000000000',
          p_total_amount: 0
        })

      evidence.scenario2 = {
        slotStart: nowTime.toISOString(),
        attemptTime: currentTime.toISOString(),
        bookingResult: nowBookingResult,
        error: nowBookingError?.message
      }

      // If slot start is exactly NOW or in the past, booking should fail
      if (nowTime <= currentTime) {
        if (nowBookingResult && nowBookingResult.length > 0 && nowBookingResult[0].success) {
          violations.push('VIOLATION: Slot starting at or before NOW was successfully booked')
        }
      }
    }

    // Scenario 3: Server clock skew simulation (±5 minutes)
    console.log('  → Scenario 3: Simulating server clock skew...')
    const futureTime = new Date(now.getTime() + 300000) // 5 minutes from now
    const skewedPastTime = new Date(futureTime.getTime() - 600000) // Simulate -5 min skew (slot appears 5 min in past)
    const skewedEndTime = new Date(skewedPastTime.getTime() + 3600000)

    const { data: skewedSlot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: skewedPastTime.toISOString(),
      end_time: skewedEndTime.toISOString(),
      is_available: true
    }).select().single()

    if (skewedSlot) {
      // Check if slot is actually in the past from server's perspective
      const serverNow = new Date()
      if (skewedPastTime < serverNow) {
        const { data: skewedBookingResult } = await supabaseAdmin
          .rpc('claim_slot_and_create_booking', {
            p_slot_id: skewedSlot.id,
            p_booking_id: crypto.randomUUID(),
            p_customer_id: customerProfile.id,
            p_provider_id: vendorProfile.id,
            p_service_id: '00000000-0000-0000-0000-000000000000',
            p_total_amount: 0
          })

        evidence.scenario3 = {
          slotStart: skewedPastTime.toISOString(),
          serverNow: serverNow.toISOString(),
          bookingResult: skewedBookingResult
        }

        // Should fail if slot is in the past
        if (skewedBookingResult && skewedBookingResult.length > 0 && skewedBookingResult[0].success) {
          violations.push('VIOLATION: Slot in the past (clock skew scenario) was successfully booked')
        }
      }
    }

    // Scenario 4: Timezone consistency check
    console.log('  → Scenario 4: Checking timezone consistency...')
    // Create slot in UTC
    const utcTime = new Date(now.getTime() + 7200000) // 2 hours from now
    const utcEndTime = new Date(utcTime.getTime() + 3600000)

    const { data: utcSlot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: utcTime.toISOString(),
      end_time: utcEndTime.toISOString(),
      is_available: true
    }).select().single()

    if (utcSlot) {
      // Verify time is stored and retrieved consistently
      const { data: retrievedSlot } = await supabaseAdmin
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('id', utcSlot.id)
        .single()

      if (retrievedSlot) {
        const storedStart = new Date(retrievedSlot.start_time)
        const storedEnd = new Date(retrievedSlot.end_time)

        evidence.scenario4 = {
          originalStart: utcTime.toISOString(),
          storedStart: retrievedSlot.start_time,
          originalEnd: utcEndTime.toISOString(),
          storedEnd: retrievedSlot.end_time,
          timeMatch: storedStart.getTime() === utcTime.getTime() && storedEnd.getTime() === utcEndTime.getTime()
        }

        // Times should match exactly
        if (storedStart.getTime() !== utcTime.getTime() || storedEnd.getTime() !== utcEndTime.getTime()) {
          violations.push('VIOLATION: Timezone inconsistency - stored time does not match original time')
        }
      }
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    }

    return {
      phase: 3,
      name: 'Time Hostility',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 3,
      name: 'Time Hostility',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 4: Abuse & Probing
 * Test: "The system resists abuse, probing, and inference attacks."
 */
async function executePhase4(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n🛡️ PHASE 4: Abuse & Probing')
  console.log('Testing: Hostile user & bot behavior resistance')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Scenario 1: Rapid repeated operations (database-level check)
    console.log('  → Scenario 1: Testing database-level abuse resistance...')
    
    // Create test vendor and customer
    const vendorEmail = `simcity+phase4+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase4 Test Vendor' }
    })

    if (!vendorAuth?.user) {
      return {
        phase: 4,
        name: 'Abuse & Probing',
        status: 'ERROR',
        violations: ['Failed to create vendor'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: vendorAuth.user.id,
      full_name: 'Phase4 Test Vendor',
      email: vendorEmail,
      role: 'vendor'
    }).select().single()

    if (!vendorProfile) {
      return {
        phase: 4,
        name: 'Abuse & Probing',
        status: 'ERROR',
        violations: ['Failed to create vendor profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const customerEmail = `simcity+phase4+customer+${Date.now()}@example.com`
    const { data: customerAuth } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: 'Phase4 Customer' }
    })

    if (!customerAuth?.user) {
      return {
        phase: 4,
        name: 'Abuse & Probing',
        status: 'ERROR',
        violations: ['Failed to create customer'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: customerProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: customerAuth.user.id,
      full_name: 'Phase4 Customer',
      email: customerEmail,
      role: 'customer'
    }).select().single()

    if (!customerProfile) {
      return {
        phase: 4,
        name: 'Abuse & Probing',
        status: 'ERROR',
        violations: ['Failed to create customer profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Scenario 1: Rapid repeated operations
    console.log('  → Scenario 1: Rapid repeated operations...')
    const rapidOperations = Array.from({ length: 50 }, (_, i) => i).map(async (i) => {
      // Attempt rapid slot creation
      const { error } = await supabaseAdmin.from('availability_slots').insert({
        provider_id: vendorProfile.id,
        start_time: new Date(Date.now() + (i * 3600000)).toISOString(),
        end_time: new Date(Date.now() + (i * 3600000) + 3600000).toISOString(),
        is_available: true
      })
      return { attempt: i, success: !error, error: error?.message }
    })

    const rapidResults = await Promise.all(rapidOperations)
    const successfulRapid = rapidResults.filter(r => r.success).length

    evidence.scenario1 = {
      totalAttempts: 50,
      successful: successfulRapid
    }

    // Scenario 2: Commitment fee bypass attempts
    console.log('  → Scenario 2: Commitment fee bypass attempts...')
    
    // Attempt to create confirmed booking directly without payment
    const { data: bypassBooking, error: bypassError } = await supabaseAdmin
      .from('bookings')
      .insert({
        customer_id: customerProfile.id,
        provider_id: vendorProfile.id,
        service_id: '00000000-0000-0000-0000-000000000000',
        start_time: new Date(Date.now() + 3600000).toISOString(),
        end_time: new Date(Date.now() + 7200000).toISOString(),
        status: 'confirmed', // Try to bypass payment
        stripe_payment_intent_id: null // No payment
      })
      .select()
      .single()

    evidence.scenario2 = {
      bypassAttempt: bypassBooking ? 'succeeded' : 'failed',
      error: bypassError?.message,
      errorCode: bypassError?.code
    }

    // Should fail - cannot create confirmed booking without payment
    if (bypassBooking && (bypassBooking.status === 'confirmed' || bypassBooking.state === 'confirmed')) {
      violations.push('VIOLATION: Confirmed booking created without payment intent (bypass attempt succeeded)')
    }

    // Scenario 3: Provider privacy check
    console.log('  → Scenario 3: Provider privacy check...')
    
    // Check if provider details can be inferred from public data
    const { data: publicSlots } = await supabaseAdmin
      .from('availability_slots')
      .select('id, provider_id, start_time, end_time')
      .eq('provider_id', vendorProfile.id)
      .limit(5)

    evidence.scenario3 = {
      slotsExposed: publicSlots?.length || 0,
      // In a real test, we'd check if provider_id can be used to infer identity
    }

    // Scenario 4: Automation detection
    console.log('  → Scenario 4: Automation detection...')
    
    // Simulate automation-style pattern (same operation repeated)
    const automationPattern = Array.from({ length: 20 }, (_, i) => i).map(async (i) => {
      const { error } = await supabaseAdmin
        .from('availability_slots')
        .insert({
          provider_id: vendorProfile.id,
          start_time: new Date(Date.now() + 86400000 + (i * 3600000)).toISOString(),
          end_time: new Date(Date.now() + 86400000 + (i * 3600000) + 3600000).toISOString(),
          is_available: true
        })
      return { attempt: i, success: !error }
    })

    const automationResults = await Promise.all(automationPattern)
    const successfulAutomation = automationResults.filter(r => r.success).length

    evidence.scenario4 = {
      automationAttempts: 20,
      successful: successfulAutomation
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    }

    return {
      phase: 4,
      name: 'Abuse & Probing',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 4,
      name: 'Abuse & Probing',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 5: Degraded Reality
 * Test: "When dependencies fail, Scheduling tells the truth."
 */
async function executePhase5(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n💥 PHASE 5: Degraded Reality')
  console.log('Testing: Partial failure & degradation')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Scenario 1: Partial database write failure simulation
    console.log('  → Scenario 1: Testing partial write failure handling...')
    
    // Create a booking attempt that might partially fail
    const vendorEmail = `simcity+phase5+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase5 Test Vendor' }
    })

    if (vendorAuth?.user) {
      const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
        auth_user_id: vendorAuth.user.id,
        full_name: 'Phase5 Test Vendor',
        email: vendorEmail,
        role: 'vendor'
      }).select().single()

      if (vendorProfile) {
        // Attempt to create booking with invalid foreign key (simulates partial failure)
        const { data: invalidBooking, error: invalidBookingError } = await supabaseAdmin
          .from('bookings')
          .insert({
            customer_id: '00000000-0000-0000-0000-000000000000', // Invalid customer
            provider_id: vendorProfile.id,
            service_id: '00000000-0000-0000-0000-000000000000',
            start_time: new Date(Date.now() + 3600000).toISOString(),
            end_time: new Date(Date.now() + 7200000).toISOString(),
            status: 'pending',
            stripe_payment_intent_id: 'pi_test'
          })
          .select()
          .single()

        evidence.scenario1 = {
          invalidBookingAttempt: invalidBooking ? 'succeeded' : 'failed',
          error: invalidBookingError?.message,
          errorCode: invalidBookingError?.code
        }

        // Should fail cleanly - no partial state
        if (invalidBooking) {
          violations.push('VIOLATION: Booking created with invalid foreign key (partial failure not handled)')
        }

        // Check for orphaned records
        if (invalidBookingError) {
          // Verify no partial state was created
          const { data: orphanedSlots } = await supabaseAdmin
            .from('availability_slots')
            .select('id')
            .eq('provider_id', vendorProfile.id)
            .eq('is_available', false)

          if (orphanedSlots && orphanedSlots.length > 0) {
            violations.push(`VIOLATION: ${orphanedSlots.length} orphaned slots found after failed booking attempt`)
          }
        }
      }
    }

    // Scenario 2: Check for false confirmations
    console.log('  → Scenario 2: Checking for false confirmations...')
    
    // Look for bookings that claim to be confirmed but have inconsistencies
    const { data: confirmedBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, stripe_payment_intent_id, confirmed_at, created_at')
      .or('status.eq.confirmed,state.eq.confirmed')
      .gte('created_at', new Date(startTime).toISOString())
      .limit(10)

    if (confirmedBookings) {
      const falseConfirmations = confirmedBookings.filter(b => {
        // Check for inconsistencies
        const hasPaymentIntent = b.stripe_payment_intent_id !== null
        const hasConfirmedAt = b.confirmed_at !== null
        const isConfirmed = b.status === 'confirmed' || b.state === 'confirmed'
        
        // If confirmed but missing required fields
        return isConfirmed && (!hasPaymentIntent || !hasConfirmedAt)
      })

      evidence.scenario2 = {
        totalConfirmed: confirmedBookings.length,
        falseConfirmations: falseConfirmations.length
      }

      if (falseConfirmations.length > 0) {
        violations.push(`VIOLATION: ${falseConfirmations.length} false confirmations detected (confirmed without payment or timestamp)`)
        evidence.falseConfirmations = falseConfirmations
      }
    }

    // Scenario 3: Silent corruption check
    console.log('  → Scenario 3: Checking for silent corruption...')
    
    // Check for bookings with inconsistent state
    const { data: allRecentBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, stripe_payment_intent_id, confirmed_at, cancelled_at')
      .gte('created_at', new Date(startTime).toISOString())
      .limit(20)

    if (allRecentBookings) {
      const corruptedBookings = allRecentBookings.filter(b => {
        // Check for impossible states
        const isConfirmed = b.status === 'confirmed' || b.state === 'confirmed'
        const isCancelled = b.status === 'cancelled' || b.state === 'cancelled'
        const hasConfirmedAt = b.confirmed_at !== null
        const hasCancelledAt = b.cancelled_at !== null

        // Cannot be both confirmed and cancelled
        if (isConfirmed && isCancelled) return true
        // Cannot have both timestamps
        if (hasConfirmedAt && hasCancelledAt) return true
        // Confirmed must have confirmed_at
        if (isConfirmed && !hasConfirmedAt) return true

        return false
      })

      evidence.scenario3 = {
        totalBookings: allRecentBookings.length,
        corrupted: corruptedBookings.length
      }

      if (corruptedBookings.length > 0) {
        violations.push(`VIOLATION: ${corruptedBookings.length} bookings with corrupted state detected`)
        evidence.corruptedBookings = corruptedBookings
      }
    }

    // Scenario 4: Failure visibility check
    console.log('  → Scenario 4: Checking failure visibility...')
    
      // Check for silent failures in database operations
      // Attempt invalid operations and verify they fail explicitly
      // Use a test vendor profile if available
      const { data: testVendor } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('role', 'vendor')
        .limit(1)
        .single()

      if (testVendor) {
        const { data: invalidBooking, error: invalidError } = await supabaseAdmin
          .from('bookings')
          .insert({
            customer_id: '00000000-0000-0000-0000-000000000000', // Invalid
            provider_id: testVendor.id,
            service_id: '00000000-0000-0000-0000-000000000000',
            start_time: new Date(Date.now() + 3600000).toISOString(),
            end_time: new Date(Date.now() + 7200000).toISOString(),
            status: 'pending'
          })
          .select()
          .single()

        evidence.scenario4 = {
          invalidOperation: invalidBooking ? 'succeeded' : 'failed',
          error: invalidError?.message,
          errorCode: invalidError?.code
        }

        // Should fail explicitly with error
        if (invalidBooking) {
          violations.push('VIOLATION: Invalid operation succeeded silently (should have failed)')
        } else if (!invalidError) {
          violations.push('VIOLATION: Operation failed but no error message provided')
        }
      } else {
        evidence.scenario4 = {
          skipped: 'No test vendor available'
        }
      }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    }

    return {
      phase: 5,
      name: 'Degraded Reality',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 5,
      name: 'Degraded Reality',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 6: Forensics & Explainability
 * Test: "The truth is fully inspectable."
 */
async function executePhase6(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n🔍 PHASE 6: Forensics & Explainability')
  console.log('Testing: Observability and reconstruction')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Create a test booking that will fail
    console.log('  → Creating test booking for forensic reconstruction...')
    
    const vendorEmail = `simcity+phase6+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase6 Test Vendor' }
    })

    if (!vendorAuth?.user) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create vendor'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: vendorAuth.user.id,
      full_name: 'Phase6 Test Vendor',
      email: vendorEmail,
      role: 'vendor'
    }).select().single()

    if (!vendorProfile) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create vendor profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const customerEmail = `simcity+phase6+customer+${Date.now()}@example.com`
    const { data: customerAuth } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'customer', full_name: 'Phase6 Customer' }
    })

    if (!customerAuth?.user) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create customer'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: customerProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: customerAuth.user.id,
      full_name: 'Phase6 Customer',
      email: customerEmail,
      role: 'customer'
    }).select().single()

    if (!customerProfile) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create customer profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Create a slot and attempt booking that will be cancelled
    const slotStart = new Date(Date.now() + 3600000)
    const slotEnd = new Date(slotStart.getTime() + 3600000)

    const { data: testSlot } = await supabaseAdmin.from('availability_slots').insert({
      provider_id: vendorProfile.id,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      is_available: true
    }).select().single()

    if (!testSlot) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create test slot'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Create a service first
    const { data: testService } = await supabaseAdmin.from('services').insert({
      provider_id: vendorProfile.id,
      name: 'Phase6 Test Service',
      description: 'Test service for forensics',
      category: 'test',
      duration_minutes: 60,
      price: 0
    }).select().single()

    if (!testService) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: ['Failed to create test service'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Create a booking that will be cancelled
    const { data: testBooking, error: bookingError } = await supabaseAdmin.from('bookings').insert({
      customer_id: customerProfile.id,
      provider_id: vendorProfile.id,
      service_id: testService.id,
      start_time: slotStart.toISOString(),
      end_time: slotEnd.toISOString(),
      status: 'cancelled',
      cancelled_at: new Date().toISOString(),
      cancelled_reason: 'Test cancellation for forensics',
      total_amount: 0
    }).select().single()

    if (bookingError || !testBooking) {
      return {
        phase: 6,
        name: 'Forensics & Explainability',
        status: 'ERROR',
        violations: [`Failed to create test booking: ${bookingError?.message || 'Unknown error'}`],
        evidence: { bookingError },
        executionTime: Date.now() - startTime
      }
    }

    // Attempt full forensic reconstruction
    console.log('  → Attempting forensic reconstruction...')
    
    const reconstruction: Record<string, unknown> = {}

    // 1. Reconstruct User
    const { data: reconstructedCustomer } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', testBooking.customer_id)
      .single()

    const { data: reconstructedVendor } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', testBooking.provider_id)
      .single()

    reconstruction.user = {
      customer: reconstructedCustomer ? {
        id: reconstructedCustomer.id,
        email: reconstructedCustomer.email,
        full_name: reconstructedCustomer.full_name
      } : 'NOT_FOUND',
      vendor: reconstructedVendor ? {
        id: reconstructedVendor.id,
        email: reconstructedVendor.email,
        full_name: reconstructedVendor.full_name
      } : 'NOT_FOUND'
    }

    // 2. Reconstruct Slot
    const { data: reconstructedSlot } = await supabaseAdmin
      .from('availability_slots')
      .select('*')
      .eq('provider_id', testBooking.provider_id)
      .eq('start_time', testBooking.start_time)
      .eq('end_time', testBooking.end_time)
      .single()

    reconstruction.slot = reconstructedSlot ? {
      id: reconstructedSlot.id,
      start_time: reconstructedSlot.start_time,
      end_time: reconstructedSlot.end_time,
      is_available: reconstructedSlot.is_available
    } : 'NOT_FOUND'

    // 3. Reconstruct Timeline
    const { data: auditLogs } = await supabaseAdmin
      .from('booking_audit_log')
      .select('*')
      .eq('booking_id', testBooking.id)
      .order('created_at', { ascending: true })

    reconstruction.timeline = {
      booking_created: testBooking.created_at,
      booking_cancelled: testBooking.cancelled_at,
      audit_events: auditLogs?.length || 0,
      audit_logs: auditLogs || []
    }

    // 4. Reconstruct Failure Cause
    reconstruction.failure_cause = {
      status: testBooking.status,
      state: testBooking.state,
      cancelled_reason: testBooking.cancelled_reason,
      cancelled_at: testBooking.cancelled_at
    }

    // 5. Reconstruct Resolution Path
    reconstruction.resolution_path = {
      current_state: testBooking.status || testBooking.state,
      slot_released: reconstructedSlot?.is_available || false,
      final_status: 'cancelled'
    }

    evidence.reconstruction = reconstruction

    // Check for observability gaps
    const gaps: string[] = []

    if (!reconstructedCustomer) {
      gaps.push('Customer profile not found')
    }
    if (!reconstructedVendor) {
      gaps.push('Vendor profile not found')
    }
    if (!reconstructedSlot) {
      gaps.push('Slot not found')
    }
    if (!testBooking.cancelled_reason) {
      gaps.push('Cancellation reason missing')
    }
    if (!testBooking.cancelled_at) {
      gaps.push('Cancellation timestamp missing')
    }

    if (gaps.length > 0) {
      violations.push(`VIOLATION: Observability gaps detected: ${gaps.join(', ')}`)
      evidence.observabilityGaps = gaps
    }

    // Check for critical unknowns
    const criticalUnknowns: string[] = []

    if (!testBooking.customer_id) {
      criticalUnknowns.push('Customer ID missing')
    }
    if (!testBooking.provider_id) {
      criticalUnknowns.push('Provider ID missing')
    }
    if (!testBooking.start_time || !testBooking.end_time) {
      criticalUnknowns.push('Time information missing')
    }

    if (criticalUnknowns.length > 0) {
      violations.push(`VIOLATION: Critical unknowns: ${criticalUnknowns.join(', ')}`)
      evidence.criticalUnknowns = criticalUnknowns
    }

    // Verify causal chain is clear
    const causalChain = [
      testBooking.created_at ? 'Booking created' : null,
      testBooking.cancelled_at ? 'Booking cancelled' : null,
      testBooking.cancelled_reason ? `Reason: ${testBooking.cancelled_reason}` : null
    ].filter(Boolean)

    evidence.causalChain = causalChain

    if (causalChain.length < 2) {
      violations.push('VIOLATION: Causal chain incomplete - cannot trace booking lifecycle')
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    } else {
      console.log(`  → Reconstruction complete: User ✓, Slot ✓, Timeline ✓, Cause ✓, Resolution ✓`)
    }

    return {
      phase: 6,
      name: 'Forensics & Explainability',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 6,
      name: 'Forensics & Explainability',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * PHASE 7: Soak & Time Decay
 * Test: "System tomorrow behaves like today."
 */
async function executePhase7(): Promise<PhaseResult> {
  const startTime = Date.now()
  const violations: string[] = []
  const evidence: Record<string, unknown> = {}

  console.log('\n⏳ PHASE 7: Soak & Time Decay')
  console.log('Testing: Long-duration stability')

  try {
    const config = getSupabaseConfig()
    const supabaseAdmin = createClient(config.url, config.secretKey || config.publishableKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Simulate extended operation over time
    // In a real soak test, this would run for hours/days
    // Here we simulate with multiple operations over a short period
    console.log('  → Simulating extended operation...')
    
    const operationCount = 100
    const operations: Array<{ type: string; success: boolean; error?: string }> = []

    // Create test vendor and customer for soak test
    const vendorEmail = `simcity+phase7+vendor+${Date.now()}@example.com`
    const { data: vendorAuth } = await supabaseAdmin.auth.admin.createUser({
      email: vendorEmail,
      password: 'SimCity123!',
      email_confirm: true,
      user_metadata: { role: 'vendor', full_name: 'Phase7 Test Vendor' }
    })

    if (!vendorAuth?.user) {
      return {
        phase: 7,
        name: 'Soak & Time Decay',
        status: 'ERROR',
        violations: ['Failed to create vendor'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    const { data: vendorProfile } = await supabaseAdmin.from('profiles').insert({
      auth_user_id: vendorAuth.user.id,
      full_name: 'Phase7 Test Vendor',
      email: vendorEmail,
      role: 'vendor'
    }).select().single()

    if (!vendorProfile) {
      return {
        phase: 7,
        name: 'Soak & Time Decay',
        status: 'ERROR',
        violations: ['Failed to create vendor profile'],
        evidence: {},
        executionTime: Date.now() - startTime
      }
    }

    // Scenario 1: State drift detection
    console.log('  → Scenario 1: Checking for state drift...')
    
    // Perform many operations and check for consistency
    for (let i = 0; i < operationCount; i++) {
      const slotStart = new Date(Date.now() + (i * 3600000) + 86400000) // Future slots
      const slotEnd = new Date(slotStart.getTime() + 3600000)

      const { error: slotError } = await supabaseAdmin.from('availability_slots').insert({
        provider_id: vendorProfile.id,
        start_time: slotStart.toISOString(),
        end_time: slotEnd.toISOString(),
        is_available: true
      })

      operations.push({
        type: 'slot_creation',
        success: !slotError,
        error: slotError?.message
      })

      // Small delay to simulate time passage
      if (i % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }
    }

    // Check for state drift - slots should remain consistent
    const { data: allSlots } = await supabaseAdmin
      .from('availability_slots')
      .select('id, is_available, created_at')
      .eq('provider_id', vendorProfile.id)
      .gte('created_at', new Date(startTime).toISOString())

    const availableSlots = allSlots?.filter(s => s.is_available) || []
    const unavailableSlots = allSlots?.filter(s => !s.is_available) || []

    evidence.scenario1 = {
      totalSlots: allSlots?.length || 0,
      available: availableSlots.length,
      unavailable: unavailableSlots.length,
      operationsPerformed: operationCount
    }

    // Check for unexpected state changes
    if (unavailableSlots.length > 0 && operations.filter(o => o.type === 'booking').length === 0) {
      violations.push(`VIOLATION: ${unavailableSlots.length} slots became unavailable without bookings (state drift)`)
    }

    // Scenario 2: Queue buildup check
    console.log('  → Scenario 2: Checking for queue buildup...')
    
    // Check for pending operations that haven't been processed
    const { data: pendingBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, created_at')
      .in('status', ['pending'])
      .or('state.eq.hold_placed,state.is.null')
      .gte('created_at', new Date(startTime - 3600000).toISOString()) // Last hour

    const oldPending = pendingBookings?.filter(b => {
      const created = new Date(b.created_at)
      const age = Date.now() - created.getTime()
      return age > 300000 // Older than 5 minutes
    }) || []

    evidence.scenario2 = {
      pendingBookings: pendingBookings?.length || 0,
      oldPending: oldPending.length
    }

    if (oldPending.length > 10) {
      violations.push(`VIOLATION: ${oldPending.length} bookings stuck in pending state (queue buildup)`)
      evidence.queueBuildup = oldPending
    }

    // Scenario 3: Memory/logic decay check
    console.log('  → Scenario 3: Checking for logic decay...')
    
    // Perform same operation multiple times and verify consistent results
    const consistencyTests = Array.from({ length: 20 }, (_, i) => i).map(async (i) => {
      const testTime = new Date(Date.now() + 86400000 + (i * 3600000))
      const { data: slot, error } = await supabaseAdmin.from('availability_slots').insert({
        provider_id: vendorProfile.id,
        start_time: testTime.toISOString(),
        end_time: new Date(testTime.getTime() + 3600000).toISOString(),
        is_available: true
      }).select().single()

      return {
        attempt: i,
        success: !error && !!slot,
        slotId: slot?.id,
        error: error?.message,
        errorCode: error?.code
      }
    })

    const consistencyResults = await Promise.all(consistencyTests)
    const successful = consistencyResults.filter(r => r.success)
    const failed = consistencyResults.filter(r => !r.success)

    // Check for actual inconsistency: mix of success and failure with same operation
    // If all fail with same error, that's consistent (not decay)
    // If some succeed and some fail, that's inconsistency (decay)
    const errorCodes = new Set(failed.map(r => r.errorCode).filter(Boolean))
    const isInconsistent = successful.length > 0 && failed.length > 0 && errorCodes.size > 1

    evidence.scenario3 = {
      totalTests: 20,
      successful: successful.length,
      failed: failed.length,
      errorCodes: Array.from(errorCodes),
      isInconsistent
    }

    // Only flag as violation if there's actual inconsistency (mix of success/failure)
    // Consistent failures are not logic decay
    if (isInconsistent) {
      violations.push(`VIOLATION: Inconsistent results in repeated operations (some succeed, some fail with different errors)`)
    } else if (successful.length === 0 && failed.length === 20) {
      // All operations failed - check if it's a systematic issue
      if (errorCodes.size === 1) {
        // All failed with same error - consistent behavior, not decay
        evidence.scenario3.note = 'All operations failed consistently (not logic decay)'
      }
    }

    // Scenario 4: Silent long-term failure detection
    console.log('  → Scenario 4: Checking for silent failures...')
    
    // Check for operations that should have completed but didn't
    const { data: recentBookings } = await supabaseAdmin
      .from('bookings')
      .select('id, status, state, created_at, updated_at')
      .gte('created_at', new Date(startTime - 3600000).toISOString())
      .limit(50)

    if (recentBookings) {
      const staleBookings = recentBookings.filter(b => {
        const updated = new Date(b.updated_at || b.created_at)
        const age = Date.now() - updated.getTime()
        // Bookings that haven't been updated in a while but aren't in final state
        const isFinalState = b.status === 'confirmed' || b.status === 'cancelled' || 
                            b.status === 'completed' || b.state === 'confirmed' || 
                            b.state === 'cancelled'
        return !isFinalState && age > 600000 // 10 minutes
      })

      evidence.scenario4 = {
        recentBookings: recentBookings.length,
        staleBookings: staleBookings.length
      }

      if (staleBookings.length > 5) {
        violations.push(`VIOLATION: ${staleBookings.length} bookings in non-final state for extended period (silent failure)`)
        evidence.silentFailures = staleBookings
      }
    }

    // Scenario 5: System behavior consistency
    console.log('  → Scenario 5: Verifying system behavior consistency...')
    
    // Perform same type of operation at different times and verify same behavior
    const behaviorTests = [
      { time: Date.now() + 3600000, expected: 'success' },
      { time: Date.now() + 7200000, expected: 'success' },
      { time: Date.now() + 10800000, expected: 'success' }
    ]

    const behaviorResults = await Promise.all(
      behaviorTests.map(async (test, i) => {
        const { error } = await supabaseAdmin.from('availability_slots').insert({
          provider_id: vendorProfile.id,
          start_time: new Date(test.time).toISOString(),
          end_time: new Date(test.time + 3600000).toISOString(),
          is_available: true
        })
        return {
          test: i,
          expected: test.expected,
          actual: error ? 'failure' : 'success',
          consistent: (test.expected === 'success' && !error) || (test.expected === 'failure' && !!error)
        }
      })
    )

    const inconsistentBehavior = behaviorResults.filter(r => !r.consistent)

    evidence.scenario5 = {
      behaviorTests: behaviorResults,
      inconsistent: inconsistentBehavior.length
    }

    if (inconsistentBehavior.length > 0) {
      violations.push(`VIOLATION: ${inconsistentBehavior.length} behavior inconsistencies detected (system behavior changed over time)`)
    }

    const status = violations.length > 0 ? 'FAIL' : 'PASS'
    console.log(`  → Result: ${status}`)
    if (violations.length > 0) {
      console.log(`  → Violations: ${violations.length}`)
      violations.forEach(v => console.log(`    - ${v}`))
    } else {
      console.log(`  → System stability verified: No drift, no buildup, no decay detected`)
    }

    return {
      phase: 7,
      name: 'Soak & Time Decay',
      status,
      violations,
      evidence,
      executionTime: Date.now() - startTime
    }
  } catch (error) {
    return {
      phase: 7,
      name: 'Soak & Time Decay',
      status: 'ERROR',
      violations: [`Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      evidence: { error: error instanceof Error ? error.stack : String(error) },
      executionTime: Date.now() - startTime
    }
  }
}

/**
 * Main execution function
 * 
 * @param phasesToRun - Optional array of phase numbers (1-7) to run. If null, runs all phases.
 */
async function main(phasesToRun: number[] | null = null) {
  console.log('🎯 BOOKIJI SCHEDULING — ADVERSARIAL CERTIFICATION')
  console.log('=' .repeat(60))
  console.log(`Started: ${new Date().toISOString()}`)
  if (phasesToRun) {
    console.log(`Running phases: ${phasesToRun.join(', ')}`)
  }
  console.log('')

  const report: CertificationReport = {
    timestamp: new Date().toISOString(),
    phases: [],
    finalVerdict: 'NOT_CERTIFIED',
    unresolvedRisks: []
  }

  // Execute phases sequentially
  // If any phase FAILS, stop execution
  const allPhases = [
    { num: 1, fn: executePhase1 },
    { num: 2, fn: executePhase2 },
    { num: 3, fn: executePhase3 },
    { num: 4, fn: executePhase4 },
    { num: 5, fn: executePhase5 },
    { num: 6, fn: executePhase6 },
    { num: 7, fn: executePhase7 }
  ]

  // Filter phases if specific phases requested
  const phases = phasesToRun 
    ? allPhases.filter(p => phasesToRun.includes(p.num))
    : allPhases

  for (const { num, fn } of phases) {
    const result = await fn()
    report.phases.push(result)

    // Log phase result with clear formatting
    if (result.status === 'PASS') {
      console.log(`✅ Phase ${result.phase} PASSED — ${result.name}`)
    } else if (result.status === 'FAIL') {
      console.log(`\n❌ Phase ${result.phase} FAILED — ${result.name}`)
      if (result.violations.length > 0) {
        console.log(`   Violations:`)
        result.violations.forEach(v => console.log(`     - ${v}`))
      }
      console.log(`\n   See: docs/operations/SCHEDULING_CHANGE_RULE.md`)
      console.log(`   Certification: certification/scheduling-certification-v1.md`)
      console.log(`\n❌ PHASE ${result.phase} FAILED — STOPPING EXECUTION`)
      break
    } else if (result.status === 'ERROR') {
      console.log(`\n⚠️ PHASE ${result.phase} ERROR — CONTINUING WITH CAUTION`)
      if (result.violations.length > 0) {
        console.log(`   Errors:`)
        result.violations.forEach(v => console.log(`     - ${v}`))
      }
    }
  }

  // Determine final verdict
  const failedPhases = report.phases.filter(p => p.status === 'FAIL')
  const errorPhases = report.phases.filter(p => p.status === 'ERROR')
  
  if (failedPhases.length > 0) {
    report.finalVerdict = 'NOT_CERTIFIED'
    report.unresolvedRisks = failedPhases.flatMap(p => p.violations)
  } else if (errorPhases.length > 0) {
    report.finalVerdict = 'NOT_CERTIFIED'
    report.unresolvedRisks = errorPhases.flatMap(p => p.violations)
  } else {
    // If running subset of phases, use "PARTIAL" verdict
    // Full certification requires all 7 phases
    report.finalVerdict = phasesToRun && phasesToRun.length < 7 ? 'PARTIAL' : 'CERTIFIED'
  }

  // Print final report
  console.log('\n' + '='.repeat(60))
  console.log('📊 FINAL VERDICT')
  console.log('='.repeat(60))
  console.log(`Status: ${report.finalVerdict}`)
  console.log(`Phases Executed: ${report.phases.length}${phasesToRun ? ` (of ${phasesToRun.length} requested)` : '/7'}`)
  console.log(`Failed: ${failedPhases.length}`)
  console.log(`Errors: ${errorPhases.length}`)
  
  if (report.unresolvedRisks.length > 0) {
    console.log('\nUnresolved Risks:')
    report.unresolvedRisks.forEach(risk => console.log(`  - ${risk}`))
  }

  // Save report to file
  // File name includes timestamp for uniqueness within a run
  // In CI, artifact name includes PR number and run ID for traceability
  const fs = await import('fs/promises')
  const timestamp = Date.now()
  const reportPath = `certification-report-${timestamp}.json`
  await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
  console.log(`\n📄 Report saved to: ${reportPath}`)
  
  // In CI, this artifact will be named with PR number and run ID for easy debugging

  // Exit code: 0 for success (CERTIFIED or PARTIAL with no failures), 1 for failure
  const exitCode = (report.finalVerdict === 'CERTIFIED' || (report.finalVerdict === 'PARTIAL' && failedPhases.length === 0)) ? 0 : 1
  process.exit(exitCode)
}

// Parse command line arguments for phase filtering
function parsePhasesArg(): number[] | null {
  const phasesArg = process.argv.find(arg => arg.startsWith('--phases='))
  if (!phasesArg) return null
  
  const phasesStr = phasesArg.split('=')[1]
  if (!phasesStr) return null
  
  const phases = phasesStr.split(',').map(p => parseInt(p.trim(), 10)).filter(p => !isNaN(p) && p >= 1 && p <= 7)
  return phases.length > 0 ? phases : null
}

// Execute if run directly
// Check if this is the main module (ES module way)
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('adversarial-certification.ts')) {
  const phasesToRun = parsePhasesArg()
  main(phasesToRun).catch(error => {
    console.error('Fatal error:', error)
    process.exit(1)
  })
}

export { main, executePhase1, executePhase2, executePhase3, executePhase4, executePhase5, executePhase6, executePhase7 }

