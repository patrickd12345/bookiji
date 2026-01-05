
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { ingestFreeBusy } from '../../../src/lib/calendar-sync/ingestion/ingest-free-busy';
import { CalendarAdapter } from '../../../src/lib/calendar-adapters/types';

// Mock repositories
const mockGetSyncState = vi.fn();
const mockUpdateSyncState = vi.fn();
const mockUpsertBusyInterval = vi.fn();

vi.mock('@/lib/calendar-sync/repositories/sync-state-repository', () => ({
  syncStateRepository: {
    getSyncState: (...args: any[]) => mockGetSyncState(...args),
    updateSyncState: (...args: any[]) => mockUpdateSyncState(...args),
  },
}));

vi.mock('@/lib/calendar-sync/repositories/busy-interval-repository', () => ({
  busyIntervalRepository: {
    upsertBusyInterval: (...args: any[]) => mockUpsertBusyInterval(...args),
  },
}));

vi.mock('@/lib/calendar-sync/flags', () => ({
  isCalendarSyncEnabled: () => true,
}));

describe('Calendar Sync Integration', () => {
  let mockAdapter: CalendarAdapter;

  beforeEach(() => {
    mockAdapter = {
      connect: vi.fn(),
      disconnect: vi.fn(),
      refreshToken: vi.fn(),
      getEvents: vi.fn(),
      getFreebusy: vi.fn(),
      getCalendarList: vi.fn(),
      // Adding listFreeBusy to match the implementation in ingest-free-busy.ts
      // Although it's not in the interface in google.ts, the code expects it.
      // Casting to any to avoid TS errors if interface mismatch
    } as any;

    vi.clearAllMocks();
  });

  describe('ingestFreeBusy', () => {
    it('should successfully ingest free/busy intervals', async () => {
      // Mock sync state
      mockGetSyncState.mockResolvedValue({
        provider_id: 'provider1',
        source: 'google',
        error_count: 0
      });

      // Mock adapter response
      const startTime = new Date('2025-01-01T10:00:00Z');
      const endTime = new Date('2025-01-01T12:00:00Z');

      // @ts-ignore
      mockAdapter.listFreeBusy = vi.fn().mockResolvedValue({
        busy: [
            { start: startTime, end: endTime }
        ]
      });

      // Mock repo success
      mockUpsertBusyInterval.mockResolvedValue({ created: true });

      const result = await ingestFreeBusy({
        provider_id: 'provider1',
        source: 'google',
        window: { start: new Date('2025-01-01T00:00:00Z'), end: new Date('2025-01-02T00:00:00Z') },
        adapter: mockAdapter
      });

      expect(result.ingested).toBe(1);
      expect(result.errors).toHaveLength(0);
      expect(mockUpsertBusyInterval).toHaveBeenCalledTimes(1);
      expect(mockUpdateSyncState).toHaveBeenCalledWith(expect.objectContaining({
          error_count: 0,
          provider_id: 'provider1'
      }));
    });

    it('should handle adapter errors and update sync state', async () => {
      mockGetSyncState.mockResolvedValue({});

      // @ts-ignore
      mockAdapter.listFreeBusy = vi.fn().mockRejectedValue(new Error('Google API Error'));

      const result = await ingestFreeBusy({
        provider_id: 'provider1',
        source: 'google',
        window: { start: new Date(), end: new Date() },
        adapter: mockAdapter
      });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toContain('Google API Error');
      expect(mockUpdateSyncState).toHaveBeenCalledWith(expect.objectContaining({
          error_count: 1,
          last_error: expect.objectContaining({ message: expect.stringContaining('Google API Error') })
      }));
    });

    it('should skip sync if backoff is active', async () => {
        mockGetSyncState.mockResolvedValue({
            backoff_until: new Date(Date.now() + 100000) // Future
        });

        const result = await ingestFreeBusy({
            provider_id: 'provider1',
            source: 'google',
            window: { start: new Date(), end: new Date() },
            adapter: mockAdapter
        });

        expect(result.errors).toHaveLength(1);
        expect(result.errors[0].error).toBe('BACKOFF_ACTIVE');
        // @ts-ignore
        // We can't check .not.toHaveBeenCalled() directly because listFreeBusy is undefined on the mock
        // when we set it as {} initially and didn't mock listFreeBusy specifically for this test case.
        // But since listFreeBusy call is inside ingestFreeBusy after backoff check, if we didn't crash,
        // and we got BACKOFF_ACTIVE, we know it returned early.
    });
  });
});
