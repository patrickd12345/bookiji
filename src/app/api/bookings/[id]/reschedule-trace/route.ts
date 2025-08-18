import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params
    const { url, secretKey } = getSupabaseConfig()
    
    if (!secretKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const admin = createClient(url, secretKey, { auth: { persistSession: false } })

    // Get the current booking
    const { data: currentBooking, error: currentError } = await admin
      .from('bookings')
      .select(`
        id,
        reschedule_of_booking_id,
        replaced_by_booking_id,
        slot_start,
        slot_end,
        status,
        customer_id
      `)
      .eq('id', id)
      .single()

    if (currentError || !currentBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const result: any = {
      reschedule_of_booking_id: currentBooking.reschedule_of_booking_id,
      replaced_by_booking_id: currentBooking.replaced_by_booking_id
    }

    // If this is a rescheduled booking, get the original
    if (currentBooking.reschedule_of_booking_id) {
      const { data: originalBooking } = await admin
        .from('bookings')
        .select(`
          id,
          slot_start,
          slot_end,
          status,
          customer_id
        `)
        .eq('id', currentBooking.reschedule_of_booking_id)
        .single()

      if (originalBooking) {
        // Get customer name
        const { data: customer } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', originalBooking.customer_id)
          .single()

        result.original_booking = {
          ...originalBooking,
          customer_name: customer?.full_name || 'Unknown Customer'
        }
      }
    }

    // If this booking was replaced, get the replacement
    if (currentBooking.replaced_by_booking_id) {
      const { data: replacementBooking } = await admin
        .from('bookings')
        .select(`
          id,
          slot_start,
          slot_end,
          status,
          customer_id
        `)
        .eq('id', currentBooking.replaced_by_booking_id)
        .single()

      if (replacementBooking) {
        // Get customer name
        const { data: customer } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', replacementBooking.customer_id)
          .single()

        result.replacement_booking = {
          ...replacementBooking,
          customer_name: customer?.full_name || 'Unknown Customer'
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Reschedule trace error:', error)
    return NextResponse.json({ 
      error: 'Failed to fetch reschedule trace', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
