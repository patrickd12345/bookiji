import { describe, it, expect, vi } from 'vitest'
import { makeCreditsStatusHandler } from '@/lib/creditsStatusHandler'
import { NextRequest } from 'next/server'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('GET /api/credits/status', () => {
  it('returns loyalty status with progress', async () => {
    const mockGetUserCredits = vi.fn().mockResolvedValue({
      success: true,
      credits: {
        lifetime_earned_cents: 1000,
        tier: 'bronze'
      }
    })
    const GET = makeCreditsStatusHandler(mockGetUserCredits)
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/credits/status?userId=user-1`, {
        method: 'GET',
      })
    )
    const response = await GET(req)
    const data = await response.json()
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data).toHaveProperty('credits')
    expect(data).toHaveProperty('progressToNextTier')
    expect(data).toHaveProperty('nextTier')
  })

  it('returns 500 and success: false if getUserCredits returns undefined', async () => {
    const mockGetUserCredits = vi.fn().mockResolvedValue(undefined)
    const GET = makeCreditsStatusHandler(mockGetUserCredits)
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/credits/status?userId=user-2`, { method: 'GET' })
    )
    const response = await GET(req)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/no result/i)
  })

  it('returns 500 and success: false if getUserCredits returns { success: false }', async () => {
    const mockGetUserCredits = vi.fn().mockResolvedValue({ success: false, error: 'fail' })
    const GET = makeCreditsStatusHandler(mockGetUserCredits)
    const req = new NextRequest(
      new Request(`${BASE_URL}/api/credits/status?userId=user-3`, { method: 'GET' })
    )
    const response = await GET(req)
    const data = await response.json()
    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toMatch(/fail|fetch/i)
  })
})
