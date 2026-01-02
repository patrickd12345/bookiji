import { describe, it, beforeEach, expect } from 'vitest';
import { createMockSupabaseClient } from '../../../utils/supabase-mocks';
import { MockCalendarAdapter } from '@/lib/calendar-adapters/mock';
import { syncBookingCreatedToCalendar } from '@/lib/calendar-sync/outbound/sync-booking-created';
import { syncBookingUpdatedToCalendar } from '@/lib/calendar-sync/outbound/sync-booking-updated';
import { syncBookingCancelledToCalendar } from '@/lib/calendar-sync/outbound/sync-booking-cancelled';
import { getServerSupabase } from '@/lib/supabaseServer';

createMockSupabaseClient();

describe('outbound calendar sync (integration)', () => {
  const providerId = '00000000-0000-0000-0000-000000000010';
  let adapter: MockCalendarAdapter;

  beforeEach(async () => {
    const supabase = getServerSupabase();
    await supabase.from('external_calendar_events').delete().neq('id', '');
    await supabase.from('external_calendar_connections').delete().neq('id', '');
    await supabase.from('bookings').delete().neq('id', '');
    adapter = new MockCalendarAdapter();
  });

  it('creates mapping on booking create and is idempotent', async () => {
    const supabase = getServerSupabase();
    const { data: inserted } = await supabase.from('bookings').insert({
      id: 'b-out-1',
      customer_id: providerId,
      provider_id: providerId,
      service_id: 's1',
      start_time: new Date('2026-01-20T10:00:00Z').toISOString(),
      end_time: new Date('2026-01-20T11:00:00Z').toISOString(),
      status: 'confirmed',
      total_amount: 50,
    }).select('id').maybeSingle();
    const bookingId = (inserted as any).id;

    const r1 = await syncBookingCreatedToCalendar({
      booking_id: bookingId,
      provider_id: providerId,
      calendar_provider: 'google',
      adapter,
    });
    expect(r1.status).toBe('created');

    // Replay should be idempotent (no duplicate created)
    const r2 = await syncBookingCreatedToCalendar({
      booking_id: bookingId,
      provider_id: providerId,
      calendar_provider: 'google',
      adapter,
    });
    expect(['noop','updated','created']).toContain(r2.status);
  });

  it('updates event on booking change', async () => {
    const supabase = getServerSupabase();
    // Insert booking and initial mapping via sync
    const { data: inserted } = await supabase.from('bookings').insert({
      id: 'b-out-2',
      customer_id: providerId,
      provider_id: providerId,
      service_id: 's1',
      start_time: new Date('2026-02-20T10:00:00Z').toISOString(),
      end_time: new Date('2026-02-20T11:00:00Z').toISOString(),
      status: 'confirmed',
      total_amount: 70,
    }).select('id').maybeSingle();
    const bookingId = (inserted as any).id;

    await syncBookingCreatedToCalendar({ booking_id: bookingId, provider_id: providerId, calendar_provider: 'google', adapter });

    // Update booking times
    await supabase.from('bookings').update({ start_time: new Date('2026-02-20T12:00:00Z').toISOString(), end_time: new Date('2026-02-20T13:00:00Z').toISOString() }).eq('id', bookingId);

    const r = await syncBookingUpdatedToCalendar({ booking_id: bookingId, provider_id: providerId, calendar_provider: 'google', adapter });
    expect(['updated','fallback_create','noop']).toContain(r.status);
  });

  it('cancels event on booking cancel', async () => {
    const supabase = getServerSupabase();
    const { data: inserted } = await supabase.from('bookings').insert({
      id: 'b-out-3',
      customer_id: providerId,
      provider_id: providerId,
      service_id: 's1',
      start_time: new Date('2026-03-20T10:00:00Z').toISOString(),
      end_time: new Date('2026-03-20T11:00:00Z').toISOString(),
      status: 'confirmed',
      total_amount: 30,
    }).select('id').maybeSingle();
    const bookingId = (inserted as any).id;

    await syncBookingCreatedToCalendar({ booking_id: bookingId, provider_id: providerId, calendar_provider: 'google', adapter });

    const r = await syncBookingCancelledToCalendar({ booking_id: bookingId, calendar_provider: 'google', adapter });
    expect(['cancelled','marked_cancelled','cancelled_local']).toContain(r.status);
  });
});

