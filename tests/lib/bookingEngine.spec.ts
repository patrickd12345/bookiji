import { describe, it, expect, vi, beforeEach } from 'vitest'
import { BookingEngine } from '../../src/lib/bookingEngine'
import { getSupabaseMock } from '../utils/supabase-mocks'

// Mock the Stripe helper
vi.mock('../../src/lib/stripe', () => ({
  createCommitmentFeePaymentIntent: async (amount: number, currency: string, bookingId: string) => {
    return {
      id: 'pi_mock',
      client_secret: 'cs_mock',
      amount: 100,
      currency: 'usd'
    }
  },
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

describe('BookingEngine - Layer 1: Unit Tests (Logic Integrity)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    vi.clearAllMocks()
  })

  describe('createBooking', () => {
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

    it('rejects bookings with past start times', async () => {
      const mock = getSupabaseMock()
      const pastDate = new Date(Date.now() - 60 * 60 * 1000) // 1 hour ago
      const pastDateStr = pastDate.toISOString().split('T')[0]
      const pastTime = pastDate.toTimeString().split(':').slice(0, 2).join(':')

      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
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
        .mockImplementationOnce((table: string) => {
          const baseChain = baseFrom(table)
          return {
            ...baseChain,
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    lt: () => ({
                      limit: () => Promise.resolve({ 
                        data: [{
                          id: 'slot_1',
                          start_time: pastDate.toISOString(),
                          end_time: new Date(pastDate.getTime() + 60 * 60 * 1000).toISOString(),
                          is_booked: false,
                          vendor_id: 'vendor_1',
                          service_id: 'service_1'
                        }], 
                        error: null 
                      })
                    })
                  })
                })
              })
            })
          } as any
        })
        .mockImplementationOnce((table: string) => {
          // This should not be called because past booking should be rejected
          return {
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: null, error: { message: 'Should not reach here' } })
              })
            })
          } as any
        })

      const result = await BookingEngine.createBooking({
        customerId: 'cust_1',
        service: 'Haircut',
        location: 'NYC',
        date: pastDateStr,
        time: pastTime
      } as any)

      // Should fail because slot is in the past
      expect(result.success).toBe(false)
    })

    it('creates booking successfully when slot is available', async () => {
      const mock = getSupabaseMock()
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now
      const futureDateStr = futureDate.toISOString().split('T')[0]
      const futureTime = '10:00'

      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
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
        .mockImplementationOnce((table: string) => {
          const baseChain = baseFrom(table)
          return {
            ...baseChain,
            select: () => ({
              eq: () => ({
                eq: () => ({
                  gte: () => ({
                    lt: () => ({
                      limit: () => Promise.resolve({ 
                        data: [{
                          id: 'slot_1',
                          start_time: futureDate.toISOString(),
                          end_time: new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(),
                          is_booked: false,
                          vendor_id: 'vendor_1',
                          service_id: 'service_1'
                        }], 
                        error: null 
                      })
                    })
                  })
                })
              })
            })
          } as any
        })
        .mockImplementationOnce((table: string) => {
          const baseChain = baseFrom(table)
          return {
            ...baseChain,
            insert: () => ({
              select: () => ({
                single: () => Promise.resolve({ data: { id: 'booking_123' }, error: null })
              })
            })
          } as any
        })

      const result = await BookingEngine.createBooking({
        customerId: 'cust_1',
        service: 'Haircut',
        location: 'NYC',
        date: futureDateStr,
        time: futureTime
      } as any)

      expect(result.success).toBe(true)
      expect(result.bookingId).toBe('booking_123')
      expect(result.paymentIntentId).toBe('pi_mock')
      expect(result.clientSecret).toBe('cs_mock')
    })
  })

  describe('updateBookingStatus', () => {
    it('updates booking status successfully', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          update: () => ({
            eq: () => ({
              then: (resolve: any) => resolve({ error: null })
            })
          })
        } as any
      })

      const result = await BookingEngine.updateBookingStatus('booking_123', 'confirmed')
      expect(result).toBe(true)
    })

    it('handles update errors gracefully', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          update: () => ({
            eq: () => ({
              then: (resolve: any) => resolve({ error: { message: 'Database error' } })
            })
          })
        } as any
      })

      const result = await BookingEngine.updateBookingStatus('booking_123', 'confirmed')
      expect(result).toBe(false)
    })
  })

  describe('getUserBookings', () => {
    it('returns user bookings successfully', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const mockBookings = [
        { id: 'booking_1', customer_id: 'user_1', status: 'confirmed' },
        { id: 'booking_2', customer_id: 'user_1', status: 'pending' }
      ]

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: mockBookings, error: null })
            })
          })
        } as any
      })

      const result = await BookingEngine.getUserBookings('user_1')
      expect(result).toEqual(mockBookings)
    })

    it('returns empty array on error', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            or: () => ({
              order: () => Promise.resolve({ data: null, error: { message: 'Database error' } })
            })
          })
        } as any
      })

      const result = await BookingEngine.getUserBookings('user_1')
      expect(result).toEqual([])
    })
  })
}) 