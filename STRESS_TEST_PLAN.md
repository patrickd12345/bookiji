# BOOKIJI Stress Test Plan
## Senior SRE / Test Architect / Payments Reliability Engineer

**Date:** 2025-01-27  
**System Under Test:** BOOKIJI Reservation & Booking System  
**Objective:** Break the system under real-world conditions and document failures

---

## Executive Summary

This stress test plan attempts to break the BOOKIJI system through adversarial testing across five critical dimensions:

1. **API & Idempotency Stress** - Concurrent reservations, duplicate requests, retry storms
2. **Time & Human Latency** - TTL expiry, delayed confirmations, authorization timeouts
3. **Chaos & Load Testing** - Volume testing, partial failures, worker crashes
4. **Failure Choreography** - Orchestrated failure scenarios with compensation validation
5. **Observability** - Can we see what's happening? Can we reconcile state?

**Testing Philosophy:** Adversarial, assume real money, assume production load.

---

## PART 1: POSTMAN/NEWMAN - API & IDEMPOTENCY STRESS

### Test 1.1: Concurrent Reservation Attempts
**Tool:** Newman (Postman CLI)  
**Scenario:** Fire 20 concurrent POST /v1/reservations calls with:
- Same `slot_id` (vendor + time range)
- Different `partner_booking_ref` values
- Same `idempotency_key` for some, different for others

**Expected:**
- Exactly 1 success (201)
- 19 failures (409 CONFLICT or SLOT_HELD)

**Failure Criteria:**
- More than 1 success → Double booking vulnerability
- Less than 19 failures → Race condition in slot locking
- Different error codes → Inconsistent error handling

**File:** `stress-tests/postman/concurrent-reservations.postman_collection.json`

---

### Test 1.2: Idempotency Key Replay
**Tool:** Newman  
**Scenario:** Replay the SAME POST /v1/reservations request twice:
- Identical body (including `idempotency_key`)
- Same authentication headers
- Sequential execution (not concurrent)

**Expected:**
- First request: 201 with `reservation_id`
- Second request: 200 with SAME `reservation_id` (or 409 if idempotency not fully implemented)

**Failure Criteria:**
- Different `reservation_id` returned → Idempotency broken
- Duplicate holds created → Idempotency not enforced
- Second request creates new reservation → Idempotency key ignored

**File:** `stress-tests/postman/idempotency-replay.postman_collection.json`

---

### Test 1.3: Retry After Transient Errors
**Tool:** Newman  
**Scenario:** 
1. POST /v1/reservations → Get 412 AVAILABILITY_CHANGED
2. Retry same request immediately
3. POST /v1/reservations → Get 409 SLOT_HELD
4. Retry same request after delay

**Expected:**
- 412 AVAILABILITY_CHANGED → Retryable (should retry)
- 409 SLOT_HELD → Non-retryable (should NOT retry)

**Failure Criteria:**
- Retrying 409 creates duplicate reservation → Retry logic broken
- Not retrying 412 → Missing retryable flag

**File:** `stress-tests/postman/retry-behavior.postman_collection.json`

---

### Test 1.4: Authorization Idempotency
**Tool:** Newman  
**Scenario:** 
1. Create reservation
2. Trigger vendor authorization with same `idempotency_key` twice
3. Trigger requester authorization with same `idempotency_key` twice

**Expected:**
- Same external payment intent reused
- No double authorization
- Idempotency preserved across payment operations

**Failure Criteria:**
- Multiple payment intents created → Idempotency broken
- Double charge → Payment idempotency broken

**File:** `stress-tests/postman/payment-idempotency.postman_collection.json`

---

## PART 2: PLAYWRIGHT - TIME & HUMAN LATENCY

### Test 2.1: Vendor Confirmation Near TTL Expiry
**Tool:** Playwright  
**Scenario:**
1. Create reservation (10-minute TTL)
2. Wait until 30 seconds before expiry
3. Vendor confirms reservation
4. Observe TTL extension and state transition

**Expected:**
- TTL extended after vendor confirmation
- State transitions correctly (HELD → VENDOR_CONFIRMED)
- No premature expiry

**Failure Criteria:**
- Reservation expires despite vendor confirmation → TTL extension broken
- State transition fails → State machine broken
- Slot released prematurely → Hold release logic broken

**File:** `stress-tests/playwright/vendor-confirmation-delay.spec.ts`

---

### Test 2.2: Requester Authorization Near Expiry
**Tool:** Playwright  
**Scenario:**
1. Create reservation
2. Vendor confirms
3. Delay requester authorization until just before authorization expiry
4. Complete authorization

**Expected:**
- No premature cancellation
- No early capture
- Authorization completes successfully

**Failure Criteria:**
- Reservation cancelled before authorization → Expiry logic too aggressive
- Capture happens before authorization → Race condition
- Authorization fails due to timing → Time window too narrow

**File:** `stress-tests/playwright/requester-auth-delay.spec.ts`

---

