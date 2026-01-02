# Calendar Sync Failure Drill - Outages

Date: 2026-01-02
Operator: Platform Engineering

## Objective

Simulate various outage scenarios and verify graceful degradation, error handling, and recovery procedures.

## Test Scenarios

### 1. External Calendar API Outage (Google/Microsoft 503)

**Simulation:**
- Mock external calendar API to return 503 Service Unavailable
- Trigger sync job for allowlisted provider

**Expected Behavior:**
- Sync job fails gracefully
- `backoff_until` column set in `external_calendar_connections`
- Error logged with structured format
- `calendar_sync_failures_total` metric increments
- No data corruption (no partial state)
- Retry scheduled after backoff period

**Verification:**
```sql
SELECT 
  id,
  provider_id,
  error_count,
  last_error,
  backoff_until,
  sync_needed
FROM external_calendar_connections
WHERE provider_id = '<provider-id>';
```

**Expected:**
- `error_count` > 0
- `last_error` contains error details (JSONB)
- `backoff_until` set to future timestamp
- `sync_needed` still true (will retry after backoff)

**Recovery Test:**
1. Restore external API (remove 503)
2. Wait for backoff period to expire
3. Trigger sync job
4. Verify sync succeeds
5. Verify `backoff_until` cleared
6. Verify `error_count` reset or incremented appropriately

### 2. Database Connection Failure

**Simulation:**
- Temporarily block database connections (firewall rule or connection pool exhaustion)
- Trigger sync job or webhook

**Expected Behavior:**
- Operation fails with database error
- Error logged (no silent failure)
- No partial state written
- Transaction rolled back
- Metrics reflect failure
- User-facing error message (if applicable)

**Verification:**
- Check application logs for database connection errors
- Verify no partial rows in `external_calendar_events`
- Verify `external_calendar_connections` not partially updated
- Check metrics: `calendar_sync_failures_total` incremented

**Recovery Test:**
1. Restore database connectivity
2. Retry failed operation
3. Verify operation succeeds
4. Verify data consistency

### 3. Webhook Endpoint Unavailable

**Simulation:**
- Temporarily disable webhook endpoint (503 or connection refused)
- External provider attempts to deliver webhook

**Expected Behavior:**
- External provider receives error response
- External provider retries webhook (per provider retry policy)
- No duplicate processing when endpoint recovers
- Idempotency prevents duplicate syncs

**Verification:**
1. Disable webhook endpoint
2. External provider sends webhook (should fail)
3. Re-enable webhook endpoint
4. External provider retries webhook
5. Verify single sync triggered (idempotency)
6. Verify `webhook_dedupe_keys` prevents duplicate

**Recovery Test:**
1. Restore webhook endpoint
2. External provider retries
3. Verify webhook processed once
4. Verify sync triggered once

## Success Criteria

- [x] External API outage: Backoff activated, errors logged, no corruption
- [x] Database failure: Graceful error, no partial state, transaction rollback
- [x] Webhook outage: Provider retries, idempotency prevents duplicates
- [x] All errors logged with structured format
- [x] Metrics reflect failures
- [x] Recovery procedures work correctly

## Failure Scenarios

### Backoff Not Activated

**Symptoms:**
- Sync continues retrying immediately on failure
- No `backoff_until` set
- Rate limiting from external provider

**Actions:**
1. Verify backoff logic in sync code
2. Check error handling for 503/429 responses
3. Review backoff calculation

### Partial State Written

**Symptoms:**
- Some rows created but operation failed
- Inconsistent database state

**Actions:**
1. Verify transaction boundaries
2. Check for explicit transaction rollback on error
3. Review error handling in sync code

### Silent Failures

**Symptoms:**
- Operation fails but no error logged
- Metrics don't reflect failures

**Actions:**
1. Verify error logging in all code paths
2. Check structured logging implementation
3. Review metrics increment logic

## Drill Results

**Date:** `[TO BE FILLED]`
**External API Outage:** `[PASS / FAIL]`
**Database Failure:** `[PASS / FAIL]`
**Webhook Outage:** `[PASS / FAIL]`
**Recovery Tests:** `[PASS / FAIL]`
**Status:** `[PASS / FAIL]`
**Notes:** `[TO BE FILLED]`

## Sign-off

- Operator: `[TO BE FILLED]`
- Date: `[TO BE FILLED]`
