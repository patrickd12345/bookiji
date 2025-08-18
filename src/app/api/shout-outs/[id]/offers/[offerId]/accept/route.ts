import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; offerId: string }> }
) {
  try {
    const { id, offerId } = await params
    const cookieStore = await cookies()
    const config = getSupabaseConfig()
    const supabase = createServerClient(
      config.url,
      config.publishableKey || config.anonKey,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value
          }
        }
      }
    )

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Verify the shout-out belongs to the user and is still active
    const { data: shoutOut, error: shoutOutError } = await supabase
      .from('shout_outs')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (shoutOutError || !shoutOut) {
      return NextResponse.json(
        { error: 'Shout-out not found' },
        { status: 404 }
      )
    }

    if (shoutOut.status !== 'active') {
      return NextResponse.json(
        { error: 'Shout-out is no longer active' },
        { status: 400 }
      )
    }

    if (new Date() > new Date(shoutOut.expires_at)) {
      return NextResponse.json(
        { error: 'Shout-out has expired' },
        { status: 400 }
      )
    }

    // Get the offer details
    const { data: offer, error: offerError } = await supabase
      .from('shout_out_offers')
      .select(`
        *,
        vendor:vendor_id (
          id,
          full_name,
          email
        ),
        service:service_id (
          id,
          name,
          duration_minutes
        )
      `)
      .eq('id', offerId)
      .eq('shout_out_id', id)
      .eq('status', 'pending')
      .single()

    if (offerError || !offer) {
      return NextResponse.json(
        { error: 'Offer not found or no longer available' },
        { status: 404 }
      )
    }

    // Start a database transaction
    const { data: transactionResult, error: transactionError } = await supabase.rpc(
      'accept_shout_out_offer',
      {
        p_shout_out_id: id,
        p_offer_id: offerId,
        p_customer_id: user.id,
        p_vendor_id: offer.vendor_id,
        p_service_id: offer.service_id,
        p_slot_start: offer.slot_start,
        p_slot_end: offer.slot_end,
        p_price_cents: offer.price_cents
      }
    )

    // If the function doesn't exist, do the transaction manually
    if (transactionError?.message?.includes('function') || transactionError?.code === '42883') {
      // Manual transaction: create booking and update statuses
      try {
        // 1. Create the booking
        const { data: booking, error: bookingError } = await supabase
          .from('bookings')
          .insert([{
            customer_id: user.id,
            vendor_id: offer.vendor_id,
            service_id: offer.service_id,
            slot_start: offer.slot_start,
            slot_end: offer.slot_end,
            status: 'pending',
            total_amount_cents: offer.price_cents,
            commitment_fee_paid: false,
            vendor_fee_paid: false,
            notes: `Created from shout-out offer: ${offer.message || ''}`
          }])
          .select()
          .single()

        if (bookingError) {
          console.error('Error creating booking:', bookingError)
          return NextResponse.json(
            { error: 'Failed to create booking' },
            { status: 500 }
          )
        }

        // 2. Accept the offer
        const { error: acceptError } = await supabase
          .from('shout_out_offers')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', offerId)

        if (acceptError) {
          console.error('Error accepting offer:', acceptError)
          // Try to rollback booking creation
          await supabase.from('bookings').delete().eq('id', booking.id)
          return NextResponse.json(
            { error: 'Failed to accept offer' },
            { status: 500 }
          )
        }

        // 3. Reject other offers for this shout-out
        const { error: rejectError } = await supabase
          .from('shout_out_offers')
          .update({ status: 'rejected', updated_at: new Date().toISOString() })
          .eq('shout_out_id', id)
          .neq('id', offerId)
          .eq('status', 'pending')

        if (rejectError) {
          console.error('Error rejecting other offers:', rejectError)
          // Continue anyway, as the main transaction succeeded
        }

        // 4. Close the shout-out
        const { error: closeError } = await supabase
          .from('shout_outs')
          .update({ status: 'closed', updated_at: new Date().toISOString() })
          .eq('id', id)

        if (closeError) {
          console.error('Error closing shout-out:', closeError)
          // Continue anyway
        }

        // 5. Record metrics for offer acceptance
        await supabase.rpc('record_shout_out_metric', {
          p_shout_out_id: id,
          p_vendor_id: offer.vendor_id,
          p_event: 'offer_accepted',
          p_metadata: { 
            offer_id: offerId,
            booking_id: booking.id,
            price_cents: offer.price_cents
          }
        })

        return NextResponse.json({
          success: true,
          booking_id: booking.id,
          message: 'Offer accepted and booking created successfully'
        })

      } catch (error) {
        console.error('Error in manual transaction:', error)
        return NextResponse.json(
          { error: 'Failed to process offer acceptance' },
          { status: 500 }
        )
      }
    }

    if (transactionError) {
      console.error('Error accepting offer:', transactionError)
      return NextResponse.json(
        { error: 'Failed to accept offer' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      booking_id: transactionResult,
      message: 'Offer accepted and booking created successfully'
    })

  } catch (error) {
    console.error('Error accepting offer:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
