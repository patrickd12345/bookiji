# Bookiji CI/CD Pipeline Setup Guide

## 🚀 Full-Metal-Jacket CI/CD Pipeline

This setup provides enterprise-grade CI/CD with GitHub Actions, Vercel, Supabase, and comprehensive testing.

## 📋 Prerequisites

- GitHub repository with admin access
- Vercel account and project
- Supabase project
- Stripe test account
- Sentry account (optional but recommended)
- Slack/Discord webhook URL

## 🔐 Required GitHub Secrets

### Vercel
- `VERCEL_TOKEN` - Generate at [vercel.com/account/tokens](https://vercel.com/account/tokens)
- `VERCEL_ORG_ID` - Found in Vercel project settings
- `VERCEL_PROJECT_ID` - Found in Vercel project settings

### Supabase
- `SUPABASE_ACCESS_TOKEN` - Generate at [supabase.com/account/tokens](https://supabase.com/account/tokens)
- `SUPABASE_PROJECT_REF` - Your project reference (e.g., abcdxyz1234)
- `SUPABASE_DB_PASSWORD` - Your project's Postgres password

### Stripe (TEST keys for CI)
- `STRIPE_SECRET_KEY` - Test secret key from Stripe dashboard
- `STRIPE_WEBHOOK_SECRET` - Test webhook secret

### Sentry (Optional)
- `SENTRY_AUTH_TOKEN` - Generate at [sentry.io/settings/account/api/auth-tokens](https://sentry.io/settings/account/api/auth-tokens)
- `SENTRY_ORG` - Your Sentry organization slug
- `SENTRY_PROJECT` - Your Sentry project slug

### Alerts
- `ALERT_WEBHOOK_URL` - Slack/Discord incoming webhook URL

### App
- `NEXT_PUBLIC_BASE_URL` - Production domain (e.g., https://bookiji.com)

## 🏗️ Branch Strategy

```
main → production (protected)
develop → shared staging
feature/* → preview deployments
```

### GitHub Branch Protections for `main`:

1. **Require status checks to pass before merging:**
   - CI
   - Preview E2E

2. **Require branches to be up to date before merging**

3. **Require linear history** (squash and merge)

4. **Require at least 1 review**

5. **Restrict pushes** (only allow pull requests)

## 🔄 Workflow Overview

### 1. CI Workflow (`.github/workflows/ci.yml`)
- **Triggers:** Every PR and push to main/develop
- **Runs:** Typecheck, lint, unit tests, build
- **Timeout:** 20 minutes
- **Purpose:** Fast feedback on code quality

### 2. Preview E2E (`.github/workflows/preview-e2e.yml`)
- **Triggers:** PR opened/updated
- **Runs:** Deploy preview → Health check → Playwright E2E tests
- **Timeout:** 40 minutes
- **Purpose:** Validate changes work in real environment

### 3. Production Deploy (`.github/workflows/deploy-prod.yml`)
- **Triggers:** Manual (workflow_dispatch)
- **Runs:** DB migrations → Deploy → Health check → Sentry sourcemaps
- **Timeout:** 40 minutes
- **Purpose:** Safe production deployment with manual gate

## 🧪 Testing Strategy

### Unit Tests (Vitest)
- Fast feedback loop
- Run on every commit
- Coverage reporting

### E2E Tests (Playwright)
- Real browser testing
- Against actual preview deployments
- Critical user journeys

### Smoke Tests
- Basic functionality verification
- Health endpoint checks
- Phone-only cancellation policy validation

## 🚀 Deployment Flow

```
Feature Branch → PR → CI ✅ → Preview E2E ✅ → Merge → Manual Prod Deploy
```

## 📱 Phone-Only Cancellation System Tests

The pipeline includes specific tests for our phone-only cancellation system:

- ✅ No cancel/reschedule buttons exist
- ✅ Phone-only messaging is displayed
- ✅ Cancel API returns 410 Gone
- ✅ FAQ shows correct policy
- ✅ Health endpoints respond

## 🔧 Local Development

### Running Tests
```bash
# Unit tests
pnpm test

# E2E tests
pnpm e2e

# E2E with UI
pnpm e2e:ui

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Playwright Setup
```bash
# Install browsers
npx playwright install --with-deps

# Run tests
npx playwright test

# View report
npx playwright show-report
```

## 🚨 Monitoring & Alerts

### Success Notifications
- ✅ Production deployments
- ✅ Preview deployments

### Failure Alerts
- ❌ CI failures
- ❌ Preview E2E failures
- ❌ Production deployment failures

## 🔒 Security Features

- Branch protection rules
- Required status checks
- Manual production deployment gate
- Environment-specific secrets
- Supabase migration safety

## 📊 Metrics & Reporting

- Playwright HTML reports
- Test coverage reports
- Build success/failure rates
- Deployment frequency
- Mean time to recovery

## 🚀 Getting Started

1. **Add all required secrets** to GitHub repository
2. **Enable branch protections** for main branch
3. **Connect repository to Vercel** for automatic previews
4. **Test the pipeline** with a feature branch
5. **Deploy to production** when ready

## 🔍 Troubleshooting

### Common Issues

1. **Secret not found:** Verify secret name and value
2. **Build timeout:** Check for infinite loops or heavy operations
3. **E2E failures:** Verify preview deployment health
4. **Migration errors:** Ensure migrations are idempotent

### Debug Commands

```bash
# Check build locally
pnpm build

# Run type checking
pnpm typecheck

# Test E2E locally
pnpm e2e

# Verify health endpoint
curl http://localhost:3000/api/health
```

## 📈 Next Steps

1. **Set up Sentry** for error tracking
2. **Add CodeQL** for security scanning
3. **Configure Dependabot** for dependency updates
4. **Implement Changesets** for release management
5. **Add performance monitoring** with Web Vitals

---

**This pipeline ensures every change is tested, validated, and safely deployed to production.**
