import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string }
  const admin = createClient(url, secretKey, { auth: { persistSession: false } })

  try {
    // Create a vendor user
    const vendorEmail = 'vendor@test.dev'
    const { data: vendorUser, error: vendorErr } = await admin
      .from('users')
      .insert({ email: vendorEmail, role: 'vendor', full_name: 'Test Vendor' })
      .select()
      .single()

    if (vendorErr && vendorErr.code !== '23505') {
      console.error('Vendor creation error:', vendorErr)
      return NextResponse.json({ error: vendorErr.message }, { status: 500 })
    }

    let vendorId = vendorUser?.id
    if (!vendorId) {
      const { data, error } = await admin.from('users').select('id').eq('email', vendorEmail).single()
      if (error) {
        console.error('Vendor fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch vendor' }, { status: 500 })
      }
      vendorId = data?.id
    }

    if (!vendorId) {
      return NextResponse.json({ error: 'Failed to create or fetch vendor' }, { status: 500 })
    }

    // Create a customer user for the booking
    const customerEmail = 'customer@test.dev'
    const { data: customerUser, error: customerErr } = await admin
      .from('users')
      .insert({ email: customerEmail, role: 'customer', full_name: 'Test Customer' })
      .select()
      .single()

    if (customerErr && customerErr.code !== '23505') {
      console.error('Customer creation error:', customerErr)
      return NextResponse.json({ error: customerErr.message }, { status: 500 })
    }

    let customerId = customerUser?.id
    if (!customerId) {
      const { data, error } = await admin.from('users').select('id').eq('email', customerEmail).single()
      if (error) {
        console.error('Customer fetch error:', error)
        return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 })
      }
      customerId = data?.id
    }

    if (!customerId) {
      return NextResponse.json({ error: 'Failed to create or fetch customer' }, { status: 500 })
    }

    // Create a simple service for the vendor
    // Try new schema first, fallback to old schema if it fails
    interface Service {
      id: string
      vendor_id: string
      name: string
      description: string
      duration_minutes: number
      price_cents: number
      category: string
      is_active: boolean
    }
    let service: Service | null = null
    let serviceErr: Error | null = null

    // First attempt: new schema
    try {
      const { data: newService, error: newServiceErr } = await admin
        .from('services')
        .insert({ 
          vendor_id: vendorId, 
          name: 'Test Service', 
          description: 'E2E Service', 
          duration_minutes: 60, 
          price_cents: 2000, 
          category: 'test', 
          is_active: true 
        })
        .select()
        .single()

      if (!newServiceErr && newService?.id) {
        service = newService
        console.log('✅ Service created with new schema')
      } else {
        throw new Error('New schema failed')
      }
    } catch {
      console.log('🔄 New schema failed, trying old schema...')
      
      // Second attempt: old schema
      const { data: oldService, error: oldServiceErr } = await admin
        .from('services')
        .insert({ 
          vendor_id: vendorId, 
          name: 'Test Service', 
          description: 'E2E Service', 
          duration: 60, 
          price: 20.00, 
          category: 'test', 
          is_active: true 
        })
        .select()
        .single()

      if (oldServiceErr) {
        serviceErr = new Error(oldServiceErr.message)
        console.error('❌ Old schema also failed:', oldServiceErr)
      } else if (oldService?.id) {
        service = oldService
        console.log('✅ Service created with old schema')
      } else if (!oldService?.id) {
        serviceErr = new Error('Service created but no ID returned')
      }
    }

    if (serviceErr) {
      console.error('Service creation error:', serviceErr)
      return NextResponse.json({ error: `Service creation failed: ${serviceErr.message}` }, { status: 500 })
    }

    if (!service?.id) {
      return NextResponse.json({ error: 'Service created but no ID returned' }, { status: 500 })
    }

    // Create a slot one hour from now
    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    const { data: slot, error: slotErr } = await admin
      .from('availability_slots')
      .insert({ 
        vendor_id: vendorId, 
        service_id: service.id, 
        start_time: start.toISOString(), 
        end_time: end.toISOString(), 
        is_booked: false 
      })
      .select()
      .single()

    if (slotErr) {
      console.error('Slot creation error:', slotErr)
      return NextResponse.json({ error: `Slot creation failed: ${slotErr.message}` }, { status: 500 })
    }

    if (!slot?.id) {
      return NextResponse.json({ error: 'Slot created but no ID returned' }, { status: 500 })
    }

    // Pre-create a pending booking for determinism (optional)
    const { data: booking, error: bookingErr } = await admin
      .from('bookings')
      .insert({ 
        customer_id: customerId,
        vendor_id: vendorId, 
        service_id: service.id, 
        slot_id: slot.id, 
        slot_start: slot.start_time, 
        slot_end: slot.end_time, 
        status: 'pending', 
        total_amount_cents: 2000 
      })
      .select()
      .single()

    if (bookingErr) {
      console.error('Booking creation error:', bookingErr)
      return NextResponse.json({ error: `Booking creation failed: ${bookingErr.message}` }, { status: 500 })
    }

    if (!booking?.id) {
      return NextResponse.json({ error: 'Booking created but no ID returned' }, { status: 500 })
    }

    return NextResponse.json({ vendorId, customerId, slotId: slot.id, bookingId: booking.id })
  } catch (error) {
    console.error('Test seed error:', error)
    return NextResponse.json({ error: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}


