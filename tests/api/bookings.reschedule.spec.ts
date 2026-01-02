import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@/config/supabase', () => ({
  getSupabaseConfig: vi.fn(() => ({
    url: 'http://test.supabase.co',
    secretKey: 'test-secret-key'
  }))
}))

/**
 * Layer 2: API E2E Tests - Reschedule
 * 
 * Tests atomic slot swap during rescheduling.
 * Note: This tests the dev/test endpoint as the production endpoint may not exist yet.
 */
describe('POST /api/(dev)/test/bookings/[id]/reschedule - Layer 2: API E2E (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    mock.rpc.mockReset()
    vi.clearAllMocks()
  })

  it('reschedules booking with atomic slot swap', async () => {
    const mock = getSupabaseMock()
    const bookingId = 'booking_123'
    const newSlotId = 'slot_new_456'
    const oldSlotId = 'slot_old_123'

    // Mock RPC call for atomic reschedule
    mock.rpc.mockResolvedValueOnce({
      data: [{
        success: true,
        booking_id: bookingId,
        error_message: null
      }],
      error: null
    } as any)

    // Mock booking retrieval after reschedule
    mock.from.mockImplementationOnce((table: string) => {
      if (table === 'bookings') {
        return {
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: {
                  id: bookingId,
                  customer_id: 'customer_123',
                  provider_id: 'provider_123',
                  service_id: 'service_123',
                  start_time: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
                  end_time: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString(),
                  status: 'confirmed',
                  total_amount: 100
                },
                error: null
              })
            })
          })
        }
      }
      return { select: vi.fn() }
    })

    const mockRequest = new Request(
      `${TEST_BASE_URL}/api/test/bookings/${bookingId}/reschedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_slot_id: newSlotId,
          slot_start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          slot_end: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString()
        })
      }
    )

    // Set E2E=true for test endpoint
    process.env.E2E = 'true'
    ;(process.env as any).NODE_ENV = 'development'

    try {
      const { POST } = await import('@/app/api/(dev)/test/bookings/[id]/reschedule/route')
      const response = await POST(mockRequest, { params: Promise.resolve({ id: bookingId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.ok).toBe(true)
      
      // Verify RPC was called with correct parameters
      expect(mock.rpc).toHaveBeenCalledWith('reschedule_booking_atomically', {
        p_booking_id: bookingId,
        p_new_slot_id: newSlotId
      })
    } finally {
      delete process.env.E2E
    }
  })

  it('returns 400 when slot is not available', async () => {
    const mock = getSupabaseMock()
    const bookingId = 'booking_123'
    const newSlotId = 'slot_unavailable'

    // Mock RPC call returning error (slot not available)
    mock.rpc.mockResolvedValueOnce({
      data: [{
        success: false,
        booking_id: null,
        error_message: 'Slot is not available'
      }],
      error: null
    } as any)

    const mockRequest = new Request(
      `${TEST_BASE_URL}/api/test/bookings/${bookingId}/reschedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_slot_id: newSlotId,
          slot_start: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
          slot_end: new Date(Date.now() + 49 * 60 * 60 * 1000).toISOString()
        })
      }
    )

    process.env.E2E = 'true'
    ;(process.env as any).NODE_ENV = 'development'

    try {
      const { POST } = await import('@/app/api/(dev)/test/bookings/[id]/reschedule/route')
      const response = await POST(mockRequest, { params: Promise.resolve({ id: bookingId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/not available/i)
    } finally {
      delete process.env.E2E
    }
  })

  it('returns 400 when slot_start and slot_end are missing', async () => {
    const bookingId = 'booking_123'

    const mockRequest = new Request(
      `${TEST_BASE_URL}/api/test/bookings/${bookingId}/reschedule`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          new_slot_id: 'slot_123'
          // Missing slot_start and slot_end
        })
      }
    )

    process.env.E2E = 'true'
    ;(process.env as any).NODE_ENV = 'development'

    try {
      const { POST } = await import('@/app/api/(dev)/test/bookings/[id]/reschedule/route')
      const response = await POST(mockRequest, { params: Promise.resolve({ id: bookingId }) })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toMatch(/slot_start.*slot_end.*required/i)
    } finally {
      delete process.env.E2E
    }
  })
})
