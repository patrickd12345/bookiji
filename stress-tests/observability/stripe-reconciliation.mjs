/**
 * PART 5.3: Reconcile Stripe State vs Bookiji State
 * 
 * Check for discrepancies between Stripe payment intents and Bookiji reservations.
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || ''

async function reconcileStripeVsBookiji() {
  console.log('=== OBSERVABILITY CHECK 5.3 ===')
  console.log('Reconcile Stripe State vs Bookiji State')
  console.log('')
  
  if (!STRIPE_SECRET_KEY) {
    console.log('❌ STRIPE_SECRET_KEY not provided')
    return
  }
  
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.log('❌ Supabase credentials not provided')
    return
  }
  
  const stripe = new Stripe(STRIPE_SECRET_KEY)
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  
  console.log('=== STEP 1: Fetch Stripe Payment Intents ===')
  
  // Fetch recent payment intents from Stripe
  const paymentIntents = await stripe.paymentIntents.list({
    limit: 100,
    created: {
      gte: Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000), // Last 24 hours
    },
  })
  
  console.log(`Found ${paymentIntents.data.length} payment intents in Stripe`)
  console.log('')
  
  console.log('=== STEP 2: Fetch Bookiji Reservations ===')
  
  // Fetch reservations from Bookiji
  const { data: reservations, error } = await supabase
    .from('reservations')
    .select('id, payment_state, state, created_at')
    .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
  
  if (error) {
    console.log(`❌ Error fetching reservations: ${error.message}`)
    return
  }
  
  console.log(`Found ${reservations.length} reservations in Bookiji`)
  console.log('')
  
  console.log('=== STEP 3: Identify Discrepancies ===')
  
  const discrepancies = {
    orphanedPayments: [], // Payment intent exists but no reservation
    missingPayments: [], // Reservation exists but no payment intent
    capturedWithoutBooking: [], // Payment captured but booking not confirmed
    stateMismatch: [], // Payment state doesn't match reservation state
  }
  
  // Build map of reservation payment intents
  const reservationPaymentMap = new Map()
  for (const reservation of reservations || []) {
    if (reservation.payment_state) {
      const paymentState = typeof reservation.payment_state === 'string'
        ? JSON.parse(reservation.payment_state)
        : reservation.payment_state
      
      if (paymentState.vendorPaymentIntentId) {
        reservationPaymentMap.set(paymentState.vendorPaymentIntentId, reservation)
      }
      if (paymentState.requesterPaymentIntentId) {
        reservationPaymentMap.set(paymentState.requesterPaymentIntentId, reservation)
      }
    }
  }
  
  // Check Stripe payment intents
  for (const paymentIntent of paymentIntents.data) {
    const reservation = reservationPaymentMap.get(paymentIntent.id)
    
    if (!reservation) {
      // Payment intent exists but no reservation
      discrepancies.orphanedPayments.push({
        paymentIntentId: paymentIntent.id,
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        created: new Date(paymentIntent.created * 1000).toISOString(),
      })
    } else {
      // Check if state matches
      if (paymentIntent.status === 'succeeded' && reservation.state !== 'CONFIRMED') {
        discrepancies.capturedWithoutBooking.push({
          paymentIntentId: paymentIntent.id,
          reservationId: reservation.id,
          paymentStatus: paymentIntent.status,
          reservationState: reservation.state,
        })
      }
    }
  }
  
  // Check reservations for missing payment intents
  for (const reservation of reservations || []) {
    if (reservation.payment_state) {
      const paymentState = typeof reservation.payment_state === 'string'
        ? JSON.parse(reservation.payment_state)
        : reservation.payment_state
      
      if (paymentState.vendorPaymentIntentId) {
        const paymentIntent = paymentIntents.data.find(pi => pi.id === paymentState.vendorPaymentIntentId)
        if (!paymentIntent) {
          discrepancies.missingPayments.push({
            reservationId: reservation.id,
            paymentIntentId: paymentState.vendorPaymentIntentId,
            type: 'vendor',
          })
        }
      }
      
      if (paymentState.requesterPaymentIntentId) {
        const paymentIntent = paymentIntents.data.find(pi => pi.id === paymentState.requesterPaymentIntentId)
        if (!paymentIntent) {
          discrepancies.missingPayments.push({
            reservationId: reservation.id,
            paymentIntentId: paymentState.requesterPaymentIntentId,
            type: 'requester',
          })
        }
      }
    }
  }
  
  console.log('=== DISCREPANCIES FOUND ===')
  console.log(`Orphaned Payments: ${discrepancies.orphanedPayments.length}`)
  console.log(`Missing Payments: ${discrepancies.missingPayments.length}`)
  console.log(`Captured Without Booking: ${discrepancies.capturedWithoutBooking.length}`)
  console.log(`State Mismatches: ${discrepancies.stateMismatch.length}`)
  console.log('')
  
  if (discrepancies.orphanedPayments.length > 0) {
    console.log('❌ ORPHANED PAYMENTS:')
    for (const orphan of discrepancies.orphanedPayments.slice(0, 5)) {
      console.log(`   - ${orphan.paymentIntentId}: ${orphan.status}, $${orphan.amount / 100}`)
    }
  }
  
  if (discrepancies.missingPayments.length > 0) {
    console.log('❌ MISSING PAYMENTS:')
    for (const missing of discrepancies.missingPayments.slice(0, 5)) {
      console.log(`   - Reservation ${missing.reservationId}: ${missing.type} payment intent ${missing.paymentIntentId} not found`)
    }
  }
  
  if (discrepancies.capturedWithoutBooking.length > 0) {
    console.log('❌ CAPTURED WITHOUT BOOKING:')
    for (const captured of discrepancies.capturedWithoutBooking.slice(0, 5)) {
      console.log(`   - Payment ${captured.paymentIntentId}: ${captured.paymentStatus}, Reservation ${captured.reservationId}: ${captured.reservationState}`)
    }
  }
  
  console.log('')
  console.log('=== VALIDATION ===')
  if (discrepancies.orphanedPayments.length === 0 &&
      discrepancies.missingPayments.length === 0 &&
      discrepancies.capturedWithoutBooking.length === 0) {
    console.log('✅ No discrepancies found - Stripe and Bookiji are in sync')
  } else {
    console.log('❌ Discrepancies found - reconciliation needed')
    process.exit(1)
  }
}

reconcileStripeVsBookiji().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
