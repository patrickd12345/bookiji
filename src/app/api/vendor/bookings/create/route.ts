import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'
import { assertVendorHasActiveSubscription } from '@/lib/guards/subscriptionGuard'

/**
 * Create booking as vendor (payment-free)
 * POST /api/vendor/bookings/create
 * Body: { customerId, serviceId, startTime, endTime, amountUSD, notes? }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { customerId, serviceId, startTime, endTime, amountUSD, notes } = body

    // Validate required fields
    if (!customerId || !serviceId || !startTime || !endTime || amountUSD === undefined) {
      return NextResponse.json({ 
        error: 'Missing required fields',
        hint: 'Required: customerId, serviceId, startTime, endTime, amountUSD'
      }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Get vendor profile
    const { data: vendorProfile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !vendorProfile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (vendorProfile.role !== 'vendor') {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Invariant III-1: Vendor must have active subscription
    try {
      await assertVendorHasActiveSubscription(vendorProfile.id)
    } catch (_error) {
      return NextResponse.json({
        error: 'Active subscription required',
        hint: 'Please subscribe to create bookings'
      }, { status: 403 })
    }

    // Validate customer exists
    const { data: customerProfile, error: customerError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .eq('id', customerId)
      .single()

    if (customerError || !customerProfile) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }

    // Validate service exists and belongs to vendor
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .select('id, name, provider_id')
      .eq('id', serviceId)
      .eq('provider_id', vendorProfile.id)
      .single()

    if (serviceError || !service) {
      return NextResponse.json({ 
        error: 'Service not found or does not belong to vendor',
        hint: 'Please select a valid service'
      }, { status: 404 })
    }

    // Validate time is in the future
    const now = new Date()
    const bookingStart = new Date(startTime)
    
    if (bookingStart <= now) {
      return NextResponse.json(
        { error: 'Cannot create booking in the past' },
        { status: 400 }
      )
    }

    // Validate amount
    const amountNumber = Number(amountUSD)
    if (!Number.isFinite(amountNumber) || amountNumber <= 0) {
      return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
    }

    // Create booking (vendor-created, no payment required)
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: vendorProfile.id,
        service_id: serviceId,
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        state: 'quoted',
        total_amount: amountNumber,
        vendor_created: true,
        vendor_created_by: vendorProfile.id,
        notes: notes || null,
        stripe_payment_intent_id: null // No payment for vendor-created bookings
      })
      .select()
      .single()

    if (bookingError) {
      console.error('Error creating vendor booking:', bookingError)
      return NextResponse.json({ 
        error: 'Failed to create booking',
        hint: 'Please try again later'
      }, { status: 500 })
    }

    // TODO: Send notification to customer about pending booking

    return NextResponse.json({
      success: true,
      booking,
      message: 'Booking created successfully. Customer confirmation pending.',
      requiresCustomerConfirmation: true
    })

  } catch (error) {
    console.error('Vendor booking create API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
