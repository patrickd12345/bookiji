# Tier A Stress Test Results

## Test Configuration
- **Seed**: 812736 (original), 123456 (attempted)
- **Duration**: 60 seconds
- **Max Events**: 600
- **Concurrency**: 4
- **Target URL**: http://host.docker.internal:3000

## Harness Fixes Applied

### Fix 1: Slot Query Completeness (Harness Bug)
**Issue**: The `getState` function was not querying slots for all bookings returned in the state. When bookings were queried by `bookingSlotIds`, their corresponding slots were not included in the slots query, causing invariant failures.

**Fix**: Modified `getState` to merge `bookingSlotIds` into the slots query, ensuring all slots for all bookings in the state are fetched.

**Location**: `chaos/harness/index.mjs` line 529
```javascript
// Merge all slot IDs: event slots + booking slot IDs (to ensure we have slots for all bookings)
const allSlotIds = Array.from(new Set([...slotIds, ...bookingSlotIds]))
```

**Classification**: Harness bug - data query completeness issue

## Test Execution Status

### Attempt 1 (Seed 812736)
- **Status**: FAIL
- **Invariant**: `booking_requires_availability`
- **Event Index**: 0
- **Issue**: Booking existed in state_before but slot was not marked as booked. This was due to the slot query bug above.

### Attempt 2 (Seed 123456)
- **Status**: FAIL (Bootstrap)
- **Error**: `fetch failed`
- **Issue**: Supabase not accessible (test environment issue)

### Attempt 3 (Seed 812736, after fix)
- **Status**: FAIL (Bootstrap)
- **Error**: `fetch failed`
- **Issue**: Supabase not accessible (test environment issue)

## Classification of Initial Failure

### Failure: `booking_requires_availability` at event_index 0

**Details**:
- Booking `82923b29-e538-d47f-bc2c-efb13dac5f97` existed with slot `e6afe7c9-b1ae-0eb7-8de8-f4e6f65015c7`
- Slot was missing from `state_after.slots` array
- Invariant correctly identified missing slot data

**Root Cause**: Harness bug - incomplete slot query
**Classification**: Harness bug (data query completeness)
**Fix Applied**: Yes (merged bookingSlotIds into slots query)

## Next Steps

1. **Test Environment**: Ensure Supabase is running and accessible
2. **Re-run Tier A**: Execute with fixed harness
3. **Document Real Failures**: After harness bugs are resolved, document any real product failures
4. **Proceed to Tier B**: Only after Tier A produces stable results

## Notes

- Bootstrap layer is confirmed working (per user confirmation)
- All bootstrap-related code is frozen (per requirements)
- The slot query fix is a harness data completeness issue, not a product bug
- Test environment needs Supabase instance running for full test execution




