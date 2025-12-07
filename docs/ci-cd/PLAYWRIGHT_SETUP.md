# Playwright Configuration & CI/CD Setup

This document describes the Playwright test configuration and GitHub Actions workflows for automated testing and deployment.

## Playwright Configuration

### `playwright.config.ts` Updates

The Playwright configuration has been enhanced with:

- **Vercel Domain Support**: Automatically uses `VERCEL_URL` environment variable when deployed to Vercel
- **Snapshot Management**: Configured for visual regression testing with configurable snapshot updates
- **Multi-browser Testing**: Chrome, Firefox, and Safari browsers for comprehensive coverage
- **Screenshot on Failure**: Automatic screenshots captured for failed tests

#### Key Settings

```typescript
const baseURL = process.env.BASE_URL || 'http://localhost:3000'

// Multi-browser support
projects: [
  { name: 'chromium', use: devices['Desktop Chrome'] },
  { name: 'firefox', use: devices['Desktop Firefox'] },
  { name: 'webkit', use: devices['Desktop Safari'] }
]

// Screenshot configuration
use: {
  baseURL,
  headless: true,
  trace: 'retain-on-failure',
  screenshot: 'only-on-failure',
  video: 'off'
}

// Screenshot diff settings
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,
    threshold: 0.2
  }
}
```

### Running Tests Locally

```bash
# Run all E2E tests
pnpm exec playwright test

# Run specific test file
pnpm exec playwright test tests/e2e/visual-regression.spec.ts

# Run in headed mode (see browser)
pnpm exec playwright test --headed

# Debug mode
pnpm exec playwright test --debug

# Update snapshots (when intentional changes made)
UPDATE_SNAPSHOTS=true pnpm exec playwright test
```

## Test Fixtures & Helpers

### Auth Helper

Located in `tests/helpers/auth.ts`, provides authentication methods:

```typescript
// Customer login
await auth.login('customer@example.com', 'password')

// Admin login
await auth.loginAsAdmin('admin@bookiji.test', 'admin123')

// Vendor login
await auth.loginAsVendor('vendor@bookiji.test', 'vendor123')

// Custom customer
await auth.loginAsCustomer('custom@example.com', 'password')
```

### Other Helpers

- **Booking Helper** (`booking.ts`): Start booking flow, choose provider/time, handle payments
- **Vendor Helper** (`vendor.ts`): Vendor-specific operations
- **Stripe Helper** (`stripe.ts`): Payment testing utilities
- **Services Helper** (`services.ts`): Service management
- **Payment Helper** (`payment.ts`): Payment flow testing
- **Email Helper** (`email.ts`): Email interception and verification

### Using Fixtures in Tests

```typescript
import { test, expect } from '../fixtures/base'

test('my test', async ({ page, auth, booking, vendor }) => {
  await auth.loginAsVendor()
  await vendor.createService()
  await page.goto('/vendor/dashboard')
})
```

## GitHub Actions Workflows

### 1. Main CI Workflow (`ci.yml`)

Runs on every push and pull request to `main` and `bookiji` branches.

#### Steps:
1. Typecheck code
2. Lint code
3. Run unit tests
4. Upload test artifacts
5. Comment on PR with results

#### Environment Variables:
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

#### PR Commenting:
- ✅ Comments on success
- ❌ Comments on failure with link to results

### 2. Snapshot Approval Workflow (`snapshot-approval.yml`)

Detects visual regression test snapshot changes and comments on PRs.

#### Triggers:
- Pull request opened/synchronized/reopened

#### Features:
- Detects snapshot file changes
- Runs visual regression tests
- Comments with snapshot files changed
- Uploads visual test report

#### What It Does:
1. Checks for changes in `*-snapshots` directories
2. Comments on PR listing changed snapshots
3. Runs Playwright visual tests
4. Uploads report as artifact

### 3. E2E Tests with Vercel (`e2e-with-vercel.yml`)

Deploys to Vercel preview environment and runs E2E tests.

#### Features:
- Automatic Vercel deployment
- Multi-browser parallel testing (Chromium, Firefox, WebKit)
- Test results reported to PR
- Artifacts uploaded for review

#### Preview URL:
```
https://<branch>-<org>.<project>.vercel.app
```

#### Environment Requirements:
Required secrets in GitHub Settings:
- `VERCEL_TOKEN`: Vercel authentication token
- `VERCEL_ORG_ID`: Vercel organization ID
- `VERCEL_PROJECT_ID`: Vercel project ID

## Setting Up GitHub Secrets

For the workflows to function, add these secrets to your GitHub repository:

1. Go to **Settings** → **Secrets and variables** → **Actions**
2. Add the following secrets:

| Secret | Value |
|--------|-------|
| `VERCEL_TOKEN` | Your Vercel API token |
| `VERCEL_ORG_ID` | Vercel organization ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

## Visual Regression Test Strategy

### When to Update Snapshots

Only update snapshots when:
1. ✅ UI intentionally changed (design update, feature addition)
2. ✅ Font rendering changes across OS
3. ✅ Component styling refactored

### Never Update Snapshots For:
- ❌ Bug fixes that shouldn't affect visuals
- ❌ Temporary test modifications
- ❌ CI environment-specific issues

### Updating Snapshots Locally

```bash
# Review visual changes first
pnpm exec playwright test tests/e2e/visual-regression.spec.ts --headed

# After reviewing, update snapshots
UPDATE_SNAPSHOTS=true pnpm exec playwright test tests/e2e/visual-regression.spec.ts
```

### Committing Snapshot Changes

```bash
# Stage the snapshot files
git add tests/e2e/**/*-snapshots/

# Commit with descriptive message
git commit -m "refactor: update visual regression snapshots for <feature>"
```

## Debugging Failed Tests

### View Test Report

```bash
pnpm exec playwright show-report
```

### Check Screenshot Differences

1. Go to GitHub Actions workflow run
2. Download artifact: `visual-regression-report`
3. Open `index.html` in browser
4. Review failed test screenshots

### Common Issues

| Issue | Solution |
|-------|----------|
| Chromium/Firefox/Safari not installed | Run `pnpm exec playwright install --with-deps` |
| Tests timeout | Increase `timeout` in `playwright.config.ts` |
| Flaky visual tests | Increase `waitForLoadState('networkidle')` delay |
| Font rendering different | Update snapshots for your OS |

## Best Practices

1. **Keep Tests Focused**: Each test should verify one specific visual element
2. **Wait for Content**: Always use `waitForLoadState('networkidle')` before screenshots
3. **Handle Dynamic Content**: Mock time, data, or animations that differ between runs
4. **Review PRs**: Carefully review snapshot changes in PR reviews
5. **Document Changes**: Add comments explaining why visual snapshots changed

## Performance Tips

- Use `fullyParallel: true` for faster test execution
- Set `retries: 1` to catch flaky tests
- Run only necessary browser combinations
- Use `video: 'off'` to reduce artifact size

## See Also

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs)



