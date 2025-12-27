# Bookings Lifecycle Invariants

## INV-1: Atomic Slot Claim
**Rule**: One availability slot can result in at most one confirmed booking.

**FAIL Condition**: 
- Multiple confirmed bookings for the same slot
- Slot marked unavailable but no booking exists
- Booking exists but slot still marked available

**Allowed Transitions**:
- `slot.available=true` + `booking=none` → `slot.available=false` + `booking=hold_placed` (atomic)
- `booking=hold_placed` → `booking=confirmed` (via webhook only)
- `booking=hold_placed` → `booking=cancelled` (releases slot)

**Enforcement**: Database function `claim_slot_and_create_booking()` with `FOR UPDATE` lock.

---

## INV-2: Payment-Booking Consistency
**Rule**: `confirmed_at IS NOT NULL` → `stripe_payment_intent_id IS NOT NULL` AND payment succeeded.

**FAIL Condition**:
- Booking with `state='confirmed'` but `stripe_payment_intent_id IS NULL`
- Booking with `confirmed_at IS NOT NULL` but `stripe_payment_intent_id IS NULL`
- Booking confirmed without webhook verification

**Allowed Transitions**:
- `hold_placed` (no `confirmed_at`) → `confirmed` (sets `confirmed_at` + requires webhook)
- `hold_placed` → `cancelled` (no `confirmed_at` set)

**Enforcement**: 
- Database CHECK constraint: `confirmed_at IS NOT NULL` → `stripe_payment_intent_id IS NOT NULL`
- Webhook handler is only path to `confirmed` state
- `/api/bookings/confirm` never sets `confirmed_at`

---

## INV-3: No Direct State Transitions
**Rule**: Booking state transitions must go through authoritative state machine.

**FAIL Condition**:
- Direct UPDATE to `bookings.state` bypassing state machine
- Transition from `confirmed` to `hold_placed`
- Transition from `cancelled` to any other state

**Allowed Transitions**:
```
hold_placed → confirmed (webhook only)
hold_placed → cancelled (webhook, expiry, or user action)
confirmed → completed (after service)
confirmed → cancelled (refund)
confirmed → no_show (after slot time)
```

**Enforcement**: 
- Authoritative path: `src/app/api/webhooks/stripe/route.ts` (webhook transitions)
- Runtime assertion in state machine
- Database trigger to log all state changes

---

## INV-4: Slot Release on Cancellation
**Rule**: When booking is cancelled, slot must be released (made available).

**FAIL Condition**:
- Booking `state='cancelled'` but `slot.is_available=false`
- Slot remains unavailable after cancellation

**Allowed Transitions**:
- `booking=cancelled` → `slot.is_available=true` (atomic or immediately after)

**Enforcement**: 
- Database trigger `trg_sync_booking_slot_availability` on booking state change
- Webhook handlers explicitly release slots on cancellation

---

## INV-5: Idempotency for State Changes
**Rule**: Duplicate webhook events must not cause duplicate state transitions.

**FAIL Condition**:
- Same webhook processed twice causes double state change
- Payment processed twice for same booking

**Allowed Behavior**:
- Duplicate webhook → no-op (idempotent)
- Check `payments_outbox.status='committed'` before processing

**Enforcement**: 
- Idempotency check in webhook handler via `payments_outbox` table
- Database unique constraint on `(booking_id, payment_intent_id)`

---

## INV-6: Audit Trail for All State Changes
**Rule**: Every booking state change must be logged to `booking_audit_log`.

**FAIL Condition**:
- State change without corresponding audit log entry
- Missing `actor_type`, `actor_id`, or `timestamp` in audit log

**Allowed Behavior**:
- State change → audit log insert (atomic or immediately after)

**Enforcement**: 
- Database trigger on `bookings.state` changes
- Runtime assertion in state machine functions

---

## INV-7: Hold Expiry Reconciliation
**Rule**: Expired holds (`hold_expires_at < NOW()`) must be cancelled and slot released.

**FAIL Condition**:
- Booking with `state='hold_placed'` and `hold_expires_at < NOW()` still exists
- Expired hold not cancelled within reconciliation window

**Allowed Behavior**:
- Cron job `/api/cron/cancel-expired-holds` cancels expired holds
- Reconciliation runs at least every `hold_timeout_minutes`

**Enforcement**: 
- Cron job must run and process expired holds
- Database query to find expired holds must be efficient



