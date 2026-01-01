# Failure & Compensation Matrix

**Version:** 1.0  
**Last Updated:** 2025-01-27

---

## Overview

This document defines all failure scenarios in the reservation → booking workflow, their compensation actions, and reversibility guarantees.

---

## Failure Scenarios

### Pre-Commit Failures (Steps 1-6)

These failures occur before the atomic commit. All are reversible with no money captured.

#### 1. Reservation Creation Fails

**When:** Step 1-2 fails  
**Causes:**
- Database error
- Invalid input
- Rate limit exceeded
- Vendor not found

**Compensation:** None (no state changed)  
**Reversibility:** N/A  
**Action:** Return error to partner, no cleanup needed

---

#### 2. Vendor Notification Fails

**When:** Step 2 fails  
**Causes:**
- Email service down
- SMS service down
- Webhook delivery failure
- Invalid vendor contact info

**Compensation:**
- Retry notification (exponential backoff)
- Extend TTL by notification retry time
- Log failure for manual follow-up

**Reversibility:** Yes (reservation can be cancelled)  
**Action:** Retry up to 3 times, then mark for manual review

---

#### 3. Vendor Doesn't Confirm

**When:** Step 3 timeout  
**Causes:**
- Vendor doesn't respond within 10 minutes
- Vendor rejects reservation
- Vendor notification not received

**Compensation:**
- Release hold automatically
- Mark reservation as `FAILED_VENDOR_TIMEOUT`
- Emit webhook event to partner
- No payment actions needed

**Reversibility:** Yes (hold released, slot available again)  
**Action:** Automatic expiry handling

---

#### 4. Vendor Authorization Fails

**When:** Step 4 fails  
**Causes:**
- Insufficient funds
- Card declined
- Payment method invalid
- Stripe API error

**Compensation:**
- Release hold
- Mark reservation as `FAILED_VENDOR_AUTH`
- Emit webhook event to partner
- No payment captured

**Reversibility:** Yes (no money moved)  
**Action:** Immediate failure, release hold

---

#### 5. Requester Authorization Fails

**When:** Step 5 fails  
**Causes:**
- Insufficient funds
- Card declined
- Payment method invalid
- Stripe API error

**Compensation:**
- Release vendor authorization (cancel PaymentIntent)
- Release hold
- Mark reservation as `FAILED_REQUESTER_AUTH`
- Emit webhook event to partner

**Reversibility:** Yes (vendor auth released, no money moved)  
**Action:** Cancel vendor PaymentIntent, release hold

---

#### 6. Availability Changed

**When:** Step 6 revalidation fails  
**Causes:**
- Slot booked by another system
- Vendor manually blocked slot
- Calendar updated (busy)
- Business hours changed

**Compensation:**
- Release both authorizations (cancel PaymentIntents)
- Release hold
- Mark reservation as `FAILED_AVAILABILITY_CHANGED`
- Emit webhook event to partner

**Reversibility:** Yes (both auths released, no money moved)  
**Action:** Cancel both PaymentIntents, release hold

---

### Commit Failures (Step 7)

These failures occur during atomic commit. Partial captures require compensation.

#### 7a. Vendor Capture Fails, Requester Succeeds

**When:** Step 7 - vendor capture fails but requester capture succeeds  
**Causes:**
- Vendor PaymentIntent expired
- Vendor account closed
- Stripe API error (vendor capture)
- Network timeout (vendor capture)

**Compensation:**
1. Cancel requester capture (refund)
2. Release vendor authorization (if not captured)
3. Mark reservation as `FAILED_COMMIT`
4. Emit compensation event to partner
5. Log compensation actions

**Reversibility:** Partial (requester refunded, vendor auth released)  
**Action:** Immediate compensation execution

**Compensation Steps:**
```typescript
1. Cancel requester PaymentIntent capture
   - If capture succeeded: Issue refund
   - If capture pending: Cancel capture
2. Cancel vendor PaymentIntent (if not captured)
3. Update reservation state to FAILED_COMMIT
4. Emit webhook: reservation.failed
5. Log compensation actions
```

---

#### 7b. Requester Capture Fails, Vendor Succeeds

**When:** Step 7 - requester capture fails but vendor capture succeeds  
**Causes:**
- Requester PaymentIntent expired
- Requester account closed
- Stripe API error (requester capture)
- Network timeout (requester capture)

**Compensation:**
1. Cancel vendor capture (refund)
2. Release requester authorization (if not captured)
3. Mark reservation as `FAILED_COMMIT`
4. Emit compensation event to partner
5. Log compensation actions

**Reversibility:** Partial (vendor refunded, requester auth released)  
**Action:** Immediate compensation execution

**Compensation Steps:**
```typescript
1. Cancel vendor PaymentIntent capture
   - If capture succeeded: Issue refund
   - If capture pending: Cancel capture
2. Cancel requester PaymentIntent (if not captured)
3. Update reservation state to FAILED_COMMIT
4. Emit webhook: reservation.failed
5. Log compensation actions
```

---

#### 7c. Both Captures Fail

**When:** Step 7 - both captures fail  
**Causes:**
- Both PaymentIntents expired
- Stripe API outage
- Network failure
- Database error during commit

