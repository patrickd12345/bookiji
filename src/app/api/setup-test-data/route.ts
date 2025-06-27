import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

export async function POST() {
  try {
    console.log('🔧 Setting up test data...')

    // Create test users
    const testUsers = [
      {
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'customer@test.com',
        role: 'customer',
        full_name: 'Test Customer'
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440001',
        email: 'vendor@test.com',
        role: 'vendor',
        full_name: 'Test Vendor'
      }
    ]

    for (const user of testUsers) {
      const { error } = await supabase
        .from('users')
        .upsert(user, { onConflict: 'id' })
      
      if (error) {
        console.error('Error creating user:', error)
      }
    }

    // Create test service
    const { data: service, error: serviceError } = await supabase
      .from('services')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440002',
        vendor_id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'Haircut',
        description: 'Professional haircut service',
        duration_minutes: 60,
        price_cents: 5000,
        category: 'beauty'
      }, { onConflict: 'id' })
      .select()
      .single()

    if (serviceError) {
      console.error('Error creating service:', serviceError)
    }

    // Create test availability slots
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const testSlots = [
      {
        id: '550e8400-e29b-41d4-a716-446655440003',
        vendor_id: '550e8400-e29b-41d4-a716-446655440001',
        service_id: '550e8400-e29b-41d4-a716-446655440002',
        start_time: `${tomorrowStr}T14:00:00Z`,
        end_time: `${tomorrowStr}T15:00:00Z`,
        is_booked: false
      },
      {
        id: '550e8400-e29b-41d4-a716-446655440004',
        vendor_id: '550e8400-e29b-41d4-a716-446655440001',
        service_id: '550e8400-e29b-41d4-a716-446655440002',
        start_time: `${tomorrowStr}T15:00:00Z`,
        end_time: `${tomorrowStr}T16:00:00Z`,
        is_booked: false
      }
    ]

    for (const slot of testSlots) {
      const { error } = await supabase
        .from('availability_slots')
        .upsert(slot, { onConflict: 'id' })
      
      if (error) {
        console.error('Error creating slot:', error)
      }
    }

    // Create test provider location
    const { error: locationError } = await supabase
      .from('provider_locations')
      .upsert({
        id: '550e8400-e29b-41d4-a716-446655440005',
        vendor_id: '550e8400-e29b-41d4-a716-446655440001',
        latitude: 40.7128,
        longitude: -74.0060,
        service_radius_km: 5,
        is_active: true
      }, { onConflict: 'id' })

    if (locationError) {
      console.error('Error creating location:', locationError)
    }

    console.log('✅ Test data setup completed')

    return NextResponse.json({
      success: true,
      message: 'Test data setup completed',
      data: {
        users: testUsers.length,
        services: 1,
        slots: testSlots.length,
        locations: 1
      }
    })

  } catch (error) {
    console.error('❌ Test data setup error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Test data setup failed'
    }, { status: 500 })
  }
} 