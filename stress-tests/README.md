# BOOKIJI Stress Test Suite

Comprehensive adversarial stress testing suite designed to break the BOOKIJI system under real-world conditions.

## Overview

This test suite covers five critical dimensions:

1. **API & Idempotency Stress** - Concurrent reservations, duplicate requests, retry storms
2. **Time & Human Latency** - TTL expiry, delayed confirmations, authorization timeouts
3. **Chaos & Load Testing** - Volume testing, partial failures, worker crashes
4. **Failure Choreography** - Orchestrated failure scenarios with compensation validation
5. **Observability** - System visibility and reconciliation capabilities

## Prerequisites

### Required Tools
- `bash` (for shell scripts)
- `curl` (for API tests)
- `node` (for Node.js scripts)
- `playwright` (for browser-based tests) - Optional
- `jq` (for JSON parsing) - Optional but recommended

### Required Environment Variables

```bash
export BASE_URL="http://localhost:3000"  # or staging URL
export PARTNER_API_KEY="your-partner-api-key"
export VENDOR_ID="test-vendor-id"
export REQUESTER_ID="test-requester-id"
export STRIPE_SECRET_KEY="sk_test_..."  # For payment tests
export ADMIN_TOKEN="admin-token"  # For admin endpoints
export NEXT_PUBLIC_SUPABASE_URL="https://..."  # For database queries
export SUPABASE_SECRET_KEY="..."  # For database queries
```

## Quick Start

### Run All Tests

```bash
bash stress-tests/run-all-tests.sh
```

This will:
1. Execute all test suites
2. Save results to `stress-test-results-YYYYMMDD-HHMMSS/`
3. Generate logs for each test

### Generate Report

```bash
bash stress-tests/generate-report.sh <report-directory>
```

## Test Structure

### PART 1: Postman/Newman Tests

**Location:** `stress-tests/postman/`

- `run-concurrent-reservations.sh` - 20 concurrent reservation attempts
- `idempotency-replay.sh` - Test idempotency key replay

**Run individually:**
```bash
bash stress-tests/postman/run-concurrent-reservations.sh
bash stress-tests/postman/idempotency-replay.sh
```

### PART 2: Playwright Tests

**Location:** `stress-tests/playwright/`

- `vendor-confirmation-delay.spec.ts` - Vendor confirms near TTL expiry
- `requester-auth-delay.spec.ts` - Requester authorizes near expiry
- `idle-expiry.spec.ts` - Automatic expiry of idle reservations

**Run individually:**
```bash
playwright test stress-tests/playwright/vendor-confirmation-delay.spec.ts
playwright test stress-tests/playwright/requester-auth-delay.spec.ts
playwright test stress-tests/playwright/idle-expiry.spec.ts
```

### PART 3: Chaos/Load Testing

**Location:** `stress-tests/chaos/`

- `volume-reservations.mjs` - Create 100 reservations across 10 vendors/partners
- `stripe-failures.mjs` - Inject Stripe failures (requires mocking)
- `worker-crashes.mjs` - Simulate worker crashes
- `repair-loop.mjs` - Test repair/reconciliation loop

**Run individually:**
```bash
node stress-tests/chaos/volume-reservations.mjs
node stress-tests/chaos/stripe-failures.mjs
node stress-tests/chaos/worker-crashes.mjs
node stress-tests/chaos/repair-loop.mjs
```

### PART 4: Failure Choreography

**Location:** `stress-tests/failure-choreography/`

- `vendor-success-requester-fail.mjs` - Vendor auth succeeds, requester fails
- `requester-success-vendor-fail.mjs` - Requester capture succeeds, vendor fails
- `availability-revalidation-fail.mjs` - Availability revalidation fails
- `crash-between-capture-commit.mjs` - Crash between capture and commit

**Run individually:**
```bash
node stress-tests/failure-choreography/vendor-success-requester-fail.mjs
node stress-tests/failure-choreography/requester-success-vendor-fail.mjs
node stress-tests/failure-choreography/availability-revalidation-fail.mjs
node stress-tests/failure-choreography/crash-between-capture-commit.mjs
```

### PART 5: Observability

**Location:** `stress-tests/observability/`

- `in-flight-reservations.sh` - List all in-flight reservations
- `stuck-authorizations.sh` - Identify stuck authorizations
- `stripe-reconciliation.mjs` - Reconcile Stripe vs Bookiji state
- `lifecycle-reconstruction.sh` - Reconstruct booking lifecycle

**Run individually:**
```bash
bash stress-tests/observability/in-flight-reservations.sh
bash stress-tests/observability/stuck-authorizations.sh
node stress-tests/observability/stripe-reconciliation.mjs
bash stress-tests/observability/lifecycle-reconstruction.sh <reservation-id>
```

## Expected Results

### Test 1.1: Concurrent Reservations
- **Expected:** Exactly 1 success (201), 19 failures (409)
- **Failure if:** Multiple successes (double booking) or wrong error codes

### Test 1.2: Idempotency Replay
- **Expected:** Same `reservation_id` returned for duplicate requests
- **Failure if:** Different IDs or duplicate reservations created

### Test 2.1-2.3: Time & Latency
- **Expected:** TTL extensions work, state transitions correct, automatic expiry
- **Failure if:** Premature expiry, incorrect state transitions, slots not released

### Test 3.1: Volume Reservations
- **Expected:** All reservations created, no duplicate slots, system responsive
- **Failure if:** Duplicate slots, system degradation, data corruption

### Test 3.4: Repair Loop
- **Expected:** All bookings converge to terminal states, no stuck reservations
- **Failure if:** Stuck reservations, orphaned payments, slots not released

### Test 4.1-4.4: Failure Choreography
- **Expected:** Compensation executed, final states correct, no money leaked
- **Failure if:** No compensation, incorrect states, money leakage

### Test 5.1-5.4: Observability
- **Expected:** Can list in-flight reservations, identify stuck states, reconcile Stripe
- **Failure if:** Missing endpoints, incomplete data, cannot reconstruct lifecycle

## Interpreting Results

### Critical Failures (Block Launch)
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

## Troubleshooting

### Tests Skipped
- Check environment variables are set
- Verify API endpoints are accessible
- Ensure test data (vendors, partners) exists

### Tests Fail
- Review individual test logs in report directory
- Check API responses for error details
- Verify system is in expected state

### Missing Endpoints
- Some tests require admin endpoints that may not be implemented
- Check test logs for specific endpoint requirements
- Flag as observability gaps if missing

## Contributing

When adding new tests:

1. Follow the existing structure
2. Document expected behavior
3. Include validation logic
4. Update this README
5. Add to `run-all-tests.sh`

## References

- Main test plan: `STRESS_TEST_PLAN.md`
- Failure compensation matrix: `docs/architecture/FAILURE_COMPENSATION_MATRIX.md`
- Idempotency invariants: `docs/invariants/retries-idempotency.md`
- Payment invariants: `docs/invariants/payments-refunds.md`
