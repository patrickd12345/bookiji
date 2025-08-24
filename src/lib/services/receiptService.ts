import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface ReceiptData {
  booking_id: string
  customer_name: string
  provider_name: string
  service_type: string
  price_cents: number
  date_time: string
  duration_minutes: number
  receipt_number: string
}

export class ReceiptService {
  private static instance: ReceiptService

  static getInstance(): ReceiptService {
    if (!ReceiptService.instance) {
      ReceiptService.instance = new ReceiptService()
    }
    return ReceiptService.instance
  }

  /**
   * Generate receipt for a confirmed booking
   */
  async generateReceipt(bookingId: string): Promise<string> {
    try {
      // Get booking details
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name),
          provider:profiles!bookings_provider_id_fkey(full_name),
          quote:quotes(estimated_duration_minutes)
        `)
        .eq('id', bookingId)
        .eq('state', 'provider_confirmed')
        .single()

      if (bookingError || !booking) {
        throw new Error(`Booking not found or not confirmed: ${bookingId}`)
      }

      // Generate receipt number
      const receiptNumber = this.generateReceiptNumber(bookingId)

      // Create receipt data
      const receiptData: ReceiptData = {
        booking_id: booking.id,
        customer_name: booking.customer?.full_name || 'Unknown Customer',
        provider_name: booking.provider?.full_name || 'Unknown Provider',
        service_type: 'General Service', // Would come from service_id in real implementation
        price_cents: booking.price_cents || 0,
        date_time: booking.created_at,
        duration_minutes: booking.quote?.estimated_duration_minutes || 60,
        receipt_number: receiptNumber
      }

      // Generate receipt URL (in real implementation, this would create a PDF or HTML receipt)
      const receiptUrl = this.createReceiptUrl(receiptData)

      // Update booking with receipt URL and transition to receipt_issued
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          receipt_url: receiptUrl,
          state: 'receipt_issued'
        })
        .eq('id', bookingId)

      if (updateError) {
        throw new Error(`Failed to update booking with receipt: ${updateError.message}`)
      }

      // Log the state transition
      await supabase
        .from('booking_audit_log')
        .insert({
          booking_id: booking.id,
          from_state: 'provider_confirmed',
          to_state: 'receipt_issued',
          action: 'state_change',
          actor_type: 'system',
          actor_id: 'receipt_service',
          metadata: {
            receipt_url: receiptUrl,
            receipt_number: receiptNumber,
            generated_at: new Date().toISOString()
          }
        })

      console.log(`Receipt generated for booking ${bookingId}: ${receiptUrl}`)

      return receiptUrl

    } catch (error) {
      console.error(`Failed to generate receipt for booking ${bookingId}:`, error)
      throw error
    }
  }

  /**
   * Generate a unique receipt number
   */
  private generateReceiptNumber(bookingId: string): string {
    const timestamp = Date.now().toString(36)
    const shortId = bookingId.substring(0, 8)
    return `RCP-${timestamp}-${shortId}`.toUpperCase()
  }

  /**
   * Create receipt URL (placeholder - would generate actual receipt)
   */
  private createReceiptUrl(receiptData: ReceiptData): string {
    // In real implementation, this would:
    // 1. Generate a PDF receipt
    // 2. Upload to cloud storage
    // 3. Return the public URL
    
    // For now, return a placeholder URL with receipt data
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://bookiji.com'
    const encodedData = encodeURIComponent(JSON.stringify(receiptData))
    
    return `${baseUrl}/receipt/${receiptData.booking_id}?data=${encodedData}`
  }

  /**
   * Get receipt data for a booking
   */
  async getReceiptData(bookingId: string): Promise<ReceiptData | null> {
    try {
      const { data: booking, error } = await supabase
        .from('bookings')
        .select(`
          *,
          customer:profiles!bookings_customer_id_fkey(full_name),
          provider:profiles!bookings_provider_id_fkey(full_name),
          quote:quotes(estimated_duration_minutes)
        `)
        .eq('id', bookingId)
        .eq('state', 'receipt_issued')
        .single()

      if (error || !booking) {
        return null
      }

      return {
        booking_id: booking.id,
        customer_name: booking.customer?.full_name || 'Unknown Customer',
        provider_name: booking.provider?.full_name || 'Unknown Provider',
        service_type: 'General Service',
        price_cents: booking.price_cents || 0,
        date_time: booking.created_at,
        duration_minutes: booking.quote?.estimated_duration_minutes || 60,
        receipt_number: this.extractReceiptNumber(booking.receipt_url)
      }

    } catch (error) {
      console.error(`Failed to get receipt data for booking ${bookingId}:`, error)
      return null
    }
  }

  /**
   * Extract receipt number from receipt URL
   */
  private extractReceiptNumber(receiptUrl: string): string {
    // Extract from URL or generate a fallback
    const match = receiptUrl.match(/RCP-[A-Z0-9]+-[A-Z0-9]+/)
    return match ? match[0] : 'RCP-UNKNOWN'
  }

  /**
   * Send receipt notifications (email/SMS)
   */
  async sendReceiptNotifications(bookingId: string): Promise<void> {
    try {
      const receiptData = await this.getReceiptData(bookingId)
      if (!receiptData) {
        throw new Error(`Receipt data not found for booking ${bookingId}`)
      }

      // TODO: Implement email notification
      console.log(`Would send email receipt to customer for booking ${bookingId}`)
      
      // TODO: Implement SMS notification
      console.log(`Would send SMS receipt to customer for booking ${bookingId}`)

    } catch (error) {
      console.error(`Failed to send receipt notifications for booking ${bookingId}:`, error)
      // Don't throw - notifications are not critical to the core flow
    }
  }

  /**
   * Process all confirmed bookings and generate receipts
   */
  async processConfirmedBookings(): Promise<void> {
    try {
      // Get all provider_confirmed bookings without receipts
      const { data: confirmedBookings, error } = await supabase
        .from('bookings')
        .select('id, created_at')
        .eq('state', 'provider_confirmed')
        .is('receipt_url', null)
        .order('created_at', { ascending: true })

      if (error) {
        console.error('Failed to fetch confirmed bookings:', error)
        return
      }

      if (!confirmedBookings || confirmedBookings.length === 0) {
        return // No confirmed bookings to process
      }

      console.log(`Processing ${confirmedBookings.length} confirmed bookings for receipt generation`)

      for (const booking of confirmedBookings) {
        try {
          await this.generateReceipt(booking.id)
          await this.sendReceiptNotifications(booking.id)
        } catch (receiptError) {
          console.error(`Failed to process receipt for booking ${booking.id}:`, receiptError)
        }
      }

    } catch (error) {
      console.error('Error in processConfirmedBookings:', error)
    }
  }
}

// Export singleton instance
export const receiptService = ReceiptService.getInstance()
