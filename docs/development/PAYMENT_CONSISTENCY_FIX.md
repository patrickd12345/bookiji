# Payment ↔ Booking Consistency Fix

## Problem

SimCity Phase 2 revealed a critical violation:
- **Confirmed bookings can exist without a corresponding verified Stripe PaymentIntent**
- This violates the invariant: "A confirmed booking and payment decision are never out of sync"

## Root Causes Identified

1. **Booking confirm endpoint set `confirmed_at` immediately** - should only be set by webhook
2. **Payment intent not verified server-side** - client could provide fake payment intent IDs
3. **No database constraints** - database allowed confirmed bookings without payment intent
4. **Slots not released on payment failure** - failed payments left slots permanently held
5. **No reconciliation for expired holds** - holds could expire without cleanup

## Fixes Implemented

### 1. Booking Confirm Endpoint (`src/app/api/bookings/confirm/route.ts`)

**Changes:**
- Removed `confirmed_at` from booking creation
- Added server-side Stripe API verification of payment intent
- Validates payment intent exists, is in valid state, and amount matches
- Returns explicit error codes: `INVALID_PAYMENT_INTENT`, `INVALID_PAYMENT_INTENT_STATE`, `PAYMENT_AMOUNT_MISMATCH`
- Sets `hold_expires_at` for reconciliation

**State:** Booking created in `hold_placed` state, not `confirmed`

### 2. Webhook Handler (`src/app/api/webhooks/stripe/route.ts`)

**Changes:**
- Payment success: Transitions `hold_placed` → `confirmed` and sets `confirmed_at`
- Payment failure: Transitions `hold_placed` → `cancelled` and releases slot
- Payment cancellation: Transitions `hold_placed` → `cancelled` and releases slot
- Added state guard: `.eq('state', 'hold_placed')` to prevent invalid transitions
- Handles quote-based bookings (gets time from quote if not on booking)

**State Machine:** Only webhook can set `confirmed_at` and transition to `confirmed`

### 3. Database Constraints (`supabase/migrations/20251226235710_enforce_payment_booking_consistency.sql`)

**Added:**
- CHECK constraint: `confirmed_at IS NOT NULL` → `stripe_payment_intent_id IS NOT NULL`
- Trigger: Prevents setting `state = 'confirmed'` or `confirmed_at` without valid payment intent
- Function: `cancel_expired_holds()` for reconciliation

**Protection:** Database-level enforcement of payment consistency

### 4. Reconciliation Job (`src/app/api/cron/cancel-expired-holds/route.ts`)

**Purpose:** Cancel expired holds and release slots

**Functionality:**
- Finds bookings in `hold_placed` state where `hold_expires_at < NOW()`
- Cancels them and releases associated slots
- Logs cancellations for audit

**Usage:** Call periodically via cron (e.g., Vercel Cron Jobs)

### 5. Tests (`tests/api/payments.booking-consistency.spec.ts`)

**Coverage:**
- Cannot create booking hold with fake payment intent
- Cannot end in confirmed state without webhook success
- Duplicate webhooks are idempotent

## State Machine

See `docs/development/BOOKING_STATE_MACHINE.md` for complete state machine documentation.

**Key States:**
- `hold_placed`: Booking created, payment intent verified but not confirmed
- `confirmed`: Payment succeeded (webhook only)
- `cancelled`: Payment failed/cancelled or hold expired

## Migration Required

Run the migration to apply database constraints:
```bash
supabase db push
```

This will:
- Add `hold_expires_at` column if missing
- Add CHECK constraint for payment consistency
- Add trigger to prevent unverified confirmations
- Create reconciliation function

## Verification

After applying fixes, rerun SimCity Phase 2:
```bash
pnpm exec tsx scripts/adversarial-certification.ts
```

**Expected Result:** Phase 2 should PASS (no new violations)

**Note:** Existing violations in database from before the fix will still be detected. These should be cleaned up separately.

## Next Steps

1. Apply migration: `supabase db push`
2. Rerun SimCity Phase 2 to verify fixes
3. Clean up any existing violations in database
4. Set up cron job for reconciliation endpoint
5. Monitor for any new violations

