import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  // Test-only route: allow in preview or when explicitly enabled
  if (process.env.NODE_ENV === 'production' && process.env.VERCEL_ENV !== 'preview' && process.env.ENABLE_TEST_ROUTES !== 'true') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  const { id } = params
  try {
    const { idempotencyKey } = await request.json().catch(() => ({})) as { idempotencyKey?: string }
    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, (cfg.secretKey || cfg.publishableKey) as string, { auth: { persistSession: false } })

    // If idempotent booking already exists, return it
    if (idempotencyKey) {
      const { data: existing } = await admin
        .from('bookings')
        .select('id')
        .eq('rebooked_from', id)
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle()
      if (existing?.id) {
        return NextResponse.json({ message: 'Rebooking already exists', booking_id: existing.id }, { status: 200 })
      }
    }

    // Fetch original booking
    const { data: original, error: origErr } = await admin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle()
    if (origErr || !original) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Create a new booking clone with pending status
    const { data: created, error: createErr } = await admin
      .from('bookings')
      .insert({
        customer_id: original.customer_id,
        vendor_id: original.vendor_id,
        service_id: original.service_id,
        slot_id: original.slot_id,
        slot_start: original.slot_start,
        slot_end: original.slot_end,
        status: 'pending',
        commitment_fee_paid: false,
        vendor_fee_paid: false,
        total_amount_cents: original.total_amount_cents,
        notes: `Rebooked from ${id}`,
        rebooked_from: id,
        idempotency_key: idempotencyKey || null,
      })
      .select('id')
      .single()

    if (createErr || !created) {
      return NextResponse.json({ error: 'Failed to create rebooking' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Rebooking created', booking_id: created.id }, { status: 200 })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}


