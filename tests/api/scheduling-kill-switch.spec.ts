/**
 * Scheduling Kill Switch Tests
 *
 * Unit tests for server-enforced kill switch behavior.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { SchedulingDisabledError, assertSchedulingEnabled } from '@/lib/guards/schedulingKillSwitch'

const supabaseAdminMock = {
  from: vi.fn()
} as any

vi.mock('@/lib/supabaseProxies', () => ({
  supabaseAdmin: supabaseAdminMock
}))

vi.mock('@/config/featureFlags', () => ({
  featureFlags: {
    beta: { core_booking_flow: true },
    payments: { hold_timeout_minutes: 15, hold_amount_cents: 1000 },
    slo: {
      enabled: false,
      quote_endpoint_target_p95_ms: 1000,
      quote_endpoint_target_p99_ms: 2000,
      confirm_endpoint_target_p95_ms: 1000,
      confirm_endpoint_target_p99_ms: 2000
    }
  }
}))

vi.mock('@/lib/guards/subscriptionGuard', () => ({
  SubscriptionRequiredError: class SubscriptionRequiredError extends Error {},
  assertVendorHasActiveSubscription: vi.fn(async () => {})
}))

vi.mock('@/lib/supabaseServerClient', () => ({
  createSupabaseServerClient: () => ({
    auth: { getSession: vi.fn(async () => ({ data: { session: null }, error: null })) }
  })
}))

function mockSchedulingFlag(value: boolean | null, error: any = null) {
  supabaseAdminMock.from.mockImplementation((table: string) => {
    if (table !== 'system_flags') return {}
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(async () => ({
            data: value === null ? null : { value },
            error
          }))
        }))
      }))
    }
  })
}

describe('Scheduling Kill Switch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('assertSchedulingEnabled', () => {
    it('should pass when scheduling is enabled', async () => {
      const admin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { value: true }, error: null }))
            }))
          }))
        }))
      } as any

      await expect(assertSchedulingEnabled(admin)).resolves.not.toThrow()
    })

    it('should throw SchedulingDisabledError when scheduling is disabled', async () => {
      const admin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: { value: false }, error: null }))
            }))
          }))
        }))
      } as any

      await expect(assertSchedulingEnabled(admin)).rejects.toThrow(SchedulingDisabledError)
    })

    it('should default to enabled if flag does not exist (fail open)', async () => {
      const admin = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({ data: null, error: { message: 'not found' } }))
            }))
          }))
        }))
      } as any

      await expect(assertSchedulingEnabled(admin)).resolves.not.toThrow()
    })
  })

  describe('Booking confirmation endpoint', () => {
    it('should return 503 when scheduling is disabled', async () => {
      mockSchedulingFlag(false)

      const req = new NextRequest(
        new Request('http://localhost:3000/api/bookings/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            quote_id: 'test-quote',
            provider_id: 'test-provider',
            stripe_payment_intent_id: 'pi_test',
            idempotency_key: 'test-idempotency'
          })
        })
      )

      const { POST } = await import('@/app/api/bookings/confirm/route')
      const response = await POST(req)
      const json = await response.json()

      expect(response.status).toBe(503)
      expect(json.code).toBe('SCHEDULING_DISABLED')
      expect(String(json.error)).toContain('Scheduling is temporarily unavailable')
    })
  })

  describe('Admin API endpoint', () => {
    it('should require admin authentication', async () => {
      const req = new NextRequest(
        new Request('http://localhost:3000/api/admin/system-flags/scheduling', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            enabled: false,
            reason: 'Test reason for disabling scheduling'
          })
        })
      )

      const { POST } = await import('@/app/api/admin/system-flags/scheduling/route')
      const response = await POST(req)

      expect([401, 403]).toContain(response.status)
    })
  })
})



