import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function POST(req: NextRequest) {
  try {
    const { requestId, vendorId, slotStart, slotEnd } = await req.json()

    if (!requestId || !vendorId || !slotStart) {
      return NextResponse.json(
        { error: 'requestId, vendorId and slotStart are required' },
        { status: 400 }
      )
    }

    const supabase = createSupabaseServerClient()

    // Fetch service request details
    const { data: serviceRequest, error: requestError } = await supabase
      .from('service_requests')
      .select('id, customer_id, service_type, status')
      .eq('id', requestId)
      .single()

    if (requestError || !serviceRequest) {
      return NextResponse.json(
        { error: 'Service request not found' },
        { status: 404 }
      )
    }

    if (serviceRequest.status !== 'pending') {
      return NextResponse.json(
        { error: 'Request has already been matched' },
        { status: 400 }
      )
    }

    // Create booking slot
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        vendor_id: vendorId,
        customer_id: serviceRequest.customer_id,
        service_id: serviceRequest.service_type,
        slot_start: slotStart,
        slot_end: slotEnd,
        status: 'pending'
      })
      .select()
      .single()

    if (bookingError || !booking) {
      return NextResponse.json(
        { error: bookingError?.message || 'Failed to create booking' },
        { status: 500 }
      )
    }

    // Update service request status
    const { error: updateError } = await supabase
      .from('service_requests')
      .update({
        status: 'matched',
        vendor_id: vendorId,
        booking_id: booking.id
      })
      .eq('id', requestId)

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      )
    }

    // Notify customer
    try {
      await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ''}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'email',
          recipient: serviceRequest.customer_id,
          template: 'booking_confirmation',
          data: { bookingId: booking.id }
        })
      })
    } catch (err) {
      console.error('Failed to send notification', err)
    }

    return NextResponse.json({ success: true, bookingId: booking.id })
  } catch (err) {
    console.error('Service request respond error', err)
    return NextResponse.json(
      { error: 'Failed to process response' },
      { status: 500 }
    )
  }
}

