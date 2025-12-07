import { getServerSupabase } from './supabaseClient'

const supabase = getServerSupabase()
import type { 
  UserCredits, 
  CreditTransaction, 
  CreditPackage 
} from '../types/global'

// Types for database operations
export interface UserProfile {
  id: string
  full_name?: string
  email?: string
  phone?: string
  role: 'customer' | 'vendor' | 'admin'
  preferences?: Record<string, unknown>
  marketing_consent?: boolean
  business_name?: string // For vendors
  service_type?: string // For vendors
  location?: string // For vendors
  description?: string // For vendors
  vendor_status?: 'pending_verification' | 'pending_approval' | 'approved' | 'suspended' // For vendors
  created_at: string
  updated_at: string
}

export interface OnboardingData {
  full_name: string
  phone: string
  location: string
  service_preferences: string[]
}

export interface Service {
  id: string
  vendor_id: string
  name: string
  description?: string
  duration_minutes: number
  price_cents: number
  category: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface AvailabilitySlot {
  id: string
  vendor_id: string
  service_id: string
  start_time: string
  end_time: string
  is_booked: boolean
  created_at: string
}

export interface Booking {
  id: string
  customer_id: string
  vendor_id: string
  service_id: string
  slot_id: string
  slot_start: string
  slot_end: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'no_show'
  commitment_fee_paid: boolean
  vendor_fee_paid: boolean
  total_amount_cents: number
  payment_intent_id?: string // For Stripe payments
  payment_status?: 'pending' | 'paid' | 'failed' | 'refunded'
  cancellation_reason?: string // For cancelled bookings
  cancelled_at?: string // Timestamp when cancelled
  refunded_at?: string // Timestamp when refunded
  notes?: string
  created_at: string
  updated_at: string
}

// User Management
export const userService = {
  // Get current user profile
  async getCurrentUser(): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (error) {
      console.error('Error fetching user profile:', error)
      return null
    }

    return data
  },

  // Create or update user profile
  async upsertProfile(profile: Partial<UserProfile>): Promise<UserProfile | null> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting profile:', error)
      return null
    }

    return data
  },

  // Save onboarding data
  async saveOnboardingData(onboardingData: OnboardingData): Promise<boolean> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return false

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: onboardingData.full_name,
        phone: onboardingData.phone,
        preferences: {
          location: onboardingData.location,
          service_preferences: onboardingData.service_preferences
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      console.error('Error saving onboarding data:', error)
      return false
    }

    return true
  }
}

// Service Management
export const serviceService = {
  // Get services by category
  async getServicesByCategory(category: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('category', category)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching services:', error)
      return []
    }

    return data || []
  },

  // Get services by vendor
  async getServicesByVendor(vendorId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('is_active', true)

    if (error) {
      console.error('Error fetching vendor services:', error)
      return []
    }

    return data || []
  },

  // Create new service
  async createService(service: Omit<Service, 'id' | 'created_at' | 'updated_at'>): Promise<Service | null> {
    const { data, error } = await supabase
      .from('services')
      .insert(service)
      .select()
      .single()

    if (error) {
      console.error('Error creating service:', error)
      return null
    }

    return data
  }
}

// Availability Management
export const availabilityService = {
  // Get available slots for a service
  async getAvailableSlots(serviceId: string, date: string): Promise<AvailabilitySlot[]> {
    const startOfDay = new Date(date)
    startOfDay.setHours(0, 0, 0, 0)
    
    const endOfDay = new Date(date)
    endOfDay.setHours(23, 59, 59, 999)

    const { data, error } = await supabase
      .from('availability_slots')
      .select('*')
      .eq('service_id', serviceId)
      .eq('is_booked', false)
      .gte('start_time', startOfDay.toISOString())
      .lte('start_time', endOfDay.toISOString())
      .order('start_time')

    if (error) {
      console.error('Error fetching available slots:', error)
      return []
    }

    return data || []
  },

  // Create availability slots
  async createAvailabilitySlots(slots: Omit<AvailabilitySlot, 'id' | 'created_at'>[]): Promise<boolean> {
    const { error } = await supabase
      .from('availability_slots')
      .insert(slots)

    if (error) {
      console.error('Error creating availability slots:', error)
      return false
    }

    return true
  }
}

