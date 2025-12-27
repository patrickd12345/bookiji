# Time & Scheduling Logic Invariants

## INV-1: No Past Bookings
**Rule**: Booking `start_time` must be strictly in the future (`start_time > NOW()`).

**FAIL Condition**:
- Booking created with `start_time <= NOW()`
- Booking `start_time` in the past

**Allowed Behavior**:
- Booking `start_time > NOW()` (strict, server time)
- Past bookings rejected with 400 error

**Enforcement**: 
- Database CHECK constraint: `start_time > created_at`
- Runtime check in booking creation: `start_time > NOW()`
- Migration: `20251225150656_enforce_no_past_booking.sql`
- Atomic function `claim_slot_and_create_booking()` validates time

---

## INV-2: Timezone Consistency
**Rule**: All time comparisons must use server timezone (UTC) as source of truth.

**FAIL Condition**:
- Client timezone used for time validation
- Timezone mismatch between client and server
- DST transitions cause time ambiguity

**Allowed Behavior**:
- All timestamps stored as `TIMESTAMPTZ` (UTC)
- Server uses `NOW()` for time comparisons
- Client time only used for display, not validation

**Enforcement**: 
- Database functions use `NOW()` (server time)
- Runtime checks use `new Date()` (server time)
- No client-provided time used for validation

---

## INV-3: Slot Time Boundaries
**Rule**: Booking `start_time` and `end_time` must match slot boundaries.

**FAIL Condition**:
- Booking `start_time` != slot `start_time`
- Booking `end_time` != slot `end_time`
- Booking time range outside slot time range

**Allowed Behavior**:
- Booking created from slot inherits slot's `start_time` and `end_time`
- No partial slot bookings

**Enforcement**: 
- Atomic function `claim_slot_and_create_booking()` uses slot times
- Database constraint: Booking times must match slot times

---

## INV-4: No Time Travel
**Rule**: System clock cannot be manipulated to create past bookings.

**FAIL Condition**:
- Server clock set backwards allows past bookings
- Time validation bypassed by clock manipulation

**Allowed Behavior**:
- All time checks use database `NOW()` (server time, not client time)
- Clock skew detection and rejection

**Enforcement**: 
- Database functions use `NOW()` (cannot be manipulated by client)
- Runtime checks use server time, not client-provided time
- Clock skew detection in booking creation

---

## INV-5: Hold Expiry Time Consistency
**Rule**: `hold_expires_at` must be set when booking is in `hold_placed` state.

**FAIL Condition**:
- Booking `state='hold_placed'` but `hold_expires_at IS NULL`
- `hold_expires_at` in the past when booking is still `hold_placed`

**Allowed Behavior**:
- Booking `hold_placed` → `hold_expires_at = NOW() + hold_timeout_minutes`
- Expired holds (`hold_expires_at < NOW()`) must be cancelled

**Enforcement**: 
- Database CHECK constraint: `state='hold_placed'` → `hold_expires_at IS NOT NULL`
- Cron job cancels expired holds
- Reconciliation query finds expired holds

---

## INV-6: Time Range Validation
**Rule**: Booking `end_time` must be after `start_time`.

**FAIL Condition**:
- Booking with `end_time <= start_time`
- Invalid time range

**Allowed Behavior**:
- `end_time > start_time` (strict)
- Time range validation in booking creation

**Enforcement**: 
- Database CHECK constraint: `end_time > start_time`
- Runtime validation in booking endpoints

---

## INV-7: DST Transition Handling
**Rule**: System must handle DST transitions without time ambiguity.

**FAIL Condition**:
- DST transition causes duplicate or missing time slots
- Time calculations fail during DST transitions

**Allowed Behavior**:
- All timestamps stored as UTC (no DST issues)
- Time calculations use UTC throughout

**Enforcement**: 
- Database uses `TIMESTAMPTZ` (timezone-aware)
- All time operations use UTC
- No local timezone conversions in critical paths



