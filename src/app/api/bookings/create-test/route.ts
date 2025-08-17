import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === 'production' &&
    process.env.VERCEL_ENV !== 'preview' &&
    process.env.ENABLE_TEST_ROUTES !== 'true'
  ) {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  try {
    const body = await request.json()
    const { customer_name, phone, service_id, slot_iso } = body || {}

    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, (cfg.secretKey || cfg.publishableKey) as string, { auth: { persistSession: false } })

    // Lookup service to resolve vendor and default price
    const { data: service, error: svcErr } = await admin
      .from('services')
      .select('id, vendor_id, price_cents')
      .eq('id', service_id)
      .maybeSingle()
    if (svcErr || !service) {
      return NextResponse.json({ error: 'Service not found' }, { status: 400 })
    }

    // Create a slot for the booking if needed
    const start = slot_iso ? new Date(slot_iso) : new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)

    const { data: slot, error: slotErr } = await admin
      .from('availability_slots')
      .insert({
        vendor_id: service.vendor_id,
        service_id: service.id,
        start_time: start.toISOString(),
        end_time: end.toISOString(),
        is_booked: false,
      })
      .select()
      .single()
    if (slotErr || !slot) {
      return NextResponse.json({ error: 'Failed to create slot' }, { status: 500 })
    }

    // Create minimal pending booking
    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .insert({
        customer_id: '00000000-0000-0000-0000-000000000000',
        vendor_id: service.vendor_id,
        service_id: service.id,
        slot_id: slot.id,
        slot_start: slot.start_time,
        slot_end: slot.end_time,
        status: 'pending',
        commitment_fee_paid: false,
        vendor_fee_paid: false,
        total_amount_cents: service.price_cents || 100,
        notes: customer_name ? `Test booking for ${customer_name}${phone ? ' (' + phone + ')' : ''}` : 'Test booking',
      })
      .select('*')
      .single()

    if (bookingErr || !booking) {
      return NextResponse.json({ error: 'Failed to create booking' }, { status: 500 })
    }

    return NextResponse.json({ bookingId: booking.id })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}


