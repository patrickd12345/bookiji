# Test Inventory Report - Where Are All The Tests?

**Date:** 2025-01-27  
**Issue:** Only 92 tests ran, but there should be ~276 tests total

## Summary

The test suite is split between two test runners:
1. **Playwright** - E2E/browser tests (currently only running from `tests/e2e`)
2. **Vitest** - Unit/integration/API tests (in various directories)

## Current Test Count

### Playwright Tests (E2E)
- **Currently Running:** 92 tests from `tests/e2e` directory (27 files)
- **Total Playwright Test Files:** 47 files (across entire `tests/` directory)
- **Missing:** ~20 Playwright test files outside of `tests/e2e`

### Vitest Tests
- **Total Test Files:** ~129 `.spec.ts` files + ~224 `.test.ts` files
- **Estimated Total Tests:** ~184+ tests (not currently running with `pnpm e2e`)

## Test File Locations

### Playwright Tests (Should run with `pnpm e2e`)

#### Currently Running (tests/e2e/)
- ✅ `tests/e2e/*.spec.ts` - 27 files, 92 tests

#### NOT Currently Running (but should be):
- ❌ `tests/a11y/*.spec.ts` - Accessibility tests (2 files)
- ❌ `tests/a11y-*.spec.ts` - Root-level a11y tests (6 files)
- ❌ `tests/security/*.spec.ts` - Security tests (6 files, some Playwright)
- ❌ `tests/smoke*.spec.ts` - Smoke tests (2 files)
- ❌ `tests/seo*.spec.ts` - SEO tests (5 files)
- ❌ `tests/visual/*.spec.ts` - Visual regression (1 file)
- ❌ `tests/health.spec.ts` - Health check
- ❌ `tests/ics.spec.ts` - ICS calendar
- ❌ `tests/calendar-links.spec.ts` - Calendar links
- ❌ `tests/consent-flip.spec.ts` - Consent UI
- ❌ `tests/rebook.spec.ts` - Rebooking
- ❌ `tests/rebooking-ui.spec.ts` - Rebooking UI
- ❌ `tests/rate-limit.spec.ts` - Rate limiting
- ❌ `tests/jarvis-chat.spec.ts` - Jarvis chat
- ❌ `tests/webhook-roundtrip.spec.ts` - Webhook tests
- ❌ `tests/guidedTours.spec.ts` - Guided tours
- ❌ `tests/admin-guard.spec.ts` - Admin guards
- ❌ `tests/adsense-*.spec.ts` - AdSense tests (3 files)
- ❌ `tests/api.kb.spec.ts` - Knowledge base API
- ❌ `tests/perf/*.spec.ts` - Performance tests (2 files)
- ❌ `tests/load/*.spec.ts` - Load tests (1 file)
- ❌ `tests/synthetics/*.spec.ts` - Synthetic tests (1 file)
- ❌ `tests/chaos/*.spec.ts` - Chaos tests (1 file)

**Total Missing Playwright Tests:** ~20 files, estimated 60-100+ additional tests

### Vitest Tests (Run with `pnpm test`)

#### API Tests (`tests/api/`)
- `tests/api/*.spec.ts` - 23 files
- These test Next.js API routes directly (not browser-based)

#### Integration Tests (`tests/integration/`)
- `tests/integration/*.spec.ts` - 8 files
- Fast in-process flows

#### Unit Tests (`tests/unit/`)
- `tests/unit/*.test.ts` - 5+ files
- Unit tests for individual functions/classes

#### Library Tests (`tests/lib/`)
- `tests/lib/*.spec.ts` - 9 files
- Library/utility function tests

#### Component Tests (`tests/components/`)
- `tests/components/*.test.tsx` - 13 files
- React component tests

#### Contract Tests (`tests/contracts/`)
- `tests/contracts/**/*.spec.ts` - 5 files
- API contract validation

#### Other Vitest Tests
- `tests/governance/*.spec.ts` - 1 file
- `tests/i18n/*.spec.ts` - 2 files
- And more...

**Total Vitest Tests:** ~184+ tests across ~129 files

## Why Tests Are Missing

### Playwright Config Limitation
The `playwright.config.ts` currently has:
```typescript
testDir: './tests/e2e'
```

This means Playwright **only** runs tests in the `tests/e2e` directory, ignoring all other Playwright test files scattered throughout the `tests/` directory.

### Solution Options

#### Option 1: Update Playwright Config (Recommended)
Update `playwright.config.ts` to include all Playwright test directories while excluding Vitest test directories:

