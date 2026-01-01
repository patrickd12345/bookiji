# Search Providers API - Performance Envelope

## Status: SAFE FOR LIMITED PARTNERS

**Last Updated**: 2026-01-01  
**Performance Fix**: N+1 availability query eliminated via batched query

## Load Envelope

The following performance characteristics are **LOCKED IN** and must be preserved:

| VUs | Expected P95 | Error Rate | Status |
|-----|--------------|------------|--------|
| 10  | ~1.9s        | 0.00%      | ✅ Safe |
| 25  | ~2.2s        | 0.00%      | ✅ Safe |
| 50  | ~2.9s        | 0.00%      | ✅ Safe |
| 75  | ~3.7s        | 0.00%      | ✅ Safe |

**⚠️ WARNING**: Higher concurrency (100+ VUs) requires architectural changes. Current implementation is optimized for limited partner access.

## Performance Invariant

**CRITICAL**: The `availability_slots` table must be queried **at most ONCE** per request.

- **Enforcement**: Automated test in `tests/api/providers.search.performance.spec.ts`
- **CI Guard**: Test failure blocks merge
- **Regression Impact**: If violated, P95 latency regresses from ~2.2s to ~5.5s at 25 VUs

## Implementation Details

### Batched Query Pattern

The availability filtering uses a single batched query:

```typescript
const { data: slots } = await supabase
  .from('availability_slots')
  .select('provider_id, start_time, end_time')
  .in('provider_id', providerIds)  // Batched: all providers in one query
  .gte('start_time', `${date}T00:00:00Z`)
  .lt('start_time', `${date}T23:59:59Z`)
  .eq('is_available', true)
```

**DO NOT** change this to per-provider queries. This would reintroduce N+1 behavior.

### Observability

Minimal logging is enabled:
- Provider count per request
- Total slots fetched per request
- Date filter applied

No high-cardinality metrics are logged.

## Testing

Run the performance invariant test:

```bash
pnpm test tests/api/providers.search.performance.spec.ts
```

The test verifies:
1. `availability_slots` is queried at most once when `availability_date` is provided
2. `availability_slots` is not queried when `availability_date` is not provided

## Future Changes

If you need to modify the availability filtering logic:

1. **MUST** preserve the single-query pattern
2. **MUST** update the performance invariant test if query pattern changes
3. **MUST** re-run k6 load tests at 10/25/50/75 VUs
4. **MUST** update this document with new P95 measurements

## Related Files

- Endpoint: `src/app/api/search/providers/route.ts`
- Performance Test: `tests/api/providers.search.performance.spec.ts`
- Load Test Script: `loadtests/search-providers.k6.js`
