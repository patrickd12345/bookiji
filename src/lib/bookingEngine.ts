import { getServerSupabase } from './supabaseServer'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { createCommitmentFeePaymentIntent } from './stripe'

export interface BookingRequest {
  customerId: string
  service: string
  providerId?: string
  location: string
  date: string
  time: string
  notes?: string
}

export interface BookingSlot {
  id: string
  start_time: string
  end_time: string
  is_booked: boolean
  vendor_id: string
  service_id: string
}

export interface BookingResult {
  success: boolean
  bookingId?: string
  paymentIntentId?: string
  clientSecret?: string
  error?: string
  slot?: BookingSlot
}

export class BookingEngine {
  // Create a new booking and payment intent
  static async createBooking(request: BookingRequest): Promise<BookingResult> {
    try {
      console.log('🚀 Creating booking for:', request)

      // 1. Find available slot
      const slot = await this.findAvailableSlot(request)
      if (!slot) {
        return {
          success: false,
          error: 'No available slots found for the requested time'
        }
      }

      // 2. Create booking record
      const bookingId = await this.createBookingRecord(request, slot)
      if (!bookingId) {
        return {
          success: false,
          error: 'Failed to create booking record'
        }
      }

      // 3. Create payment intent
      const paymentIntent = await createCommitmentFeePaymentIntent(100, 'usd', bookingId)
      if (!paymentIntent) {
        // Clean up booking if payment fails
        await this.cancelBooking(bookingId)
        return {
          success: false,
          error: 'Failed to create payment intent'
        }
      }

      return {
        success: true,
        bookingId,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret!,
        slot
      }

    } catch (error) {
      console.error('❌ Booking engine error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Booking creation failed'
      }
    }
  }

  // Find available slot for the requested service and time
  private static async findAvailableSlot(request: BookingRequest): Promise<BookingSlot | null> {
    try {
      // First, get the service_id for the requested service name
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .select('id')
        .eq('name', request.service)
        .single()

      if (serviceError || !serviceData) {
        console.error('Error finding service:', serviceError)
        return null
      }

      const serviceId = serviceData.id

      // Now, find an available slot for that service and time
      const { data, error } = await supabase
        .from('availability_slots')
        .select('*')
        .eq('is_booked', false)
        .eq('service_id', serviceId)
        .gte('start_time', `${request.date}T${request.time}:00Z`)
        .lt('start_time', `${request.date}T${request.time}:59Z`)
        .limit(1)

      if (error) {
        console.error('Error finding available slot:', error)
        return null
      }

      if (!data || data.length === 0) {
        return null
      }

      return data[0] as BookingSlot
    } catch (error) {
      console.error('Error in findAvailableSlot:', error)
      return null
    }
  }

  // Create booking record in database
  private static async createBookingRecord(request: BookingRequest, slot: BookingSlot): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .insert({
          customer_id: request.customerId,
          vendor_id: slot.vendor_id,
          service_id: slot.service_id,
          slot_id: slot.id,
          slot_start: slot.start_time,
          slot_end: slot.end_time,
          status: 'pending',
          commitment_fee_paid: false,
          vendor_fee_paid: false,
          total_amount_cents: 100, // $1.00 commitment fee
          notes: request.notes,
        })
        .select('id')
        .single()

      if (error) {
        console.error('Error creating booking record:', error)
        return null
      }

      return data.id
    } catch (error) {
      console.error('Error in createBookingRecord:', error)
      return null
    }
  }

  // Cancel booking (cleanup)
  private static async cancelBooking(bookingId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (error) {
        console.error('Error cancelling booking:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in cancelBooking:', error)
      return false
    }
  }

  // Get user's bookings
  static async getUserBookings(userId: string): Promise<unknown[]> {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select(`
          *,
          services(name),
          customers:users!bookings_customer_id_fkey(full_name),
          vendors:users!bookings_vendor_id_fkey(full_name)
        `)
        .or(`customer_id.eq.${userId},vendor_id.eq.${userId}`)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching user bookings:', error)
        return []
      }

      return data || []
    } catch (error) {
      console.error('Error in getUserBookings:', error)
      return []
    }
  }

  // Update booking status
  static async updateBookingStatus(bookingId: string, status: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ 
          status,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId)

      if (error) {
        console.error('Error updating booking status:', error)
        return false
      }

      return true
    } catch (error) {
      console.error('Error in updateBookingStatus:', error)
      return false
    }
  }

  // Helper method to generate proper UUIDs for testing
  static generateTestUUID(): string {
    return '00000000-0000-0000-0000-000000000000'
  }
}
