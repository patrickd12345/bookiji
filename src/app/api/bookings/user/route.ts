import { NextResponse } from 'next/server'
import { BookingEngine } from '../../../../../lib/bookingEngine'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required' 
      }, { status: 400 })
    }

    console.log('📋 Fetching bookings for user:', userId)

    // Get user bookings using the booking engine
    const rawBookings = await BookingEngine.getUserBookings(userId)

    // Ensure we always work with an array to avoid runtime errors
    const bookings = Array.isArray(rawBookings) ? rawBookings : []

    console.log('✅ Found bookings:', bookings.length)

    return NextResponse.json({
      success: true,
      bookings,
      count: bookings.length,
      message: 'Bookings retrieved successfully'
    })

  } catch (error) {
    console.error('❌ Error fetching user bookings:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to fetch bookings',
      success: false
    }, { status: 500 })
  }
} 