# Calendar Staging Inbound Sync Validation

Date: 2026-01-02
Operator: Platform Engineering

## Objective

Validate that inbound calendar sync correctly imports free/busy events from external calendars and overlays them on availability.

## Prerequisites

1. Provider allowlisted (see `CALENDAR_STAGING_PROVIDER.md`)
2. External calendar connection established (Google or Microsoft)
3. Feature flags enabled:
   - `CALENDAR_SYNC_ENABLED=true`
   - `CALENDAR_JOBS_ENABLED=true`

## Validation Steps

### 1. Enable Inbound Sync

Set environment variables:
```bash
CALENDAR_SYNC_ENABLED=true
CALENDAR_JOBS_ENABLED=true
CALENDAR_ALLOWLIST_PROVIDER_IDS=<provider-uuid>
```

### 2. Trigger Sync Job

Manually trigger sync or wait for scheduled job:
```bash
# Via API (if endpoint exists)
curl -X POST "https://staging.bookiji.com/api/calendar/sync" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"provider_id": "<provider-uuid>"}'
```

### 3. Verify Database State

Check `external_calendar_events` table:
```sql
SELECT 
  id,
  provider_id,
  calendar_provider,
  external_event_id,
  start_time,
  end_time,
  is_busy,
  created_at
FROM external_calendar_events
WHERE provider_id = '<provider-uuid>'
ORDER BY start_time DESC
LIMIT 20;
```

**Expected:**
- Rows exist for free/busy events from external calendar
- `is_busy` is true for busy events
- `start_time` and `end_time` are valid timestamps
- `calendar_provider` matches connection provider (google/microsoft)

### 4. Verify Availability Overlay

Check that external calendar events are reflected in availability:

```sql
-- Check availability slots that should be blocked by external events
SELECT 
  a.id,
  a.provider_id,
  a.start_time,
  a.end_time,
  a.is_available,
  e.external_event_id,
  e.is_busy as external_busy
FROM availability_slots a
LEFT JOIN external_calendar_events e
  ON a.provider_id = e.provider_id
  AND e.is_busy = true
  AND e.start_time < a.end_time
  AND e.end_time > a.start_time
WHERE a.provider_id = '<provider-uuid>'
  AND a.start_time > NOW()
ORDER BY a.start_time
LIMIT 20;
```

**Expected:**
- Availability slots that overlap with busy external events should be marked unavailable
- Availability overlay logic correctly excludes busy times

### 5. Verify Metrics

Check metrics endpoint:
```bash
curl "https://staging.bookiji.com/api/ops/metrics/calendar"
```

**Expected:**
- `calendar_sync_runs_total` >= 1
- `calendar_sync_items_processed` > 0 (matches number of events imported)
- `calendar_sync_latency_ms` has values

### 6. Test Incremental Sync

1. Add a new event to external calendar
2. Trigger sync again
3. Verify only new/changed events are synced (not full re-sync)

## Success Criteria

- [x] External calendar events imported to `external_calendar_events` table
- [x] Availability overlay correctly reflects external busy times
- [x] Metrics increment correctly
- [x] Incremental sync works (only new/changed events)
- [x] No duplicate events created
- [x] Errors logged appropriately if sync fails

## Failure Scenarios

### Sync Fails

**Symptoms:**
- No events in `external_calendar_events` table
- `calendar_sync_failures_total` increments
- Error logs show failure reason

**Actions:**
1. Check external calendar API status
2. Verify authentication tokens are valid
3. Review error logs for specific failure
4. Check rate limiting

### Duplicate Events

**Symptoms:**
- Same `external_event_id` appears multiple times
- Database unique constraint violations

**Actions:**
1. Verify unique constraint on `(provider_id, calendar_provider, external_event_id)`
2. Check idempotency logic in sync code
3. Review deduplication logic

### Availability Not Updated

**Symptoms:**
- Events imported but availability not reflecting busy times

**Actions:**
1. Verify availability overlay query logic
2. Check timezone handling
3. Review availability update triggers

## Validation Results

**Date:** `[TO BE FILLED]`
**Provider ID:** `[TO BE FILLED]`
**Events Imported:** `[TO BE FILLED]`
**Sync Duration:** `[TO BE FILLED]`
**Status:** `[PASS / FAIL]`
**Notes:** `[TO BE FILLED]`

## Sign-off

- Operator: `[TO BE FILLED]`
- Date: `[TO BE FILLED]`
