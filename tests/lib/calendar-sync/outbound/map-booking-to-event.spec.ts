import { describe, it, expect } from 'vitest';
import { mapBookingToCalendarEvent } from '@/lib/calendar-sync/outbound/map-booking-to-event';

describe('mapBookingToCalendarEvent', () => {
  it('produces deterministic payload for same booking', () => {
    const booking = {
      id: 'b-1',
      provider_id: 'p-1',
      start_time: '2026-01-20T10:00:00Z',
      end_time: '2026-01-20T11:00:00Z',
      notes: 'Please be on time',
      service_name: 'Haircut',
      location: '123 Main St',
    };
    const ctx = { calendar_provider: 'google' };
    const p1 = mapBookingToCalendarEvent(booking, ctx);
    const p2 = mapBookingToCalendarEvent(booking, ctx);
    expect(p1).toEqual(p2);
  });

  it('ensures times are in UTC and description contains minimal info', () => {
    const booking = {
      id: 'b-2',
      provider_id: 'p-1',
      start_time: '2026-01-20T10:00:00-05:00',
      end_time: '2026-01-20T11:00:00-05:00',
      notes: 'Secret token: abc123 should not be included as token',
      service_name: 'Consult',
    };
    const ctx = { calendar_provider: 'google' };
    const payload = mapBookingToCalendarEvent(booking, ctx);
    expect(payload.start.toISOString()).toBe('2026-01-20T15:00:00.000Z'); // converted to UTC
    expect(payload.description).toContain('Booking ID: b-2');
    expect(payload.description).toContain('Notes:');
  });
});

