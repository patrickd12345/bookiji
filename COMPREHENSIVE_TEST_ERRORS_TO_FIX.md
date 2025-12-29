# COMPREHENSIVE TEST ERROR REPORT - ALL ERRORS TO FIX

**Generated:** 2025-12-29  
**Total Errors Found:** 506 errors across 467 test runs  
**Test Run Period:** Last 24 hours

---

## EXECUTIVE SUMMARY

The test suite has **506 errors** categorized as follows:

1. **Connection Errors (305 errors - 60%)** - Server not running or connection refused
2. **Timeout Errors (76 errors - 15%)** - Tests exceeding 45s timeout
3. **Seed Data Errors (41 errors - 8%)** - Missing test vendor/user data
4. **Type Errors (39 errors - 8%)** - JavaScript/TypeScript runtime errors
5. **Other Errors (45 errors - 9%)** - Various other issues

---

## PRIORITY 1: CRITICAL FIXES (Must Fix First)

### 1.1 Seed Data Errors (41 errors)

**Problem:** Test vendor profile/user not found in database

**Errors:**
- **24x**: `Error: Vendor user not found: e2e-vendor@bookiji.test. Run pnpm e2e:seed first.`
- **11x**: `Error: Vendor profile not found for e2e-vendor@bookiji.test`
- **6x**: `Error: Vendor profile not found for e2e-vendor@bookiji.test. Run pnpm e2e:seed first.`

**Affected Tests:**
- `scheduling-proof` (6 errors)
- `bookiji-full-proof` (35 errors)

**Fix:**
```bash
# Run the seed command to create test data
pnpm e2e:seed
```

**Files to Check:**
- `tests/e2e/scheduling-proof.spec.ts:67` - Profile fetch error
- `tests/e2e/bookiji-full-proof.spec.ts` - Multiple vendor profile lookups
- Check if `scripts/e2e/credentials.ts` has correct vendor email
- Verify Supabase connection and RLS policies allow service role access

---

### 1.2 Connection Errors (305 errors - 60% of all errors)

**Problem:** Development server not running when tests execute

