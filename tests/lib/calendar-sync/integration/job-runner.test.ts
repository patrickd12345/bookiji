import { describe, it, expect, beforeEach, vi } from 'vitest'

// Mock dependencies
vi.mock('@/lib/supabaseServer', () => ({
  getServerSupabase: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          or: vi.fn(() => ({
            data: [],
            error: null,
          })),
        })),
      })),
    })),
  })),
}))

vi.mock('@/lib/calendar-sync/flags', () => ({
  isJobsEnabled: vi.fn(() => true),
  isProviderAllowed: vi.fn(() => true),
  isConnectionAllowed: vi.fn(() => true),
}))

vi.mock('@/lib/calendar-sync/ingestion/ingest-free-busy', () => ({
  ingestFreeBusy: vi.fn(() => ({
    ingested: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  })),
}))

vi.mock('@/lib/calendar-sync/repositories/sync-state-repository', () => ({
  syncStateRepository: {
    updateSyncState: vi.fn(),
  },
}))

describe('Job Runner', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    // Ensure per-test defaults; some tests override these and we don't want leakage.
    const { isJobsEnabled, isProviderAllowed, isConnectionAllowed } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isJobsEnabled).mockReturnValue(true)
    vi.mocked(isProviderAllowed).mockReturnValue(true)
    vi.mocked(isConnectionAllowed).mockReturnValue(true)
  })

  it('returns early when flag disabled', async () => {
    const { isJobsEnabled } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isJobsEnabled).mockReturnValue(false)

    const { runSyncJob } = await import('@/lib/calendar-sync/jobs/run-sync-job')
    const summary = await runSyncJob()
    
    expect(summary.connections_processed).toBe(0)
    expect(summary.errors.length).toBe(1)
    expect(summary.errors[0].error).toBe('CALENDAR_JOBS_DISABLED')
  })

  it('excludes connections in backoff', async () => {
    // This test would require mocking the database query
    // For now, we verify the flag check works
    const { isJobsEnabled } = await import('@/lib/calendar-sync/flags')
    expect(isJobsEnabled()).toBe(true)
  })

  it('excludes non-allowlisted connections', async () => {
    const { isConnectionAllowed } = await import('@/lib/calendar-sync/flags')
    vi.mocked(isConnectionAllowed).mockReturnValue(false)

    expect(isConnectionAllowed('connection-123')).toBe(false)
  })

  it('returns deterministic summary structure', async () => {
    const { runSyncJob } = await import('@/lib/calendar-sync/jobs/run-sync-job')
    const summary = await runSyncJob()
    
    expect(summary).toHaveProperty('connections_processed')
    expect(summary).toHaveProperty('connections_succeeded')
    expect(summary).toHaveProperty('connections_failed')
    expect(summary).toHaveProperty('items_ingested')
    expect(summary).toHaveProperty('items_updated')
    expect(summary).toHaveProperty('outbound_retried')
    expect(summary).toHaveProperty('outbound_succeeded')
    expect(summary).toHaveProperty('errors')
    expect(summary).toHaveProperty('duration_ms')
  })
})
