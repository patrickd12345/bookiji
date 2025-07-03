/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { POST } from '@/app/api/auth/register/route'

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(async () => ({
        data: { user: { id: 'new-user', email: 'new@example.com' } },
        error: null
      }))
    }
  }
}))

vi.mock('@/lib/database', () => ({
  userService: {
    upsertProfile: vi.fn(async () => ({ id: 'new-user' }))
  }
}))

const completeReferralMock = vi.fn(async () => {})
vi.mock('@/lib/referrals', () => ({
  referralService: {
    completeReferral: completeReferralMock
  }
}))

const BASE_URL = 'http://localhost:3000'

describe('POST /api/auth/register with referral', () => {
  it('credits referrer when referral email matches', async () => {
    const body = {
      email: 'new@example.com',
      password: 'pass123',
      full_name: 'New User',
      role: 'customer'
    }

    const req = new Request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await POST(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(completeReferralMock).toHaveBeenCalledWith('new@example.com', 'new-user', 'customer')
  })
})
