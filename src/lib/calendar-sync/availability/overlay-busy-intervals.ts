import { busyIntervalRepository } from '../repositories/busy-interval-repository';
import { subtractIntervals } from '../subtract';
import type { TimeInterval } from '../normalize';

export async function overlayBusyIntervals(params: {
  provider_id: string;
  availability_slots: Array<{ start_time: string; end_time: string }>;
  window_start: Date;
  window_end: Date;
}): Promise<Array<{ start_time: string; end_time: string }>> {
  const { provider_id, availability_slots, window_start, window_end } = params;

  // Read busy intervals for provider + window
  const busy = await busyIntervalRepository.getBusyIntervals({
    provider_id,
    window_start,
    window_end,
  });

  // Convert availability slots to TimeInterval[]
  const results: Array<{ start_time: string; end_time: string }> = [];

  for (const slot of availability_slots) {
    const base: TimeInterval = { start: new Date(slot.start_time), end: new Date(slot.end_time) };
    const freeParts = subtractIntervals(base, busy);
    for (const p of freeParts) {
      results.push({ start_time: p.start.toISOString(), end_time: p.end.toISOString() });
    }
  }

  // Deterministic ordering
  results.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  return results;
}

