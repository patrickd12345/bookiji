import type { CalendarAdapter } from '@/lib/calendar-adapters/types';
import { normalizeBusyIntervalsToUTC, type TimeInterval } from '../normalize';
import { mergeIntervals } from '../merge';
import { computeIntervalSetChecksum, computeExternalEventChecksum } from '../checksum';
import { busyIntervalRepository } from '../repositories/busy-interval-repository';
import { syncStateRepository } from '../repositories/sync-state-repository';
import { isCalendarSyncEnabled } from '../flags';

export async function ingestFreeBusy(params: {
  provider_id: string;
  source: 'google' | 'microsoft';
  window: { start: Date; end: Date };
  adapter: CalendarAdapter;
}) {
  const { provider_id, source, window, adapter } = params;

  // Check feature flag
  if (!isCalendarSyncEnabled(provider_id)) {
    return { ingested: 0, updated: 0, skipped: 0, errors: [{ error: 'CALENDAR_SYNC_DISABLED' }] };
  }

  // Read sync state
  const state = await syncStateRepository.getSyncState({ provider_id, source });
  if (state?.backoff_until && new Date(state.backoff_until) > new Date()) {
    return { ingested: 0, updated: 0, skipped: 0, errors: [{ error: 'BACKOFF_ACTIVE' }] };
  }

  // Call adapter.listFreeBusy exactly once
  if (!adapter.listFreeBusy) {
    return { ingested: 0, updated: 0, skipped: 0, errors: [{ error: 'NO_FREEBUSY_CAPABILITY' }] };
  }

  let fbResult;
  try {
    fbResult = await adapter.listFreeBusy({ timeMin: window.start, timeMax: window.end });
  } catch (err: any) {
    // record error on sync state
    await syncStateRepository.updateSyncState({
      provider_id,
      source,
      last_synced_at: new Date(),
      error_count: (state?.error_count || 0) + 1,
      last_error: { message: String(err) },
      backoff_until: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes backoff (state only)
    });
    return { ingested: 0, updated: 0, skipped: 0, errors: [{ error: String(err) }] };
  }

  // Normalize and merge
  const normalized = normalizeBusyIntervalsToUTC(fbResult.busy || [], 'UTC');
  const merged = mergeIntervals(normalized as TimeInterval[]);
  const setChecksum = computeIntervalSetChecksum(merged);

  let ingested = 0;
  let updated = 0;
  const skipped = 0;
  const errors: Array<{ external_id?: string; error: string }> = [];

  for (const iv of merged) {
    try {
      // deterministic external id per interval
      const external_id = `${source}-${iv.start.getTime()}-${iv.end.getTime()}`;
      const eventChecksum = computeExternalEventChecksum({
        external_event_id: external_id,
        start: iv.start,
        end: iv.end,
        is_busy: true,
        provider_id,
        calendar_provider: source,
      });

      const res = await busyIntervalRepository.upsertBusyInterval({
        provider_id,
        source,
        external_id,
        start_time: iv.start,
        end_time: iv.end,
        checksum: eventChecksum,
      });

      if (res.created) ingested++;
      else updated++;
    } catch (err: any) {
      errors.push({ error: String(err) });
    }
  }

  // Update sync state success
  await syncStateRepository.updateSyncState({
    provider_id,
    source,
    last_synced_at: new Date(),
    cursor: state?.sync_cursor ?? undefined,
    error_count: 0,
    last_error: null,
  });

  return { ingested, updated, skipped, errors };
}

