import { supabase } from '@/lib/supabaseClient'
import { bookingStateMachine, type BookingStatus } from '@/lib/bookingStateMachine'
import type { Database } from '@/types/supabase'

export type Booking = Database['public']['Tables']['bookings']['Row']

export class BookingService {
  private static instance: BookingService
  
  private constructor() {}

  public static getInstance(): BookingService {
    if (!BookingService.instance) {
      BookingService.instance = new BookingService()
    }
    return BookingService.instance
  }

  /**
   * Create a new booking
   */
  public async createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .insert({
        ...booking,
        status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return null
    }

    return data
  }

  /**
   * Update booking status using state machine
   */
  public async updateStatus(
    bookingId: string,
    newStatus: BookingStatus,
    options: {
      reason?: string
      adminOverride?: boolean
      adminId?: string
      skipRefund?: boolean
    } = {}
  ) {
    return bookingStateMachine.transition(bookingId, newStatus, options)
  }

  /**
   * Get booking by ID
   */
  public async getBooking(bookingId: string): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .single()

    if (error) {
      console.error('Error fetching booking:', error)
      return null
    }

    return data
  }

  /**
   * Get booking state history
   */
  public async getBookingHistory(bookingId: string) {
    return bookingStateMachine.getTransitionHistory(bookingId)
  }

  /**
   * Get user's bookings
   */
  public async getUserBookings(userId: string, role: 'customer' | 'vendor'): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .eq(role === 'customer' ? 'customer_id' : 'vendor_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user bookings:', error)
      return []
    }

    return data
  }
}

// Export singleton instance
export const bookingService = BookingService.getInstance()
