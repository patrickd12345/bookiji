import { getServerSupabase } from '@/lib/supabaseServer';

export const bookingEventRepository = {
  async getMapping(params: { booking_id: string; calendar_provider: string }) {
    const supabase = getServerSupabase();
    const { booking_id, calendar_provider } = params;
    const { data, error } = await supabase
      .from('external_calendar_events')
      .select('*')
      .eq('booking_id', booking_id)
      .eq('calendar_provider', calendar_provider)
      .maybeSingle();
    if (error) {
      throw new Error(`Failed to read booking-event mapping: ${String(error)}`);
    }
    return data || null;
  },

  async upsertMapping(params: {
    booking_id: string;
    provider_id: string;
    calendar_provider: string;
    external_event_id: string;
    ical_uid: string;
    start_time: Date;
    end_time: Date;
    checksum: string;
    sync_status?: 'CREATED' | 'UPDATED' | 'CANCELLED' | 'FAILED';
    last_error?: string | null;
  }) {
    const supabase = getServerSupabase();
    const {
      booking_id,
      provider_id,
      calendar_provider,
      external_event_id,
      ical_uid,
      start_time,
      end_time,
      checksum,
      sync_status,
      last_error,
    } = params;

    // Try to find existing mapping
    const { data: existing, error: selErr } = await supabase
      .from('external_calendar_events')
      .select('id, checksum')
      .eq('booking_id', booking_id)
      .eq('calendar_provider', calendar_provider)
      .maybeSingle();

    if (selErr) throw new Error(`Failed to read existing mapping: ${String(selErr)}`);

    if (existing) {
      // If checksum matches, no-op
      if (existing.checksum === checksum) {
        return { id: existing.id, created: false };
      }
      // Update existing
      const { data: updated, error: updErr } = await supabase
        .from('external_calendar_events')
        .update({
          provider_id,
          external_event_id,
          ical_uid,
          start_time: start_time.toISOString(),
          end_time: end_time.toISOString(),
          checksum,
          sync_status: sync_status ?? 'UPDATED',
          last_error: last_error ?? null,
          raw_payload: null,
        })
        .eq('id', existing.id)
        .select('id')
        .maybeSingle();
      if (updErr) throw new Error(`Failed to update mapping: ${String(updErr)}`);
      if (!updated || !('id' in updated)) throw new Error('Failed to read updated mapping id');
      return { id: (updated as any).id, created: false };
    }

    // Insert new mapping
    const { data: inserted, error: insErr } = await supabase
      .from('external_calendar_events')
      .insert({
        booking_id,
        provider_id,
        calendar_provider,
        external_event_id,
        ical_uid,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        is_busy: false,
        checksum,
        sync_status: sync_status ?? 'CREATED',
        last_error: last_error ?? null,
        raw_payload: null,
      })
      .select('id')
      .maybeSingle();

    if (insErr) throw new Error(`Failed to insert mapping: ${String(insErr)}`);
    if (!inserted || !('id' in inserted)) throw new Error('Failed to read inserted mapping id');
    return { id: (inserted as any).id, created: true };
  },

  async updateStatus(params: { booking_id: string; calendar_provider: string; sync_status: string; last_error?: string | null }) {
    const supabase = getServerSupabase();
    const { booking_id, calendar_provider, sync_status, last_error } = params;
    const { data: existing, error: selErr } = await supabase
      .from('external_calendar_events')
      .select('id')
      .eq('booking_id', booking_id)
      .eq('calendar_provider', calendar_provider)
      .maybeSingle();
    if (selErr) throw new Error(`Failed to read mapping: ${String(selErr)}`);
    if (!existing) throw new Error('Mapping not found');
    const { error: updErr } = await supabase
      .from('external_calendar_events')
      .update({ sync_status, last_error: last_error ?? null })
      .eq('id', existing.id);
    if (updErr) throw new Error(`Failed to update mapping status: ${String(updErr)}`);
  },

  async deleteMapping(params: { booking_id: string; calendar_provider: string }) {
    const supabase = getServerSupabase();
    const { booking_id, calendar_provider } = params;
    const { error } = await supabase
      .from('external_calendar_events')
      .delete()
      .eq('booking_id', booking_id)
      .eq('calendar_provider', calendar_provider);
    if (error) throw new Error(`Failed to delete mapping: ${String(error)}`);
  },
};

export type BookingEventRepository = typeof bookingEventRepository;

