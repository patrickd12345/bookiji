# BOOKIJI Stress Test Plan
## Production-Grade Adversarial Testing

**Version:** 1.0  
**Date:** 2025-01-27  
**Status:** EXECUTABLE  
**Target:** Production-Ready System Validation

---

## Executive Summary

This document defines a comprehensive stress test plan designed to **BREAK** the BOOKIJI system under real-world adversarial conditions. The plan assumes:

- **Real money** (Stripe test mode)
- **Real partners** (production-grade API contracts)
- **Real failures** (network flakiness, timeouts, crashes)
- **Real humans** (slow responses, delayed actions)

**Goal:** Identify failures, gaps, and blockers **BEFORE** production deployment.

---

## PART 0: SANITY / TESTABILITY CHECK

**Purpose:** Verify system is testable before stress testing.

### Prerequisites

Before executing stress tests, verify:

1. ✅ `GET /v1/vendors/{id}/availability` works
2. ✅ `POST /v1/reservations` works
3. ✅ `GET /v1/reservations/{id}` works
4. ✅ Reservation states are observable
5. ✅ Holds have expiry timestamps
6. ✅ Idempotency keys are supported
7. ✅ Partner API authentication works

### Test Script

```bash
# Run sanity check
bash stress-tests/sanity-check.sh
```

**Expected Output:**
- All endpoints return 200/201
- Reservation states are readable
- Expiry timestamps are present

**BLOCKER if:**
- Any endpoint returns 404/500
- States are not observable
- Expiry timestamps missing

---

## PART 1: POSTMAN / NEWMAN
### API Contract + Idempotency + Concurrency

**Tool:** Postman Collection + Newman CLI  
**Why:** Postman/Newman provides reliable HTTP contract testing with concurrency support via Node.js wrapper.

### Test 1.1: Concurrent Reservation Attempts

**Scenario:** Fire 20 concurrent `POST /v1/reservations` requests:
- Same `vendorId`, `slotStartTime`, `slotEndTime`
- Different `idempotencyKey` values
- Different `requesterId` values

**Expected:**
- Exactly **1** HTTP 201 (success)
- Exactly **19** HTTP 409 CONFLICT (SLOT_HELD or SLOT_ALREADY_RESERVED)
- No other status codes
- No duplicate reservations in database

**Failure Conditions:**
- Multiple 201 responses → **BLOCKER** (double booking possible)
- Wrong error codes → **HIGH** (API contract violation)
- Duplicate reservations → **BLOCKER** (data integrity broken)

**Execution:**
```bash
bash stress-tests/postman/run-concurrent-reservations.sh
```

### Test 1.2: Idempotency Key Replay

**Scenario:** Replay the **SAME** `POST /v1/reservations` request twice:
- Identical payload
- Identical `idempotencyKey`

**Expected:**
- Same `reservationId` returned
- No duplicate holds created
- No duplicate ledger entries
- HTTP 201 on first, 200/201 on second (idempotent)

**Failure Conditions:**
- Different `reservationId` → **BLOCKER** (idempotency broken)
- Duplicate holds → **BLOCKER** (slot locking broken)
- Duplicate payments → **BLOCKER** (money leakage)

**Execution:**
```bash
bash stress-tests/postman/idempotency-replay.sh
```

### Test 1.3: Stale Computed Version

**Scenario:**
1. `GET /v1/vendors/{id}/availability` → Get `computedVersion`
2. Wait 5 seconds
3. `POST /v1/reservations` with stale `computedVersion`

**Expected:**
- HTTP 412 PRECONDITION_FAILED
- Error code: `AVAILABILITY_CHANGED`
- `retryable: true`
- Error includes new `computedVersion`

**Failure Conditions:**
- Request succeeds → **HIGH** (version check broken)
- Wrong error code → **MEDIUM** (API contract violation)
- `retryable: false` → **MEDIUM** (retry logic broken)

**Execution:**
```bash
bash stress-tests/postman/stale-version.sh
```

### Test 1.4: Retry Classification

**Scenario:** Verify error codes are correctly classified as retryable/non-retryable:

