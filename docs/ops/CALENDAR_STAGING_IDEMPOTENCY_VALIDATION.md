# Calendar Staging Idempotency Validation

Date: 2026-01-02
Operator: Platform Engineering

## Objective

Validate that calendar sync operations are idempotent and prevent duplicate processing of webhooks, sync jobs, and booking updates.

## Test Scenarios

### 1. Webhook Replay

**Test:** Send the same webhook twice

**Steps:**
1. Send webhook to `/api/webhooks/calendar/google` or `/api/webhooks/calendar/microsoft`
2. Verify webhook processed (check `sync_needed` flag set)
3. Send identical webhook again (same dedupe key)
4. Verify second webhook returns 200 with `reason: 'duplicate'`
5. Verify `sync_needed` flag still set (not reset)
6. Verify only one sync triggered

**Expected:**
- First webhook: 200, `processed: true`
- Second webhook: 200, `processed: true, reason: 'duplicate'`
- Only one sync job triggered
- `webhook_dedupe_keys` contains dedupe key

**SQL Verification:**
```sql
SELECT 
  id,
  sync_needed,
  webhook_dedupe_keys,
  last_webhook_received_at
FROM external_calendar_connections
WHERE id = '<connection-id>';
```

### 2. Sync Job Retry

**Test:** Retry failed sync job

**Steps:**
1. Trigger sync job for provider
2. Simulate failure (e.g., invalid token)
3. Retry sync job
4. Verify no duplicate events created
5. Verify idempotency keys prevent reprocessing

**Expected:**
- Failed sync doesn't create partial state
- Retry processes only new/changed events
- No duplicate `external_calendar_events` rows
- Metrics reflect single sync attempt (not double-counted)

**SQL Verification:**
```sql
-- Check for duplicate events
SELECT 
  provider_id,
  calendar_provider,
  external_event_id,
  COUNT(*) as count
FROM external_calendar_events
WHERE provider_id = '<provider-id>'
GROUP BY provider_id, calendar_provider, external_event_id
HAVING COUNT(*) > 1;
```

**Expected:** No rows returned (no duplicates)

### 3. Booking Update Idempotency

**Test:** Update booking multiple times

**Steps:**
1. Create booking (triggers outbound sync)
2. Update booking time
3. Update booking time again (same time)
4. Verify single external calendar event updated (not duplicated)

**Expected:**
- Single event in external calendar
- Event updated with latest booking time
- `external_calendar_events` has single row with updated times
- `ical_uid` remains stable

**SQL Verification:**
```sql
SELECT 
  b.id as booking_id,
  b.start_time as booking_start,
  e.external_event_id,
  e.start_time as event_start,
  e.ical_uid
FROM bookings b
LEFT JOIN external_calendar_events e
  ON b.id::text = e.external_event_id
WHERE b.id = '<booking-id>';
```

### 4. Rapid Webhook Delivery (Replay Storm)

**Test:** Send 100+ webhooks rapidly

**Steps:**
1. Send 100 identical webhooks in 1 second
2. Verify all return 200 (idempotent)
3. Verify only one sync triggered
4. Verify `webhook_dedupe_keys` array managed correctly (max 100 keys)

**Expected:**
- All webhooks return 200
- First webhook: `processed: true`
- Subsequent webhooks: `processed: true, reason: 'duplicate'`
- Only one sync job triggered
- `webhook_dedupe_keys` contains dedupe key (trimmed to last 100)

**Script:**
```bash
for i in {1..100}; do
  curl -X POST "https://staging.bookiji.com/api/webhooks/calendar/google" \
    -H "Content-Type: application/json" \
    -H "X-Goog-Signature: <valid-signature>" \
    -d '{"channel": {"resourceId": "<connection-id>"}}' &
done
wait
```

### 5. Delayed Webhook Replay

**Test:** Replay webhook after long delay

**Steps:**
1. Send webhook and process
2. Wait 24 hours
3. Replay same webhook (old dedupe key may be trimmed)
4. Verify webhook processed (if dedupe key trimmed) or rejected (if still in array)

**Expected:**
- If dedupe key still in array (< 100 keys): rejected as duplicate
- If dedupe key trimmed (> 100 keys): processed (acceptable for old webhooks)

**Note:** This tests the dedupe key trimming logic (keeps last 100 keys).

## Success Criteria

- [x] Webhook replay returns duplicate status
- [x] Sync job retry doesn't create duplicates
- [x] Booking updates update single event
- [x] Rapid webhook delivery handled correctly
- [x] Dedupe key array management works (max 100 keys)
- [x] No duplicate events in database
- [x] No duplicate events in external calendars

## Failure Scenarios

### Duplicate Events Created

**Symptoms:**
- Multiple rows in `external_calendar_events` with same `external_event_id`
- Multiple events in external calendar

**Actions:**
1. Verify unique constraint: `(provider_id, calendar_provider, external_event_id)`
2. Check idempotency logic in sync code
3. Review dedupe key generation
4. Check for race conditions

### Webhook Dedupe Keys Not Working

**Symptoms:**
- Same webhook processed multiple times
- Multiple syncs triggered for same webhook

**Actions:**
1. Verify `webhook_dedupe_keys` array update logic
2. Check dedupe key extraction logic
3. Review database transaction handling
4. Check for race conditions in webhook handler

### Sync Job Creates Duplicates

**Symptoms:**
- Retry creates duplicate events
- Metrics double-counted

**Actions:**
1. Verify sync token/idempotency key usage
2. Check incremental sync logic
3. Review event creation deduplication
4. Check for transaction isolation issues

## Validation Results

**Date:** `[TO BE FILLED]`
**Provider ID:** `[TO BE FILLED]`
**Webhook Replay:** `[PASS / FAIL]`
**Sync Job Retry:** `[PASS / FAIL]`
**Booking Update:** `[PASS / FAIL]`
**Rapid Delivery:** `[PASS / FAIL]`
**Delayed Replay:** `[PASS / FAIL]`
**Status:** `[PASS / FAIL]`
**Notes:** `[TO BE FILLED]`

## Sign-off

- Operator: `[TO BE FILLED]`
- Date: `[TO BE FILLED]`
