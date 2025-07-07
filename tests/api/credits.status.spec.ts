import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/credits/status/route'
import { NextRequest } from 'next/server'

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

// Mock the database module
vi.mock('@/lib/database', () => ({
  getUserCredits: vi.fn().mockResolvedValue({
    success: true,
    credits: {
      lifetime_earned_cents: 1000,
      tier: 'bronze'
    }
  })
}))

describe('GET /api/credits/status', () => {
  it('returns loyalty status with progress', async () => {
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
})