**Compensation:**
1. Release both authorizations (cancel PaymentIntents)
2. Release hold
3. Mark reservation as `FAILED_COMMIT`
4. Emit failure event to partner
5. Log failure

**Reversibility:** Yes (both auths released, no money moved)  
**Action:** Cancel both PaymentIntents, release hold

**Compensation Steps:**
```typescript
1. Cancel vendor PaymentIntent
2. Cancel requester PaymentIntent
3. Release hold
4. Update reservation state to FAILED_COMMIT
5. Emit webhook: reservation.failed
6. Log failure
```

---

## Compensation Execution

### Compensation Orchestrator

The compensation orchestrator executes compensation actions in the correct order:

1. **Identify failure type** (from failure matrix)
2. **Execute compensation actions** (in order)
3. **Verify compensation** (check all actions succeeded)
4. **Update reservation state** (mark as failed)
5. **Emit events** (webhooks, logs)
6. **Alert if needed** (if compensation fails)

### Compensation Actions

#### Release Authorization

```typescript
async function releaseAuthorization(paymentIntentId: string): Promise<Result<void>> {
  try {
    await stripe.paymentIntents.cancel(paymentIntentId)
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error }
  }
}
```

#### Cancel Capture / Refund

```typescript
async function cancelCapture(paymentIntentId: string): Promise<Result<void>> {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    
    if (paymentIntent.status === 'succeeded') {
      // Issue refund
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
      })
    } else if (paymentIntent.status === 'requires_capture') {
      // Cancel capture
      await stripe.paymentIntents.cancel(paymentIntentId)
    }
    
    return { success: true, data: undefined }
  } catch (error) {
    return { success: false, error }
  }
}
```

---

## Retry Logic

### Retryable Failures

- Network errors (ECONNRESET, ETIMEDOUT)
- HTTP 500, 502, 503, 504
- Stripe rate limits
- Transient database errors

### Non-Retryable Failures

- Business rule violations (slot already reserved)
- Invalid input (400 errors)
- Authentication failures (401 errors)
- Payment declines (card declined, insufficient funds)

### Retry Strategy

- **Max Attempts:** 5
- **Initial Delay:** 1 second
- **Max Delay:** 60 seconds
- **Backoff:** Exponential (multiply by 2)
- **Jitter:** ±20%

---

## Reconciliation

### Reconciliation Job

Runs every 5 minutes to handle:
- Expired reservations
- Stale authorizations
- Failed commits requiring compensation
- Orphaned reservations

### Reconciliation Actions

1. **Find expired reservations**
   - State: `AUTHORIZED_BOTH`, `COMMIT_IN_PROGRESS`
   - `expiresAt < NOW()`

2. **Check authorization status**
   - Verify PaymentIntents still valid
   - Check if captures succeeded

3. **Execute compensation if needed**
   - If captures succeeded but booking not created: Create booking
   - If captures failed: Execute compensation
   - If expired: Release auths, mark as EXPIRED

4. **Cleanup stale authorizations**
   - Find authorizations older than 7 days
   - Cancel unused authorizations
   - Mark reservations as EXPIRED

---

## Monitoring & Alerts

### Key Metrics

- **Compensation Rate:** % of reservations requiring compensation
- **Commit Failure Rate:** % of commits that fail
- **Authorization Expiry Rate:** % of authorizations that expire
- **Compensation Success Rate:** % of compensations that succeed

### Alerts

- **High Compensation Rate:** >1% of reservations
- **High Commit Failure Rate:** >5% of commits
- **Compensation Failures:** Any compensation that fails
- **Stale Reservations:** >100 reservations in `AUTHORIZED_BOTH` >1 hour

---

## Testing

### Test Scenarios

1. **Vendor auth fails:** Verify hold released, no money moved
2. **Requester auth fails:** Verify vendor auth released, no money moved
3. **Availability changes:** Verify both auths released, no money moved
4. **Vendor capture fails:** Verify requester refunded, vendor auth released
5. **Requester capture fails:** Verify vendor refunded, requester auth released
6. **Both captures fail:** Verify both auths released, no money moved

### Compensation Testing

- Test each compensation scenario
- Verify all actions execute
- Verify state updates correctly
- Verify events emitted
- Verify logs created

---

## Summary

| Failure Point | Compensation | Reversibility | Money Moved |
|---------------|--------------|---------------|-------------|
| Reservation creation | None | N/A | No |
| Vendor notification | Retry | Yes | No |
| Vendor timeout | Release hold | Yes | No |
| Vendor auth fails | Release hold | Yes | No |
| Requester auth fails | Release vendor auth | Yes | No |
| Availability changed | Release both auths | Yes | No |
| Vendor capture fails | Refund requester | Partial | Yes (refunded) |
| Requester capture fails | Refund vendor | Partial | Yes (refunded) |
| Both captures fail | Release both auths | Yes | No |

**Key Principle:** No money is captured until both authorizations succeed AND availability is revalidated. Any failure before commit is fully reversible.

---

*Document Version: 1.0*  
*Last Updated: 2025-01-27*
