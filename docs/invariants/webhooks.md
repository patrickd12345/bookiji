# Webhooks Invariants

## INV-1: Webhook Signature Verification
**Rule**: All webhook requests must verify signature before processing.

**FAIL Condition**:
- Webhook processed without signature verification
- Invalid signature accepted
- Signature verification bypassed

**Allowed Behavior**:
- Stripe webhook signature verified via `stripe.webhooks.constructEvent()`
- Invalid signature → 401 error, no processing

**Enforcement**: 
- Authoritative path: `src/app/api/webhooks/stripe/route.ts`
- Runtime check: Signature verification before event processing
- Static check: No webhook endpoints without signature verification

---

## INV-2: Webhook Idempotency
**Rule**: Duplicate webhook deliveries must not cause duplicate processing.

**FAIL Condition**:
- Same webhook processed twice causes double booking confirmation
- Payment processed twice for same payment intent

**Allowed Behavior**:
- Check `payments_outbox.status='committed'` before processing
- Duplicate webhook → no-op (idempotent)
- Webhook event ID tracked for idempotency

**Enforcement**: 
- Idempotency check in webhook handler via `payments_outbox` table
- Database unique constraint on `(event_type, event_id)`
- Runtime check before processing webhook event

---

## INV-3: Webhook Only Updates Existing Bookings
**Rule**: Webhooks must only update existing `hold_placed` bookings, never create new bookings.

**FAIL Condition**:
- Webhook creates new booking
- Webhook processes payment for non-existent booking

**Allowed Behavior**:
- Webhook finds existing booking with `stripe_payment_intent_id` and `state='hold_placed'`
- Webhook updates booking state, never creates new booking
- If booking not found → log error, do not process

**Enforcement**: 
- Webhook handler queries existing booking (no INSERT)
- Static check: Webhook handlers do not call booking creation endpoints
- Runtime assertion: Booking must exist before webhook processing

---

## INV-4: Webhook Bypass Kill Switch (Intentional)
**Rule**: Webhooks intentionally bypass kill switches to process in-flight operations.

**FAIL Condition**:
- Webhook blocked by kill switch causes payment to hang
- In-flight payment not processed due to kill switch

**Allowed Behavior**:
- Webhooks bypass `assertSchedulingEnabled()` (intentional)
- Webhooks only update existing holds, never create new bookings
- Kill switch prevents new confirmations, not completion of in-flight payments

**Enforcement**: 
- Webhook handlers do not call `assertSchedulingEnabled()`
- Comment in code explains intentional bypass
- Static check: Webhook handlers skip kill switch checks

---

## INV-5: Webhook Event Ordering
**Rule**: Webhook events must be processed in order or handle out-of-order gracefully.

**FAIL Condition**:
- Out-of-order webhooks cause incorrect state transitions
- Payment failure webhook processed after success webhook

**Allowed Behavior**:
- Webhook handler checks current state before transition
- Invalid transition → log error, no state change
- State machine enforces valid transitions only

**Enforcement**: 
- State machine validates transitions
- Runtime check: Current state must allow transition
- Database constraint: State transitions must be valid

---

## INV-6: Webhook Error Handling
**Rule**: Webhook processing errors must not cause silent failures.

**FAIL Condition**:
- Webhook error not logged
- Webhook error causes payment to hang
- Error response not sent to webhook provider

**Allowed Behavior**:
- Webhook errors logged with full context
- Error response sent to webhook provider (non-200 status)
- Retry mechanism for transient errors

**Enforcement**: 
- Error logging in webhook handlers
- Error response returned to webhook provider
- Monitoring for webhook processing failures

---

## INV-7: Webhook Audit Trail
**Rule**: All webhook events must be logged for audit and debugging.

**FAIL Condition**:
- Webhook processed without audit log entry
- Missing webhook event details in audit log

**Allowed Behavior**:
- Webhook event → audit log insert (before or after processing)
- Audit log includes: `event_type`, `event_id`, `payment_intent_id`, `timestamp`, `status`

**Enforcement**: 
- Audit log insert in webhook handler
- Database audit log table with required fields
- Runtime assertion: Audit log must be created













