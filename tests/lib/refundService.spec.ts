import { describe, it, expect, vi } from 'vitest'
import { processRefund } from '@/lib/services/refundService'

const booking = {
  payment_intent_id: 'pi_test',
  refund_status: null,
  idempotency_key: 'key123',
  refund_amount_cents: null,
  refund_transaction_id: null,
}

vi.mock('@/lib/supabaseClient', () => {
  return {
    supabase: {
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: booking })) }))
        })),
        update: vi.fn((values: any) => {
          Object.assign(booking, values)
          return { eq: vi.fn(() => Promise.resolve({ data: booking, error: null })) }
        })
      }))
    }
  }
})

var refundMock = vi.fn(() => Promise.resolve({ id: 're_1', amount: 100 }))
vi.mock('@/lib/stripe', () => ({ __esModule: true, refundPayment: refundMock }))

describe('refundService', () => {
  it('uses idempotency key and avoids duplicate refunds', async () => {
    const r1 = await processRefund('booking1')
    const r2 = await processRefund('booking1')
    expect(r1.status).toBe('completed')
    expect(r2.status).toBe('completed')
    expect(refundMock).toHaveBeenCalledWith('pi_test', undefined, 'key123')
    expect(refundMock).toHaveBeenCalledTimes(1)
  })
})
