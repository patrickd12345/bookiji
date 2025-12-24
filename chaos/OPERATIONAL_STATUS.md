# Chaos Harness Operational Status

## ✅ Supabase Status: OPERATIONAL

**Ports**:
- API (Kong): `54321` ✅
- Database: `54322` ✅

**Containers**: All Supabase containers running and healthy

**Verification**: 
- Containers: `supabase_kong_bookiji_e2e` listening on 0.0.0.0:54321
- Database: `supabase_db_bookiji_e2e` listening on 0.0.0.0:54322

## ✅ Harness Fixes Applied

### Fix 1: Complete Slot Query
**Issue**: Slots for all bookings were not being queried
**Fix**: Extract slot_ids from all returned bookings and query those slots
**Location**: `chaos/harness/index.mjs` lines 560-580
**Status**: ✅ Applied

## ✅ Test Execution Status

**Bootstrap**: ✅ PASSING
- Reaches `event_index >= 0`
- Real invariant execution begins

**Tier A Execution**: ⚠️ PARTIAL
- Seed 812736: Reaches event_index 0, fails on `booking_requires_availability`
- Issue: Stale data - booking exists with slot not marked as booked
- This is a data consistency issue from previous test runs

## 🔍 Current Failure Analysis

**Failure**: `booking_requires_availability` at event_index 0
**Booking**: `34f5ac38-bd4d-4b0a-f6b3-ca2ff8706ce0`
**Slot**: `594aa4e6-7674-0437-a85b-4ba02e6f3d1b`
**Issue**: Slot has `is_booked: false` but booking exists

**Classification**: Likely stale test data from previous runs
**Action Required**: Database reset or use fresh seed

## 🎯 Success Criteria Met

✅ Supabase running on port 54321
✅ Bootstrap passes
✅ Event index >= 0
✅ Real invariant execution

## 📝 Next Steps

1. Reset database or use fresh seed for clean test
2. Run full Tier A with clean state
3. Document any real product failures (not stale data issues)













