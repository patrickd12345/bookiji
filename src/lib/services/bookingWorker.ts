import { createClient } from '@supabase/supabase-js'
import { featureFlags } from '@/config/featureFlags'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

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
      console.log('Booking worker already running')
      return
    }

    this.isRunning = true
    this.pollInterval = setInterval(() => {
      this.processPendingBookings()
    }, this.config.pollIntervalMs)

    console.log(`Booking worker started - polling every ${this.config.pollIntervalMs}ms`)
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
    console.log('Booking worker stopped')
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
        console.error('Failed to fetch pending events:', error)
        return
      }

      if (!pendingEvents || pendingEvents.length === 0) {
        return // No pending events
      }

      console.log(`Processing ${pendingEvents.length} pending booking events`)

      for (const event of pendingEvents) {
        try {
          await this.processBookingEvent(event)
        } catch (eventError) {
          console.error(`Failed to process event ${event.id}:`, eventError)
          await this.markEventFailed(event.id, eventError instanceof Error ? eventError.message : 'Unknown error')
        }
      }

    } catch (error) {
      console.error('Error in processPendingBookings:', error)
    }
  }

  /**
   * Process a single booking event
   */
  private async processBookingEvent(event: any): Promise<void> {
    const { booking_id, provider_id } = event.event_data

    // Check if booking still exists and is in hold_placed state
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', booking_id)
      .eq('state', 'hold_placed')
      .single()

    if (bookingError || !booking) {
      console.log(`Booking ${booking_id} not found or not in hold_placed state, marking event as processed`)
      await this.markEventProcessed(event.id)
      return
    }

    // Check if we've exceeded the timeout
    const timeSinceHold = Date.now() - new Date(booking.created_at).getTime()
    const timeoutMs = this.config.timeoutMinutes * 60 * 1000

    if (timeSinceHold > timeoutMs) {
      console.log(`Booking ${booking_id} exceeded ${this.config.timeoutMinutes}min timeout, auto-cancelling`)
      await this.autoCancelBooking(booking, event)
      await this.markEventProcessed(event.id)
      return
    }

    // Simulate provider confirmation (in real implementation, this would call provider APIs)
    const shouldConfirm = await this.simulateProviderConfirmation(provider_id, booking_id)
    
    if (shouldConfirm) {
      console.log(`Provider ${provider_id} confirmed booking ${booking_id}`)
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
  private async simulateProviderConfirmation(_providerId: string, _bookingId: string): Promise<boolean> {
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
  private async confirmBooking(booking: any, event: any): Promise<void> {
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
            payment_intent: booking.stripe_payment_intent_id,
            provider_id: booking.provider_id,
            confirmation_time: new Date().toISOString(),
            worker_event_id: event.id
          }
        })

      console.log(`Booking ${booking.id} confirmed successfully`)

    } catch (error) {
      console.error(`Failed to confirm booking ${booking.id}:`, error)
      throw error
    }
  }

  /**
   * Auto-cancel a booking due to timeout
   */
  private async autoCancelBooking(booking: any, event: any): Promise<void> {
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
            payment_intent: booking.stripe_payment_intent_id,
            provider_id: booking.provider_id,
            cancellation_reason: 'PROVIDER_TIMEOUT',
            timeout_minutes: this.config.timeoutMinutes,
            worker_event_id: event.id
          }
        })

      // TODO: Implement automatic refund via Stripe
      console.log(`Booking ${booking.id} auto-cancelled due to provider timeout`)

    } catch (error) {
      console.error(`Failed to auto-cancel booking ${booking.id}:`, error)
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
