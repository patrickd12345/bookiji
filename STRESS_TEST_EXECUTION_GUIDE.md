# BOOKIJI Stress Test Execution Guide

**Quick Start Guide** for executing the comprehensive stress test suite.

---

## Prerequisites

### Required Tools
- `bash` (for shell scripts)
- `curl` (for API tests)
- `node` (v18+, for Node.js scripts)
- `jq` (for JSON parsing) - Optional but recommended
- `playwright` (for browser-based tests) - Optional

### Required Environment Variables

Create a `.env.stress-test` file or export these variables:

```bash
export BOOKIJI_BASE_URL="http://localhost:3000"  # or staging URL
export BOOKIJI_PARTNER_API_KEY="your-partner-api-key"
export BOOKIJI_VENDOR_TEST_ID="test-vendor-id"
export BOOKIJI_PARTNER_ID="test-partner-id"
export BOOKIJI_SLOT_TEST_ID="test-slot-id"  # Optional
export CHAOS_SEED="812736"  # For reproducible chaos
export STRIPE_SECRET_KEY="sk_test_..."  # For Stripe reconciliation
export NEXT_PUBLIC_SUPABASE_URL="https://..."  # For DB queries
export SUPABASE_SECRET_KEY="..."  # For DB queries
```

---

## Quick Start

### Option 1: Run All Tests (Recommended)

```bash
# Load environment variables
source .env.stress-test  # or export them manually

# Run all tests
bash stress-tests/run-all-tests.sh
```

This will:
1. Run sanity check
2. Execute all Postman/Newman tests
3. Run chaos tests
4. Execute failure choreography tests
5. Run observability tests
6. Generate comprehensive report

**Duration:** ~60-90 minutes

### Option 2: Run Individual Test Suites

#### Sanity Check (2 minutes)
```bash
bash stress-tests/sanity-check.sh
```

#### Postman/Newman Tests (10 minutes)
```bash
bash stress-tests/postman/run-all.sh
```

Individual tests:
```bash
bash stress-tests/postman/concurrent-reservations.sh
bash stress-tests/postman/idempotency-replay.sh
bash stress-tests/postman/stale-version.sh
bash stress-tests/postman/retry-classification.sh
```

#### Playwright Tests (30 minutes)
```bash
playwright test stress-tests/playwright/
```

Individual tests:
```bash
playwright test stress-tests/playwright/vendor-confirmation-delay.spec.ts
playwright test stress-tests/playwright/idle-expiry.spec.ts
playwright test stress-tests/playwright/requester-auth-delay.spec.ts
```

#### Chaos Tests (20 minutes)
```bash
node stress-tests/chaos/volume-reservations.mjs
CHAOS_SEED=812736 node stress-tests/chaos/chaos-injection.mjs
node stress-tests/chaos/stripe-failures.mjs
node stress-tests/chaos/worker-crashes.mjs
node stress-tests/chaos/repair-loop.mjs
```

#### Failure Choreography (15 minutes)
```bash
node stress-tests/failure-choreography/vendor-success-requester-fail.mjs
node stress-tests/failure-choreography/requester-success-vendor-fail.mjs
node stress-tests/failure-choreography/availability-revalidation-fail.mjs
node stress-tests/failure-choreography/crash-between-capture-commit.mjs
```

#### Observability Tests (5 minutes)
```bash
bash stress-tests/observability/run-all.sh
```

Individual tests:
```bash
bash stress-tests/observability/in-flight-reservations.sh
bash stress-tests/observability/stuck-authorizations.sh
node stress-tests/observability/stripe-reconciliation.mjs
bash stress-tests/observability/lifecycle-reconstruction.sh <reservation-id>
```

---

## Using Postman Collection

### Import Collection

1. Open Postman
2. Click "Import"
3. Select `stress-tests/postman/bookiji-stress-test.postman_collection.json`
4. Create environment with variables:
   - `BASE_URL`
   - `PARTNER_API_KEY`
   - `VENDOR_ID`
   - `REQUESTER_ID`

### Run with Newman

```bash
# Install Newman
npm install -g newman

# Run collection
newman run stress-tests/postman/bookiji-stress-test.postman_collection.json \
  --environment postman-environment.json \
  --iteration-count 1
```

### Run Concurrent Tests

For concurrent reservation test, use the shell script:
```bash
bash stress-tests/postman/run-concurrent-reservations.sh
```

---

## Interpreting Results

### Test Output

Each test outputs:
- ✅ **PASSED** - Test passed
- ❌ **FAILED** - Test failed (check log)
- ⚠️  **PARTIAL** - Test partially passed (see log)

### Report Generation

After running tests, generate report:
```bash
bash stress-tests/generate-report.sh <results-directory>
```

Report includes:
- Test results summary
- Failures by severity (BLOCKER, HIGH, MEDIUM, LOW)
- Final verdict (SAFE FOR PILOT / SAFE FOR LIMITED PARTNERS / NOT SAFE)

### Severity Classification

- **BLOCKER** - System cannot handle real-world conditions safely
  - Examples: Double booking, money leakage, slot permanently blocked
  - **Action:** DO NOT LAUNCH until fixed

- **HIGH** - System may fail under stress
  - Examples: Retry logic broken, compensation not executed
  - **Action:** FIX BEFORE SCALE

- **MEDIUM** - System works but has gaps
  - Examples: API contract violations, observability gaps
  - **Action:** MONITOR CLOSELY

- **LOW** - Minor issues, non-critical
  - Examples: Documentation gaps, logging improvements
  - **Action:** FIX IN NEXT RELEASE

---

## Troubleshooting

### Tests Skipped

**Problem:** Tests show "SKIP" messages

**Solutions:**
- Check environment variables are set
- Verify API endpoints are accessible
- Ensure test data (vendors, partners) exists

### Tests Fail

**Problem:** Tests fail with errors

**Solutions:**
- Review individual test logs in results directory
- Check API responses for error details
- Verify system is in expected state
- Check network connectivity

### Missing Endpoints

**Problem:** Tests report missing endpoints

**Solutions:**
- Some tests require admin endpoints that may not be implemented
- Check test logs for specific endpoint requirements
- Flag as observability gaps if missing

### Database Access Issues

**Problem:** Database queries fail

**Solutions:**
- Verify Supabase credentials are correct
- Check network access to Supabase
- Ensure service role key has necessary permissions

---

## Test Artifacts

### Generated Files

After running tests, you'll find:

```
stress-test-results-YYYYMMDD-HHMMSS/
├── sanity-check.log
├── postman.log
├── concurrent-reservations.log
├── idempotency-replay.log
├── stale-version.log
├── retry-classification.log
├── volume-reservations.log
├── chaos-injection.log
├── vendor-success-requester-fail.log
├── in-flight-reservations.log
├── stuck-authorizations.log
├── stripe-reconciliation.log
└── report.md
```

### Log Files

Each log file contains:
- Test execution details
- API requests/responses
- Error messages
- Validation results

---

## Next Steps

1. **Review Report** - Check `report.md` for failures
2. **Fix Blockers** - Address all BLOCKER severity issues
3. **Address High Issues** - Fix HIGH severity before scaling
4. **Monitor Medium Issues** - Track and fix in next release
5. **Re-run Tests** - After fixes, re-run relevant test suites

---

## References

- **Test Plan:** `STRESS_TEST_PLAN.md`
- **Failure Matrix:** `docs/architecture/FAILURE_COMPENSATION_MATRIX.md`
- **Idempotency Invariants:** `docs/invariants/retries-idempotency.md`
- **Payment Invariants:** `docs/invariants/payments-refunds.md`

---

**Last Updated:** 2025-01-27
