import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processRefund } from '@/lib/services/refundService'
import { getSupabaseMock } from '../utils/supabase-mocks'

const booking = {
  payment_intent_id: 'pi_test',
  refund_status: null,
  idempotency_key: 'key123',
  refund_amount_cents: null,
  refund_transaction_id: null,
}

vi.mock('@/lib/stripe', () => ({ 
  __esModule: true, 
  refundPayment: vi.fn(() => Promise.resolve({ id: 're_1', amount: 100 }))
}))

describe('refundService', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockImplementation((table: string) => {
      if (table === 'bookings') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: booking })) }))
          })),
          update: vi.fn((values: any) => {
            Object.assign(booking, values)
            return { eq: vi.fn(() => Promise.resolve({ data: booking, error: null })) }
          })
        }
      }
      // Fallback to default behavior for other tables
      const defaultChain: any = {
        select: vi.fn(() => defaultChain),
        eq: vi.fn(() => defaultChain),
        single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) }))
      }
      return defaultChain
    })
  })

  it('uses idempotency key and avoids duplicate refunds', async () => {
    const r1 = await processRefund('booking1')
    const r2 = await processRefund('booking1')
    expect(r1.status).toBe('completed')
    expect(r2.status).toBe('completed')
    
    const { refundPayment } = await import('@/lib/stripe')
    expect(refundPayment).toHaveBeenCalledWith('pi_test', undefined, 'key123')
    expect(refundPayment).toHaveBeenCalledTimes(1)
  })
})
