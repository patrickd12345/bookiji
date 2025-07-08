import { NextRequest, NextResponse } from 'next/server'
import { BookingEngine } from '../../lib/bookingEngine'

export interface BookingsUserResponse {
  success: boolean
  bookings: any[]
  count: number
  message?: string
  error?: string
}

export interface BookingsUserHandler {
  handle(request: NextRequest): Promise<NextResponse<BookingsUserResponse>>
}

export class BookingsUserHandlerImpl implements BookingsUserHandler {
  constructor(
    private bookingEngine: typeof BookingEngine
  ) {}

  async handle(request: NextRequest): Promise<NextResponse<BookingsUserResponse>> {
    try {
      const { searchParams } = new URL(request.url)
      const userId = searchParams.get('userId')

      if (!userId) {
        return NextResponse.json({ 
          error: 'User ID is required',
          success: false,
          bookings: [],
          count: 0
        }, { status: 400 })
      }

      console.log('📋 Fetching bookings for user:', userId)

      // Get user bookings using the booking engine
      const rawBookings = await this.bookingEngine.getUserBookings(userId)

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
        success: false,
        bookings: [],
        count: 0
      }, { status: 500 })
    }
  }
}

export function createBookingsUserHandler(): BookingsUserHandler {
  return new BookingsUserHandlerImpl(BookingEngine)
} 