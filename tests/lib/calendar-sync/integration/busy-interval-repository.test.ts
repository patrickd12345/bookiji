import { createMockSupabaseClient } from '../../../../tests/utils/supabase-mocks';
import { getServerSupabase } from '@/lib/supabaseServer';
import { busyIntervalRepository } from '@/lib/calendar-sync/repositories/busy-interval-repository';

// Ensure test environment uses mock supabase client
createMockSupabaseClient();

describe('BusyIntervalRepository (integration)', () => {
  const providerId = '00000000-0000-0000-0000-000000000001';
  beforeEach(async () => {
    // Clean table
    const supabase = getServerSupabase();
    await supabase.from('external_calendar_events').delete().neq('id', ''); // delete all
  });

  it('upsert same checksum is no-op', async () => {
    const res1 = await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'google-1',
      start_time: new Date('2026-01-20T10:00:00Z'),
      end_time: new Date('2026-01-20T11:00:00Z'),
      checksum: 'abc',
    });
    expect(res1.created).toBe(true);

    const res2 = await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'google-1',
      start_time: new Date('2026-01-20T10:00:00Z'),
      end_time: new Date('2026-01-20T11:00:00Z'),
      checksum: 'abc',
    });
    expect(res2.created).toBe(false);
    expect(res2.id).toBe(res1.id);
  });

  it('upsert different checksum updates', async () => {
    const res1 = await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'google-2',
      start_time: new Date('2026-01-20T12:00:00Z'),
      end_time: new Date('2026-01-20T13:00:00Z'),
      checksum: 'abc',
    });
    expect(res1.created).toBe(true);

    const res2 = await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'google-2',
      start_time: new Date('2026-01-20T12:00:00Z'),
      end_time: new Date('2026-01-20T13:00:00Z'),
      checksum: 'def',
    });
    expect(res2.created).toBe(false);
    expect(res2.id).toBe(res1.id);
  });

  it('getBusyIntervals returns deterministic ordering', async () => {
    await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'g-a',
      start_time: new Date('2026-01-20T09:00:00Z'),
      end_time: new Date('2026-01-20T09:30:00Z'),
      checksum: 'a',
    });
    await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'g-b',
      start_time: new Date('2026-01-20T11:00:00Z'),
      end_time: new Date('2026-01-20T11:30:00Z'),
      checksum: 'b',
    });

    const intervals = await busyIntervalRepository.getBusyIntervals({
      provider_id: providerId,
      window_start: new Date('2026-01-20T00:00:00Z'),
      window_end: new Date('2026-01-21T00:00:00Z'),
    });
    expect(intervals.length).toBeGreaterThanOrEqual(2);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i].start.getTime()).toBeGreaterThanOrEqual(intervals[i - 1].start.getTime());
    }
  });
});

