import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { idempotencyKey } = await request.json()
    
    if (!idempotencyKey) {
      return NextResponse.json(
        { error: 'Idempotency key required' },
        { status: 400 }
      )
    }
    
    // Get user from auth
    const userId = await getAuthenticatedUserId(request)
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }
    
    // Create Supabase client for database operations
    const { url, secretKey } = getSupabaseConfig()
    const supabase = createClient(url, secretKey!, { auth: { persistSession: false } })
    
    // Get original booking
    const { data: originalBooking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services:service_requests(id, service_type_id, description),
        availability_slots(*)
      `)
      .eq('id', id)
      .eq('customer_id', userId)
      .single()
    
    if (bookingError || !originalBooking) {
      return NextResponse.json(
        { error: 'Booking not found' },
        { status: 404 }
      )
    }
    
    // Check if provider still offers this service
    const { data: serviceAvailability, error: serviceError } = await supabase
      .from('service_requests')
      .select('id, service_type_id, description')
      .eq('vendor_id', originalBooking.vendor_id)
      .eq('service_type_id', originalBooking.services[0]?.service_type_id)
      .eq('is_active', true)
      .single()
    
    if (serviceError || !serviceAvailability) {
      return NextResponse.json(
        { error: 'Service no longer available from this provider' },
        { status: 400 }
      )
    }
    
    // Check idempotency - prevent duplicate rebookings
    const { data: existingRebooking } = await supabase
      .from('bookings')
      .select('id')
      .eq('customer_id', userId)
      .eq('vendor_id', originalBooking.vendor_id)
      .eq('idempotency_key', idempotencyKey)
      .maybeSingle()
    
    if (existingRebooking) {
      return NextResponse.json(
        { 
          message: 'Rebooking already exists',
          booking_id: existingRebooking.id
        },
        { status: 200 }
      )
    }
    
    // Create new booking with same details
    const { data: newBooking, error: createError } = await supabase
      .from('bookings')
      .insert({
        customer_id: userId,
        vendor_id: originalBooking.vendor_id,
        service_request_id: serviceAvailability.id,
        status: 'pending',
        idempotency_key: idempotencyKey,
        rebooked_from: id,
        notes: `Rebooked from booking ${id}`,
        created_at: new Date().toISOString()
      })
      .select()
      .single()
    
    if (createError) {
      console.error('Error creating rebooking:', createError)
      return NextResponse.json(
        { error: 'Failed to create rebooking' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      message: 'Rebooking created successfully',
      booking_id: newBooking.id,
      status: 'pending'
    })
    
  } catch (error) {
    console.error('Rebooking error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
