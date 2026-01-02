import type { CalendarAdapter } from '@/lib/calendar-adapters/types';
import { bookingEventRepository } from '../repositories/booking-event-repository';
import { getServerSupabase } from '@/lib/supabaseServer';
import { isCalendarSyncEnabled } from '../flags';

export async function syncBookingCancelledToCalendar(params: {
  booking_id: string;
  calendar_provider: string;
  adapter: CalendarAdapter;
}) {
  const { booking_id, calendar_provider, adapter } = params;

  // Get provider_id from booking or existing mapping
  const existing = await bookingEventRepository.getMapping({ booking_id, calendar_provider });
  let provider_id: string | undefined = existing?.provider_id;
  
  // If not in mapping, fetch from booking
  if (!provider_id) {
    const supabase = getServerSupabase();
    const { data: booking } = await supabase
      .from('bookings')
      .select('provider_id')
      .eq('id', booking_id)
      .maybeSingle();
    provider_id = booking?.provider_id;
  }

  // Check feature flag
  if (provider_id && !isCalendarSyncEnabled(provider_id)) {
    return { status: 'disabled', reason: 'CALENDAR_SYNC_DISABLED' };
  }

  if (!existing) {
    return { status: 'no_mapping' };
  }

  const externalId = existing.external_event_id;

  try {
    if (!adapter.deleteEvent && !(adapter as any).cancelEvent) {
      // No cancel capability; just mark cancelled locally
      await bookingEventRepository.updateStatus({ booking_id, calendar_provider, sync_status: 'CANCELLED' , last_error: null});
      return { status: 'marked_cancelled' };
    }

    const deleted = adapter.deleteEvent ? await adapter.deleteEvent(externalId) : await (adapter as any).cancelEvent(externalId);

    await bookingEventRepository.updateStatus({ booking_id, calendar_provider, sync_status: 'CANCELLED', last_error: null });
    return { status: deleted ? 'cancelled' : 'cancelled_local' };
  } catch (err: any) {
    await bookingEventRepository.updateStatus({ booking_id, calendar_provider, sync_status: 'FAILED', last_error: String(err) });
    throw err;
  }
}

