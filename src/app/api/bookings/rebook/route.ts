import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { createErrorResponse, createSuccessResponse, ErrorCodes } from '@/lib/api/errorEnvelope'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

interface RebookRequest {
  original_booking_id: string
  new_slot_id?: string
  new_start_time?: string
  new_end_time?: string
  reason?: string
}

/**
 * Rebook flow: Create a new booking linked to original without corrupting original record
 */
export async function POST(req: NextRequest) {
  try {
    const body: RebookRequest = await req.json()
    const { original_booking_id, new_slot_id, new_start_time, new_end_time, reason } = body

    if (!original_booking_id) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Missing required field: original_booking_id',
        400,
        { missingFields: ['original_booking_id'] },
        req.nextUrl.pathname
      )
    }

    if (!new_slot_id && (!new_start_time || !new_end_time)) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Must provide either new_slot_id or both new_start_time and new_end_time',
        400,
        { missingFields: ['new_slot_id or (new_start_time, new_end_time)'] },
        req.nextUrl.pathname
      )
    }

    // Fetch original booking
    const { data: originalBooking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', original_booking_id)
      .single()

    if (bookingError || !originalBooking) {
      return createErrorResponse(
        ErrorCodes.NOT_FOUND,
        'Original booking not found',
        404,
        { booking_id: original_booking_id },
        req.nextUrl.pathname
      )
    }

    // Verify original booking is in a state that allows rebooking
    const allowedStates = ['cancelled', 'completed', 'no_show']
    if (!allowedStates.includes(originalBooking.status || originalBooking.state || '')) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        'Original booking must be cancelled, completed, or no_show to rebook',
        400,
        { current_status: originalBooking.status || originalBooking.state },
        req.nextUrl.pathname
      )
    }

    // Determine new slot times
    let finalStartTime: string
    let finalEndTime: string

    if (new_slot_id) {
      // Fetch slot details
      const { data: slot, error: slotError } = await supabase
        .from('availability_slots')
        .select('start_time, end_time')
        .eq('id', new_slot_id)
        .single()

      if (slotError || !slot) {
        return createErrorResponse(
          ErrorCodes.NOT_FOUND,
          'Slot not found',
          404,
          { slot_id: new_slot_id },
          req.nextUrl.pathname
        )
      }

      finalStartTime = slot.start_time
      finalEndTime = slot.end_time
    } else {
      finalStartTime = new_start_time!
      finalEndTime = new_end_time!
    }

    // Create new booking linked to original
    const { data: newBooking, error: createError } = await supabase
      .from('bookings')
      .insert({
        customer_id: originalBooking.customer_id,
        provider_id: originalBooking.provider_id || originalBooking.vendor_id,
        service_id: originalBooking.service_id,
        start_time: finalStartTime,
        end_time: finalEndTime,
        status: 'pending',
        state: 'pending',
        original_booking_id: original_booking_id, // Link to original
        rebook_reason: reason,
        created_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (createError || !newBooking) {
      return createErrorResponse(
        ErrorCodes.INTERNAL_ERROR,
        'Failed to create rebook',
        500,
        { databaseError: createError?.message },
        req.nextUrl.pathname
      )
    }

    // Mark slot as booked if using slot_id
    if (new_slot_id) {
      await supabase
        .from('availability_slots')
        .update({ is_booked: true, booking_id: newBooking.id })
        .eq('id', new_slot_id)
    }

    // Log rebook action (audit trail)
    await supabase.from('audit_log').insert({
      action: 'booking_rebooked',
      booking_id: original_booking_id,
      meta: {
        original_booking_id,
        new_booking_id: newBooking.id,
        reason,
      },
      created_at: new Date().toISOString(),
    })

    return createSuccessResponse({
      booking: newBooking,
      original_booking_id,
      message: 'Booking rebooked successfully',
    })
  } catch (error) {
    console.error('Rebook error:', error)
    return createErrorResponse(
      ErrorCodes.INTERNAL_ERROR,
      'Internal server error during rebook',
      500,
      { error: error instanceof Error ? error.message : 'Unknown error' },
      req.nextUrl.pathname
    )
  }
}
