import { supabase } from '@/lib/supabaseClient'
import { stripe } from '@/lib/stripe'
import type { Database } from '@/types/supabase'
import type Stripe from 'stripe'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
export type RefundStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'skipped'

export interface StateTransitionResult {
  success: boolean
  error?: string
  booking?: Database['public']['Tables']['bookings']['Row']
  refundResult?: {
    status: RefundStatus
    amount?: number
    transactionId?: string
    error?: string
  }
}

export interface RefundOptions {
  force?: boolean // Admin override
  reason?: string
  adminId?: string
}

class BookingStateMachine {
  private static instance: BookingStateMachine
  
  private constructor() {}

  public static getInstance(): BookingStateMachine {
    if (!BookingStateMachine.instance) {
      BookingStateMachine.instance = new BookingStateMachine()
    }
    return BookingStateMachine.instance
  }

  /**
   * Transition a booking to a new status
   */
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
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (fetchError || !booking) {
      return {
        success: false,
        error: fetchError?.message || 'Booking not found'
      }
    }

    // Set app.current_user_id for trigger
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

      // Handle refund if needed
      let refundResult
      if (!options.skipRefund && updatedBooking.commitment_fee_paid) {
        if (newStatus === 'completed') {
          // Auto-refund on completion
          refundResult = await this.processRefund(bookingId)
        } else if (newStatus === 'cancelled') {
          // Check cancellation time for refund
          const { data: isRefundable } = await supabase
            .rpc('is_cancellation_refundable', { booking_id: bookingId })

          if (isRefundable || options.adminOverride) {
            refundResult = await this.processRefund(bookingId, {
              force: options.adminOverride,
              reason: options.reason,
              adminId: options.adminId
            })
          } else {
            refundResult = {
              status: 'skipped' as RefundStatus,
              error: 'Cancellation too close to appointment time'
            }
          }
        } else if (newStatus === 'no_show') {
          refundResult = {
            status: 'skipped' as RefundStatus,
            error: 'No refund for no-show'
          }
        }
      }

      return {
        success: true,
        booking: updatedBooking,
        refundResult
      }
    } catch (error) {
      console.error('State transition error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'State transition failed'
      }
    }
  }

  /**
   * Process refund for a booking
   */
  private async processRefund(
    bookingId: string,
    options: RefundOptions = {}
  ): Promise<{ status: RefundStatus; amount?: number; transactionId?: string; error?: string }> {
    try {
      const { data: booking, error: fetchError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', bookingId)
        .single()

      if (fetchError || !booking) {
        throw new Error(fetchError?.message || 'Booking not found')
      }

      if (!booking.payment_intent_id) {
        throw new Error('No payment intent found')
      }

      // Update refund status to processing
      await supabase
        .from('bookings')
        .update({
          refund_status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      // Process refund through Stripe
      const refund = await stripe.refunds.create({
        payment_intent: booking.payment_intent_id,
        reason: 'requested_by_customer',
        metadata: {
          booking_id: bookingId,
          admin_override: options.force ? 'true' : 'false',
          reason: options.reason || ''
        }
      })

      // Update booking with refund details
      await supabase
        .from('bookings')
        .update({
          refund_status: 'completed',
          refund_amount_cents: refund.amount,
          refund_transaction_id: refund.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      return {
        status: 'completed',
        amount: refund.amount,
        transactionId: refund.id
      }
    } catch (error) {
      console.error('Refund processing error:', error)

      // Update booking with error
      await supabase
        .from('bookings')
        .update({
          refund_status: 'failed',
          refund_error: error instanceof Error ? error.message : 'Refund processing failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      return {
        status: 'failed',
        error: error instanceof Error ? error.message : 'Refund processing failed'
      }
    }
  }

  /**
   * Get state transition history for a booking
   */
  public async getTransitionHistory(bookingId: string) {
    const { data, error } = await supabase
      .from('booking_state_changes')
      .select(`
        *,
        changed_by:users(id, email, full_name)
      `)
      .eq('booking_id', bookingId)
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(error.message)
    }

    return data
  }
}

// Export singleton instance
export const bookingStateMachine = BookingStateMachine.getInstance()
