# Layer-1 Calendar Foundation Tests

**Phase:** F-015.1 Foundations  
**Scope:** Pure logic unit tests only  
**Tooling:** Vitest

## Test Files

### ✅ Implemented Tests

1. **`normalize.test.ts`** — Interval normalization tests
   - Timezone conversion to UTC
   - DST boundary handling (spring forward, fall back)
   - Overnight span handling
   - Deterministic ordering
   - Input immutability
   - Output stability

2. **`checksum.test.ts`** — Checksum determinism tests
   - Same semantic intervals → same checksum
   - Boundary changes → different checksum
   - Timezone normalization (after helper exists)
   - Input immutability
   - Output stability

3. **`meta-invariants.test.ts`** — Meta-invariant tests
   - All helpers do not mutate inputs
   - All helpers produce stable outputs across runs
   - JSON serialization is deterministic

### ⚠️ Missing Helpers (Blocked)

See `missing-helpers.md` for detailed requirements:

1. **`mergeIntervals(intervals: TimeInterval[]): TimeInterval[]`**
   - Required for: Conflict resolution, availability computation
   - Status: NOT IMPLEMENTED — tests cannot be written

2. **`subtractIntervals(base: TimeInterval, busy: TimeInterval[]): TimeInterval[]`**
   - Required for: Free/busy calculation
   - Status: NOT IMPLEMENTED — tests cannot be written

3. **`computeIntervalSetChecksum(intervals: TimeInterval[]): string`**
   - Required for: Change detection in sync operations
   - Status: NOT IMPLEMENTED — tests cannot be written

## Test Philosophy

- **Tests define invariants, not implementations**
- **Pure logic only** — no DB, no network, no env, no flags, no adapters, no OAuth, no jobs, no UI
- **Deterministic and side-effect free**
- **No placeholder tests** — only real assertions

## Running Tests

```bash
pnpm test tests/unit/calendar
```

## Next Steps

1. Implement missing helpers (`mergeIntervals`, `subtractIntervals`, `computeIntervalSetChecksum`)
2. Write comprehensive tests for each helper (test cases documented in `missing-helpers.md`)
3. Verify all tests pass
4. Close F-015.1 Foundations phase
