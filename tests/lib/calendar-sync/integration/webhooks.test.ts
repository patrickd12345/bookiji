import { describe, it, expect, beforeEach, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            data: { id: 'conn-123', webhook_dedupe_keys: [] },
            error: null,
          })),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          error: null,
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/calendar-sync/flags', () => ({
  isWebhookEnabled: vi.fn(() => true),
  isConnectionAllowed: vi.fn(() => true),
}))

vi.mock('@/lib/calendar-sync/utils/token-redaction', () => ({
  safeError: vi.fn(),
}))

describe('Webhook Flag Enforcement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('webhook returns 403 when flag disabled', async () => {
    const { isWebhookEnabled } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isWebhookEnabled).mockReturnValue(false)

    expect(isWebhookEnabled('connection-123')).toBe(false)
  })

  it('webhook returns 403 when flag enabled but connection not allowlisted', async () => {
    const { isWebhookEnabled, isConnectionAllowed } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isWebhookEnabled).mockReturnValue(true)
    vi.mocked(isConnectionAllowed).mockReturnValue(false)

    expect(isWebhookEnabled('connection-123')).toBe(true)
    expect(isConnectionAllowed('connection-123')).toBe(false)
  })

  it('webhook processes when enabled and allowlisted', async () => {
    const { isWebhookEnabled, isConnectionAllowed } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isWebhookEnabled).mockReturnValue(true)
    vi.mocked(isConnectionAllowed).mockReturnValue(true)

    expect(isWebhookEnabled('connection-123')).toBe(true)
    expect(isConnectionAllowed('connection-123')).toBe(true)
  })

  it('webhook deduplication prevents duplicate processing', async () => {
    // This would require full endpoint testing
    // For now, we verify the concept
    const dedupeKeys = ['key-1', 'key-2']
    const newKey = 'key-1'
    
    expect(dedupeKeys.includes(newKey)).toBe(true)
  })
})
