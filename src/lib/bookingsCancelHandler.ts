import { NextRequest, NextResponse } from 'next/server'
import { bookingService, Booking } from './database'
import { refundPayment } from './stripe'
import { getServerSupabase } from '@/lib/supabaseClient'

const supabase = getServerSupabase()
import type { SupabaseClient } from '@supabase/supabase-js'

export interface BookingCancelRequest {
  bookingId: string
  userId: string
  reason?: string
}

export type RefundResult = {
  success: boolean
  amount?: number
  refund_id?: string
  error?: string
}

export interface BookingCancelResponse {
  success: boolean
  booking?: Booking
  refund?: RefundResult | null
  message?: string
  error?: string
}

export interface BookingCancelHandler {
  handle(request: NextRequest): Promise<NextResponse<BookingCancelResponse>>
}

// Define proper types for the service objects
interface BookingService {
  getBookingById: (id: string) => Promise<Booking | null>;
  updateBooking: (id: string, data: Partial<Booking>) => Promise<Booking | null>;
}

interface RefundPaymentFunction {
  (paymentIntentId: string, amount?: number): Promise<{ id: string; amount: number }>;
}

export class BookingCancelHandlerImpl implements BookingCancelHandler {
  constructor(
    private bookingService: BookingService,
    private refundPayment: RefundPaymentFunction,
    private supabase: SupabaseClient
  ) {}

  async handle(request: NextRequest): Promise<NextResponse<BookingCancelResponse>> {
    try {
      const { bookingId, userId, reason } = await request.json() as BookingCancelRequest

      // Validate input
      if (!bookingId || !userId) {
        return NextResponse.json({ 
          error: 'Booking ID and User ID are required',
          success: false
        }, { status: 400 })
      }

      // Get booking details
      const booking = await this.bookingService.getBookingById(bookingId)
      if (!booking) {
        return NextResponse.json({ 
          error: 'Booking not found',
          success: false
        }, { status: 404 })
      }

      // Verify user owns this booking
      if (booking.customer_id !== userId) {
        return NextResponse.json({ 
          error: 'Unauthorized - booking does not belong to user',
          success: false
        }, { status: 403 })
      }

      // Check if booking can be cancelled
      const bookingTime = new Date(booking.slot_start)
      const now = new Date()
      const timeDiff = bookingTime.getTime() - now.getTime()
      const hoursUntilBooking = timeDiff / (1000 * 60 * 60)

      if (hoursUntilBooking < 2) {
        return NextResponse.json({ 
          error: 'Cannot cancel booking less than 2 hours before appointment',
          success: false
        }, { status: 400 })
      }

      if (booking.status === 'cancelled') {
        return NextResponse.json({ 
          error: 'Booking is already cancelled',
          success: false
        }, { status: 400 })
      }

      if (booking.status === 'completed') {
        return NextResponse.json({ 
          error: 'Cannot cancel completed booking',
          success: false
        }, { status: 400 })
      }

      // Cancel the booking
      const updatedBooking = await this.bookingService.updateBooking(bookingId, {
        status: 'cancelled',
        cancellation_reason: reason || 'Customer requested',
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

      if (!updatedBooking) {
        return NextResponse.json({ 
          error: 'Failed to cancel booking',
          success: false
        }, { status: 500 })
      }

      // Process refund if commitment fee was paid
      let refundResult: RefundResult | null = null
      if (booking.commitment_fee_paid && booking.payment_intent_id) {
        try {
          const refund = await this.refundPayment(booking.payment_intent_id)
          await this.bookingService.updateBooking(bookingId, {
            payment_status: 'refunded',
            refunded_at: new Date().toISOString()
          })

          refundResult = {
            success: true,
            amount: refund.amount || 0,
            refund_id: refund.id
          }
        } catch (refundError: unknown) {
          console.error('Refund processing error:', refundError)
          // Don't fail the cancellation if refund fails
          refundResult = {
            success: false,
            error: 'Refund will be processed manually'
          }
        }
      }

      // Notify provider and customer about cancellation
      await this.supabase.from('notifications').insert([
        {
          user_id: booking.vendor_id,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          message: `Booking ${bookingId} was cancelled by the customer.`,
        },
        {
          user_id: booking.customer_id,
          type: 'BOOKING_CANCELLED',
          title: 'Booking Cancelled',
          message: 'Your booking has been cancelled and refund processing has started.',
        }
      ])

      return NextResponse.json({
        success: true,
        booking: updatedBooking,
        refund: refundResult,
        message: 'Booking cancelled successfully'
      })

    } catch (error: unknown) {
      console.error('Booking cancellation error:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Failed to cancel booking',
        success: false
      }, { status: 500 })
    }
  }
}

export function createBookingCancelHandler(): BookingCancelHandler {
  return new BookingCancelHandlerImpl(bookingService, refundPayment, supabase)
} 