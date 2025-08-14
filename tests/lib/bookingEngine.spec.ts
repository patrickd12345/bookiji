/// <reference types="vitest" />
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingEngine } from '../../src/lib/bookingEngine'

// Mock the Stripe helper
vi.mock('../../src/lib/stripe', () => ({
  createCommitmentFeePaymentIntent: async () => ({
    success: true,
    paymentIntent: {
      id: 'pi_mock',
      client_secret: 'cs_mock',
      amount: 100,
      currency: 'usd'
    }
  }),
  getLiveBookingFee: async () => 100 // Mock the live booking fee function
}))

vi.mock('../../src/lib/supabaseClient', () => {
  const from = vi.fn()
  // Expose for tests via globalThis
  ;(globalThis as any).__SB_FROM__ = from
  return {
    supabase: {
      from
    }
  }
})

// Helper to fetch the mock after modules are evaluated
const getMockFrom = () => (globalThis as any).__SB_FROM__ as ReturnType<typeof vi.fn>

/**
 * Helper to build the minimal query-chain object Vitest needs for this test.
 * Each database call we care about just returns a Promise with the expected
 * shape. For anything not used in this test we can return `this` unchanged.
 */
function chainable(returnValue: any): any {
  return new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'limit' || prop === 'single') {
          // these methods should resolve with the final value
          return () => Promise.resolve(returnValue)
        }
        // otherwise return another chainable function
        return () => chainable(returnValue)
      }
    }
  )
}

describe('BookingEngine', () => {
  beforeEach(() => {
    getMockFrom().mockReset()
  })

  it('returns error when no slot is available', async () => {
    // 1) Service lookup returns a service id
    getMockFrom()
      .mockImplementationOnce(() => ({
        select: () => ({
          eq: () => ({
            single: () => Promise.resolve({ data: { id: 'service_1' }, error: null })
          })
        })
      }))
      // 2) Slot lookup returns empty array
      .mockImplementationOnce(() => chainable(Promise.resolve({ data: [], error: null })))

    const result = await BookingEngine.createBooking({
      customerId: 'cust_1',
      service: 'Haircut',
      location: 'NYC',
      date: '2024-05-01',
      time: '10:00'
    } as any)

    expect(result.success).toBe(false)
    expect(result.error).toMatch(/No available slots/)
  })
}) 