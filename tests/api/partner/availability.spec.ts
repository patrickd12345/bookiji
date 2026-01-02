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

// Mock availability engine
vi.mock('@/lib/core-infrastructure/availabilityEngine', () => ({
  computeAvailability: vi.fn(async (request: any) => {
    if (request.vendorId === 'non-existent-vendor') {
      return {
        success: false,
        error: 'VENDOR_NOT_FOUND'
      }
    }
    return {
      success: true,
      data: {
        vendorId: request.vendorId,
        startTime: request.startTime,
        endTime: request.endTime,
        computedAt: new Date().toISOString(),
        computedVersion: 'test-version-123',
        slots: [
          {
            startTime: request.startTime,
            endTime: new Date(new Date(request.startTime).getTime() + 60 * 60 * 1000).toISOString(),
            isAvailable: true,
            confidence: 'HIGH',
            reasons: ['Within business hours'],
            computedAt: new Date().toISOString(),
            computedVersion: 'test-version-123'
          }
        ],
        metadata: {
          confidenceThreshold: 0.6,
          computationTimeMs: 50,
          calendarSource: 'native'
        }
      }
    }
  })
}))

/**
 * Layer 2: API E2E Tests - Partner Availability API
 * 
 * Tests partner API endpoint for querying vendor availability.
 */
describe('GET /api/v1/vendors/{vendorId}/availability - Layer 2: API E2E (System Truth)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    vi.clearAllMocks()
  })

  it('returns availability for valid vendor with API key', async () => {
    const vendorId = 'vendor_123'
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000)

    const mockRequest = new NextRequest(
      new URL(`${TEST_BASE_URL}/api/v1/vendors/${vendorId}/availability?startTime=${futureStart.toISOString()}&endTime=${futureEnd.toISOString()}`),
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-api-key'
        }
      }
    )

    const { GET } = await import('@/app/api/v1/vendors/[vendorId]/availability/route')
    const response = await GET(mockRequest, { params: Promise.resolve({ vendorId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.vendorId).toBe(vendorId)
    expect(data.slots).toBeDefined()
    expect(Array.isArray(data.slots)).toBe(true)
    expect(data.slots.length).toBeGreaterThan(0)
    expect(data.computedVersion).toBeDefined()
  })

  it('returns 401 for missing API key', async () => {
    const vendorId = 'vendor_123'
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000)

    const mockRequest = new NextRequest(
      new URL(`${TEST_BASE_URL}/api/v1/vendors/${vendorId}/availability?startTime=${futureStart.toISOString()}&endTime=${futureEnd.toISOString()}`),
      {
        method: 'GET'
        // No Authorization header
      }
    )

    const { GET } = await import('@/app/api/v1/vendors/[vendorId]/availability/route')
    const response = await GET(mockRequest, { params: Promise.resolve({ vendorId }) })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.error.code).toBe('UNAUTHORIZED')
  })

  it('returns 400 for missing required parameters', async () => {
    const vendorId = 'vendor_123'

    const mockRequest = new NextRequest(
      new URL(`${TEST_BASE_URL}/api/v1/vendors/${vendorId}/availability`),
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-api-key'
        }
        // Missing startTime and endTime
      }
    )

    const { GET } = await import('@/app/api/v1/vendors/[vendorId]/availability/route')
    const response = await GET(mockRequest, { params: Promise.resolve({ vendorId }) })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error.code).toBe('INVALID_REQUEST')
    expect(data.error.message).toMatch(/startTime.*endTime/i)
  })

  it('returns 404 for non-existent vendor', async () => {
    const vendorId = 'non-existent-vendor'
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000)

    const mockRequest = new NextRequest(
      new URL(`${TEST_BASE_URL}/api/v1/vendors/${vendorId}/availability?startTime=${futureStart.toISOString()}&endTime=${futureEnd.toISOString()}`),
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-api-key'
        }
      }
    )

    const { GET } = await import('@/app/api/v1/vendors/[vendorId]/availability/route')
    const response = await GET(mockRequest, { params: Promise.resolve({ vendorId }) })
    const data = await response.json()

    expect(response.status).toBe(404)
    // Error code may be 'NOT_FOUND' or 'VENDOR_NOT_FOUND' depending on implementation
    expect(['NOT_FOUND', 'VENDOR_NOT_FOUND']).toContain(data.error.code)
  })

  it('includes confidence scores when requested', async () => {
    const vendorId = 'vendor_123'
    const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000)

    const mockRequest = new NextRequest(
      new URL(`${TEST_BASE_URL}/api/v1/vendors/${vendorId}/availability?startTime=${futureStart.toISOString()}&endTime=${futureEnd.toISOString()}&includeConfidence=true`),
      {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer valid-api-key'
        }
      }
    )

    const { GET } = await import('@/app/api/v1/vendors/[vendorId]/availability/route')
    const response = await GET(mockRequest, { params: Promise.resolve({ vendorId }) })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.slots.length).toBeGreaterThan(0)
    data.slots.forEach((slot: any) => {
      expect(slot.confidence).toBeDefined()
      expect(slot.reasons).toBeDefined()
    })
  })
})
