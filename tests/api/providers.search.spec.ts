import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from '@/app/api/search/providers/route'
import { NextRequest } from 'next/server'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

const mockFrom = vi.fn()

vi.mock('@/lib/supabaseClient', () => {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    or: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    range: vi.fn(async () => ({ data: mockProviders, error: null })),
    single: vi.fn(async () => ({ data: [], error: null }))
  }
  mockFrom.mockReturnValue(chain)
  return { supabase: { from: mockFrom } }
})

let mockProviders: any[] = []

beforeEach(() => {
  mockFrom.mockClear()
  mockProviders = []
})

describe('GET /api/search/providers dynamic radius', () => {
  it('returns no match message in low density area', async () => {
    mockProviders = []
    const req = new NextRequest(new Request(`${BASE_URL}/api/search/providers?userLat=0&userLon=0&category=test`))
    const res = await GET(req)
    const data = await res.json()
    expect(data.matchFound).toBe(false)
    expect(data.message).toMatch(/No providers available/)
  })

  it('honors maxTravelDistance cutoff', async () => {
    mockProviders = [{ id: 'p1', provider_locations: [{ latitude: 0, longitude: 0.05 }], services: [] }]
    const req = new NextRequest(new Request(`${BASE_URL}/api/search/providers?userLat=0&userLon=0&category=test&maxTravelDistance=3`))
    const res = await GET(req)
    const data = await res.json()
    expect(data.radiusUsed).toBe(3)
    expect(data.total).toBe(0)
  })

  it('hides provider details when booking not committed', async () => {
    mockProviders = [{ id: 'p2', name: 'Hidden', provider_locations: [{ latitude: 0, longitude: 0 }], services: [] }]
    const req = new NextRequest(new Request(`${BASE_URL}/api/search/providers?userLat=0&userLon=0&category=test`))
    const res = await GET(req)
    const data = await res.json()
    expect(data.providers[0]).toEqual({ id: 'p2', distance: 0 })
  })
})
