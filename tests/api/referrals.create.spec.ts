import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/referrals/create/route'
import { NextRequest } from 'next/server'

const createReferralMock = vi.hoisted(() => vi.fn(async () => ({ success: true, referralId: 'ref-123' })))

vi.mock('@/lib/referrals', () => ({
  referralService: {
    createReferral: createReferralMock
  }
}))

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/referrals/create', () => {
  it('creates a referral', async () => {
    const body = { 
      referrer_id: 'user-123', 
      referee_email: 'test@example.com'
    }

    const req = new NextRequest(
      new Request(`${BASE_URL}/api/referrals/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      })
    )

    const response = await POST(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(createReferralMock).toHaveBeenCalledWith(body.referrer_id, body.referee_email)
  })
})
