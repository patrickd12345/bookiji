// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { featureFlags } from '@/config/featureFlags'
import { logger, errorToContext } from '@/lib/logger'
import type { Database } from '@/types/supabase'
import type { PaymentOutboxEntry } from '@/lib/database/outbox'

import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

type BookingRow = Database['public']['Tables']['bookings']['Row']

interface BookingOutboxEvent extends Omit<PaymentOutboxEntry, 'payload'> {
  event_data: {
    booking_id: string
    provider_id: string
  }
  status?: 'pending' | 'in_flight' | 'committed' | 'failed'
  retry_count?: number
}

interface BookingWorkerConfig {
  pollIntervalMs: number
  maxRetries: number
  timeoutMinutes: number
}

export class BookingWorker {
  private static instance: BookingWorker
  private pollInterval?: NodeJS.Timeout
  private isRunning = false
  private config: BookingWorkerConfig

  private constructor() {
    this.config = {
      pollIntervalMs: 30 * 1000, // 30 seconds
      maxRetries: 3,
      timeoutMinutes: featureFlags.provider.confirmation_timeout_minutes
    }
  }

  static getInstance(): BookingWorker {
    if (!BookingWorker.instance) {
      BookingWorker.instance = new BookingWorker()
    }
    return BookingWorker.instance
  }

  /**
   * Start the booking worker
   */
  start(): void {
    if (this.isRunning) {
      logger.info('Booking worker already running')
      return
    }

    this.isRunning = true
    this.pollInterval = setInterval(() => {
      this.processPendingBookings()
    }, this.config.pollIntervalMs)

    logger.info('Booking worker started', { poll_interval_ms: this.config.pollIntervalMs })
  }

