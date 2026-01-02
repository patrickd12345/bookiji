# Missing Layer-1 Calendar Helpers

**Phase:** F-015.1 Foundations  
**Status:** BLOCKED — Helpers must be implemented before tests can be written

## Required Helpers

### 1. `mergeIntervals(intervals: TimeInterval[]): TimeInterval[]`

**Purpose:** Merge overlapping intervals deterministically.

**Required Behavior:**
- Merges overlapping intervals deterministically
- Defines and locks behavior for "touching" intervals (end == start)
- Preserves gaps between non-overlapping intervals
- Is idempotent: `merge(merge(x)) === merge(x)`
- Does not mutate input
- Output is stable across runs
- JSON.stringify(output) is deterministic

**Test Cases (to be written once helper exists):**
- Two overlapping intervals → one merged interval
- Two touching intervals (end == start) → one merged interval OR two separate (behavior must be locked)
- Three overlapping intervals → one merged interval
- Non-overlapping intervals → preserved as-is
- Empty input → empty output
- Single interval → unchanged
- Idempotency: merge(merge(x)) === merge(x)
- No mutation of input
- Deterministic ordering

**Location:** `src/lib/calendar-sync/merge.ts`

---

### 2. `subtractIntervals(base: TimeInterval, busy: TimeInterval[]): TimeInterval[]`

**Purpose:** Subtract busy intervals from a base interval.

**Required Behavior:**
- Subtracts busy intervals from a base interval correctly
- Handles inside, edge, outside, and full-cover cases
- Produces deterministic ordering
- Produces empty set when fully covered
- Does not mutate input
- Output is stable across runs

**Test Cases (to be written once helper exists):**
- Base: [10:00-12:00], Busy: [10:30-11:00] → [10:00-10:30, 11:00-12:00]
- Base: [10:00-12:00], Busy: [09:00-13:00] → [] (fully covered)
- Base: [10:00-12:00], Busy: [10:00-11:00] → [11:00-12:00] (edge case)
- Base: [10:00-12:00], Busy: [11:00-12:00] → [10:00-11:00] (edge case)
- Base: [10:00-12:00], Busy: [09:00-10:00] → [10:00-12:00] (outside, no change)
- Base: [10:00-12:00], Busy: [] → [10:00-12:00] (no busy, unchanged)
- Multiple busy intervals with overlaps → correctly subtracts all
- Deterministic ordering of result
- No mutation of input

**Location:** `src/lib/calendar-sync/subtract.ts`

---

### 3. `computeIntervalSetChecksum(intervals: TimeInterval[]): string`

**Purpose:** Compute deterministic checksum for a set of intervals.

**Required Behavior:**
- Same semantic intervals → same checksum
- Order-independent (if intervals are a set)
- Any boundary change → different checksum
- Same times expressed in different timezones → same checksum after normalization
- Does not mutate input
- Output is stable across runs

**Test Cases (to be written once helper exists):**
- Same intervals in different order → same checksum
- Same intervals with different object references → same checksum
- One interval boundary changed → different checksum
- Empty set → deterministic checksum (empty set hash)
- Normalized timezone-aware intervals → same checksum as UTC equivalents
- Deterministic across multiple calls

**Location:** `src/lib/calendar-sync/checksum.ts` (extend existing file)

---

## Implementation Priority

1. **mergeIntervals** — Required for conflict resolution and availability computation
2. **subtractIntervals** — Required for free/busy calculation
3. **computeIntervalSetChecksum** — Required for change detection in sync operations

## Testing Philosophy

Once helpers are implemented, tests must:
- Define invariants, not implementations
- Be deterministic and side-effect free
- Not reference calendar providers, OAuth, jobs, webhooks, UI, or flags
- Prove correctness of pure logic only
