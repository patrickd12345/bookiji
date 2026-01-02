import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

describe('Calendar Sync Flags', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.stubEnv('CALENDAR_SYNC_ENABLED', 'false')
    vi.stubEnv('CALENDAR_OAUTH_ENABLED', 'false')
    vi.stubEnv('CALENDAR_JOBS_ENABLED', 'false')
    vi.stubEnv('CALENDAR_WEBHOOK_ENABLED', 'false')
    vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', '')
    vi.stubEnv('CALENDAR_ALLOWLIST_CONNECTION_IDS', '')
    vi.stubEnv('NODE_ENV', 'development')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('isCalendarSyncEnabled', async () => {
    it('returns false when flag is disabled', async () => {
      vi.stubEnv('CALENDAR_SYNC_ENABLED', 'false')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isCalendarSyncEnabled()).toBe(false)
    })

    it('returns true when flag is enabled in development', async () => {
      vi.stubEnv('CALENDAR_SYNC_ENABLED', 'true')
      vi.stubEnv('NODE_ENV', 'development')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isCalendarSyncEnabled('provider-123')).toBe(true)
    })

    it('requires allowlist in production when allowlist exists', async () => {
      vi.stubEnv('CALENDAR_SYNC_ENABLED', 'true')
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', 'provider-123,provider-456')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      
      expect(flagsModule.isCalendarSyncEnabled('provider-123')).toBe(true)
      expect(flagsModule.isCalendarSyncEnabled('provider-999')).toBe(false)
    })

    it('allows all when allowlist is empty in production', async () => {
      vi.stubEnv('CALENDAR_SYNC_ENABLED', 'true')
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', '')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      
      expect(flagsModule.isCalendarSyncEnabled('provider-123')).toBe(true)
    })
  })

  describe('isOAuthEnabled', async () => {
    it('returns false when flag is disabled', async () => {
      vi.stubEnv('CALENDAR_OAUTH_ENABLED', 'false')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isOAuthEnabled()).toBe(false)
    })

    it('returns true when flag is enabled in development', async () => {
      vi.stubEnv('CALENDAR_OAUTH_ENABLED', 'true')
      vi.stubEnv('NODE_ENV', 'development')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isOAuthEnabled('provider-123')).toBe(true)
    })

    it('requires allowlist in production', async () => {
      vi.stubEnv('CALENDAR_OAUTH_ENABLED', 'true')
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', 'provider-123')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      
      expect(flagsModule.isOAuthEnabled('provider-123')).toBe(true)
      expect(flagsModule.isOAuthEnabled('provider-999')).toBe(false)
    })
  })

  describe('isProviderAllowed', async () => {
    it('returns true when allowlist is empty', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', '')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isProviderAllowed('provider-123')).toBe(true)
    })

    it('returns true when provider is in allowlist', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', 'provider-123,provider-456')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isProviderAllowed('provider-123')).toBe(true)
    })

    it('returns false when provider is not in allowlist', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_PROVIDER_IDS', 'provider-123,provider-456')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isProviderAllowed('provider-999')).toBe(false)
    })
  })

  describe('isConnectionAllowed', async () => {
    it('returns true when allowlist is empty', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_CONNECTION_IDS', '')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isConnectionAllowed('connection-123')).toBe(true)
    })

    it('returns true when connection is in allowlist', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_CONNECTION_IDS', 'connection-123,connection-456')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isConnectionAllowed('connection-123')).toBe(true)
    })

    it('returns false when connection is not in allowlist', async () => {
      vi.stubEnv('CALENDAR_ALLOWLIST_CONNECTION_IDS', 'connection-123,connection-456')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isConnectionAllowed('connection-999')).toBe(false)
    })
  })

  describe('edge cases and production defaults', async () => {
    it('readFlag returns false when unset in production', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.unstubEnv('CALENDAR_SYNC_ENABLED')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isCalendarSyncEnabled()).toBe(false)
    })

    it('isWebhookEnabled requires connection allowlist in production when present', async () => {
      vi.stubEnv('NODE_ENV', 'production')
      vi.stubEnv('CALENDAR_WEBHOOK_ENABLED', 'true')
      vi.stubEnv('CALENDAR_ALLOWLIST_CONNECTION_IDS', 'conn-1')
      const flagsModule = await import('@/lib/calendar-sync/flags')
      expect(flagsModule.isWebhookEnabled('conn-1')).toBe(true)
      expect(flagsModule.isWebhookEnabled('conn-2')).toBe(false)
    })
  })
})