| Error Code | HTTP Status | Expected `retryable` |
|------------|-------------|---------------------|
| `SLOT_HELD` | 409 | `false` |
| `AVAILABILITY_CHANGED` | 412 | `true` |
| `RATE_LIMIT_EXCEEDED` | 429 | `true` |
| `INTERNAL_ERROR` | 500 | `true` |
| `INVALID_REQUEST` | 400 | `false` |

**Execution:**
```bash
bash stress-tests/postman/retry-classification.sh
```

### Test 1.5: Authorization Idempotency

**Scenario:** Replay authorization-triggering calls with:
- Same `idempotencyKey`
- Simulated client timeout (request sent but client disconnects)

**Expected:**
- Same external payment object reused
- No double authorization
- No double capture
- Payment intent reused on retry

**Failure Conditions:**
- Double authorization → **BLOCKER** (money leakage)
- Double capture → **BLOCKER** (money leakage)
- Payment intent not reused → **HIGH** (idempotency broken)

**Execution:**
```bash
bash stress-tests/postman/auth-idempotency.sh
```

---

## PART 2: PLAYWRIGHT
### Time, TTL, Human Latency, Race Conditions

**Tool:** Playwright (API-first)  
**Why:** Playwright provides precise time control, waiting, and state observation needed for TTL and timing tests.

### Test 2.1: TTL Boundary Test

**Scenario:**
1. Create reservation (10-minute TTL)
2. Wait until ~30 seconds before `expiresAt`
3. Vendor confirms reservation

**Expected:**
- TTL extended (new `expiresAt` > old `expiresAt`)
- State transitions to `CONFIRMED_BY_VENDOR`
- Hold not lost
- Slot remains held

**Failure Conditions:**
- TTL not extended → **HIGH** (state machine broken)
- Hold lost → **BLOCKER** (slot released prematurely)
- Wrong state transition → **HIGH** (state machine broken)

**Execution:**
```bash
playwright test stress-tests/playwright/vendor-confirmation-delay.spec.ts
```

### Test 2.2: Expiry Test

**Scenario:**
1. Create reservation
2. Take no action
3. Wait past `expiresAt + buffer` (e.g., 1 minute buffer)

**Expected:**
- Reservation transitions to `EXPIRED`
- Slot released (`is_available = true`)
- No funds held
- Webhook event emitted: `reservation.expired`

**Failure Conditions:**
- Reservation not expired → **BLOCKER** (TTL enforcement broken)
- Slot not released → **BLOCKER** (slot permanently blocked)
- Funds still held → **BLOCKER** (money leakage)

**Execution:**
```bash
playwright test stress-tests/playwright/idle-expiry.spec.ts
```

### Test 2.3: Slow Authorization Test

**Scenario:**
1. Reach `CONFIRMED_BY_VENDOR` state
2. Delay requester authorization until just before timeout
3. Complete authorization

**Expected:**
- No premature cancellation
- No early capture
- Deterministic terminal state
- Both authorizations complete

**Failure Conditions:**
- Premature cancellation → **HIGH** (timeout logic broken)
- Early capture → **BLOCKER** (money captured before both auths)
- Indeterminate state → **BLOCKER** (state machine broken)

**Execution:**
```bash
playwright test stress-tests/playwright/requester-auth-delay.spec.ts
```

---

## PART 3: CHAOS / LOAD TESTING
### Volume + Entropy

**Tool:** Node.js chaos runner  
**Why:** Node.js provides fine-grained control over failure injection, seeding, and state observation needed for chaos testing.

### Test 3.1: Volume Reservation Creation

**Scenario:** Create 100 reservation attempts across:
- 10 logical vendors
- 10 logical partners
- Unique time slots (15-minute intervals)

**Expected:**
- All reservations created successfully
- No duplicate slots
- System remains responsive
- No data corruption

**Failure Conditions:**
- Duplicate slots → **BLOCKER** (slot locking broken)
- System degradation → **HIGH** (performance issue)
- Data corruption → **BLOCKER** (integrity broken)

**Execution:**
```bash
node stress-tests/chaos/volume-reservations.mjs
```

### Test 3.2: Chaos Injection (Seeded)