### Test 2.3: Idle Reservation Expiry
**Tool:** Playwright  
**Scenario:**
1. Create reservation
2. Let it sit idle past:
   - Vendor confirmation timeout (10 minutes)
   - Requester auth timeout (if applicable)
3. Observe automatic expiry

**Expected:**
- Automatic expiry occurs
- Slot released
- No held funds
- State transitions to EXPIRED or FAILED

**Failure Criteria:**
- Reservation never expires → Expiry job broken
- Slot not released → Cleanup broken
- Funds still held → Payment cleanup broken

**File:** `stress-tests/playwright/idle-expiry.spec.ts`

---

## PART 3: CHAOS / LOAD TESTING

### Test 3.1: Volume Reservation Creation
**Tool:** Node.js script (k6 alternative)  
**Scenario:** Create 100 reservations across:
- 10 vendors
- 10 partners
- Random time slots

**Expected:**
- All reservations created successfully
- No duplicate slots
- System remains responsive

**Failure Criteria:**
- Duplicate slots → Slot locking broken
- System degradation → Performance issues
- Data corruption → Database consistency broken

**File:** `stress-tests/chaos/volume-reservations.mjs`

---

### Test 3.2: Stripe Failure Injection
**Tool:** Node.js script  
**Scenario:** Randomly:
- Drop Stripe API responses (simulate network failure)
- Delay webhook deliveries
- Return error responses from Stripe

**Expected:**
- System handles failures gracefully
- Compensation executed correctly
- No money leaked
- No slot permanently blocked

**Failure Criteria:**
- Money captured without booking → Payment consistency broken
- Slot permanently blocked → Cleanup broken
- No compensation → Failure handling broken

**File:** `stress-tests/chaos/stripe-failures.mjs`

---

### Test 3.3: Worker Process Crashes
**Tool:** Node.js script  
**Scenario:**
- Kill worker processes mid-commit
- Restart workers during capture
- Simulate database connection failures

**Expected:**
- System recovers gracefully
- No partial commits
- Compensation executed for partial captures

**Failure Criteria:**
- Partial commits → Atomicity broken
- No recovery → Resilience broken
- Data corruption → Consistency broken

**File:** `stress-tests/chaos/worker-crashes.mjs`

---

### Test 3.4: Repair Loop Validation
**Tool:** Node.js script  
**Scenario:**
1. Create reservations with injected failures
2. Allow system to stabilize
3. Run repair/reconciliation loop
4. Verify final state

**Expected:**
- All bookings converge to terminal states
- No stuck reservations
- No orphaned payments
- All slots released or confirmed

**Failure Criteria:**
- Stuck reservations → Repair loop broken
- Orphaned payments → Reconciliation broken
- Slots not released → Cleanup broken

**File:** `stress-tests/chaos/repair-loop.mjs`

---

## PART 4: FAILURE CHOREOGRAPHY

### Test 4.1: Vendor Auth Succeeds → Requester Auth Fails
**Tool:** Node.js script  
**Scenario:**
1. Create reservation
2. Vendor authorization succeeds
3. Requester authorization fails (simulated)
4. Observe compensation

**Expected:**
- Vendor authorization released
- Hold released
- Reservation marked as FAILED_REQUESTER_AUTH
- No money moved

**Failure Criteria:**
- Vendor auth not released → Compensation broken
- Money captured → Payment consistency broken
- Hold not released → Cleanup broken

**File:** `stress-tests/failure-choreography/vendor-success-requester-fail.mjs`

---

### Test 4.2: Requester Capture Succeeds → Vendor Capture Fails
**Tool:** Node.js script  
**Scenario:**
1. Both authorizations succeed
2. Requester capture succeeds
3. Vendor capture fails (simulated)
4. Observe compensation

**Expected:**
- Requester capture refunded
- Vendor authorization released
- Reservation marked as FAILED_COMMIT
- Compensation event emitted

**Failure Criteria:**
- Requester not refunded → Compensation broken
- Vendor auth not released → Cleanup broken
- No compensation event → Observability broken

**File:** `stress-tests/failure-choreography/requester-success-vendor-fail.mjs`

---

### Test 4.3: Both Auths Succeed → Availability Revalidation Fails
**Tool:** Node.js script  
**Scenario:**
1. Both authorizations succeed
2. Availability revalidation fails (slot booked by another system)
3. Observe compensation

**Expected:**
- Both authorizations released
- Hold released
- Reservation marked as FAILED_AVAILABILITY_CHANGED
- No money moved

**Failure Criteria:**
- Authorizations not released → Compensation broken
- Money captured → Payment consistency broken
- Hold not released → Cleanup broken

**File:** `stress-tests/failure-choreography/availability-revalidation-fail.mjs`

---

### Test 4.4: System Crash Between External Capture and DB Commit
**Tool:** Node.js script  
**Scenario:**
1. Both captures succeed in Stripe
2. System crashes before DB commit
3. System restarts
4. Observe recovery

**Expected:**
- Compensation executed (refunds issued)
- Reservation marked as FAILED_COMMIT
- No orphaned payments
- No double booking

**Failure Criteria:**
- No compensation → Recovery broken
- Orphaned payments → Consistency broken
- Double booking → Atomicity broken

