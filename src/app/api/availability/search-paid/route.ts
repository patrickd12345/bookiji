import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { createAvailabilitySearchPaymentIntent } from '@/lib/stripe'

export async function POST(req: NextRequest) {
  try {
    const { customerId, providerId, date, currency } = await req.json()

    if (!customerId || !providerId) {
      return NextResponse.json({ error: 'Missing customerId or providerId' }, { status: 400 })
    }

    const payment = await createAvailabilitySearchPaymentIntent(customerId, { provider_id: providerId }, currency)
    if (!payment.success || !payment.paymentIntent) {
      return NextResponse.json({ error: 'Failed to create payment intent' }, { status: 500 })
    }

    // Fetch availability slots for the requested date
    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_booked', false)
      .gte('start_time', date ? `${date}T00:00:00Z` : new Date().toISOString())
      .order('start_time')

    if (error) {
      console.error('Error fetching slots:', error)
    }

    return NextResponse.json({
      success: true,
      clientSecret: payment.paymentIntent.client_secret,
      slots: slots || []
    })
  } catch (err) {
    console.error('search-paid error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