**Scenario:** Inject chaos using seeded RNG (`CHAOS_SEED`):
- Duplicate requests (same `idempotencyKey`)
- Dropped client responses (simulate timeout)
- Delayed webhook delivery (simulate network delay)
- Out-of-order webhook delivery
- Process crash mid-run (simulate worker crash)
- Restart and resume

**Expected:**
- System handles duplicates gracefully
- Dropped responses don't corrupt state
- Delayed webhooks processed correctly
- Out-of-order webhooks handled
- Crash recovery works
- State converges to terminal states

**Failure Conditions:**
- State corruption → **BLOCKER** (integrity broken)
- Duplicate processing → **BLOCKER** (idempotency broken)
- Stuck states → **HIGH** (reconciliation broken)

**Execution:**
```bash
CHAOS_SEED=812736 node stress-tests/chaos/chaos-injection.mjs
```

### Test 3.3: Stripe Failure Simulation

**Scenario:** Simulate Stripe failures:
- Vendor auth fails (insufficient funds)
- Requester auth fails (card declined)
- Capture fails (network timeout)
- Webhook delivery fails (Stripe outage)

**Expected:**
- Failures handled gracefully
- Compensation executed
- No money leaked
- State transitions correct

**Failure Conditions:**
- Money leaked → **BLOCKER** (compensation broken)
- State incorrect → **HIGH** (state machine broken)
- No compensation → **BLOCKER** (failure handling broken)

**Execution:**
```bash
node stress-tests/chaos/stripe-failures.mjs
```

### Test 3.4: Worker Crash Simulation

**Scenario:**
1. Create 50 reservations in progress
2. Simulate worker crash (kill process)
3. Restart system
4. Trigger repair/reconciliation loop

**Expected:**
- All reservations converge to terminal states
- No stuck reservations
- No orphaned payments
- Reconciliation completes

**Failure Conditions:**
- Stuck reservations → **HIGH** (reconciliation broken)
- Orphaned payments → **BLOCKER** (money leakage)
- Reconciliation fails → **HIGH** (repair loop broken)

**Execution:**
```bash
node stress-tests/chaos/worker-crashes.mjs
```

### Test 3.5: Repair Loop Validation

**Scenario:**
1. Create reservations in various states
2. Manually corrupt some states (via database)
3. Trigger repair/reconciliation loop
4. Verify all states converge

**Expected:**
- All reservations converge to terminal states
- No unbounded retries
- Compensation executed where needed
- System stabilizes

**Failure Conditions:**
- Unbounded retries → **HIGH** (retry logic broken)
- No convergence → **BLOCKER** (repair loop broken)
- Compensation not executed → **BLOCKER** (failure handling broken)

**Execution:**
```bash
node stress-tests/chaos/repair-loop.mjs
```

---

## PART 4: FAILURE CHOREOGRAPHY
### Money-Critical Scenarios

**Tool:** Node.js scripts  
**Why:** Node.js provides precise control over failure injection and state observation needed for money-critical tests.

### Test 4.1: Vendor Auth Succeeds → Requester Auth Fails

**Scenario:**
1. Vendor authorization succeeds
2. Requester authorization fails (simulated)

**Expected:**
- Vendor auth voided (PaymentIntent canceled)
- Slot released
- State: `FAILED_REQUESTER_AUTH`
- Partner notified **ONCE**
- No money moved

**Failure Conditions:**
- Vendor auth not voided → **BLOCKER** (compensation broken)
- Slot not released → **BLOCKER** (slot permanently blocked)
- Double notification → **MEDIUM** (notification idempotency broken)
- Money moved → **BLOCKER** (money leakage)

**Execution:**
```bash
node stress-tests/failure-choreography/vendor-success-requester-fail.mjs
```

### Test 4.2: Requester Capture Succeeds → Vendor Capture Fails

**Scenario:**
1. Both authorizations succeed
2. Requester capture succeeds
3. Vendor capture fails (simulated)

**Expected:**
- Requester refunded
- Vendor not charged
- State: `FAILED_COMMIT`
- Compensation executed
- Repair loop converges

