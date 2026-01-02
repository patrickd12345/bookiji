import type { TimeInterval } from './normalize';
import { mergeIntervals } from './merge';

/**
 * Subtract busy intervals from a base interval.
 * - Assumes inputs are UTC-normalized.
 * - Pure: does not mutate inputs.
 */
export function subtractIntervals(base: TimeInterval, busy: TimeInterval[]): TimeInterval[] {
  if (!base) return [];
  if (!Array.isArray(busy) || busy.length === 0) {
    return [{ start: new Date(base.start), end: new Date(base.end) }];
  }

  const mergedBusy = mergeIntervals(busy);

  let remaining: TimeInterval[] = [{ start: new Date(base.start), end: new Date(base.end) }];

  for (const b of mergedBusy) {
    const next: TimeInterval[] = [];
    for (const r of remaining) {
      // No overlap
      if (b.end.getTime() <= r.start.getTime() || b.start.getTime() >= r.end.getTime()) {
        next.push({ start: new Date(r.start), end: new Date(r.end) });
        continue;
      }

      // Overlap: left segment
      if (r.start.getTime() < b.start.getTime()) {
        next.push({ start: new Date(r.start), end: new Date(b.start) });
      }

      // Overlap: right segment
      if (r.end.getTime() > b.end.getTime()) {
        next.push({ start: new Date(b.end), end: new Date(r.end) });
      }
      // If busy covers r entirely, nothing is added
    }
    remaining = next;
    if (remaining.length === 0) break;
  }

  // Ensure deterministic ordering
  remaining.sort((a, b) => a.start.getTime() - b.start.getTime());
  return remaining;
}

