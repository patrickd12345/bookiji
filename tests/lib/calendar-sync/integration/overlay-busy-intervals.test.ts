import { createMockSupabaseClient } from '../../../../tests/utils/supabase-mocks';
import { getServerSupabase } from '@/lib/supabaseServer';
import { busyIntervalRepository } from '@/lib/calendar-sync/repositories/busy-interval-repository';
import { overlayBusyIntervals } from '@/lib/calendar-sync/availability/overlay-busy-intervals';

createMockSupabaseClient();

describe('overlayBusyIntervals (integration)', () => {
  const providerId = '00000000-0000-0000-0000-000000000004';

  beforeEach(async () => {
    const supabase = getServerSupabase();
    await supabase.from('external_calendar_events').delete().neq('id', '');
  });

  it('trims availability slots that are fully or partially covered by busy intervals', async () => {
    // Create a busy interval that covers part of the availability slot
    await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'b1',
      start_time: new Date('2026-01-20T10:00:00Z'),
      end_time: new Date('2026-01-20T11:00:00Z'),
      checksum: 'c1',
    });

    const availability = [{ start_time: '2026-01-20T09:00:00Z', end_time: '2026-01-20T12:00:00Z' }];

    const free = await overlayBusyIntervals({
      provider_id: providerId,
      availability_slots: availability,
      window_start: new Date('2026-01-20T00:00:00Z'),
      window_end: new Date('2026-01-21T00:00:00Z'),
    });

    // Expect free slots split into two parts around the busy interval
    expect(free.length).toBeGreaterThanOrEqual(1);
    // Ensure none of the returned slots overlap the busy interval
    for (const s of free) {
      const slotEnd = new Date(s.end_time).getTime();
      const slotStart = new Date(s.start_time).getTime();
      const busyStart = new Date('2026-01-20T10:00:00Z').getTime();
      const busyEnd = new Date('2026-01-20T11:00:00Z').getTime();
      expect(slotEnd <= busyStart || slotStart >= busyEnd).toBe(true);
    }
  });

  it('busy interval hides full slot', async () => {
    // Create one availability slot
    const availability = [{ start_time: '2026-01-20T10:00:00Z', end_time: '2026-01-20T11:00:00Z' }];
    // Insert busy interval that covers it
    await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'e1',
      start_time: new Date('2026-01-20T10:00:00Z'),
      end_time: new Date('2026-01-20T11:00:00Z'),
      checksum: 'c1',
    });

    const out = await overlayBusyIntervals({
      provider_id: providerId,
      availability_slots: availability,
      window_start: new Date('2026-01-20T00:00:00Z'),
      window_end: new Date('2026-01-21T00:00:00Z'),
    });
    expect(out.length).toBe(0);
  });

  it('partial overlap trims slot', async () => {
    const availability = [{ start_time: '2026-01-20T10:00:00Z', end_time: '2026-01-20T11:00:00Z' }];
    await busyIntervalRepository.upsertBusyInterval({
      provider_id: providerId,
      source: 'google',
      external_id: 'e2',
      start_time: new Date('2026-01-20T10:30:00Z'),
      end_time: new Date('2026-01-20T11:30:00Z'),
      checksum: 'c2',
    });

    const out = await overlayBusyIntervals({
      provider_id: providerId,
      availability_slots: availability,
      window_start: new Date('2026-01-20T00:00:00Z'),
      window_end: new Date('2026-01-21T00:00:00Z'),
    });
    expect(out.length).toBe(1);
    expect(out[0].start_time).toBe('2026-01-20T10:00:00.000Z');
    expect(out[0].end_time).toBe('2026-01-20T10:30:00.000Z');
  });
});