**Failure Conditions:**
- Requester not refunded → **BLOCKER** (money leakage)
- Vendor charged → **BLOCKER** (money leakage)
- No compensation → **BLOCKER** (failure handling broken)
- Repair loop doesn't converge → **HIGH** (reconciliation broken)

**Execution:**
```bash
node stress-tests/failure-choreography/requester-success-vendor-fail.mjs
```

### Test 4.3: Both Auths Succeed → Availability Revalidation Fails

**Scenario:**
1. Both authorizations succeed
2. Availability revalidation fails (slot no longer available)

**Expected:**
- Both auths voided
- State: `FAILED_AVAILABILITY_CHANGED`
- No capture
- Slot released

**Failure Conditions:**
- Auths not voided → **BLOCKER** (compensation broken)
- Capture attempted → **BLOCKER** (money leakage)
- Slot not released → **BLOCKER** (slot permanently blocked)

**Execution:**
```bash
node stress-tests/failure-choreography/availability-revalidation-fail.mjs
```

### Test 4.4: Crash Between External Capture and DB Commit

**Scenario:**
1. Both captures succeed in Stripe
2. System crashes before DB commit
3. System restarts
4. Reconciliation runs

**Expected:**
- Reconciliation detects external capture
- Internal state finalized
- Booking created
- No duplicate notifications
- No duplicate captures

**Failure Conditions:**
- Reconciliation doesn't detect capture → **BLOCKER** (reconciliation broken)
- Booking not created → **BLOCKER** (state inconsistency)
- Duplicate notifications → **MEDIUM** (idempotency broken)
- Duplicate captures → **BLOCKER** (money leakage)

**Execution:**
```bash
node stress-tests/failure-choreography/crash-between-capture-commit.mjs
```

---

## PART 5: OBSERVABILITY & FORENSICS

**Tool:** Shell scripts + Node.js  
**Why:** Observability requires direct database queries and API calls to verify system visibility.

### Test 5.1: In-Flight Reservations

**Question:** Can all in-flight reservations be listed?

**Test:**
```bash
bash stress-tests/observability/in-flight-reservations.sh
```

**Expected:**
- Endpoint exists: `GET /api/admin/reservations/in-flight`
- Returns list of non-terminal reservations
- Includes state, expiry, payment state

**BLOCKER if:**
- Endpoint missing
- Incomplete data
- Cannot query by state

### Test 5.2: Stuck Authorizations

**Question:** Can stuck authorizations be identified?

**Test:**
```bash
bash stress-tests/observability/stuck-authorizations.sh
```

**Expected:**
- Can query reservations with:
  - `state IN ('AWAITING_VENDOR_AUTH', 'AWAITING_REQUESTER_AUTH', 'AUTHORIZED_BOTH')`
  - `expiresAt < NOW() - 1 hour`
- Includes payment intent IDs
- Includes last update timestamp

**BLOCKER if:**
- Cannot identify stuck states
- Missing payment intent IDs
- No timestamp data

### Test 5.3: Stripe Reconciliation

**Question:** Can Stripe state be reconciled with Bookiji state?

**Test:**
```bash
node stress-tests/observability/stripe-reconciliation.mjs
```

**Expected:**
- Can query Stripe PaymentIntents
- Can match PaymentIntents to reservations
- Can detect:
  - Orphaned PaymentIntents (no reservation)
  - Missing PaymentIntents (reservation but no intent)
  - Mismatched states

**BLOCKER if:**
- Cannot reconcile states
- Missing Stripe API access
- No reconciliation script

### Test 5.4: Lifecycle Reconstruction

**Question:** Can the full lifecycle of a booking be reconstructed?

**Test:**
```bash
bash stress-tests/observability/lifecycle-reconstruction.sh <reservation-id>
```

**Expected:**
- Can retrieve:
  - Reservation creation timestamp
  - All state transitions
  - Payment events
  - Webhook events
  - Final booking state
- Timeline is complete
- No gaps in history

**BLOCKER if:**
- Missing state history
- Incomplete timeline
- Cannot reconstruct lifecycle

---

## EXECUTION STRATEGY

### Phase 1: Sanity Check
```bash
bash stress-tests/sanity-check.sh
```
**Duration:** 2 minutes  
**Exit if:** Any blocker found

