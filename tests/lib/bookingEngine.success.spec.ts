/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingEngine } from '../../lib/bookingEngine'

// 1️⃣ Mock Stripe helper – always succeed
vi.mock('../../lib/stripe', () => ({
  createCommitmentFeePaymentIntent: async () => ({
    success: true,
    paymentIntent: {
      id: 'pi_mock',
      client_secret: 'cs_mock',
      amount: 100,
      currency: 'usd'
    }
  })
}))

// 2️⃣ Mock Supabase client with sequential behaviours per .from call
/**
 * We will intercept calls to supabase.from()
 * Call order inside BookingEngine.createBooking():
 *   a) from('services')      -> service lookup
 *   b) from('availability_slots') -> slot lookup
 *   c) from('bookings')      -> insert booking
 */
vi.mock('../../src/lib/supabaseClient', () => {
  const from = vi.fn()
  ;(globalThis as any).__SB_FROM2__ = from
  return {
    supabase: {
      from
    }
  }
})

const getMockFrom = () => (globalThis as any).__SB_FROM2__ as ReturnType<typeof vi.fn>

// Configure sequential behaviours before tests run
getMockFrom()
  .mockImplementationOnce(mockServiceLookup)
  .mockImplementationOnce(mockSlotLookup)
  .mockImplementationOnce(mockBookingInsert)

function mockServiceLookup() {
  return {
    select: () => ({
      eq: () => ({
        single: () => Promise.resolve({ data: { id: 'service_1' }, error: null })
      })
    })
  }
}

function mockSlotLookup() {
  // minimal slot object that BookingEngine expects
  const slot = {
    id: 'slot_1',
    start_time: '2024-05-01T10:00:00Z',
    end_time: '2024-05-01T11:00:00Z',
    vendor_id: 'vendor_1',
    service_id: 'service_1',
    is_booked: false
  }

  return {
    select: () => ({
      eq: () => ({
        eq: () => ({
          gte: () => ({
            lt: () => ({
              limit: () => Promise.resolve({ data: [slot], error: null })
            })
          })
        })
      })
    })
  }
}

function mockBookingInsert() {
  return {
    insert: () => ({
      select: () => ({
        single: () => Promise.resolve({ data: { id: 'booking_1' }, error: null })
      })
    })
  }
}

// 3️⃣ Test case

describe('BookingEngine – happy path', () => {
  beforeEach(() => {
    getMockFrom().mockClear()
  })

  it('creates a booking and returns payment info', async () => {
    const result = await BookingEngine.createBooking({
      customerId: 'cust_1',
      service: 'Haircut',
      location: 'NYC',
      date: '2024-05-01',
      time: '10:00'
    } as any)

    expect(result.success).toBe(true)
    expect(result.bookingId).toBe('booking_1')
    expect(result.clientSecret).toBe('cs_mock')
    expect(result.slot?.id).toBe('slot_1')
  })
}) 