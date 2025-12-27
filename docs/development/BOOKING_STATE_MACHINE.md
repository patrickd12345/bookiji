# Booking State Machine

## Overview

Bookiji Scheduling uses a state-based booking system to ensure payment ↔ booking consistency. Bookings transition through states based on payment events and user actions.

## States

### `hold_placed`
- **When**: Booking is created via `/api/bookings/confirm`
- **Payment**: Payment intent verified but not yet confirmed
- **Slot**: Slot is claimed (unavailable)
- **Characteristics**:
  - `confirmed_at` is NULL
  - `stripe_payment_intent_id` is set (verified via Stripe API)
  - `hold_expires_at` is set (for reconciliation)
  - Slot is marked as unavailable

### `confirmed`
- **When**: Stripe webhook `payment_intent.succeeded` is received
- **Payment**: Payment successfully processed
- **Slot**: Slot remains claimed
- **Characteristics**:
  - `confirmed_at` is set (by webhook handler)
  - `stripe_payment_intent_id` is set
  - Cannot transition to `confirmed` without webhook success

### `cancelled`
- **When**: 
  - Payment fails (`payment_intent.payment_failed` webhook)
  - Payment cancelled (`payment_intent.canceled` webhook)
  - Hold expires (reconciliation job)
  - User cancels
- **Payment**: Payment not completed or refunded
- **Slot**: Slot is released (made available)
- **Characteristics**:
  - `cancelled_at` is set
  - `cancelled_reason` explains why
  - Slot availability is restored

## State Transitions

```
[hold_placed] --payment_intent.succeeded--> [confirmed]
[hold_placed] --payment_intent.payment_failed--> [cancelled]
[hold_placed] --payment_intent.canceled--> [cancelled]
[hold_placed] --hold_expires_at < NOW()--> [cancelled] (reconciliation)
```

## Invariants

1. **Payment Consistency**: `confirmed_at IS NOT NULL` → `stripe_payment_intent_id IS NOT NULL`
2. **State Consistency**: `state = 'confirmed'` → `confirmed_at IS NOT NULL` AND `stripe_payment_intent_id IS NOT NULL`
3. **No Direct Confirmation**: Bookings cannot be set to `confirmed` without webhook verification
4. **Idempotent Webhooks**: Duplicate webhooks are handled gracefully (no double processing)

## Database Constraints

- **CHECK constraint**: `confirmed_at IS NOT NULL` → `stripe_payment_intent_id IS NOT NULL`
- **Trigger**: Prevents setting `state = 'confirmed'` or `confirmed_at` without valid payment intent

## Reconciliation

The system includes a reconciliation job (`/api/cron/cancel-expired-holds`) that:
- Finds bookings in `hold_placed` state where `hold_expires_at < NOW()`
- Cancels them and releases their slots
- Logs the cancellation for audit

This prevents slots from being permanently held if payment never completes.

## Payment Intent Verification

When creating a booking hold:
1. Server retrieves payment intent from Stripe API (server-authoritative)
2. Verifies payment intent exists and is in valid state
3. Verifies payment amount matches expected amount
4. Only then creates booking in `hold_placed` state

This prevents fake payment intents from creating bookings.

