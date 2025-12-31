import { getServerSupabase } from '@/lib/supabaseServer'
import { logger, errorToContext } from '@/lib/logger'

const getSupabase = () => getServerSupabase()
import {
  type BookingStatus,
  type RefundStatus,
  type StateTransitionResult
} from '@/types/booking'
import { processRefund } from './refundService'

class BookingStateMachine {
  private static instance: BookingStateMachine

  private constructor() {}

  public static getInstance(): BookingStateMachine {
    if (!BookingStateMachine.instance) {
      BookingStateMachine.instance = new BookingStateMachine()
    }
    return BookingStateMachine.instance
  }

  public async transition(
    bookingId: string,
    newStatus: BookingStatus,
    options: {
      reason?: string
      adminOverride?: boolean
      adminId?: string
      skipRefund?: boolean
    } = {}
  ): Promise<StateTransitionResult> {
    const supabase = getSupabase()
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return { success: false, error: fetchError?.message || 'Booking not found' }
    }

    const allowedTransitions: Record<BookingStatus, BookingStatus[]> = {
      requested: ['accepted', 'cancelled'],
      accepted: ['confirmed', 'cancelled'],
      confirmed: ['completed', 'no_show', 'cancelled'],
      completed: [],
      no_show: [],
      cancelled: []
    }

    if (!allowedTransitions[booking.status as BookingStatus]?.includes(newStatus)) {
      return { success: false, error: `Invalid transition from ${booking.status} to ${newStatus}` }
    }

    if (options.adminId) {
      await supabase.rpc('set_claim', {
        claim: 'app.current_user_id',
        value: options.adminId
      })
    }

    try {
      const { data: updatedBooking, error: updateError } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          cancellation_reason: options.reason,
          cancelled_at: newStatus === 'cancelled' ? new Date().toISOString() : booking.cancelled_at,
          admin_override: options.adminOverride || false,
          admin_override_reason: options.adminOverride ? options.reason : null,
          admin_override_by: options.adminOverride ? options.adminId : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)
        .select()
        .single()

      if (updateError || !updatedBooking) {
        throw new Error(updateError?.message || 'Failed to update booking status')
      }

      let refundResult
      if (!options.skipRefund && updatedBooking.commitment_fee_paid) {
        if (newStatus === 'completed') {
          refundResult = await processRefund(bookingId, { idempotencyKey: booking.idempotency_key })
        } else if (newStatus === 'cancelled') {
          const { data: isRefundable } = await supabase.rpc('is_cancellation_refundable', {
            booking_id: bookingId
          })
          if (isRefundable || options.adminOverride) {
            refundResult = await processRefund(bookingId, {
              force: options.adminOverride,
              reason: options.reason,
              adminId: options.adminId,
              idempotencyKey: booking.idempotency_key
            })
          } else {
            refundResult = { status: 'skipped' as RefundStatus, error: 'Cancellation too close to appointment time' }
          }
        } else if (newStatus === 'no_show') {
          refundResult = { status: 'skipped' as RefundStatus, error: 'No refund for no-show' }
        }
      }

      return { success: true, booking: updatedBooking, refundResult }
    } catch (error) {
      logger.error('State transition error', { ...errorToContext(error), booking_id: bookingId, from_state: booking.status, to_state: newStatus })
      return { success: false, error: error instanceof Error ? error.message : 'State transition failed' }
    }
  }

  public async getTransitionHistory(bookingId: string) {
    const supabase = getSupabase()
    const { data, error } = await supabase
      .from('booking_state_changes')
      .select(
        `
        *,
        changed_by:users(id, email, full_name)
      `
      )
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
}

export const bookingStateMachine = BookingStateMachine.getInstance()