  /**
   * Stop the booking worker
   */
  stop(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval)
      this.pollInterval = undefined
    }
    this.isRunning = false
    logger.info('Booking worker stopped')
  }

  /**
   * Process pending bookings from the outbox
   */
  private async processPendingBookings(): Promise<void> {
    try {
      // Get pending hold_created events
      const { data: pendingEvents, error } = await supabase
        .from('payments_outbox')
        .select('*')
        .eq('event_type', 'hold_created')
        .eq('status', 'pending')
        .lte('retry_count', this.config.maxRetries)
        .order('created_at', { ascending: true })
        .limit(10) // Process in batches

      if (error) {
        logger.error('Failed to fetch pending events', errorToContext(error))
        return
      }

      if (!pendingEvents || pendingEvents.length === 0) {
        return // No pending events
      }

      logger.info('Processing pending booking events', { event_count: pendingEvents.length })

      for (const event of pendingEvents) {
        try {
          await this.processBookingEvent(event)
        } catch (eventError) {
          logger.error('Failed to process event', { ...errorToContext(eventError), event_id: event.id })
          await this.markEventFailed(event.id, eventError instanceof Error ? eventError.message : 'Unknown error')
        }
      }

    } catch (error) {
      logger.error('Error in processPendingBookings', errorToContext(error))
    }
  }

  /**
   * Process a single booking event
   */
  private async processBookingEvent(event: BookingOutboxEvent): Promise<void> {
    const { booking_id, provider_id } = event.event_data

    // Check if booking still exists and is in hold_placed state
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('state', 'hold_placed')
      .single()

    if (bookingError || !booking) {
      logger.info('Booking not found or not in hold_placed state, marking event as processed', { booking_id })
      await this.markEventProcessed(event.id)
      return
    }

    // Check if we've exceeded the timeout
    const timeSinceHold = Date.now() - new Date(booking.created_at).getTime()
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000

    if (timeSinceHold > timeoutMs) {
      logger.info('Booking exceeded timeout, auto-cancelling', { booking_id, timeout_minutes: this.config.timeoutMinutes })
      await this.autoCancelBooking(booking, event)
      await this.markEventProcessed(event.id)
      return
    }

    // Simulate provider confirmation (in real implementation, this would call provider APIs)
    const shouldConfirm = await this.simulateProviderConfirmation(provider_id, booking_id)
    
    if (shouldConfirm) {
      logger.info('Provider confirmed booking', { provider_id, booking_id })
      await this.confirmBooking(booking, event)
      await this.markEventProcessed(event.id)
    } else {
      // Provider hasn't responded yet, increment retry count
      await this.incrementRetryCount(event.id)
    }
  }

  /**
   * Simulate provider confirmation (replace with real provider API calls)
   */
  private async simulateProviderConfirmation(__providerId: string, __bookingId: string): Promise<boolean> {
    // For now, simulate 80% confirmation rate after 5-10 minutes
    const timeSinceBooking = Date.now() - new Date().getTime() + 5 * 60 * 1000 // Simulate 5 min delay
    const randomFactor = Math.random()
    
    // Higher chance of confirmation as time passes
    const confirmationChance = Math.min(0.8, timeSinceBooking / (10 * 60 * 1000) * 0.8)
    
    return randomFactor < confirmationChance
  }

  /**
   * Confirm a booking (transition to provider_confirmed)
   */
  private async confirmBooking(booking: BookingRow, event: BookingOutboxEvent): Promise<void> {
    try {
      // Update booking state
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          state: 'provider_confirmed',
          confirmed_at: new Date().toISOString()
        })
        .eq('id', booking.id)

      if (updateError) {
        throw new Error(`Failed to update booking state: ${updateError.message}`)
      }

      // Log the state transition
      await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: booking.id,
          from_state: 'hold_placed',
          to_state: 'provider_confirmed',
          action: 'state_change',
          actor_type: 'system',
          actor_id: 'booking_worker',
          metadata: {
            payment_intent: booking.payment_intent_id,
            provider_id: booking.vendor_id,
            confirmation_time: new Date().toISOString(),
            worker_event_id: event.id
          }
        })

      logger.info('Booking confirmed successfully', { booking_id: booking.id })

    } catch (error) {
      logger.error('Failed to confirm booking', { ...errorToContext(error), booking_id: booking.id })
      throw error
    }
  }

  /**
   * Auto-cancel a booking due to timeout
   */
  private async autoCancelBooking(booking: BookingRow, event: BookingOutboxEvent): Promise<void> {
    try {
      // Update booking state
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          state: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancelled_reason: 'PROVIDER_TIMEOUT'
        })
        .eq('id', booking.id)

      if (updateError) {
        throw new Error(`Failed to update booking state: ${updateError.message}`)
      }

      // Log the state transition
      await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: booking.id,
          from_state: 'hold_placed',
          to_state: 'cancelled',
          action: 'state_change',
          actor_type: 'system',
          actor_id: 'booking_worker',
          metadata: {
            payment_intent: booking.payment_intent_id,
            provider_id: booking.vendor_id,
            cancellation_reason: 'PROVIDER_TIMEOUT',
            timeout_minutes: this.config.timeoutMinutes,
            worker_event_id: event.id
          }
        })

      // TODO: Implement automatic refund via Stripe
      logger.info('Booking auto-cancelled due to provider timeout', { booking_id: booking.id })

    } catch (error) {
      logger.error('Failed to auto-cancel booking', { ...errorToContext(error), booking_id: booking.id })
      throw error
    }
  }

  /**
   * Mark an event as processed
   */
  private async markEventProcessed(eventId: string): Promise<void> {
    await supabase
      .from('payments_outbox')
      .update({
        status: 'processed',
        processed_at: new Date().toISOString()
      })
      .eq('id', eventId)
  }

  /**
   * Mark an event as failed
   */
  private async markEventFailed(eventId: string, errorMessage: string): Promise<void> {
    await supabase
      .from('payments_outbox')
      .update({
        status: 'failed',
        processed_at: new Date().toISOString(),
        error_message: errorMessage
      })
      .eq('id', eventId)
  }

  /**
   * Increment retry count for an event
   */
  private async incrementRetryCount(eventId: string): Promise<void> {
    await supabase
      .from('payments_outbox')
      .update({
        retry_count: supabase.rpc('increment', { row_id: eventId, column_name: 'retry_count' })
      })
      .eq('id', eventId)
  }

  /**
   * Get worker status
   */
  getStatus(): { isRunning: boolean; config: BookingWorkerConfig } {
    return {
      isRunning: this.isRunning,
      config: this.config
    }
  }
}

// Export singleton instance
export const bookingWorker = BookingWorker.getInstance()
