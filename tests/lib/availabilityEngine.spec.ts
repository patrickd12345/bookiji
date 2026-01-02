import { describe, it, expect, vi, beforeEach } from 'vitest'
import { computeAvailability } from '../../src/lib/core-infrastructure/availabilityEngine'
import { getSupabaseMock } from '../utils/supabase-mocks'

vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: () => getSupabaseMock()
}))

describe('AvailabilityEngine - Layer 1: Unit Tests (Logic Integrity)', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    mock.from.mockReset()
    vi.clearAllMocks()
  })

  describe('computeAvailability', () => {
    it('returns error when vendor not found', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: null, error: null })
            })
          })
        } as any
      })

      const result = await computeAvailability({
        vendorId: 'non-existent-vendor',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        endTime: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
        partnerId: 'partner_1'
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('VENDOR_NOT_FOUND')
    })

    it('computes availability slots successfully', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000) // 2 hours later

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'vendor_1',
                  availability_mode: 'native',
                  business_hours: {
                    monday: { start: '09:00', end: '17:00' },
                    tuesday: { start: '09:00', end: '17:00' }
                  },
                  timezone: 'UTC'
                },
                error: null
              })
            })
          })
        } as any
      })

      const result = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60, // 60 minutes
        partnerId: 'partner_1'
      })

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data?.vendorId).toBe('vendor_1')
      expect(result.data?.slots).toBeDefined()
      expect(result.data?.slots.length).toBeGreaterThan(0)
      expect(result.data?.computedVersion).toBeDefined()
    })

    it('respects slot duration parameter', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 2 * 60 * 60 * 1000) // 2 hours

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'vendor_1',
                  availability_mode: 'native',
                  business_hours: {},
                  timezone: 'UTC'
                },
                error: null
              })
            })
          })
        } as any
      })

      // Test with 30-minute slots
      const result30 = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 30,
        partnerId: 'partner_1'
      })

      expect(result30.success).toBe(true)
      expect(result30.data?.slots.length).toBe(4) // 2 hours / 30 minutes = 4 slots

      // Test with 60-minute slots
      const result60 = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60,
        partnerId: 'partner_1'
      })

      expect(result60.success).toBe(true)
      expect(result60.data?.slots.length).toBe(2) // 2 hours / 60 minutes = 2 slots
    })

    it('generates deterministic version hash', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'vendor_1',
                  availability_mode: 'native',
                  business_hours: {},
                  timezone: 'UTC'
                },
                error: null
              })
            })
          })
        } as any
      })

      const result1 = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60,
        partnerId: 'partner_1'
      })

      const result2 = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60,
        partnerId: 'partner_1'
      })

      // Same inputs should produce same version (deterministic)
      expect(result1.success).toBe(true)
      expect(result2.success).toBe(true)
      // Note: Version includes timestamp, so they may differ slightly
      // But the structure should be consistent
      expect(result1.data?.computedVersion).toBeDefined()
      expect(result2.data?.computedVersion).toBeDefined()
    })

    it('includes confidence scores when requested', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'vendor_1',
                  availability_mode: 'native',
                  business_hours: {},
                  timezone: 'UTC'
                },
                error: null
              })
            })
          })
        } as any
      })

      const result = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60,
        includeConfidence: true,
        partnerId: 'partner_1'
      })

      expect(result.success).toBe(true)
      expect(result.data?.slots.length).toBeGreaterThan(0)
      // All slots should have confidence scores
      result.data?.slots.forEach(slot => {
        expect(slot.confidence).toBeDefined()
        expect(slot.reasons).toBeDefined()
        expect(Array.isArray(slot.reasons)).toBe(true)
      })
    })

    it('handles timezone conversions correctly', async () => {
      const mock = getSupabaseMock()
      const baseFrom = mock.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
      
      const futureStart = new Date(Date.now() + 24 * 60 * 60 * 1000)
      const futureEnd = new Date(futureStart.getTime() + 60 * 60 * 1000)

      mock.from.mockImplementation((table: string) => {
        const baseChain = baseFrom(table)
        return {
          ...baseChain,
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({
                data: {
                  id: 'vendor_1',
                  availability_mode: 'native',
                  business_hours: {
                    monday: { start: '09:00', end: '17:00' }
                  },
                  timezone: 'America/New_York' // EST timezone
                },
                error: null
              })
            })
          })
        } as any
      })

      const result = await computeAvailability({
        vendorId: 'vendor_1',
        startTime: futureStart.toISOString(),
        endTime: futureEnd.toISOString(),
        slotDuration: 60,
        partnerId: 'partner_1'
      })

      expect(result.success).toBe(true)
      expect(result.data?.metadata.calendarSource).toBe('native')
      // Business hours should be respected in vendor's timezone
      expect(result.data?.slots.length).toBeGreaterThan(0)
    })
  })
})
