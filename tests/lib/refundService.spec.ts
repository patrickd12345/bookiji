import { describe, it, expect, vi } from 'vitest'
import { processRefund } from '@/lib/services/refundService'

vi.mock('@/lib/supabaseClient', () => {
  const select = vi.fn(() => ({
    eq: vi.fn(() => ({
      single: vi.fn().mockResolvedValue({ data: { payment_intent_id: 'pi_test' } })
    }))
  }))
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: {}, error: null }) }))
  return {
    supabase: {
      from: vi.fn(() => ({ select, update }))
    }
  }
})

const createMock = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 're_1', amount: 100 }))
vi.mock('@/lib/stripe', () => ({ stripe: { refunds: { create: createMock } } }))

describe('refundService', () => {
  it('processes refund with idempotency key', async () => {
    const result = await processRefund('booking1')
    expect(createMock).toHaveBeenCalledWith(
      {
        payment_intent: 'pi_test',
        reason: 'requested_by_customer',
        metadata: {
          booking_id: 'booking1',
          admin_override: 'false',
          reason: ''
        }
      },
      { idempotencyKey: 'booking-refund-booking1' }
    )
    expect(result.status).toBe('completed')
  })
})
