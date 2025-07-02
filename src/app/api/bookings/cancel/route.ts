import { NextResponse } from 'next/server'
import { bookingService } from '../../../../lib/database'
import { refundPayment } from '../../../../lib/stripe'

export async function POST(request: Request) {
  try {
    const { bookingId, userId, reason } = await request.json()

    // Validate input
    if (!bookingId || !userId) {
      return NextResponse.json({ 
        error: 'Booking ID and User ID are required' 
      }, { status: 400 })
    }

    // Get booking details
    const booking = await bookingService.getBookingById(bookingId)
    if (!booking) {
      return NextResponse.json({ 
        error: 'Booking not found' 
      }, { status: 404 })
    }

    // Verify user owns this booking
    if (booking.customer_id !== userId) {
      return NextResponse.json({ 
        error: 'Unauthorized - booking does not belong to user' 
      }, { status: 403 })
    }

    // Check if booking can be cancelled
    const bookingTime = new Date(booking.slot_start)
    const now = new Date()
    const timeDiff = bookingTime.getTime() - now.getTime()
    const hoursUntilBooking = timeDiff / (1000 * 60 * 60)

    if (hoursUntilBooking < 2) {
      return NextResponse.json({ 
        error: 'Cannot cancel booking less than 2 hours before appointment' 
      }, { status: 400 })
    }

    if (booking.status === 'cancelled') {
      return NextResponse.json({ 
        error: 'Booking is already cancelled' 
      }, { status: 400 })
    }

    if (booking.status === 'completed') {
      return NextResponse.json({ 
        error: 'Cannot cancel completed booking' 
      }, { status: 400 })
    }

    // Cancel the booking
    const updatedBooking = await bookingService.updateBooking(bookingId, {
      status: 'cancelled',
      cancellation_reason: reason || 'Customer requested',
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })

    if (!updatedBooking) {
      return NextResponse.json({ 
        error: 'Failed to cancel booking' 
      }, { status: 500 })
    }

    // Process refund if commitment fee was paid
    let refundResult = null
    if (booking.commitment_fee_paid && booking.payment_intent_id) {
      try {
        const refund = await refundPayment(booking.payment_intent_id)
        await bookingService.updateBooking(bookingId, {
          payment_status: 'refunded',
          refunded_at: new Date().toISOString()
        })

        refundResult = {
          success: true,
          amount: refund.amount || 0,
          refund_id: refund.id
        }
      } catch (refundError) {
        console.error('Refund processing error:', refundError)
        // Don't fail the cancellation if refund fails
        refundResult = {
          success: false,
          error: 'Refund will be processed manually'
        }
      }
    }

    // TODO: Send notifications to provider and customer
    console.log('Sending cancellation notifications for booking:', bookingId)

    return NextResponse.json({
      success: true,
      booking: updatedBooking,
      refund: refundResult,
      message: 'Booking cancelled successfully'
    })

  } catch (error) {
    console.error('Booking cancellation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to cancel booking',
      success: false
    }, { status: 500 })
  }
} 