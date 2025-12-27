import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { featureFlags } from '@/config/featureFlags'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

async function webhookHandler(req: NextRequest): Promise<NextResponse> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20'
  })

  if (!featureFlags.beta.core_booking_flow) {
    return NextResponse.json(
      { error: 'Core booking flow not enabled' },
      { status: 403 }
    )
  }

  try {
    const body = await req.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.log(`Processing webhook: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSuccess(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.payment_failed':
        await handlePaymentFailure(event.data.object as Stripe.PaymentIntent)
        break
      
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    // NOTE: Webhooks intentionally bypass the scheduling kill switch.
    // This is correct behavior because:
    // 1. Webhooks only update existing hold_placed bookings (do not create new bookings)
    // 2. Payment processing must complete for holds that were already placed
    // 3. The kill switch prevents NEW confirmations, not completion of in-flight payments
    // If a hold was placed before the switch was flipped, its payment should still process.
    
    // Find the booking for this payment intent
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .eq('state', 'hold_placed') // Only updates existing holds, never creates new bookings
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found for payment intent:', paymentIntent.id)
      return
    }

    // Check if this payment intent was already processed (idempotency)
    const { data: existingOutbox } = await supabase
      .from('payments_outbox')
      .select('*')
      .eq('event_data->>payment_intent_id', paymentIntent.id)
      .eq('status', 'committed')
      .single()

    if (existingOutbox) {
      console.log(`Payment intent ${paymentIntent.id} already processed, skipping`)
      return
    }

    // Update booking state to confirmed (only after payment success)
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'confirmed',
        confirmed_at: new Date().toISOString()
      })
      .eq('id', booking.id)
      .eq('state', 'hold_placed') // Only transition from hold_placed

    if (updateError) {
      console.error('Failed to update booking state:', updateError)
      return
    }

    // Mark outbox entry as committed
    const { error: outboxError } = await supabase
      .from('payments_outbox')
      .update({
        status: 'committed',
        processed_at: new Date().toISOString()
      })
      .eq('event_data->>payment_intent_id', paymentIntent.id)
      .eq('status', 'pending')

    if (outboxError) {
      console.error('Failed to update outbox status:', outboxError)
    }

    // Log the state transition
    await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: booking.id,
        from_state: 'hold_placed',
        to_state: 'confirmed',
        action: 'state_change',
        actor_type: 'webhook',
        actor_id: 'stripe',
        metadata: {
          payment_intent: paymentIntent.id,
          amount_received: paymentIntent.amount,
          customer_id: paymentIntent.customer,
          webhook_event: 'payment_intent.succeeded'
        }
      })

    console.log(`Booking ${booking.id} confirmed via payment success`)

  } catch (error) {
    console.error('Error handling payment success:', error)
  }
}

async function handlePaymentFailure(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    // Find the booking for this payment intent
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .eq('state', 'hold_placed')
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found for payment intent:', paymentIntent.id)
      return
    }

    // Update booking state to cancelled and release slot
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Payment failed'
      })
      .eq('id', booking.id)
      .eq('state', 'hold_placed') // Only transition from hold_placed

    if (updateError) {
      console.error('Failed to update booking state:', updateError)
      return
    }

    // Release the slot by making it available again
    // Get time info from booking or quote
    let startTime = booking.start_time
    let endTime = booking.end_time
    
    // If booking uses quote-based model, get time from quote
    if ((!startTime || !endTime) && booking.quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('start_time, end_time')
        .eq('id', booking.quote_id)
        .single()
      
      if (quote) {
        startTime = quote.start_time
        endTime = quote.end_time
      }
    }
    
    if (booking.provider_id && startTime && endTime) {
      const { error: slotError } = await supabase
        .from('availability_slots')
        .update({
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', booking.provider_id)
        .eq('start_time', startTime)
        .eq('end_time', endTime)

      if (slotError) {
        console.error('Failed to release slot on payment failure:', slotError)
        // Don't fail the webhook - log and continue
      }
    }

    // Mark outbox entry as failed
    const { error: outboxError } = await supabase
      .from('payments_outbox')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: 'Payment failed'
      })
      .eq('event_data->>payment_intent_id', paymentIntent.id)
      .eq('status', 'pending')

    if (outboxError) {
      console.error('Failed to update outbox status:', outboxError)
    }

    // Log the state transition
    await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: booking.id,
        from_state: 'hold_placed',
        to_state: 'cancelled',
        action: 'state_change',
        actor_type: 'webhook',
        actor_id: 'stripe',
        metadata: {
          payment_intent: paymentIntent.id,
          failure_reason: paymentIntent.last_payment_error?.message || 'Unknown payment failure',
          webhook_event: 'payment_intent.payment_failed'
        }
      })

    console.log(`Booking ${booking.id} cancelled due to payment failure`)

  } catch (error) {
    console.error('Error handling payment failure:', error)
  }
}

async function handlePaymentCanceled(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  try {
    // NOTE: Webhooks intentionally bypass the scheduling kill switch.
    // Payment cancellations must be processed to release slots and cancel holds,
    // regardless of kill switch state. This prevents resource leaks.
    
    // Find the booking for this payment intent
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('stripe_payment_intent_id', paymentIntent.id)
      .eq('state', 'hold_placed') // Only updates existing holds
      .single()

    if (bookingError || !booking) {
      console.error('Booking not found for payment intent:', paymentIntent.id)
      return
    }

    // Update booking state to cancelled and release slot
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancelled_reason: 'Payment cancelled'
      })
      .eq('id', booking.id)
      .eq('state', 'hold_placed') // Only transition from hold_placed

    if (updateError) {
      console.error('Failed to update booking state:', updateError)
      return
    }

    // Release the slot by making it available again
    // Get time info from booking or quote
    let startTime = booking.start_time
    let endTime = booking.end_time
    
    // If booking uses quote-based model, get time from quote
    if ((!startTime || !endTime) && booking.quote_id) {
      const { data: quote } = await supabase
        .from('quotes')
        .select('start_time, end_time')
        .eq('id', booking.quote_id)
        .single()
      
      if (quote) {
        startTime = quote.start_time
        endTime = quote.end_time
      }
    }
    
    if (booking.provider_id && startTime && endTime) {
      const { error: slotError } = await supabase
        .from('availability_slots')
        .update({
          is_available: true,
          updated_at: new Date().toISOString()
        })
        .eq('provider_id', booking.provider_id)
        .eq('start_time', startTime)
        .eq('end_time', endTime)

      if (slotError) {
        console.error('Failed to release slot on payment cancellation:', slotError)
        // Don't fail the webhook - log and continue
      }
    }

    // Mark outbox entry as failed
    const { error: outboxError } = await supabase
      .from('payments_outbox')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: 'Payment cancelled'
      })
      .eq('event_data->>payment_intent_id', paymentIntent.id)
      .eq('status', 'pending')

    if (outboxError) {
      console.error('Failed to update outbox status:', outboxError)
    }

    // Log the state transition
    await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: booking.id,
        from_state: 'hold_placed',
        to_state: 'cancelled',
        action: 'state_change',
        actor_type: 'webhook',
        actor_id: 'stripe',
        metadata: {
          payment_intent: paymentIntent.id,
          cancellation_reason: 'Payment cancelled by customer or system',
          webhook_event: 'payment_intent.canceled'
        }
      })

    console.log(`Booking ${booking.id} cancelled due to payment cancellation`)

  } catch (error) {
    console.error('Error handling payment cancellation:', error)
  }
}

export const POST = webhookHandler
