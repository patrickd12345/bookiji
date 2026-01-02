import { getServerSupabase } from '@/lib/supabaseServer';
import type { TimeInterval } from '../normalize';
import { computeExternalEventChecksum } from '../checksum';

export const busyIntervalRepository = {
  async upsertBusyInterval(params: {
    provider_id: string;
    source: 'google' | 'microsoft';
    external_id: string;
    start_time: Date;
    end_time: Date;
    checksum: string;
  }): Promise<{ id: string; created: boolean }> {
    const supabase = getServerSupabase();
    const { provider_id, source, external_id, start_time, end_time, checksum } = params;

    // Try to find existing row for this provider+source+external_id
    const { data: existing, error: selectErr } = await supabase
      .from('external_calendar_events')
      .select('id, checksum')
      .eq('provider_id', provider_id)
      .eq('calendar_provider', source)
      .eq('external_event_id', external_id)
      .maybeSingle();

    if (selectErr) {
      throw new Error(`Failed to select existing external_calendar_event: ${String(selectErr)}`);
    }

    if (existing) {
      // If checksum matches, no-op
      if (existing.checksum === checksum) {
        return { id: existing.id, created: false };
      }

      // Update row
      const { data: updated, error: updateErr } = await supabase
        .from('external_calendar_events')
        .update({
          start_time: start_time.toISOString(),
          end_time: end_time.toISOString(),
          is_busy: true,
          checksum,
          raw_payload: null,
        })
        .eq('id', existing.id)
        .select('id')
        .maybeSingle();

      if (updateErr) {
        throw new Error(`Failed to update external_calendar_event: ${String(updateErr)}`);
      }
      if (!updated || !('id' in updated)) {
        throw new Error('Failed to read updated external_calendar_event id');
      }
      return { id: (updated as any).id, created: false };
    }

    // Insert new
    const { data: inserted, error: insertErr } = await supabase
      .from('external_calendar_events')
      .insert({
        provider_id,
        calendar_provider: source,
        external_event_id: external_id,
        start_time: start_time.toISOString(),
        end_time: end_time.toISOString(),
        is_busy: true,
        checksum,
        raw_payload: null,
      })
      .select('id')
      .maybeSingle();

    if (insertErr) {
      throw new Error(`Failed to insert external_calendar_event: ${String(insertErr)}`);
    }
    if (!inserted || !('id' in inserted)) {
      throw new Error('Failed to read inserted external_calendar_event id');
    }
    return { id: (inserted as any).id, created: true };
  },

  async getBusyIntervals(params: {
    provider_id: string;
    window_start: Date;
    window_end: Date;
  }): Promise<TimeInterval[]> {
    const supabase = getServerSupabase();
    const { provider_id, window_start, window_end } = params;
    const { data, error } = await supabase
      .from('external_calendar_events')
      .select('start_time, end_time')
      .eq('provider_id', provider_id)
      .eq('is_busy', true)
      .gte('end_time', window_start.toISOString())
      .lte('start_time', window_end.toISOString())
      .order('start_time', { ascending: true });

    if (error) {
      throw new Error(`Failed to read busy intervals: ${String(error)}`);
    }

    return (data || []).map((r: any) => ({
      start: new Date(r.start_time),
      end: new Date(r.end_time),
    }));
  },

  async deleteByExternalId(params: {
    provider_id: string;
    source: 'google' | 'microsoft';
    external_id: string;
  }): Promise<void> {
    const supabase = getServerSupabase();
    const { provider_id, source, external_id } = params;
    const { error } = await supabase
      .from('external_calendar_events')
      .delete()
      .eq('provider_id', provider_id)
      .eq('calendar_provider', source)
      .eq('external_event_id', external_id);

    if (error) {
      throw new Error(`Failed to delete external_calendar_event: ${String(error)}`);
    }
  },
};

export type BusyIntervalRepository = typeof busyIntervalRepository;

