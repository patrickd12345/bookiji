import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../../utils/supabase-mocks'

const TEST_BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Mock Supabase
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => getSupabaseMock())
}))

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: () => getSupabaseMock()
}))

// Mock partner authentication
vi.mock('@/lib/core-infrastructure/partnerAuth', () => ({
  authenticatePartner: vi.fn(async (request: NextRequest) => {
    const apiKey = request.headers.get('authorization')?.replace('Bearer ', '')
    if (apiKey === 'valid-api-key') {
      return {
        success: true,
        data: {
          partnerId: 'partner_123',
          apiKey: 'valid-api-key'
        }
      }
    }
    return {
      success: false,
      error: 'Invalid API key'
    }
  })
}))

// Mock reservation service
vi.mock('@/lib/core-infrastructure/reservationService', () => ({
  createReservation: vi.fn(async (request: any) => {
    if (request.vendorId === 'non-existent-vendor') {
      return {
        success: false,
        error: 'VENDOR_NOT_FOUND'
      }
    }
    // Simulate slot conflict - check if slotStartTime matches conflict time
    if (request.slotStartTime === '2025-01-15T10:00:00Z' || request.slotStartTime.includes('2025-01-15T10:00:00')) {
      return {
        success: false,
        error: 'SLOT_ALREADY_RESERVED'
      }
    }
    const now = Date.now()
    return {
      success: true,
      data: {
        id: 'reservation_123',
        state: 'HELD',
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
        vendorConfirmationRequired: false,
        estimatedConfirmationTime: new Date(now + 5 * 60 * 1000).toISOString()
      }
    }
  }),
  getReservation: vi.fn(async (reservationId: string, partnerId: string) => {
    if (reservationId === 'non-existent-reservation') {
      return {
        success: false,
        error: 'RESERVATION_NOT_FOUND'
      }
    }
    const now = Date.now()
    return {
      success: true,
      data: {
        id: reservationId,
        partnerId,
        vendorId: 'vendor_123',
        requesterId: 'requester_123',
        state: 'HELD',
        slotStartTime: new Date(now + 24 * 60 * 60 * 1000).toISOString(),
        slotEndTime: new Date(now + 25 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date(now).toISOString(),
        expiresAt: new Date(now + 10 * 60 * 1000).toISOString(),
        paymentState: null,
        bookingId: null,
        failureReason: null
      }
    }
  })
}))

/**
 * Layer 2: API E2E Tests - Partner Reservations API
 * 
 * Tests partner API endpoints for creating and querying reservations.
 */
describe('Partner Reservations API - Layer 2: API E2E (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    vi.clearAllMocks()
  })

  describe('POST /api/v1/reservations', () => {
    it('creates reservation successfully', async () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-api-key'
          },
          body: JSON.stringify({
            vendorId: 'vendor_123',
            slotStartTime: futureStart.toISOString(),
            slotEndTime: futureEnd.toISOString(),
            requesterId: 'requester_123',
            idempotencyKey: 'idempotency_key_123'
          })
        }
      )

      const { POST } = await import('@/app/api/v1/reservations/route')
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.reservationId || data.id).toBe('reservation_123')
      expect(data.state).toBe('HELD')
      expect(data.expiresAt).toBeDefined()
    })

    it('returns 401 for missing API key', async () => {
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
            // No Authorization header
          },
          body: JSON.stringify({
            vendorId: 'vendor_123',
            slotStartTime: futureStart.toISOString(),
            slotEndTime: futureEnd.toISOString(),
            requesterId: 'requester_123'
          })
        }
      )

      const { POST } = await import('@/app/api/v1/reservations/route')
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(401)
      expect(data.error.code).toBe('UNAUTHORIZED')
    })

    it('returns 400 for missing required fields', async () => {
      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-api-key'
          },
          body: JSON.stringify({
            vendorId: 'vendor_123'
            // Missing slotStartTime, slotEndTime, requesterId
          })
        }
      )

      const { POST } = await import('@/app/api/v1/reservations/route')
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error.code).toBe('INVALID_REQUEST')
      expect(data.error.message).toMatch(/slotStartTime.*slotEndTime.*requesterId/i)
    })

    it('returns 409 when slot is already reserved', async () => {
      // Use a future date that passes validation
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const conflictTime = futureDate.toISOString()
      
      // Override the mock for this specific test
      const { createReservation } = await import('@/lib/core-infrastructure/reservationService')
      vi.mocked(createReservation).mockImplementationOnce(async (request: any) => {
        if (request.slotStartTime === conflictTime) {
          return {
            success: false,
            error: 'SLOT_ALREADY_RESERVED'
          }
        }
        return {
          success: true,
          data: {
            id: 'reservation_123',
            state: 'HELD',
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString()
          }
        }
      })

      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer valid-api-key'
          },
          body: JSON.stringify({
            vendorId: 'vendor_123',
            slotStartTime: conflictTime,
            slotEndTime: new Date(futureDate.getTime() + 60 * 60 * 1000).toISOString(),
            requesterId: 'requester_123'
          })
        }
      )

      const { POST } = await import('@/app/api/v1/reservations/route')
      const response = await POST(mockRequest)
      const data = await response.json()

      expect(response.status).toBe(409)
      expect(data.error.code).toBe('CONFLICT')
    })
  })

  describe('GET /api/v1/reservations/{reservationId}', () => {
    it('returns reservation status', async () => {
      const reservationId = 'reservation_123'

      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations/${reservationId}`),
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-api-key'
          }
        }
      )

      const { GET } = await import('@/app/api/v1/reservations/[reservationId]/route')
      const response = await GET(mockRequest, { params: Promise.resolve({ reservationId }) })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.reservationId || data.id).toBe(reservationId)
      expect(data.state).toBeDefined()
      expect(data.vendorId).toBeDefined()
    })

    it('returns 404 for non-existent reservation', async () => {
      const reservationId = 'non-existent-reservation'

      const mockRequest = new NextRequest(
        new URL(`${TEST_BASE_URL}/api/v1/reservations/${reservationId}`),
        {
          method: 'GET',
          headers: {
            'Authorization': 'Bearer valid-api-key'
          }
        }
      )

      const { GET } = await import('@/app/api/v1/reservations/[reservationId]/route')
      const response = await GET(mockRequest, { params: Promise.resolve({ reservationId }) })
      const data = await response.json()

      expect(response.status).toBe(404)
      // Error code may be 'NOT_FOUND' or 'RESERVATION_NOT_FOUND' depending on implementation
      expect(['NOT_FOUND', 'RESERVATION_NOT_FOUND']).toContain(data.error.code)
    })
  })
})
