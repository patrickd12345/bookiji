# Extended E2E Tests

This directory contains rate-limit, SEO, and webhook round-trip tests.

Environment variables for CI:

- `RLH_BURST`: Hammer burst size for rate-limit test (e.g., 14)
- `TEST_VENDOR_SLUG`: A vendor id/slug available at `/vendor/[slug]`
- `TEST_SERVICE_ID`: A seeded service UUID to create a test booking
- `ENABLE_TEST_WEBHOOK_BYPASS`: Set to `true` to allow unsigned webhook test events
- `TEST_WEBHOOK_KEY`: Secret required in `x-test-webhook-key` header

# 🧪 Bookiji E2E Testing with Playwright

This directory contains comprehensive end-to-end tests for Bookiji's core booking flow using Playwright.

## 🚀 Quick Start

```bash
# Install dependencies (already done)
pnpm install

# Run all e2e tests
pnpm e2e

# Run specific test file
pnpm e2e tests/smoke.book-pay-confirm.spec.ts

# Run with UI
pnpm e2e:ui

# Debug mode
pnpm e2e:debug
```

## 📁 Test Structure

### Core Tests
- **`smoke.book-pay-confirm.spec.ts`** - Main booking flow: book → pay → confirm
- **`rebook.spec.ts`** - Rebooking functionality from confirmation page
- **`calendar-links.spec.ts`** - Calendar integration (Google Calendar + ICS download)
- **`admin-guard.spec.ts`** - Admin access control validation
- **`health.spec.ts`** - Health endpoint and DLQ monitoring

### Helpers
- **`helpers/stripe.ts`** - Robust Stripe Elements iframe handling

## 🎯 Test Coverage

### ✅ Core User Journey
- Landing page → Booking flow
- Payment processing with Stripe
- Booking confirmation
- Calendar integration
- Provider contact information

### ✅ Security & Access Control
- Admin panel protection
- Non-admin access blocking
- Health endpoint validation

### ✅ Integration Points
- Stripe payment processing
- Calendar export (ICS format)
- Google Calendar integration
- Health monitoring

## 🔧 Configuration

### Environment Variables
```bash
# Base URL for tests (defaults to localhost:3000)
BASE_URL=http://localhost:3000

# Stripe test keys (use test keys for e2e)
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
```

### Playwright Config
- **Timeout**: 60 seconds for tests, 15 seconds for assertions
- **Browser**: Chromium (Chrome) only for CI stability
- **Traces**: Retained on failure for debugging
- **Headless**: Enabled by default

## 🧪 Running Tests

### Local Development
```bash
# Start dev server
pnpm dev

# In another terminal, run tests
pnpm e2e
```

### CI/CD Pipeline
```bash
# Install Playwright browsers
pnpm exec playwright install --with-deps

# Run tests
pnpm e2e
```

### Debug Mode
```bash
# Run with browser visible and step-by-step
pnpm e2e:debug

# Run specific test in debug mode
pnpm e2e tests/smoke.book-pay-confirm.spec.ts --debug
```

## 📊 Test Data

### Test Users
- **Test User**: `test@example.com` / `555-555-1234`
- **Rebook User**: `rebook@example.com` / `555-555-2000`
- **Calendar User**: `calendar@example.com` / `555-555-3000`

### Test Credit Cards
- **Success**: `4242424242424242` (Visa)
- **Decline**: `4000000000000002` (Generic decline)
- **Expiry**: `12/34`, CVC: `123`, Postal: `12345`

## 🐛 Troubleshooting

### Common Issues

1. **Stripe iframe not found**
   - Ensure Stripe keys are configured
   - Check CSP allows `js.stripe.com` and `hooks.stripe.com`

2. **Tests timing out**
   - Increase timeout in `playwright.config.ts`
   - Check if dev server is running on port 3000

3. **Calendar links failing**
   - Verify `/api/calendar.ics` endpoint is working
   - Check Google Calendar API integration

### Debug Commands
```bash
# Show Playwright version
npx playwright --version

# Install specific browser
npx playwright install chromium

# Show test results
npx playwright show-report
```

## 🔒 Security Notes

- **Never use production Stripe keys** in tests
- **Test data is isolated** from production
- **Admin tests** validate access control
- **Health endpoints** are rate-limited

## 📈 Performance

- **Parallel execution**: Tests run in parallel when possible
- **Browser reuse**: Playwright reuses browser instances
- **Fast assertions**: Uses Playwright's built-in waiting mechanisms
- **Minimal setup**: Tests focus on core functionality

## 🚀 Next Steps

### Potential Enhancements
- [ ] Add visual regression tests
- [ ] Implement performance testing
- [ ] Add mobile device testing
- [ ] Create test data factories
- [ ] Add API contract testing

### Integration
- [ ] GitHub Actions CI workflow
- [ ] Vercel preview testing
- [ ] Slack notifications on failure
- [ ] Test coverage reporting

---

**Happy Testing! 🎉**
