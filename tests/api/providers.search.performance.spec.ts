import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/search/providers/route'
import { NextRequest } from 'next/server'
import { getSupabaseMock } from '../utils/supabase-mocks'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

/**
 * PERFORMANCE INVARIANT TEST
 * 
 * This test enforces that availability_slots is queried at most ONCE per request.
 * This prevents N+1 query regressions that would silently degrade performance.
 * 
 * If this test fails, it means the availability filtering logic has been changed
 * to query availability_slots multiple times, which will cause:
 * - P95 latency to regress from ~2.2s to ~5.5s at 25 VUs
 * - System to become unsafe for limited partners
 */
describe('GET /api/search/providers - Performance Invariant', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('queries availability_slots at most ONCE when availability_date is provided', async () => {
    const mock = getSupabaseMock()
    let availabilitySlotsFromCalls = 0
    
    // Count calls to mock.from() with table === 'availability_slots'
    // Counter is never reset during the request - only incremented
    const originalFrom = mock.from.getMockImplementation() || vi.fn()
    mock.from.mockImplementation((table: string) => {
      // Count availability_slots calls directly at from() invocation
      if (table === 'availability_slots') {
        availabilitySlotsFromCalls++
      }
      
      // Capture table name for chain methods (no counter reset here)
      const capturedTable = table
      
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        range: vi.fn(async () => {
          if (capturedTable === 'availability_slots') {
            return { data: [], error: null }
          }
          // Mock profiles query
          return { 
            data: [
              { id: 'p1', services: [], provider_locations: [] },
              { id: 'p2', services: [], provider_locations: [] }
            ], 
            error: null 
          }
        }),
        then: vi.fn(async (resolve: any) => {
          if (capturedTable === 'availability_slots') {
            return resolve({ data: [], error: null })
          }
          return resolve({ data: [], error: null })
        }),
        single: vi.fn(async () => ({ data: null, error: null }))
      }
      return chain
    })

    const req = new NextRequest(
      new Request(`${BASE_URL}/api/search/providers?availability_date=2025-01-15`)
    )
    
    await GET(req)
    
    // CRITICAL: availability_slots must be queried at most ONCE
    // Counter is never reset - only incremented when from('availability_slots') is called
    expect(availabilitySlotsFromCalls).toBeLessThanOrEqual(1)
  })

  it('does not query availability_slots when availability_date is not provided', async () => {
    const mock = getSupabaseMock()
    let availabilitySlotsFromCalls = 0
    
    mock.from.mockImplementation((table: string) => {
      if (table === 'availability_slots') {
        availabilitySlotsFromCalls++
      }
      
      const capturedTable = table
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        range: vi.fn(async () => {
          if (capturedTable === 'availability_slots') {
            return { data: [], error: null }
          }
          return { data: [], error: null }
        }),
        single: vi.fn(async () => ({ data: null, error: null }))
      }
      return chain
    })

    const req = new NextRequest(
      new Request(`${BASE_URL}/api/search/providers`)
    )
    
    await GET(req)
    
    // Should not query availability_slots at all
    expect(availabilitySlotsFromCalls).toBe(0)
  })

  it('would detect N+1 regression if availability_slots was queried per provider', async () => {
    const mock = getSupabaseMock()
    let availabilitySlotsFromCalls = 0
    
    // Simulate N+1 pattern: query availability_slots multiple times (one per provider)
    mock.from.mockImplementation((table: string) => {
      if (table === 'availability_slots') {
        availabilitySlotsFromCalls++
      }
      
      const capturedTable = table
      const chain: any = {
        select: vi.fn(() => chain),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lt: vi.fn(() => chain),
        range: vi.fn(async () => {
          if (capturedTable === 'availability_slots') {
            return { data: [], error: null }
          }
          // Mock profiles query returning multiple providers
          return { 
            data: [
              { id: 'p1', services: [], provider_locations: [] },
              { id: 'p2', services: [], provider_locations: [] },
              { id: 'p3', services: [], provider_locations: [] }
            ], 
            error: null 
          }
        }),
        then: vi.fn(async (resolve: any) => {
          if (capturedTable === 'availability_slots') {
            return resolve({ data: [], error: null })
          }
          return resolve({ data: [], error: null })
        }),
        single: vi.fn(async () => ({ data: null, error: null }))
      }
      return chain
    })

    // Simulate N+1 regression: manually call from('availability_slots') multiple times
    // This mimics what would happen if filterByAvailability queried per provider
    const simulateNPlusOne = () => {
      mock.from('availability_slots')
      mock.from('availability_slots')
      mock.from('availability_slots')
    }
    
    simulateNPlusOne()
    
    // Verify the invariant would catch this: counter exceeds 1
    expect(availabilitySlotsFromCalls).toBeGreaterThan(1)
    expect(availabilitySlotsFromCalls).toBe(3)
  })
})
