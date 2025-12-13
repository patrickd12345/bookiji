import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingEngine } from '../../src/lib/bookingEngine'
import { getSupabaseMock } from '../utils/supabase-mocks'

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
    const mock = getSupabaseMock()
    mock.from.mockReset()
  })

  it('returns error when no slot is available', async () => {
    const mock = getSupabaseMock()
    const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    // 1) Service lookup returns a service id
    mock.from
      .mockImplementationOnce((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({ data: { id: 'service_1' }, error: null })
            })
          })
        } as any
      })
      // 2) Slot lookup returns empty array
      .mockImplementationOnce((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          ...chainable(Promise.resolve({ data: [], error: null }))
        } as any
      })

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