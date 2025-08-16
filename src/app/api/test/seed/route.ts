import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string }
  const admin = createClient(url, secretKey, { auth: { persistSession: false } })

  // Create a vendor user
  const vendorEmail = 'vendor@test.dev'
  const { data: vendorUser, error: vendorErr } = await admin
    .from('users')
    .insert({ email: vendorEmail, role: 'vendor', full_name: 'Test Vendor' })
    .select()
    .single()

  if (vendorErr && vendorErr.code !== '23505') {
    return NextResponse.json({ error: vendorErr.message }, { status: 500 })
  }

  let vendorId = vendorUser?.id
  if (!vendorId) {
    const { data } = await admin.from('users').select('id').eq('email', vendorEmail).single()
    vendorId = data?.id
  }

  if (!vendorId) {
    return NextResponse.json({ error: 'Failed to create or fetch vendor' }, { status: 500 })
  }

  // Create a simple service for the vendor
  const { data: service } = await admin
    .from('services')
    .insert({ vendor_id: vendorId, name: 'Test Service', description: 'E2E Service', duration_minutes: 60, price_cents: 2000, category: 'test', is_active: true })
    .select()
    .single()

  // Create a slot one hour from now
  const start = new Date(Date.now() + 60 * 60 * 1000)
  const end = new Date(start.getTime() + 60 * 60 * 1000)
  const { data: slot } = await admin
    .from('availability_slots')
    .insert({ vendor_id: vendorId, service_id: service.id, start_time: start.toISOString(), end_time: end.toISOString(), is_booked: false })
    .select()
    .single()

  // Pre-create a pending booking for determinism (optional)
  const { data: booking } = await admin
    .from('bookings')
    .insert({ vendor_id: vendorId, service_id: service.id, slot_id: slot.id, slot_start: slot.start_time, slot_end: slot.end_time, status: 'pending', total_amount_cents: 2000 })
    .select()
    .single()

  return NextResponse.json({ vendorId, slotId: slot.id, bookingId: booking.id })
}