### Phase 2: API Contract Tests (Postman/Newman)
```bash
bash stress-tests/postman/run-all.sh
```
**Duration:** 10 minutes  
**Exit if:** Any blocker found

### Phase 3: Time-Based Tests (Playwright)
```bash
playwright test stress-tests/playwright/
```
**Duration:** 30 minutes (includes waiting for TTL)  
**Exit if:** Any blocker found

### Phase 4: Chaos Tests (Node.js)
```bash
node stress-tests/chaos/run-all.mjs
```
**Duration:** 20 minutes  
**Exit if:** Any blocker found

### Phase 5: Failure Choreography (Node.js)
```bash
node stress-tests/failure-choreography/run-all.mjs
```
**Duration:** 15 minutes  
**Exit if:** Any blocker found

### Phase 6: Observability Validation (Shell/Node.js)
```bash
bash stress-tests/observability/run-all.sh
```
**Duration:** 5 minutes  
**Exit if:** Any blocker found

### Phase 7: Generate Report
```bash
bash stress-tests/generate-report.sh <results-dir>
```
**Duration:** 2 minutes

**Total Duration:** ~84 minutes

---

## SEVERITY CLASSIFICATION

### BLOCKER
- **Definition:** System cannot handle real-world conditions safely
- **Examples:**
  - Double booking possible
  - Money leakage (captured without booking)
  - Slot permanently blocked
  - Payment idempotency broken
- **Action:** **DO NOT LAUNCH** until fixed

### HIGH
- **Definition:** System may fail under stress or edge cases
- **Examples:**
  - Retry logic broken
  - Compensation not executed
  - Performance degradation
  - State machine errors
- **Action:** **FIX BEFORE SCALE** (limited partners OK)

### MEDIUM
- **Definition:** System works but has gaps
- **Examples:**
  - API contract violations
  - Observability gaps
  - Edge case timing issues
- **Action:** **MONITOR CLOSELY** (can launch with monitoring)

### LOW
- **Definition:** Minor issues, non-critical
- **Examples:**
  - Documentation gaps
  - Logging improvements
  - UX issues
- **Action:** **FIX IN NEXT RELEASE**

---

## FINAL VERDICT

After all tests complete, generate verdict:

### SAFE FOR PILOT
- ✅ No blockers
- ✅ < 3 HIGH severity issues
- ✅ All observability tests pass
- ✅ All money-critical tests pass

### SAFE FOR LIMITED PARTNERS
- ✅ No blockers
- ✅ < 5 HIGH severity issues
- ✅ Core observability works
- ✅ Core money-critical tests pass

### NOT SAFE WITHOUT FIXES
- ❌ Any blocker found
- ❌ > 5 HIGH severity issues
- ❌ Critical observability gaps
- ❌ Money-critical failures

---

## REPORT TEMPLATE

See `stress-tests/REPORT_TEMPLATE.md` for detailed report structure.

---

## ENVIRONMENT VARIABLES

All tests require:

```bash
export BOOKIJI_BASE_URL="http://localhost:3000"  # or staging URL
export BOOKIJI_PARTNER_API_KEY="your-partner-api-key"
export BOOKIJI_VENDOR_TEST_ID="test-vendor-id"
export BOOKIJI_SLOT_TEST_ID="test-slot-id"  # Optional
export BOOKIJI_COMPUTED_VERSION=""  # Will be fetched
export BOOKIJI_PARTNER_ID="test-partner-id"
export CHAOS_SEED="812736"  # For reproducible chaos
export STRIPE_SECRET_KEY="sk_test_..."  # For Stripe tests
export NEXT_PUBLIC_SUPABASE_URL="https://..."  # For DB queries
export SUPABASE_SECRET_KEY="..."  # For DB queries
```

---

## NEXT STEPS

1. **Execute all tests** (see Execution Strategy)
2. **Review failures** (see Severity Classification)
3. **Generate report** (see Report Template)
4. **Make verdict** (see Final Verdict)
5. **Fix blockers** before launch
6. **Monitor HIGH issues** closely

---

**Last Updated:** 2025-01-27  
**Status:** READY FOR EXECUTION
