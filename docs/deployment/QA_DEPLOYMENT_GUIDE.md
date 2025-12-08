# QA Deployment Guide

## Overview

All deployment hooks have been updated to deploy to the **QA environment** instead of production. You will manually promote QA to production when ready.

## Vercel Configuration

### Step 1: Set QA as Production Branch

1. Go to Vercel Dashboard: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookijibck/settings/git
2. Change **Production Branch** from `bookiji` to `qa`
3. Save changes

**Result:** All deployments to `qa` branch will now be production deployments (your QA environment).

### Step 2: Create QA Branch (if not exists)

```bash
git checkout -b qa
git push origin qa
```

## Deployment Flow

### Automatic Deployments
- **Push to `qa` branch** → Auto-deploys to QA environment (Vercel production)
- **Push to `bookiji` branch** → Creates preview deployment
- **GitHub Actions** → Deploy to QA environment

### Manual Promotion to Production

When QA is tested and ready:

1. **Test QA thoroughly**
   - Verify all features work
   - Run smoke tests
   - Check performance metrics

2. **Promote to Production**
   - Go to Vercel Dashboard → Settings → Git
   - Change **Production Branch** from `qa` to `bookiji`
   - Vercel will automatically deploy `bookiji` branch to production

3. **Verify Production**
   - Check production URL
   - Monitor for issues
   - Be ready to rollback if needed

## Updated Files

The following files have been updated to deploy to QA:

- ✅ `trigger-deploy.js` - Deploys to QA
- ✅ `.github/workflows/ci-e2e.yml` - Promotes to QA
- ✅ `.github/workflows/ci-performance.yml` - Tests QA
- ✅ `scripts/promote-canary.ts` - Promotes to QA

## Rollback Process

If QA deployment has issues:

1. **Quick Rollback**
   - Go to Vercel Dashboard → Deployments
   - Find previous working deployment
   - Click "..." → "Promote to Production"

2. **Branch Rollback**
   - Change production branch back to `bookiji` in Vercel settings
   - This will deploy the last `bookiji` commit to production

## Environment Variables

Ensure QA has appropriate environment variables:

- Go to: Vercel Dashboard → Settings → Environment Variables
- Configure QA-specific values:
  - Test database URLs
  - QA API keys
  - Test payment keys (Stripe test mode)
  - QA analytics keys

## Verification Checklist

After setup, verify:

- [ ] QA branch exists and is pushed to GitHub
- [ ] Vercel production branch is set to `qa`
- [ ] Push to `qa` branch triggers QA deployment
- [ ] QA environment is accessible
- [ ] All deployment hooks deploy to QA
- [ ] Manual promotion process works

## Current Status

✅ **All deployment hooks updated to QA**
✅ **Documentation created**
✅ **Ready for QA branch setup**

Next step: Create `qa` branch and configure Vercel production branch.
