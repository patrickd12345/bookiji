import { describe, it, expect, vi } from 'vitest'

describe('Calendar Sync Flags - Production behavior', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('defaults to false in production when env var is unset', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    // CALENDAR_SYNC_ENABLED is not set, so it should default to false
    const flags = await import('@/lib/calendar-sync/flags')
    expect(flags.isCalendarSyncEnabled()).toBe(false)
  })

  it('requires allowlist in production when allowlist exists', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CALENDAR_SYNC_ENABLED', 'true')
    vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', 'provider-123,provider-456')
    const flags = await import('@/lib/calendar-sync/flags')
    expect(flags.isCalendarSyncEnabled('provider-123')).toBe(true)
    expect(flags.isCalendarSyncEnabled('provider-999')).toBe(false)
  })

  it('allows all when allowlist is empty even in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('CALENDAR_SYNC_ENABLED', 'true')
    vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', '')
    const flags = await import('@/lib/calendar-sync/flags')
    expect(flags.isCalendarSyncEnabled('provider-123')).toBe(true)
  })
})

