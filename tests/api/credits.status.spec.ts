/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { GET } from '@/app/api/credits/status/route'

const BASE_URL = process.env.TEST_BASE_URL || ''

vi.mock('@/lib/database', () => ({
  getUserCredits: vi.fn(async () => ({
    success: true,
    credits: {
      user_id: 'user-1',
      balance_cents: 2000,
      lifetime_earned_cents: 150000,
      tier: 'silver',
      points: 150,
      created_at: '',
      updated_at: '',
      total_purchased_cents: 0,
      total_used_cents: 0,
    },
  })),
}))

describe('GET /api/credits/status', () => {
  it('returns loyalty status with progress', async () => {
    const req = new Request(`${BASE_URL}/api/credits/status?userId=user-1`, {
      method: 'GET',
    })
    const res = await GET(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.credits.tier).toBe('silver')
    expect(data.progressToNextTier).toBeGreaterThan(0)
  })
})
