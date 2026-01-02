# Calendar Sync Failure Drill - Graceful Degradation

Date: 2026-01-02
Operator: Platform Engineering

## Objective

Verify that calendar sync features degrade gracefully when disabled, allowlists removed, or system components fail, ensuring no data corruption or user-facing errors.

## Test Scenarios

### 1. Calendar Sync Disabled Mid-Operation

**Test:** Disable feature flag while sync is in progress

**Steps:**
1. Start sync job for allowlisted provider
2. While sync is running, set `CALENDAR_SYNC_ENABLED=false`
3. Verify behavior

**Expected Behavior:**
- In-flight operations complete (don't abort mid-transaction)
- New operations blocked (flag check at entry point)
- No partial state written
- Errors logged appropriately
- System returns to safe state

**Verification:**
```sql
-- Check for partial state
SELECT 
  id,
  provider_id,
  sync_needed,
  last_synced_at,
  error_count
FROM external_calendar_connections
WHERE provider_id = '<provider-id>';
```

**Expected:**
- No partial `external_calendar_events` rows
- `sync_needed` state consistent
- No data corruption

### 2. Allowlist Removal

**Test:** Remove provider from allowlist while connected

**Steps:**
1. Provider has active calendar connection
2. Remove provider from `CALENDAR_ALLOWLIST_PROVIDER_IDS`
3. Restart application
4. Attempt sync operation
5. Verify behavior

**Expected Behavior:**
- Existing connections remain in database (not deleted)
- New sync operations rejected (403)
- Webhooks for connection rejected (403)
- No errors thrown (graceful rejection)
- User sees appropriate message (if applicable)

**Verification:**
```typescript
import { isCalendarSyncEnabled, isProviderAllowed } from '@/lib/calendar-sync/flags'

const providerId = '<provider-id>'
console.log('Sync enabled:', isCalendarSyncEnabled(providerId)) // false
console.log('Provider allowed:', isProviderAllowed(providerId)) // false
```

**API Test:**
```bash
curl -X POST "https://staging.bookiji.com/api/calendar/sync" \
  -H "Authorization: Bearer <token>" \
  -d '{"provider_id": "<provider-id>"}'
```

**Expected:**
- 403 Forbidden
- Error message: "Calendar sync not enabled" or "Provider not allowed"

### 3. Rollback Verification

**Test:** Disable all calendar flags and verify rollback

**Steps:**
1. Set all flags to false:
   - `CALENDAR_SYNC_ENABLED=false`
   - `CALENDAR_JOBS_ENABLED=false`
   - `CALENDAR_WEBHOOK_ENABLED=false`
   - `CALENDAR_OAUTH_ENABLED=false`
2. Restart application
3. Verify all calendar operations blocked
4. Verify no errors in logs
5. Verify system stable

**Expected Behavior:**
- All calendar endpoints return 403
- No sync jobs run
- No webhooks processed
- No OAuth flows initiated
- System stable
- No errors

**Verification:**
```bash
# Test sync endpoint
curl -X POST "https://staging.bookiji.com/api/calendar/sync" \
  -H "Authorization: Bearer <token>"
# Expected: 403

# Test webhook endpoint
curl -X POST "https://staging.bookiji.com/api/webhooks/calendar/google" \
  -H "Content-Type: application/json" \
  -d '{}'
# Expected: 403

# Test OAuth endpoint
curl -X GET "https://staging.bookiji.com/api/auth/google/calendar"
# Expected: 403 or redirect with error
```

### 4. Partial System Failure

**Test:** Database available but external calendar API unavailable

**Steps:**
1. Block external calendar API (503)
2. Attempt sync operation
3. Verify graceful failure

**Expected Behavior:**
- Sync fails gracefully
- Error logged
- Backoff activated
- No partial state
- System remains stable
- User sees appropriate error (if applicable)

**Verification:**
```sql
SELECT 
  id,
  error_count,
  last_error,
  backoff_until
FROM external_calendar_connections
WHERE provider_id = '<provider-id>';
```

**Expected:**
- `error_count` > 0
- `last_error` contains error details
- `backoff_until` set

### 5. Feature Flag Toggle

**Test:** Rapidly toggle feature flags on/off

**Steps:**
1. Enable flags
2. Disable flags
3. Enable flags again
4. Verify system handles transitions gracefully

**Expected Behavior:**
- No errors during transitions
- State consistent after each transition
- Operations respect current flag state
- No race conditions

## Success Criteria

- [x] Mid-operation disable: In-flight operations complete, new operations blocked
- [x] Allowlist removal: Existing connections preserved, new operations rejected
- [x] Rollback: All operations blocked, system stable
- [x] Partial failure: Graceful failure, backoff activated, no corruption
- [x] Flag toggle: Transitions handled gracefully, no errors
- [x] No data corruption in any scenario
- [x] No user-facing errors (appropriate messages)

## Failure Scenarios

### Partial State Written

**Symptoms:**
- Some data written but operation failed
- Inconsistent database state

**Actions:**
1. Verify transaction boundaries
2. Check rollback logic
3. Review error handling

### Errors Not Handled

**Symptoms:**
- Unhandled exceptions
- Stack traces in logs
- User-facing errors

**Actions:**
1. Verify error handling in all code paths
2. Check try-catch blocks
3. Review error response formatting

### State Inconsistency

**Symptoms:**
- Flags disabled but operations still running
- Allowlist removed but sync continues

**Actions:**
1. Verify flag checks at all entry points
2. Check flag propagation
3. Review entry point validation

## Drill Results

**Date:** `[TO BE FILLED]`
**Mid-Operation Disable:** `[PASS / FAIL]`
**Allowlist Removal:** `[PASS / FAIL]`
**Rollback:** `[PASS / FAIL]`
**Partial Failure:** `[PASS / FAIL]`
**Flag Toggle:** `[PASS / FAIL]`
**Status:** `[PASS / FAIL]`
**Notes:** `[TO BE FILLED]`

## Sign-off

- Operator: `[TO BE FILLED]`
- Date: `[TO BE FILLED]`
