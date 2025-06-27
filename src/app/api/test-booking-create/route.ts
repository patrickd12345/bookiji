import { NextResponse } from 'next/server'
import { BookingEngine } from '../../../../lib/bookingEngine'

export async function GET() {
  try {
    console.log('🧪 Testing booking creation...')

    // Use tomorrow's date to match available slots
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    const bookingRequest = {
      customerId: '550e8400-e29b-41d4-a716-446655440000',
      service: 'haircut',
      location: 'Test Location',
      date: tomorrowStr,
      time: '14:00',
      notes: 'Test booking'
    }

    console.log('Booking request:', bookingRequest)

    const result = await BookingEngine.createBooking(bookingRequest)
    
    console.log('Booking result:', result)

    return NextResponse.json({
      success: true,
      result,
      request: bookingRequest
    })

  } catch (error) {
    console.error('❌ Booking creation test error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Booking creation test failed'
    }, { status: 500 })
  }
} 