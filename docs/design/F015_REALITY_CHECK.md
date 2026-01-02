# F-015 Calendar Sync: Reality Check

**Date:** 2026-01-17  
**Feature:** Calendar Sync Foundations (Build Step 1)

## Current Codebase State

### Database Tables
- ❌ **`external_calendar_connections` table does NOT exist in migrations**
  - Referenced in production code: `src/app/api/auth/google/callback/route.ts`, `src/lib/calendar-adapters/google.ts`
  - Code attempts to INSERT/SELECT/DELETE from this table
  - **This will cause runtime errors in production**

- ❌ **No calendar sync state tables exist**
  - No `calendar_sync_status` table (per RECONCILIATION.md, we extend `external_calendar_connections` instead)
  - No `external_calendar_events` table (events mirror for sync state)

### Code References
**Files using `external_calendar_connections`:**
1. `src/app/api/auth/google/callback/route.ts` (line 53)
   - Inserts: `provider`, `provider_user_id`, `provider_email`, `provider_calendar_id`, `access_token`, `refresh_token`, `token_expiry`, `sync_enabled`
   - **Missing `provider_id` field** - needs to be added

2. `src/lib/calendar-adapters/google.ts` (lines 141, 168, 184, 198, 219)
   - SELECT operations
   - UPDATE operations (token refresh)
   - DELETE operations (disconnect)

### Adapter Interface
- ✅ `CalendarAdapter` interface exists in `src/lib/calendar-adapters/types.ts`
- ✅ Has `getFreebusy(start: Date, end: Date)` method
- ❌ No `listFreeBusy` capability (needs to be added as optional)

### Helper Modules
- ❌ No `src/lib/calendar-sync/` directory exists
- ❌ No normalization helpers
- ❌ No checksum helpers

### Tests
- ❌ No calendar sync tests exist
- ❌ No `tests/lib/calendar-sync/` directory

## Design Requirements vs Reality

| Requirement | Design Doc | Current Reality | Action Required |
|------------|------------|-----------------|-----------------|
| `external_calendar_connections` table | Should exist | ❌ Missing | **CREATE** |
| `provider_id` column | Required (RECONCILIATION.md) | ❌ Missing from inserts | **ADD** to migration + fix code |
| Sync state columns | Required | ❌ Missing | **ADD** to migration |
| `external_calendar_events` table | Required (task spec) | ❌ Missing | **CREATE** |
| `listFreeBusy` capability | Required | ❌ Missing | **EXTEND** interface |
| Normalization helpers | Required | ❌ Missing | **CREATE** |
| Checksum helpers | Required | ❌ Missing | **CREATE** |
| Unit tests | Required | ❌ Missing | **CREATE** |

## Reconciliation Compliance

✅ **Table Naming:** Will create `external_calendar_connections` (not `calendar_sync_status`)  
✅ **Column Naming:** Will use `provider_id` (not `vendor_id`)  
✅ **Token Storage:** Will keep plaintext (no encryption in this step)  
✅ **Adapter Extension:** Will extend existing interface (not create parallel)  
⚠️ **Events Table:** Task requires `external_calendar_events` for sync state tracking. This is separate from booking->event mapping (which goes on `bookings` table per RECONCILIATION.md).

## Critical Issues

1. **Missing `provider_id` in callback route:** The callback route inserts into `external_calendar_connections` without `provider_id`. This must be fixed - need to get provider_id from authenticated user.

2. **Table doesn't exist:** All code referencing `external_calendar_connections` will fail at runtime until migration is applied.

3. **No sync state tracking:** Cannot track sync progress, errors, or backoff without sync state columns.

## Implementation Priority

1. **CRITICAL:** Create migration for `external_calendar_connections` table with `provider_id`
2. **CRITICAL:** Fix callback route to include `provider_id` (or document that it needs auth context)
3. **HIGH:** Add sync state columns to `external_calendar_connections`
4. **HIGH:** Create `external_calendar_events` table
5. **MEDIUM:** Extend adapter interface
6. **MEDIUM:** Create helper modules
7. **MEDIUM:** Create unit tests

## Notes

- The callback route uses `GET` but expects JSON body - this may be incorrect (should be POST or use query params)
- Need to determine how to get `provider_id` in callback route (from auth session? from request params?)
- Migration must be idempotent (check if table exists before creating)
