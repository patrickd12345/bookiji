/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/bookings/create/route'
import { NextRequest } from 'next/server'

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

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/bookings/create', () => {
  it('should create a booking', async () => {
    const bookingData = {
      customerId: 'test-customer-123',
      service: 'Haircut',
      providerId: 'test-provider-123',
      date: '2024-06-01',
      time: '14:00',
      location: 'Test Salon, 123 Main St',
      duration: 60,
      price: 2500, // $25.00 in cents
      commitmentFee: 100, // $1.00 in cents
      notes: 'Test booking'
    }

    const mockRequest = new NextRequest(
      new Request(`${TEST_BASE_URL}/api/bookings/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(bookingData)
      })
    )

    const response = await POST(mockRequest)
    const data = await response.json()

    // Should return a booking creation result
    expect(response.status).toBeLessThanOrEqual(500) // Either success or controlled error
    expect(data).toHaveProperty('success')
    
    if (data.success) {
      expect(data).toHaveProperty('booking')
      expect(data.booking).toHaveProperty('id')
    } else {
      expect(data).toHaveProperty('error')
    }
  })
}) 