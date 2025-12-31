import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { withSLOProbe } from '@/middleware/sloProbe'
import { featureFlags } from '@/config/featureFlags'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

interface ForceCancelRequest {
  booking_id: string
  reason: 'ADMIN_OVERRIDE' | 'SYSTEM_ERROR' | 'FRAUD_DETECTED' | 'COMPLIANCE_VIOLATION'
  admin_notes?: string
  refund_customer?: boolean
}

const forceCancelHandler = async (req: NextRequest) => {
  try {
    // Check feature flag
    if (!featureFlags.beta.core_booking_flow) {
      return NextResponse.json(
        { error: 'Core booking flow not enabled' },
        { status: 503 }
      )
    }

    const body: ForceCancelRequest = await req.json()
    const { booking_id, reason, admin_notes, refund_customer = true } = body

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

    // Check if booking can be cancelled
    if (['cancelled', 'refunded'].includes(booking.state)) {
      return NextResponse.json(
        { error: `Booking already in final state: ${booking.state}` },
        { status: 400 }
      )
    }

    // Get current state for audit log
    const fromState = booking.state

    // Update booking state to cancelled
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        state: 'cancelled',
        cancelled_at: new Date().toISOString(),
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
        from_state: fromState,
        to_state: 'cancelled',
        action: 'force_cancel',
        actor_type: 'admin',
        actor_id: 'ops_force_cancel_endpoint',
        metadata: {
          reason,
          admin_notes,
          refund_customer,
          cancelled_at: new Date().toISOString(),
          stripe_payment_intent: booking.stripe_payment_intent_id,
          original_state: fromState
        }
      })

    // If customer should be refunded, process refund
    if (refund_customer && booking.price_cents && booking.price_cents > 0) {
      // TODO: Implement actual Stripe refund
      console.warn(`Would refund ${booking.price_cents} cents for force-cancelled booking ${booking_id}`)

      // Update to refunded state
      await supabase
        .from('bookings')
        .update({
          state: 'refunded',
          refunded_at: new Date().toISOString()
        })
        .eq('id', booking_id)

      // Log refund transition
      await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: booking.id,
          from_state: 'cancelled',
          to_state: 'refunded',
          action: 'refund_after_force_cancel',
          actor_type: 'system',
          actor_id: 'ops_force_cancel_endpoint',
          metadata: {
            refund_amount_cents: booking.price_cents,
            refunded_at: new Date().toISOString(),
            force_cancel_reason: reason
          }
        })
    }

    console.warn(`Force-cancelled booking ${booking_id} with reason: ${reason}`)

    return NextResponse.json({
      ok: true,
      data: {
        booking_id,
        cancelled_at: new Date().toISOString(),
        final_state: refund_customer ? 'refunded' : 'cancelled',
        reason,
        admin_notes
      }
    })

  } catch (error) {
    console.error('Error in force-cancel endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = withSLOProbe(forceCancelHandler, '/api/ops/force-cancel')
