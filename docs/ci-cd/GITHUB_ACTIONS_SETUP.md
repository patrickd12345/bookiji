# GitHub Actions CI/CD Setup Guide

This guide covers the complete CI/CD pipeline setup for automated testing, deployment, and quality assurance.

## Overview

The Bookiji project uses GitHub Actions for:

1. **Continuous Integration** - Code quality, testing, type checking
2. **Snapshot Approval** - Visual regression test management
3. **E2E Testing on Vercel** - Deploy previews and automated tests
4. **PR Commenting** - Automatic feedback on test results

## Workflows

### 1. Main CI Workflow (`ci.yml`)

**Triggers:** Every push and PR to `main` and `bookiji` branches

**Jobs:**
- Typecheck TypeScript
- Lint code
- Run unit tests
- Upload test artifacts
- Comment on PR with pass/fail status

**PR Comments:**
```
✅ All Tests Passed
The CI pipeline completed successfully. You can now merge this PR.

or

❌ Tests Failed
Please review the test results and fix any failures before merging.
```

### 2. Snapshot Approval Workflow (`snapshot-approval.yml`)

**Triggers:** PR opened, synchronized, or reopened

**Purpose:** Detect and comment on visual regression snapshot changes

**Jobs:**
1. **check-snapshots** - Detects changes in snapshot files
2. **run-visual-tests** - Executes Playwright visual tests
3. Comments on PR with findings

**PR Comments:**
```
⚠️ Snapshot Changes Detected

This PR includes visual regression test snapshot updates:

tests/e2e/visual-regression.spec.ts-snapshots/...

Please review and verify that these visual changes are intentional.
```

### 3. E2E Tests with Vercel (`e2e-with-vercel.yml`)

**Triggers:** Every push and PR

**Multi-stage pipeline:**

1. **Deploy Preview** - Deploys to Vercel preview environment
2. **E2E Tests** - Runs tests in parallel on 3 browsers:
   - Chromium
   - Firefox
   - WebKit
3. **Report Results** - Comments on PR with summary

**Preview URL Generated:**
```
https://<branch>-<project>.vercel.app
```

**Test Results Comment:**
```
✅/❌ E2E Tests Failed (chromium)
Tested on: https://pr-123-bookiji.vercel.app
View the test results...
```

## Required GitHub Secrets

Add these to your repository: **Settings** → **Secrets and variables** → **Actions**

```bash
# Vercel Integration
VERCEL_TOKEN          # Vercel API Token
VERCEL_ORG_ID         # Vercel Organization ID  
VERCEL_PROJECT_ID     # Vercel Project ID
```

### How to Get These Values

