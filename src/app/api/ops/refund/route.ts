import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { withSLOProbe } from '@/middleware/sloProbe'
import { featureFlags } from '@/config/featureFlags'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface RefundRequest {
  booking_id: string
  reason: 'CUSTOMER_REQUEST' | 'PROVIDER_CANCELLED' | 'SERVICE_ISSUE' | 'ADMIN_OVERRIDE'
  amount_cents?: number // Optional partial refund
  admin_notes?: string
}

const handler = async (req: NextRequest): Promise<NextResponse> => {
  try {
    // Check feature flag
    if (!featureFlags.beta.core_booking_flow) {
      return NextResponse.json(
        { error: 'Core booking flow not enabled' },
        { status: 503 }
      )
    }

    const body: RefundRequest = await req.json()
    const { booking_id, reason, amount_cents, admin_notes } = body

    if (!booking_id || !reason) {
      return NextResponse.json(
        { error: 'Missing required fields: booking_id, reason' },
        { status: 400 }
      )
    }

    // Get booking details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }

    // Check if booking can be refunded
    if (!['provider_confirmed', 'receipt_issued'].includes(booking.state)) {
      return NextResponse.json(
        { error: `Cannot refund booking in state: ${booking.state}` },
        { status: 400 }
      )
    }

    // Determine refund amount
    const refundAmount = amount_cents || booking.price_cents || 0
    
    if (refundAmount <= 0 || refundAmount > (booking.price_cents || 0)) {
      return NextResponse.json(
        { error: 'Invalid refund amount' },
        { status: 400 }
      )
    }

    // TODO: Implement actual Stripe refund
    // For now, simulate successful refund
    console.log(`Would refund ${refundAmount} cents for booking ${booking_id}`)

    // Update booking state
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'refunded',
        refunded_at: new Date().toISOString(),
        cancelled_reason: reason
      })
      .eq('id', booking_id)

    if (updateError) {
      throw new Error(`Failed to update booking state: ${updateError.message}`)
    }

    // Log the state transition
    await supabase
      .from('booking_audit_log')
      .insert({
        booking_id: booking.id,
        from_state: booking.state,
        to_state: 'refunded',
        action: 'refund',
        actor_type: 'admin',
        actor_id: 'ops_refund_endpoint',
        metadata: {
          reason,
          refund_amount_cents: refundAmount,
          original_price_cents: booking.price_cents,
          admin_notes,
          refunded_at: new Date().toISOString(),
          stripe_payment_intent: booking.stripe_payment_intent_id
        }
      })

    // If this was a partial refund, transition back to provider_confirmed
    if (amount_cents && amount_cents < (booking.price_cents || 0)) {
      await supabase
        .from('bookings')
        .update({
          state: 'provider_confirmed',
          price_cents: (booking.price_cents || 0) - amount_cents
        })
        .eq('id', booking_id)

      await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: booking.id,
          from_state: 'refunded',
          to_state: 'provider_confirmed',
          action: 'partial_refund_adjustment',
          actor_type: 'system',
          actor_id: 'ops_refund_endpoint',
          metadata: {
            partial_refund_amount: amount_cents,
            new_price_cents: (booking.price_cents || 0) - amount_cents,
            adjusted_at: new Date().toISOString()
          }
        })
    }

    console.log(`Refund processed for booking ${booking_id}: ${refundAmount} cents`)

    return NextResponse.json({
      ok: true,
      data: {
        booking_id,
        refund_amount_cents: refundAmount,
        new_state: amount_cents && amount_cents < (booking.price_cents || 0) 
          ? 'provider_confirmed' 
          : 'refunded',
        refunded_at: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Error in refund endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withSLOProbe(handler, '/api/ops/refund')