**File:** `stress-tests/failure-choreography/crash-between-capture-commit.mjs`

---

## PART 5: OBSERVABILITY CHECK

### Test 5.1: List All In-Flight Reservations
**Tool:** curl / API calls  
**Question:** Can we list all in-flight reservations?

**Expected:**
- API endpoint exists: GET /api/admin/reservations?state=HELD,VENDOR_CONFIRMED,AUTHORIZED_BOTH
- Returns list of reservations
- Includes state, timestamps, expiry times

**Failure Criteria:**
- No endpoint → Observability gap
- Incomplete data → Missing fields
- Performance issues → Not scalable

**File:** `stress-tests/observability/in-flight-reservations.sh`

---

### Test 5.2: Identify Stuck Authorizations
**Tool:** curl / API calls  
**Question:** Can we identify stuck authorizations?

**Expected:**
- Query for reservations in AUTHORIZED_BOTH state > 1 hour
- List payment intents that are authorized but not captured
- Identify reservations past expiry

**Failure Criteria:**
- No query capability → Observability gap
- Cannot identify stuck state → Missing metrics
- No alerting → Operational gap

**File:** `stress-tests/observability/stuck-authorizations.sh`

---

### Test 5.3: Reconcile Stripe State vs Bookiji State
**Tool:** Node.js script  
**Question:** Can we reconcile Stripe state vs Bookiji state?

**Expected:**
- Script that queries Stripe for payment intents
- Compares with Bookiji reservations
- Identifies discrepancies:
  - Payment intent exists but no reservation
  - Reservation exists but no payment intent
  - Payment intent captured but reservation not confirmed

**Failure Criteria:**
- No reconciliation script → Observability gap
- Cannot identify discrepancies → Missing tooling
- Manual process only → Not scalable

**File:** `stress-tests/observability/stripe-reconciliation.mjs`

---

### Test 5.4: Reconstruct Full Lifecycle of a Booking
**Tool:** Database queries / API calls  
**Question:** Can we reconstruct the full lifecycle of a booking?

**Expected:**
- State transition log available
- Payment events logged
- Webhook events logged
- Timeline reconstruction possible

**Failure Criteria:**
- Missing state transitions → Audit trail incomplete
- Missing payment events → Payment history incomplete
- Cannot reconstruct timeline → Forensics impossible

**File:** `stress-tests/observability/lifecycle-reconstruction.sh`

---

## EXECUTION PLAN

### Prerequisites
1. **Environment Setup:**
   ```bash
   export BASE_URL=http://localhost:3000  # or staging URL
   export PARTNER_API_KEY=<test-partner-key>
   export STRIPE_SECRET_KEY=<test-stripe-key>
   ```

2. **Test Data:**
   - 10 test vendors
   - 10 test partners
   - Test payment methods (Stripe test cards)

3. **Tools Installation:**
   ```bash
   npm install -g newman  # Postman CLI
   pnpm install  # Project dependencies
   ```

### Execution Order
1. **PART 1** - API & Idempotency (Postman/Newman)
2. **PART 2** - Time & Latency (Playwright)
3. **PART 3** - Chaos & Load (Node.js/k6)
4. **PART 4** - Failure Choreography (Node.js)
5. **PART 5** - Observability (curl/scripts)

### Expected Duration
- Part 1: 30 minutes
- Part 2: 45 minutes
- Part 3: 60 minutes
- Part 4: 45 minutes
- Part 5: 30 minutes
- **Total: ~3.5 hours**

---

## OUTPUT FORMAT

### Test Results Summary
For each test:
- **Test ID:** e.g., `1.1`
- **Tool Used:** e.g., `Newman`
- **Status:** `PASS` | `FAIL` | `ERROR`
- **Failures Found:** List of specific failures
- **Severity:** `CRITICAL` | `HIGH` | `MEDIUM` | `LOW`
- **Evidence:** Screenshots, logs, API responses

### Final Verdict
- **SAFE FOR PILOT** - All tests pass, system ready for limited pilot
- **SAFE FOR LIMITED PARTNERS** - Minor issues found, acceptable for limited rollout
- **NOT SAFE** - Critical failures found, system not ready for production

---

## RISK ASSESSMENT

### Critical Risks (Block Launch)
- Double booking possible
- Money leakage (captured without booking)
- Slot permanently blocked
- Payment idempotency broken

### High Risks (Require Fix Before Scale)
- Retry logic broken
- Compensation not executed
- Observability gaps
- Performance degradation under load

### Medium Risks (Monitor Closely)
- Edge case timing issues
- Partial failure handling
- Reconciliation gaps

---

## NEXT STEPS AFTER TESTING

1. **Document all failures** with severity and evidence
2. **Prioritize fixes** based on severity
3. **Re-run tests** after fixes
4. **Update invariants** if new failure modes discovered
5. **Create runbook** for production incidents based on test findings

---

**Document Version:** 1.0  
**Last Updated:** 2025-01-27  
**Author:** Senior SRE / Test Architect / Payments Reliability Engineer
