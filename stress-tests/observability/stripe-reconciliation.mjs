/**
 * PART 5.3: Stripe Reconciliation
 * Can Stripe state be reconciled with Bookiji state?
 */

import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || ''
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const SUPABASE_KEY = process.env.SUPABASE_SECRET_KEY || ''

if (!STRIPE_SECRET_KEY) {
  console.error('❌ STRIPE_SECRET_KEY not set')
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Supabase credentials not set')
  process.exit(1)
}

const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' })
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const issues = []

async function findOrphanedPaymentIntents() {
  console.log('Checking for orphaned PaymentIntents...')
  
  // Get recent PaymentIntents from Stripe
  const paymentIntents = await stripe.paymentIntents.list({
    limit: 100,
    created: { gte: Math.floor(Date.now() / 1000) - 86400 }, // Last 24 hours
  })
  
  console.log(`Found ${paymentIntents.data.length} recent PaymentIntents`)
  
  // Check each PaymentIntent against reservations
  for (const pi of paymentIntents.data) {
    const { data: reservation } = await supabase
      .from('reservations')
      .select('id, state, payment_state')
      .or(`payment_state->>vendorPaymentIntentId.eq.${pi.id},payment_state->>requesterPaymentIntentId.eq.${pi.id}`)
      .single()
    
    if (!reservation) {
      issues.push({
        type: 'ORPHANED_PAYMENT_INTENT',
        paymentIntentId: pi.id,
        status: pi.status,
        amount: pi.amount,
        currency: pi.currency,
      })
    }
  }
  
  return issues.filter(i => i.type === 'ORPHANED_PAYMENT_INTENT')
}

async function findMissingPaymentIntents() {
  console.log('Checking for missing PaymentIntents...')
  
  // Get reservations with payment state
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, state, payment_state')
    .not('payment_state', 'is', null)
    .limit(100)
  
  if (!reservations) {
    return []
  }
  
  console.log(`Checking ${reservations.length} reservations with payment state`)
  
  const missing = []
  
  for (const res of reservations) {
    const paymentState = res.payment_state || {}
    const vendorPI = paymentState.vendorPaymentIntentId
    const requesterPI = paymentState.requesterPaymentIntentId
    
    if (vendorPI) {
      try {
        await stripe.paymentIntents.retrieve(vendorPI)
      } catch (error) {
        if (error.code === 'resource_missing') {
          missing.push({
            type: 'MISSING_PAYMENT_INTENT',
            reservationId: res.id,
            paymentIntentId: vendorPI,
            role: 'vendor',
          })
        }
      }
    }
    
    if (requesterPI) {
      try {
        await stripe.paymentIntents.retrieve(requesterPI)
      } catch (error) {
        if (error.code === 'resource_missing') {
          missing.push({
            type: 'MISSING_PAYMENT_INTENT',
            reservationId: res.id,
            paymentIntentId: requesterPI,
            role: 'requester',
          })
        }
      }
    }
  }
  
  return missing
}

async function findMismatchedStates() {
  console.log('Checking for mismatched states...')
  
  // Get reservations in AUTHORIZED_BOTH or COMMIT_IN_PROGRESS
  const { data: reservations } = await supabase
    .from('reservations')
    .select('id, state, payment_state')
    .in('state', ['AUTHORIZED_BOTH', 'COMMIT_IN_PROGRESS', 'COMMITTED'])
    .limit(100)
  
  if (!reservations) {
    return []
  }
  
  console.log(`Checking ${reservations.length} reservations for state mismatches`)
  
  const mismatches = []
  
  for (const res of reservations) {
    const paymentState = res.payment_state || {}
    const vendorPI = paymentState.vendorPaymentIntentId
    const requesterPI = paymentState.requesterPaymentIntentId
    
    if (vendorPI) {
      try {
        const pi = await stripe.paymentIntents.retrieve(vendorPI)
        const expectedStatus = res.state === 'COMMITTED' ? 'succeeded' : 'requires_capture'
        
        if (pi.status !== expectedStatus && pi.status !== 'succeeded') {
          mismatches.push({
            type: 'STATE_MISMATCH',
            reservationId: res.id,
            reservationState: res.state,
            paymentIntentId: vendorPI,
            role: 'vendor',
            expectedStatus,
            actualStatus: pi.status,
          })
        }
      } catch (error) {
        // Already handled in missing check
      }
    }
    
    if (requesterPI) {
      try {
        const pi = await stripe.paymentIntents.retrieve(requesterPI)
        const expectedStatus = res.state === 'COMMITTED' ? 'succeeded' : 'requires_capture'
        
        if (pi.status !== expectedStatus && pi.status !== 'succeeded') {
          mismatches.push({
            type: 'STATE_MISMATCH',
            reservationId: res.id,
            reservationState: res.state,
            paymentIntentId: requesterPI,
            role: 'requester',
            expectedStatus,
            actualStatus: pi.status,
          })
        }
      } catch (error) {
        // Already handled in missing check
      }
    }
  }
  
  return mismatches
}

async function main() {
  console.log('=== STRIPE RECONCILIATION TEST ===')
  console.log('')
  
  const orphaned = await findOrphanedPaymentIntents()
  const missing = await findMissingPaymentIntents()
  const mismatches = await findMismatchedStates()
  
  console.log('')
  console.log('=== RESULTS ===')
  console.log(`Orphaned PaymentIntents: ${orphaned.length}`)
  console.log(`Missing PaymentIntents: ${missing.length}`)
  console.log(`State Mismatches: ${mismatches.length}`)
  console.log('')
  
  if (orphaned.length > 0) {
    console.log('⚠️  Orphaned PaymentIntents found:')
    orphaned.forEach(issue => {
      console.log(`  - ${issue.paymentIntentId}: ${issue.status}, ${issue.amount} ${issue.currency}`)
    })
  }
  
  if (missing.length > 0) {
    console.log('⚠️  Missing PaymentIntents found:')
    missing.forEach(issue => {
      console.log(`  - Reservation ${issue.reservationId}: ${issue.role} PaymentIntent ${issue.paymentIntentId} not found`)
    })
  }
  
  if (mismatches.length > 0) {
    console.log('⚠️  State mismatches found:')
    mismatches.forEach(issue => {
      console.log(`  - Reservation ${issue.reservationId} (${issue.reservationState}): ${issue.role} PaymentIntent ${issue.paymentIntentId} is ${issue.actualStatus}, expected ${issue.expectedStatus}`)
    })
  }
  
  console.log('')
  
  // Validation
  if (orphaned.length === 0 && missing.length === 0 && mismatches.length === 0) {
    console.log('✅ TEST PASSED: Stripe reconciliation successful')
    process.exit(0)
  } else {
    console.log('❌ TEST FAILED: Reconciliation issues found')
    console.log('   This indicates potential data inconsistency')
    process.exit(1)
  }
}

main().catch(error => {
  console.error('Fatal error:', error)
  process.exit(1)
})
