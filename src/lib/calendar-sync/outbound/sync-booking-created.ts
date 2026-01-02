import type { CalendarAdapter } from '@/lib/calendar-adapters/types';
import { getServerSupabase } from '@/lib/supabaseServer';
import { mapBookingToCalendarEvent } from './map-booking-to-event';
import { bookingEventRepository } from '../repositories/booking-event-repository';
import { computeCalendarEventPayloadChecksum } from '../checksum';
import { isCalendarSyncEnabled } from '../flags';

export async function syncBookingCreatedToCalendar(params: {
  booking_id: string;
  provider_id: string;
  calendar_provider: string;
  adapter: CalendarAdapter;
}) {
  const { booking_id, provider_id, calendar_provider, adapter } = params;
  
  // Check feature flag
  if (!isCalendarSyncEnabled(provider_id)) {
    return { status: 'disabled', reason: 'CALENDAR_SYNC_DISABLED' };
  }
  
  const supabase = getServerSupabase();

  // Fetch booking
  const { data: booking, error: bErr } = await supabase.from('bookings').select('*').eq('id', booking_id).maybeSingle();
  if (bErr) throw new Error(`Failed to fetch booking: ${String(bErr)}`);
  if (!booking) throw new Error('Booking not found');

  const payload = mapBookingToCalendarEvent(
    {
      id: booking.id,
      provider_id: booking.provider_id,
      start_time: booking.start_time,
      end_time: booking.end_time,
      notes: booking.notes,
      service_name: null,
      location: null,
    },
    { calendar_provider }
  );

  const checksum = computeCalendarEventPayloadChecksum(payload);

  // Check existing mapping
  const existing = await bookingEventRepository.getMapping({ booking_id, calendar_provider });
  if (existing) {
    // If checksum matches, no-op
    if (existing.checksum === checksum) {
      return { status: 'noop', id: existing.id };
    }
    // Treat as update path
    if (adapter.updateEvent) {
      try {
        const updated = await adapter.updateEvent({
          id: existing.external_event_id || existing.external_event_id,
          title: payload.title,
          start: payload.start,
          end: payload.end,
          isAllDay: false,
          status: 'busy',
          description: payload.description,
          location: payload.location,
        } as any);
        await bookingEventRepository.upsertMapping({
          booking_id,
          provider_id,
          calendar_provider,
          external_event_id: (updated && (updated as any).id) || existing.external_event_id,
          ical_uid: payload.ics_uid,
          start_time: payload.start,
          end_time: payload.end,
          checksum,
          sync_status: 'UPDATED',
        });
        return { status: 'updated' };
      } catch (err: any) {
        await bookingEventRepository.updateStatus({ booking_id, calendar_provider, sync_status: 'FAILED', last_error: String(err) });
        throw err;
      }
    }
  }

  // Create new external event via adapter
  if (!adapter.createEvent) {
    await bookingEventRepository.upsertMapping({
      booking_id,
      provider_id,
      calendar_provider,
      external_event_id: `local-${booking_id}`,
      ical_uid: payload.ics_uid,
      start_time: payload.start,
      end_time: payload.end,
      checksum,
      sync_status: 'FAILED',
      last_error: 'NO_CREATE_CAPABILITY',
    });
    throw new Error('Adapter does not support createEvent');
  }

  try {
    const created = await adapter.createEvent({
      title: payload.title,
      start: payload.start,
      end: payload.end,
      description: payload.description,
      location: payload.location,
      ics_uid: payload.ics_uid,
    } as any);

    const external_id = (created && ((created as any).id || (created as any).external_id)) || `mock-${Date.now()}`;

    const res = await bookingEventRepository.upsertMapping({
      booking_id,
      provider_id,
      calendar_provider,
      external_event_id: external_id,
      ical_uid: payload.ics_uid,
      start_time: payload.start,
      end_time: payload.end,
      checksum,
      sync_status: 'CREATED',
    });

    return { status: 'created', mapping_id: res.id, external_id };
  } catch (err: any) {
    await bookingEventRepository.upsertMapping({
      booking_id,
      provider_id,
      calendar_provider,
      external_event_id: `local-${booking_id}`,
      ical_uid: payload.ics_uid,
      start_time: payload.start,
      end_time: payload.end,
      checksum,
      sync_status: 'FAILED',
      last_error: String(err),
    });
    throw err;
  }
}

