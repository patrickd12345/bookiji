/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { POST as createBookingHandler } from '../../src/app/api/bookings/create/route'

// Mock Stripe
vi.mock('../../lib/stripe', () => ({
  createCommitmentFeePaymentIntent: async () => ({
    success: true,
    paymentIntent: {
      id: 'pi_mock',
      client_secret: 'cs_mock'
    }
  })
}))

// Mock Supabase similar to previous global mock
vi.mock('../../src/lib/supabaseClient', () => {
  const from = vi.fn()
  ;(globalThis as any).__SB_FROM_INT__ = from
  return {
    supabase: { from }
  }
})

const getMock = () => (globalThis as any).__SB_FROM_INT__ as ReturnType<typeof vi.fn>

describe('POST /api/bookings/create', () => {
  it('returns success JSON', async () => {
    const requestBody = {
      vendorId: 'vendor_1',
      serviceId: 'service_1',
      slotId: 'slot_1',
      slotStart: '2024-05-01T10:00:00Z',
      slotEnd: '2024-05-01T11:00:00Z',
      customerName: 'John Doe',
      customerEmail: 'john@test.com',
      customerPhone: '+1-555-0123',
      paymentMethod: 'credits',
      totalAmountCents: 5000,
      notes: 'Test booking'
    }

    const req = new Request('http://localhost/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    })

    const res = await createBookingHandler(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.booking).toBeDefined()
    expect(data.booking.id).toBeDefined()
    expect(data.customer).toBeDefined()
    expect(data.customer.email).toBe('john@test.com')
  })
}) 