// Booking Management
export const bookingService = {
  // Create new booking
  async createBooking(booking: Omit<Booking, 'id' | 'created_at' | 'updated_at'>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .insert(booking)
      .select()
      .single()

    if (error) {
      console.error('Error creating booking:', error)
      return null
    }

    return data
  },

  // Get user bookings
  async getUserBookings(userId: string): Promise<Booking[]> {
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .or(`customer_id.eq.${userId},vendor_id.eq.${userId}`)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching user bookings:', error)
      return []
    }

    return data || []
  },

  // Get booking by ID
  async getBookingById(bookingId: string): Promise<Booking | null> {
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
  },

  // Update booking with partial data
  async updateBooking(bookingId: string, updates: Partial<Booking>): Promise<Booking | null> {
    const { data, error } = await supabase
      .from('bookings')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', bookingId)
      .select()
      .single()

    if (error) {
      console.error('Error updating booking:', error)
      return null
    }

    return data
  },

  // Update booking status
  async updateBookingStatus(bookingId: string, status: Booking['status']): Promise<boolean> {
    const { error } = await supabase
      .from('bookings')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status:', error)
      return false
    }

    return true
  }
}

// Credit Booklet Database Operations
export async function getUserCredits(userId: string): Promise<{ success: boolean; credits?: UserCredits; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('user_credits')
      .select('*')
      .eq('user_id', userId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      throw error
    }

    // If no credits record exists, create one with zero balance
    if (!data) {
      const { data: newCredits, error: createError } = await supabase
        .from('user_credits')
        .insert({
          user_id: userId,
          balance_cents: 0,
          total_purchased_cents: 0,
          total_used_cents: 0,
        })
        .select()
        .single()

      if (createError) throw createError
      return { success: true, credits: newCredits }
    }

    return { success: true, credits: data }
  } catch (error) {
    console.error('Error fetching user credits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch credits' }
  }
}

export async function addCredits(
  userId: string, 
  amountCents: number, 
  description: string, 
  transactionType: 'purchase' | 'bonus' | 'refund' = 'purchase',
  paymentIntentId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Start a transaction
    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('balance_cents, total_purchased_cents')
      .eq('user_id', userId)
      .single()

    if (!currentCredits) {
      throw new Error('User credits record not found')
    }

    const newBalance = currentCredits.balance_cents + amountCents
    const newTotalPurchased = transactionType === 'purchase' 
      ? currentCredits.total_purchased_cents + amountCents 
      : currentCredits.total_purchased_cents

    // Update user credits balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        balance_cents: newBalance,
        total_purchased_cents: newTotalPurchased,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount_cents: amountCents,
        transaction_type: transactionType,
        description,
        payment_intent_id: paymentIntentId,
      })

    if (transactionError) throw transactionError

    return { success: true }
  } catch (error) {
    console.error('Error adding credits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to add credits' }
  }
}

export async function useCredits(
  userId: string, 
  amountCents: number, 
  description: string, 
  bookingId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Check current balance
    const { data: currentCredits } = await supabase
      .from('user_credits')
      .select('balance_cents, total_used_cents')
      .eq('user_id', userId)
      .single()

    if (!currentCredits) {
      throw new Error('User credits record not found')
    }

    if (currentCredits.balance_cents < amountCents) {
      return { success: false, error: 'Insufficient credits' }
    }

    const newBalance = currentCredits.balance_cents - amountCents
    const newTotalUsed = currentCredits.total_used_cents + amountCents

    // Update user credits balance
    const { error: updateError } = await supabase
      .from('user_credits')
      .update({
        balance_cents: newBalance,
        total_used_cents: newTotalUsed,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId)

    if (updateError) throw updateError

    // Record the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        amount_cents: -amountCents, // Negative for usage
        transaction_type: 'usage',
        description,
        booking_id: bookingId,
      })

    if (transactionError) throw transactionError

    return { success: true }
  } catch (error) {
    console.error('Error using credits:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to use credits' }
  }
}

export async function getCreditTransactions(userId: string): Promise<{ success: boolean; transactions?: CreditTransaction[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return { success: true, transactions: data }
  } catch (error) {
    console.error('Error fetching credit transactions:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch transactions' }
  }
}

export async function getCreditPackages(): Promise<{ success: boolean; packages?: CreditPackage[]; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('credit_packages')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true })

    if (error) throw error

    return { success: true, packages: data }
  } catch (error) {
    console.error('Error fetching credit packages:', error)
    return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch packages' }
  }
}

// Initialize database with test data
export const initializeDatabase = async () => {
  try {
    // For development, return true to indicate successful connection
    console.log('🔌 Using test database configuration')
    return true
  } catch (error) {
    console.error('Failed to initialize database:', error)
    return false
  }
} 