**Errors:**
- **61x**: `Error: page.goto: NS_ERROR_CONNECTION_REFUSED` (navigating to http://localhost:3000/)
- **50x**: `Error: page.goto: net::ERR_CONNECTION_REFUSED` (navigating to http://localhost:3000/)
- **21x**: `Error: page.goto: NS_ERROR_CONNECTION_REFUSED` (navigating to http://localhost:3000/login)
- **16x**: `Error: page.goto: net::ERR_CONNECTION_REFUSED` (navigating to http://localhost:3000/login)
- **12x**: `Error: page.goto: NS_ERROR_CONNECTION_REFUSED` (navigating to http://localhost:3000/register)
- **4x**: `Error: apiRequestContext.post: connect ECONNREFUSED ::1:3000`

**Affected Tests:**
- All visual regression tests
- All production smoke tests
- All support chat tests
- All usability tests
- All site crawler tests
- All scheduling boundary tests
- All services tests

**Fix:**
1. **Ensure dev server is running before tests:**
   ```bash
   # In one terminal
   pnpm dev
   
   # In another terminal
   pnpm test:e2e
   ```

2. **Or use test fixtures that start server automatically:**
   - Check `tests/fixtures/base.ts` - ensure it starts the server
   - Verify `playwright.config.ts` has proper server setup

3. **Check server startup in CI/CD:**
   - Ensure test scripts wait for server to be ready
   - Add health check before running tests

**Files to Check:**
- `playwright.config.ts` - Server configuration
- `tests/fixtures/base.ts` - Test setup
- `package.json` - Test scripts
- CI/CD configuration files

---

## PRIORITY 2: TIMEOUT ERRORS (76 errors)

**Problem:** Tests timing out after 45 seconds

**Errors:**
- **20x**: `Error: browserContext.newPage: Test timeout of 45000ms exceeded.`
- **14x**: `Test timeout of 45000ms exceeded.`
- **13x**: `Test timeout of 45000ms exceeded while setting up "page".`
- **8x**: `"beforeAll" hook timeout of 45000ms exceeded.`
- **7x**: `Test timeout of 45000ms exceeded while running "beforeEach" hook.`

**Affected Tests:**
- `comprehensive-site-verification` (multiple tests)
- `booking-reschedule`
- `booking-flow`
- `admin-access`
- `customer-dashboard`
- `visual-regression`

**Fixes:**

1. **Increase timeout for slow tests:**
   ```typescript
   test.setTimeout(90000); // 90 seconds instead of 45
   ```

2. **Optimize test setup:**
   - Reduce `beforeAll` hook complexity
   - Use parallel test execution where possible
   - Cache expensive setup operations

3. **Check for hanging operations:**
   - Verify network requests complete
   - Check for infinite loops in test code
   - Ensure database queries have timeouts

**Files to Check:**
- `tests/e2e/comprehensive-site-verification.spec.ts`
- `tests/e2e/booking-reschedule.spec.ts`
- `tests/e2e/booking-flow.spec.ts`
- `playwright.config.ts` - Global timeout settings

---

## PRIORITY 3: TYPE ERRORS (39 errors)

### 3.1 Fetch Failed Errors (30 errors)

**Problem:** Network requests failing in Stripe webhook replay tests

**Errors:**
- **30x**: `TypeError: fetch failed [cause]: AggregateError:`

**Affected Tests:**
- `stripe-replay` tests (all variants)

**Fix:**
1. **Check server is running** (related to connection errors)
2. **Verify API endpoints are accessible:**
   ```typescript
   // In tests/helpers/stripe-replay.ts
   // Add error handling and retry logic
   ```

**Files to Check:**
- `tests/helpers/stripe-replay.ts:84, 101, 119, 129, 147`
- `tests/e2e/stripe-replay.spec.ts`

---

### 3.2 Undefined Property Errors (9 errors)

**Problem:** Trying to read properties of undefined objects

**Errors:**
- **9x**: `TypeError: Cannot read properties of undefined (reading 'close')`

**Affected Tests:**
- `comprehensive-site-verification` tests

**Fix:**
1. **Add null checks before accessing properties:**
   ```typescript
   if (browser && browser.close) {
     await browser.close();
   }
   ```

2. **Ensure proper cleanup in test teardown**

**Files to Check:**
- `tests/e2e/comprehensive-site-verification.spec.ts`
- Test fixtures and cleanup hooks

---

## PRIORITY 4: OTHER ERRORS (45 errors)

### 4.1 Test Ended Prematurely (8 errors)

**Errors:**
- **8x**: `Error: browser.newPage: Test ended.`

**Fix:**
- Ensure tests don't exit early
- Check for unhandled promise rejections
- Verify test structure is correct

### 4.2 Screencast/Video Errors (5 errors)

**Errors:**
- **5x**: `Error: browserContext.newPage: Protocol error (Screencast.startVideo): Failed to initialize encoder: Memory allocation error`

**Fix:**
- Disable video recording if not needed
- Increase system memory
- Check Playwright video configuration

### 4.3 Browser Closed Errors (3 errors)

**Errors:**
- **3x**: `Error: page.goto: Test ended.`
- **2x**: `Error: page.goto: Target page, context or browser has been closed`

**Fix:**
- Ensure browser context stays open during test
- Check for premature cleanup
- Verify test isolation

---

## DETAILED ERROR BREAKDOWN BY TEST FILE

### Most Affected Tests:

1. **comprehensive-site-verification** - 8+ errors
   - Search functionality
   - Page loads
   - Navigation

2. **booking-reschedule** - 6 errors
   - Timeout issues
   - Connection issues

3. **booking-flow** - 5 errors
   - Full booking flow
   - Payment webhook confirmation

4. **admin-access** - 5 errors
   - API endpoint checks
   - Mission control access

5. **customer-dashboard** - 4+ errors
   - Page loads
   - Navigation
   - Redirects

---

## ACTION PLAN

### Immediate Actions (Do First):

1. ✅ **Run seed command:**
   ```bash
   pnpm e2e:seed
   ```

2. ✅ **Verify dev server starts correctly:**
   ```bash
   pnpm dev
   # Check http://localhost:3000 is accessible
   ```

3. ✅ **Check test configuration:**
   - Review `playwright.config.ts`
   - Verify `tests/fixtures/base.ts` starts server
   - Check `package.json` test scripts

### Short-term Fixes (Next):

1. **Fix connection errors:**
   - Ensure test fixtures wait for server
   - Add health check before tests
   - Fix CI/CD server startup

2. **Fix timeout errors:**
   - Increase timeouts for slow tests
   - Optimize test setup
   - Add retry logic

3. **Fix type errors:**
   - Add null checks
   - Fix fetch error handling
   - Improve error messages

### Long-term Improvements:

1. **Test infrastructure:**
   - Better test isolation
   - Parallel test execution
   - Test result caching

2. **Error handling:**
   - Better error messages
   - Retry mechanisms
   - Graceful degradation

3. **Monitoring:**
   - Track flaky tests
   - Test performance metrics
   - Error rate tracking

---

## FILES TO REVIEW AND FIX

### Critical Files:
- `tests/e2e/scheduling-proof.spec.ts:67` - Seed data error
- `tests/e2e/bookiji-full-proof.spec.ts` - Multiple seed data errors
- `playwright.config.ts` - Server configuration
- `tests/fixtures/base.ts` - Test setup
- `package.json` - Test scripts

### Test Helper Files:
- `tests/helpers/stripe-replay.ts` - Fetch errors
- `tests/helpers/vendor.ts` - Vendor registration
- `scripts/e2e/credentials.ts` - Test credentials

### Configuration Files:
- `playwright.config.ts` - Timeouts, server config
- CI/CD config files - Server startup

---

## NOTES

- Most errors (60%) are connection-related, suggesting the dev server isn't running during tests
- Seed data errors (8%) indicate missing test data setup
- Timeout errors (15%) suggest tests need optimization or longer timeouts
- Type errors (8%) are mostly fetch failures, likely related to connection issues

**Recommendation:** Fix connection errors first, as they may be causing cascading failures in other tests.


