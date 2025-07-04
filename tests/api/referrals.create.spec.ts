/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/referrals/create/route'
import { NextRequest } from 'next/server'

const createReferralMock = vi.fn(async () => {})
vi.mock('@/lib/referrals', () => ({
  referralService: {
    createReferral: createReferralMock
  }
}))

const BASE_URL = process.env.TEST_BASE_URL || ''

describe('POST /api/referrals/create', () => {
  it('records referral', async () => {
    const body = {
      referrer_id: 'user1',
      referee_email: 'test@example.com'
    }

    const req = new Request(`${BASE_URL}/api/referrals/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await POST(req as unknown as NextRequest)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(createReferralMock).toHaveBeenCalledWith('user1', 'test@example.com')
  })
})
