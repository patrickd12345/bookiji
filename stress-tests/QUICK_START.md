# Quick Start Guide - Stress Test Execution

## Prerequisites Check

Before running tests, verify your environment:

```bash
# Check tools are installed
node --version  # Should be v18+
curl --version
bash --version

# Check if dev server is running (if testing locally)
curl http://localhost:3000/api/health || echo "⚠️  Dev server not running"
```

## Step 1: Set Environment Variables

Create a `.env.stress-test` file or export variables:

```bash
export BASE_URL="http://localhost:3000"  # or your staging URL
export PARTNER_API_KEY="your-test-partner-api-key"
export VENDOR_ID="test-vendor-uuid"
export REQUESTER_ID="test-requester-uuid"
export STRIPE_SECRET_KEY="sk_test_..."  # For payment tests
export ADMIN_TOKEN="your-admin-token"  # For admin endpoints
export NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
export SUPABASE_SECRET_KEY="your-supabase-secret-key"
```

## Step 2: Prepare Test Data

You need at least:
- 1 test vendor (UUID)
- 1 test partner (with API key)
- 1 test requester (UUID)

**Quick way to get test data:**
```bash
# If you have Supabase access, query for test users:
# SELECT id FROM profiles WHERE role = 'vendor' LIMIT 1;
# SELECT id FROM profiles WHERE role = 'customer' LIMIT 1;
```

## Step 3: Run Individual Tests

### Test Concurrent Reservations (Quick Validation)
```bash
pnpm stress:concurrent
```

**Expected:** Exactly 1 success, 19 conflicts

### Test Idempotency
```bash
pnpm stress:idempotency
```

**Expected:** Same reservation_id returned twice

### Test Volume (100 Reservations)
```bash
pnpm stress:volume
```

**Expected:** All reservations created, no duplicates

## Step 4: Run Full Test Suite

```bash
pnpm stress:all
```

This will:
1. Run all test suites sequentially
2. Create timestamped report directory: `stress-test-results-YYYYMMDD-HHMMSS/`
3. Save logs for each test

**Duration:** ~3.5 hours for full suite

## Step 5: Generate Report

```bash
# Use the most recent report directory
pnpm stress:report $(ls -td stress-test-results-* | head -1)
```

Or manually:
```bash
bash stress-tests/generate-report.sh stress-test-results-20250127-120000
```

## Quick Validation Test

Run this to verify everything is set up correctly:

```bash
# Quick validation
bash stress-tests/postman/run-concurrent-reservations.sh
```

If this works, your environment is configured correctly.

## Troubleshooting

### "SKIPPED (missing credentials)"
- Check environment variables are exported
- Verify `echo $PARTNER_API_KEY` shows your key

### "Connection refused" or "404"
- Verify `BASE_URL` is correct
- Check if dev server is running: `curl $BASE_URL/api/health`

### "VENDOR_ID or REQUESTER_ID not set"
- Create test users in your database
- Or use existing user UUIDs

### Tests fail with authentication errors
- Verify `PARTNER_API_KEY` is valid
- Check API key has correct permissions

## Next Steps After Running Tests

1. **Review the report** in the generated directory
2. **Check for critical failures** (double booking, money leakage)
3. **Prioritize fixes** based on severity
4. **Re-run tests** after fixes
5. **Update invariants** if new failure modes discovered

## CI/CD Integration

To run in CI/CD:

```yaml
# Example GitHub Actions
- name: Run Stress Tests
  env:
    BASE_URL: ${{ secrets.STAGING_URL }}
    PARTNER_API_KEY: ${{ secrets.PARTNER_API_KEY }}
    VENDOR_ID: ${{ secrets.TEST_VENDOR_ID }}
    REQUESTER_ID: ${{ secrets.TEST_REQUESTER_ID }}
  run: pnpm stress:all
```

## Manual Test Execution

If you prefer to run tests manually:

```bash
# PART 1: API Tests
bash stress-tests/postman/run-concurrent-reservations.sh
bash stress-tests/postman/idempotency-replay.sh

# PART 2: Playwright Tests
playwright test stress-tests/playwright/

# PART 3: Chaos Tests
node stress-tests/chaos/volume-reservations.mjs
node stress-tests/chaos/repair-loop.mjs

# PART 4: Failure Choreography
node stress-tests/failure-choreography/vendor-success-requester-fail.mjs

# PART 5: Observability
bash stress-tests/observability/in-flight-reservations.sh
node stress-tests/observability/stripe-reconciliation.mjs
```

## Expected Test Duration

| Test Suite | Duration | Can Run in Parallel? |
|------------|----------|---------------------|
| PART 1: API Tests | ~5 min | Yes |
| PART 2: Playwright | ~45 min | No (sequential) |
| PART 3: Chaos | ~60 min | Partial |
| PART 4: Failure Choreography | ~45 min | Yes |
| PART 5: Observability | ~30 min | Yes |
| **Total** | **~3.5 hours** | |

## Success Criteria

Tests are successful if:
- ✅ No critical failures (double booking, money leakage)
- ✅ Idempotency works correctly
- ✅ Compensation executes properly
- ✅ Observability endpoints exist
- ✅ System handles failures gracefully

## Getting Help

- See `stress-tests/README.md` for detailed documentation
- See `STRESS_TEST_PLAN.md` for test plan details
- Check individual test logs in report directory
