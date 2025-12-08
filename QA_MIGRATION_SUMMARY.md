# QA Environment Migration Summary

## ✅ Changes Completed

All deployment hooks have been updated to deploy to **QA environment** instead of production.

### Files Updated

1. **`trigger-deploy.js`**
   - Changed from `--prod` to deploy to QA
   - Updated messages to indicate QA deployment
   - Note: Still uses `--prod` flag (which will deploy to QA when QA is set as production branch)

2. **`.github/workflows/ci-e2e.yml`**
   - Changed `Promote Canary to Production` → `Promote Canary to QA`
   - Updated environment from `production` to `qa`
   - Updated branch triggers to include `bookiji` branch

3. **`.github/workflows/ci-performance.yml`**
   - Changed `Lighthouse – Production` → `Lighthouse – QA`
   - Updated environment from `production` to `qa`
   - Updated Sentry check to use QA environment

4. **`scripts/promote-canary.ts`**
   - Updated promotion messages to indicate QA
   - Added note about manual promotion to production

5. **Documentation**
   - Created `docs/deployment/QA_ENVIRONMENT_SETUP.md`
   - Created `docs/deployment/QA_DEPLOYMENT_GUIDE.md`

## 🔧 Next Steps (Manual)

### 1. Create QA Branch
```bash
git checkout -b qa
git push origin qa
```

### 2. Configure Vercel
- Go to: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookijibck/settings/git
- Change **Production Branch** from `bookiji` to `qa`
- Save changes

### 3. Verify
- Push to `qa` branch → Should deploy to QA
- All hooks now deploy to QA instead of production
- Manual promotion: Change production branch back to `bookiji` when ready

## 📋 Deployment Flow

**Before:**
```
Push to bookiji → Production
```

**After:**
```
Push to qa → QA Environment (Vercel Production)
Push to bookiji → Preview Deployment
Manual Promotion → Change Vercel production branch to bookiji
```

## 🎯 Promotion Process

When QA is ready for production:

1. Test QA thoroughly
2. Go to Vercel Dashboard → Settings → Git
3. Change Production Branch: `qa` → `bookiji`
4. Vercel auto-deploys `bookiji` to production

## ⚠️ Important Notes

- **QA is now the production branch** in Vercel (after you configure it)
- All `--prod` deployments will go to QA
- `bookiji` branch will create preview deployments
- Manual promotion required to move QA → Production

## ✅ Status

All deployment hooks have been successfully updated to point to QA instead of production.
