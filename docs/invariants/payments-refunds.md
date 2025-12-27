# Payments & Refunds Invariants

## INV-1: Payment Intent Verification
**Rule**: Server must verify `stripe_payment_intent_id` via Stripe API before creating booking.

**FAIL Condition**:
- Booking created with unverified `stripe_payment_intent_id`
- Client-provided payment intent accepted without server verification
- Fake or non-existent payment intent used

**Allowed Behavior**:
- `/api/bookings/confirm` verifies payment intent via Stripe API
- Payment intent must exist, be in correct state, and match expected amount
- Verification failure → 400 error, no booking created

**Enforcement**: 
- Authoritative path: `src/app/api/bookings/confirm/route.ts` (server-side verification)
- Static check: No other endpoints accept `stripe_payment_intent_id` without verification

---

## INV-2: No Payment Without Booking
**Rule**: Payment intent cannot be processed to `succeeded` without corresponding booking in `hold_placed` state.

**FAIL Condition**:
- Webhook `payment_intent.succeeded` for payment intent with no booking
- Payment succeeds but booking never created

**Allowed Behavior**:
- Webhook handler finds booking with `stripe_payment_intent_id` and `state='hold_placed'`
- If booking not found → log error, do not process payment

**Enforcement**: 
- Webhook handler checks booking exists before processing
- Database constraint: `bookings.stripe_payment_intent_id` must be unique

---

## INV-3: Refund Consistency
**Rule**: Refund can only be processed for bookings with `state IN ('confirmed', 'completed')` and valid payment intent.

**FAIL Condition**:
- Refund processed for booking without payment intent
- Refund processed for `hold_placed` booking (payment not yet captured)
- Refund amount exceeds original payment amount

**Allowed Behavior**:
- Refund only for `confirmed` or `completed` bookings
- Refund amount ≤ original payment amount
- Refund status tracked in `bookings.refund_status`

**Enforcement**: 
- Authoritative path: `src/lib/services/refundService.ts`
- Runtime check: Booking state and payment intent validation
- Database constraint: `refund_amount_cents <= price_cents`

---

## INV-4: Idempotent Refund Processing
**Rule**: Duplicate refund requests must not cause double refunds.

**FAIL Condition**:
- Same refund processed twice
- Refund status `completed` but refund attempted again

**Allowed Behavior**:
- Check `refund_status='completed'` before processing
- Idempotency key used for Stripe refund API

**Enforcement**: 
- Idempotency check in `processRefund()` function
- Database constraint: `refund_transaction_id` must be unique per booking

---

## INV-5: Payment Outbox Consistency
**Rule**: All payment events must be recorded in `payments_outbox` before processing.

**FAIL Condition**:
- Payment processed without outbox entry
- Outbox entry missing `event_type` or `event_data`

**Allowed Behavior**:
- Payment event → outbox insert → processing
- Outbox status: `pending` → `committed` (on success) or `failed` (on error)

**Enforcement**: 
- Authoritative path: All payment handlers insert to outbox
- Database constraint: `payments_outbox.event_type` must be non-null

---

## INV-6: Webhook Idempotency
**Rule**: Duplicate webhook deliveries must not cause duplicate payment processing.

**FAIL Condition**:
- Same webhook processed twice causes double booking confirmation
- Payment processed twice for same payment intent

**Allowed Behavior**:
- Check `payments_outbox.status='committed'` before processing
- Webhook signature verification ensures authenticity

**Enforcement**: 
- Idempotency check in webhook handler via `payments_outbox` table
- Stripe webhook signature verification

---

## INV-7: No Orphan Payments
**Rule**: Payment intent cannot exist in Stripe without corresponding booking or outbox entry.

**FAIL Condition**:
- Payment intent in Stripe but no booking record
- Payment intent processed but no outbox entry

**Allowed Behavior**:
- Payment intent creation → booking creation (atomic or transactional)
- Payment intent processing → outbox entry creation

**Enforcement**: 
- Reconciliation script checks for orphan payments
- Database query to find payment intents without bookings