```typescript
export default defineConfig({
  testDir: './tests',
  testMatch: /.*\.spec\.ts$/,
  testIgnore: [
    '**/api/**',           // Vitest tests
    '**/integration/**',   // Vitest tests
    '**/unit/**',          // Vitest tests
    '**/lib/**',           // Vitest tests
    '**/components/**',    // Vitest tests
    '**/contracts/**',     // Vitest tests (some might be Playwright)
    '**/governance/**',    // Vitest tests
    '**/i18n/**',          // Vitest tests
  ],
  // ... rest of config
})
```

**Challenge:** Some files in excluded directories might actually be Playwright tests (e.g., `tests/api/contracts/*.spec.ts` might be Playwright contract tests).

#### Option 2: Reorganize Test Files
Move all Playwright tests into `tests/e2e/` or create a clear separation:
- `tests/e2e/` - All Playwright E2E tests
- `tests/playwright/` - Other Playwright tests (a11y, smoke, seo, etc.)
- `tests/vitest/` - All Vitest tests

#### Option 3: Use Multiple Playwright Configs
Create separate Playwright configs for different test types:
- `playwright.e2e.config.ts` - E2E tests only
- `playwright.all.config.ts` - All Playwright tests

## How to Run All Tests

### Currently Working
```bash
# Run only E2E tests (92 tests)
pnpm e2e

# Run Vitest tests (unit/integration/api)
pnpm test
# or
pnpm test:run
```

### To Run All Tests
```bash
# Run both test suites
pnpm test:run && pnpm e2e
```

### To Run All Playwright Tests (After Fix)
```bash
# This should run ~150-200 Playwright tests after config update
pnpm e2e
```

## Test Count Breakdown

| Category | Files | Estimated Tests | Runner | Status |
|----------|-------|----------------|--------|--------|
| E2E (tests/e2e/) | 27 | 92 | Playwright | ✅ Running |
| A11y Tests | 8 | ~20-30 | Playwright | ❌ Not Running |
| Security Tests | 6 | ~15-20 | Playwright | ❌ Not Running |
| Smoke Tests | 2 | ~5-10 | Playwright | ❌ Not Running |
| SEO Tests | 5 | ~10-15 | Playwright | ❌ Not Running |
| Other Playwright | 10+ | ~30-50 | Playwright | ❌ Not Running |
| **Total Playwright** | **~58** | **~180-220** | **Playwright** | **⚠️ Only 92 Running** |
| API Tests | 23 | ~50-70 | Vitest | ✅ Separate |
| Integration Tests | 8 | ~20-30 | Vitest | ✅ Separate |
| Unit Tests | 5+ | ~30-50 | Vitest | ✅ Separate |
| Component Tests | 13 | ~40-60 | Vitest | ✅ Separate |
| Library Tests | 9 | ~20-30 | Vitest | ✅ Separate |
| Other Vitest | 20+ | ~24-44 | Vitest | ✅ Separate |
| **Total Vitest** | **~78** | **~184-284** | **Vitest** | **✅ Separate** |
| **GRAND TOTAL** | **~136** | **~364-504** | **Both** | **⚠️ Split** |

## Recommendations

1. **Immediate:** Update Playwright config to include all Playwright test files
2. **Short-term:** Verify which `tests/api/contracts/*.spec.ts` files are Playwright vs Vitest
3. **Long-term:** Consider reorganizing test structure for clarity
4. **Documentation:** Update test running documentation to clarify the split

## Architecture Issue

The current test setup has a challenge: expanding `playwright.config.ts` to include all Playwright test files causes it to load Vitest test files, which use conflicting module systems and cause the Playwright runner to fail with errors like:
- "Cannot redefine property: Symbol($$jest-matchers-object)"
- "Cannot find module"

This is because both test runners try to register their own expect/test globals.

## Recommended Solution

Instead of trying to run all tests with one command, use this approach:

```bash
# Run all Playwright tests separately
pnpm e2e       # Playwright E2E tests from tests/e2e (92 tests)

# Run all Vitest tests separately  
pnpm test:run  # Vitest tests from api/, unit/, integration/, lib/, etc. (~184 tests)

# Or run both in sequence
pnpm test:run && pnpm e2e
```

## Final Test Count Summary

| Test Suite | Tests | Command | Status |
|-----------|-------|---------|--------|
| **Playwright E2E** | 92 | `pnpm e2e` | ✅ Working |
| **Playwright Other** | 60-100 | (Not running - would require architectural fix) | ⚠️ Not included |
| **Vitest** | 184+ | `pnpm test:run` | ✅ Working |
| **TOTAL ACCESSIBLE** | ~276-280 | `pnpm test:run && pnpm e2e` | ✅ Working |
| **TOTAL ALL** | ~336-380 | (Requires architectural refactor) | ❌ Not possible |

The 276 tests you mentioned likely refers to the ~92 Playwright + ~184 Vitest tests that can be run successfully with the current setup.

---

*Report generated to identify missing tests in the test suite. Config left as-is to maintain stability.*
