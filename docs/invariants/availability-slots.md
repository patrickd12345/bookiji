# Availability & Slots Invariants

## INV-1: Atomic Slot Claim
**Rule**: Slot availability flip and booking creation must be atomic.

**FAIL Condition**:
- Slot marked unavailable but booking not created
- Booking created but slot still available
- Race condition: two bookings for same slot

**Allowed Behavior**:
- `claim_slot_and_create_booking()` function uses `FOR UPDATE` lock
- Atomic transaction: slot update + booking insert

**Enforcement**: 
- Authoritative path: Database function `claim_slot_and_create_booking()`
- No direct updates to `availability_slots.is_available` outside this function
- Database constraint: Unique constraint on `(provider_id, start_time, end_time)`

---

## INV-2: Slot-Booking Consistency
**Rule**: `availability_slots.is_available` must match booking state.

**FAIL Condition**:
- Slot `is_available=true` but active booking exists
- Slot `is_available=false` but no booking exists

**Allowed Behavior**:
- Booking `state IN ('hold_placed', 'confirmed', 'completed')` → slot `is_available=false`
- Booking `state='cancelled'` → slot `is_available=true`
- No booking → slot `is_available=true`

**Enforcement**: 
- Database trigger `trg_sync_booking_slot_availability` on booking state changes
- Reconciliation query to find inconsistencies

---

## INV-3: No Overlapping Slots
**Rule**: Provider cannot have overlapping availability slots.

**FAIL Condition**:
- Two slots with overlapping `(start_time, end_time)` for same provider
- Slot created that overlaps with existing slot

**Allowed Behavior**:
- Slots must have non-overlapping time ranges
- Slot creation checks for overlaps before insert

**Enforcement**: 
- Database exclusion constraint using `btree_gist` extension
- Runtime check in slot creation endpoints

---

## INV-4: No Past Slots
**Rule**: Availability slots cannot be created in the past.

**FAIL Condition**:
- Slot with `start_time <= NOW()`
- Slot created with past timestamp

**Allowed Behavior**:
- Slot `start_time > NOW()` (strict)
- Past slots automatically marked unavailable or deleted

**Enforcement**: 
- Database CHECK constraint: `start_time > created_at`
- Runtime check in slot creation: `start_time > NOW()`
- Migration: `20251225150656_enforce_no_past_booking.sql`

---

## INV-5: Slot Release on Booking Cancellation
**Rule**: When booking is cancelled, slot must be released immediately.

**FAIL Condition**:
- Booking cancelled but slot remains unavailable
- Slot not released within cancellation transaction

**Allowed Behavior**:
- Booking `state='cancelled'` → slot `is_available=true` (atomic or immediately after)
- Trigger or explicit update in cancellation handler

**Enforcement**: 
- Database trigger on booking state change
- Webhook handlers explicitly release slots
- Reconciliation query to find cancelled bookings with unavailable slots

---

## INV-6: No Slot Creation Without Provider
**Rule**: Availability slot cannot exist without valid provider.

**FAIL Condition**:
- Slot with `provider_id` that doesn't exist in `profiles`
- Slot with `provider_id IS NULL`

**Allowed Behavior**:
- Slot `provider_id` must reference existing `profiles.id`
- Foreign key constraint enforces referential integrity

**Enforcement**: 
- Database foreign key: `availability_slots.provider_id REFERENCES profiles.id`
- Runtime check in slot creation endpoints

---

## INV-7: Slot Generation Idempotency
**Rule**: Availability slot generation must be idempotent (no duplicate slots).

**FAIL Condition**:
- Same slot created multiple times
- Duplicate slots for same provider and time range

**Allowed Behavior**:
- Slot generation deletes existing future slots before creating new ones
- Unique constraint prevents duplicates

**Enforcement**: 
- Authoritative path: `src/app/api/availability/generate/route.ts`
- Database unique constraint on `(provider_id, start_time, end_time)`
- Idempotency check in generation logic











