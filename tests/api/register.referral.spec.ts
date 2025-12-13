import { describe, it, expect, vi, beforeEach } from 'vitest'
import { POST } from '@/app/api/auth/register/route'
import { getSupabaseMock } from '../utils/supabase-mocks'

const completeReferralMock = vi.hoisted(() => vi.fn(async () => ({ success: true })))

// Mock is already applied globally via setup.ts, override behavior if needed in beforeEach

vi.mock('@/lib/database', () => ({
  userService: {
    upsertProfile: vi.fn(async () => ({ id: 'new-user' }))
  }
}))

vi.mock('@/lib/referrals', () => ({
  referralService: {
    completeReferral: completeReferralMock
  }
}))

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:3000'

describe('POST /api/auth/register with referral', () => {
  beforeEach(() => {
    const supabase = getSupabaseMock()
    const baseFrom = supabase.from.getMockImplementation?.() ?? ((table: string) => ({} as any))
    supabase.auth.signUp.mockResolvedValue({
      data: {
        user: { id: 'new-user', email: 'new@example.com' },
        session: { access_token: 'token' }
      },
      error: null
    } as any)
    supabase.from.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          upsert: vi.fn(() => ({
            select: () => ({
              single: async () => ({ data: { id: 'p1' }, error: null })
            })
          }))
        }
      }

      if (table === 'referrals') {
        return {
          insert: vi.fn(async () => ({ error: null }))
        }
      }

      return baseFrom(table)
    })
  })

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

    const res = await POST(req)
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data.success).toBe(true)
    expect(completeReferralMock).toHaveBeenCalledWith('new@example.com', 'new-user', 'customer')
  })
})
