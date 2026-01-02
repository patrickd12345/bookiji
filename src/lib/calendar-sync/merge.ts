import type { TimeInterval } from './normalize';

/**
 * Merge overlapping and touching intervals.
 * - Assumes inputs are UTC-normalized.
 * - Pure: does not mutate inputs.
 * - Touching intervals (a.end === b.start) are merged.
 */
export function mergeIntervals(intervals: TimeInterval[]): TimeInterval[] {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];

  const sorted = [...intervals].slice().sort((a, b) => a.start.getTime() - b.start.getTime());

  const merged: TimeInterval[] = [];
  // Copy the first interval
  let current = { start: new Date(sorted[0].start), end: new Date(sorted[0].end) };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    const currentEnd = current.end.getTime();
    const nextStart = next.start.getTime();
    const nextEnd = next.end.getTime();

    // Merge if overlapping or touching (current.end >= next.start)
    if (currentEnd >= nextStart) {
      current.end = new Date(Math.max(currentEnd, nextEnd));
    } else {
      merged.push({ start: new Date(current.start), end: new Date(current.end) });
      current = { start: new Date(next.start), end: new Date(next.end) };
    }
  }

  merged.push({ start: new Date(current.start), end: new Date(current.end) });
  return merged;
}

