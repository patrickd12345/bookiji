import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { withSLOProbe } from '@/middleware/sloProbe'
import { featureFlags } from '@/config/featureFlags'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';
import { assertVendorHasActiveSubscription, SubscriptionRequiredError } from '@/lib/guards/subscriptionGuard';

interface BookingConfirmRequest {
  quote_id: string
  provider_id: string
  stripe_payment_intent_id: string
  idempotency_key: string
  special_instructions?: string
}

interface BookingConfirmResponse {
  booking_id: string
  state: string
  payment_status: string
  expires_at: string
}

async function confirmHandler(req: NextRequest): Promise<NextResponse> {
  if (!featureFlags.beta.core_booking_flow) {
    return NextResponse.json(
      { error: 'Core booking flow not enabled' },
      { status: 403 }
    )
  }

  try {
    const body: BookingConfirmRequest = await req.json()
    
    // Validate required fields
    if (!body.quote_id || !body.provider_id || !body.stripe_payment_intent_id || !body.idempotency_key) {
      return NextResponse.json(
        { error: 'Missing required fields: quote_id, provider_id, stripe_payment_intent_id, idempotency_key' },
        { status: 400 }
      )
    }

    // Check idempotency - if this key was already processed, return the existing booking
    const { data: existingBooking } = await supabase
      .from('bookings')
      .select('*')
      .eq('idempotency_key', body.idempotency_key)
      .single()

    if (existingBooking) {
      console.log(`Idempotency key already processed: ${body.idempotency_key}`)
      return NextResponse.json(
        { 
          error: 'IDEMPOTENT_DUPLICATE',
          message: 'This request has already been processed',
          data: { booking_id: existingBooking.id }
        },
        { status: 409 }
      )
    }

    // Verify quote exists and is still valid
    const { data: quote, error: quoteError } = await supabase
      .from('quotes')
      .select('*')
      .eq('id', body.quote_id)
      .gt('expires_at', new Date().toISOString())
      .single()

    if (quoteError || !quote) {
      return NextResponse.json(
        { error: 'Quote expired or not found' },
        { status: 400 }
      )
    }

    // Verify provider is in the quote candidates
    interface QuoteCandidate {
      id: string
      [key: string]: unknown
    }
    const candidates = (quote.candidates || []) as QuoteCandidate[]
    const selectedProvider = candidates.find((c: QuoteCandidate) => c.id === body.provider_id)
    
    if (!selectedProvider) {
      return NextResponse.json(
        { error: 'Selected provider not found in quote candidates' },
        { status: 400 }
      )
    }

    // Invariant III-1: Server-side subscription gating (vendor must have active subscription to confirm bookings)
    try {
      await assertVendorHasActiveSubscription(body.provider_id);
    } catch (error) {
      if (error instanceof SubscriptionRequiredError) {
        return NextResponse.json(
          { error: error.message },
          { status: 403 }
        );
      }
      throw error;
    }

    // Invariant VI-1: No Past Booking
    // Validate quote start time is in the future (if quote has start_time)
    if (quote.start_time) {
      const now = new Date()
      const quoteStart = new Date(quote.start_time)
      
      if (quoteStart <= now) {
        return NextResponse.json(
          { error: 'Cannot confirm booking in the past' },
          { status: 400 }
        )
      }
    }

    // Create booking with hold_placed state
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: quote.user_id === 'system' ? 'system' : quote.user_id, // Will be updated when user is authenticated
        provider_id: body.provider_id,
        quote_id: body.quote_id,
        state: 'hold_placed',
        price_cents: quote.price_cents,
        stripe_payment_intent_id: body.stripe_payment_intent_id,
        idempotency_key: body.idempotency_key,
        confirmed_at: new Date().toISOString()
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Failed to create booking:', bookingError)
      return NextResponse.json(
        { error: 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Insert into payments outbox for async processing
    const { error: outboxError } = await supabase
      .from('payments_outbox')
      .insert({
        id: crypto.randomUUID(),
        event_type: 'hold_created',
        event_data: {
          booking_id: booking.id,
          payment_intent_id: body.stripe_payment_intent_id,
          amount_cents: featureFlags.payments.hold_amount_cents,
          provider_id: body.provider_id,
          quote_id: body.quote_id
        },
        status: 'pending',
        retry_count: 0,
        created_at: new Date().toISOString()
      })

    if (outboxError) {
      console.error('Failed to insert into payments outbox:', outboxError)
      // Don't fail the request - the booking was created successfully
    }

    // Log the state transition
    const { error: auditError } = await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: booking.id,
        from_state: null,
        to_state: 'hold_placed',
        action: 'state_change',
        actor_type: 'user',
        actor_id: 'system', // Will be updated when user is authenticated
        metadata: {
          payment_intent: body.stripe_payment_intent_id,
          idempotency_key: body.idempotency_key,
          provider_id: body.provider_id,
          special_instructions: body.special_instructions
        }
      })

    if (auditError) {
      console.error('Failed to log audit entry:', auditError)
      // Don't fail the request - the booking was created successfully
    }

    const response: BookingConfirmResponse = {
      booking_id: booking.id,
      state: booking.state,
      payment_status: 'hold_placed',
      expires_at: new Date(Date.now() + featureFlags.payments.hold_timeout_minutes * 60 * 1000).toISOString()
    }

    return NextResponse.json({ ok: true, data: response })

  } catch (error) {
    console.error('Booking confirmation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withSLOProbe(confirmHandler, 'booking_confirm_endpoint')