#### VERCEL_TOKEN
1. Go to [Vercel Settings → Tokens](https://vercel.com/account/tokens)
2. Create a new token with scope: `full`
3. Copy the token value

#### VERCEL_ORG_ID & VERCEL_PROJECT_ID
```bash
# Run locally with Vercel CLI
npm i -g vercel
vercel project ls

# Look for your project, then:
vercel project ls --json | jq '.projects[0].id'
vercel project ls --json | jq '.projects[0].accountId'
```

Or set in repository settings:
1. Go to **Deployments** tab in Vercel dashboard
2. Find your project
3. Copy values from project URL: `vercel.com/<ORG>/<PROJECT>`

## Setting Up Secrets

### Via GitHub UI

1. Go to your repository
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add:
   - Name: `VERCEL_TOKEN`, Value: `vercel_...`
   - Name: `VERCEL_ORG_ID`, Value: `your-org-id`
   - Name: `VERCEL_PROJECT_ID`, Value: `prj_...`

### Via GitHub CLI

```bash
gh secret set VERCEL_TOKEN --body "vercel_..."
gh secret set VERCEL_ORG_ID --body "your-org-id"
gh secret set VERCEL_PROJECT_ID --body "prj_..."
```

## Environment Configuration

### Playwright Configuration

File: `playwright.config.ts`

```typescript
// Uses environment variable for Vercel deployments
const baseURL = process.env.BASE_URL || 'http://localhost:3000'

// Multi-browser testing
projects: [ 'chromium', 'firefox', 'webkit' ]

// Screenshot settings
expect: {
  toHaveScreenshot: {
    maxDiffPixels: 100,    // Pixel difference threshold
    threshold: 0.2         // Percentage threshold
  }
}
```

### Environment Variables

| Variable | Purpose | Source |
|----------|---------|--------|
| `BASE_URL` | Test URL | `$VERCEL_URL` or localhost:3000 |
| `VERCEL_URL` | Vercel preview domain | GitHub Actions (Vercel) |
| `VERCEL_ORG_ID` | Vercel organization | Secrets |
| `VERCEL_PROJECT_ID` | Vercel project | Secrets |

## Test Fixtures

The test suite uses custom fixtures for easy test writing:

```typescript
import { test, expect } from '../fixtures/base'

test('admin flow', async ({ page, auth }) => {
  // Available fixtures:
  // - page: Playwright page object
  // - auth: Authentication helper
  // - booking: Booking flow helper
  // - vendor: Vendor operations helper
  // - stripe: Stripe payment helper
  // - services: Service management helper
  // - payment: Payment testing helper
  // - email: Email interception helper
})
```

### Auth Helper Methods

```typescript
// Customer login (default role)
await auth.login('customer@example.com', 'password')

// Admin login
await auth.loginAsAdmin('admin@bookiji.test', 'admin123')

// Vendor login
await auth.loginAsVendor('vendor@bookiji.test', 'vendor123')

// Custom customer login
await auth.loginAsCustomer('user@example.com', 'password')
```

## Running Tests Locally

### Unit Tests
```bash
pnpm test
pnpm vitest run
```

### E2E Tests
```bash
# All E2E tests
pnpm exec playwright test

# Specific test file
pnpm exec playwright test tests/e2e/visual-regression.spec.ts

# Single browser
pnpm exec playwright test --project=chromium

# Headed mode (see browser)
pnpm exec playwright test --headed

# Debug mode
pnpm exec playwright test --debug

# Update snapshots
UPDATE_SNAPSHOTS=true pnpm exec playwright test
```

### View Test Report
```bash
pnpm exec playwright show-report
```

## Snapshot Management

### Adding Visual Snapshots

1. Write test with screenshot:
```typescript
test('my component', async ({ page }) => {
  await page.goto('/component')
  await expect(page).toHaveScreenshot('component.png')
})
```

2. Update snapshots:
```bash
UPDATE_SNAPSHOTS=true pnpm exec playwright test tests/e2e/visual-regression.spec.ts
```

3. Review changes and commit:
```bash
git add tests/e2e/**/*-snapshots/
git commit -m "test: update visual regression snapshots"
```

### When to Update Snapshots

✅ **Update when:**
- UI intentionally changed (design, refactor)
- Component styling updated
- Cross-OS font rendering differences

❌ **Don't update for:**
- Bug fixes that shouldn't affect visuals
- CI environment differences
- Temporary test modifications

## PR Review Workflow

1. **Submit PR** → Triggers all workflows
2. **CI Checks** → Typecheck, lint, unit tests
3. **Snapshot Check** → Comments if visual changes
4. **E2E Tests** → Deploys to Vercel and runs tests
5. **PR Comments** → Summary of all test results

### Example PR Comments

**On Failure:**
```
❌ Tests Failed

Please review the test results and fix any failures before merging.
View results → [GitHub Actions](link)
```

**On Snapshot Changes:**
```
⚠️ Snapshot Changes Detected

This PR includes visual regression test snapshot updates:

- tests/e2e/visual-regression.spec.ts-snapshots/admin-dashboard.png
- tests/e2e/visual-regression.spec.ts-snapshots/vendor-calendar.png

Please review and verify that these visual changes are intentional.
```

**On E2E Test Failure:**
```
❌ E2E Tests Failed (chromium)

Tested on: https://pr-123-bookiji.vercel.app

View the test results → [GitHub Actions](link)
```

## Troubleshooting

### Workflow Not Running

**Problem:** Workflows don't start on PR

**Solutions:**
1. Check branch is `main` or `bookiji`
2. Verify workflows are in `.github/workflows/`
3. Check workflow YAML syntax: `yamllint .github/workflows/`
4. Ensure branch protection doesn't require specific checks

### Vercel Deployment Failed

**Problem:** E2E tests fail with "deployment not ready"

**Solutions:**
1. Increase wait time in `e2e-with-vercel.yml`: `sleep 60`
2. Check Vercel build logs for errors
3. Verify `VERCEL_TOKEN` has correct permissions
4. Confirm `VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are correct

### Tests Flaky on CI

**Problem:** Tests pass locally but fail on CI

**Solutions:**
1. Increase timeouts: `await page.waitForTimeout(2000)`
2. Use `waitForLoadState('networkidle')`
3. Check for environment-specific issues
4. Review Playwright trace files: check artifacts

### Snapshot Diffs Too Large

**Problem:** Screenshot diffs exceed threshold

**Solutions:**
1. Review actual vs expected screenshot in report
2. If intentional, update snapshots
3. If bug, fix issue and re-run tests
4. Check `maxDiffPixels` and `threshold` settings

## Performance Optimization

### Parallel Execution

All workflows run jobs in parallel by default:
- 3 browsers run simultaneously in E2E tests
- Multiple test files run concurrently

### Caching

Add to workflows to speed up installation:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'  # Caches pnpm store
```

### Artifact Retention

Artifacts are retained for 30 days by default. To change:

```yaml
- uses: actions/upload-artifact@v4
  with:
    retention-days: 7  # Reduce to save storage
```

## Best Practices

1. ✅ **Keep tests focused** - One assertion per test
2. ✅ **Use explicit waits** - Don't rely on `sleep()`
3. ✅ **Test realistic flows** - Follow actual user journeys
4. ✅ **Review snapshots carefully** - Visual changes are intentional
5. ✅ **Keep secrets secure** - Never commit secrets to repo
6. ✅ **Monitor test trends** - Track flaky tests over time
7. ✅ **Document changes** - Explain why tests were modified

## Useful Commands

```bash
# List all secrets
gh secret list

# Update secret
gh secret set SECRET_NAME --body "new_value"

# View workflow run
gh run view <run-id>

# Download artifacts
gh run download <run-id> -n playwright-report

# Re-run workflow
gh run rerun <run-id>
```

## See Also

- [Playwright Documentation](https://playwright.dev)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [Vercel Deployment Documentation](https://vercel.com/docs)
- [Testing Best Practices](../testing/BEST_PRACTICES.md)







