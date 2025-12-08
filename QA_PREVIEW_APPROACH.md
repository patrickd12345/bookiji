# QA Environment Setup - Using Preview Deployments

## ✅ Correct Approach

The branch between Dev and Production **stays named "Preview"** in Vercel. We use preview deployments as our QA environment.

### Configuration

- **Production Branch**: `bookiji` → Production deployments
- **QA Branch**: `qa` → Preview deployments (serves as QA, but stays named "Preview" in Vercel)
- **Deployment Hooks**: Deploy to `qa` branch (creates preview deployments)

## 📋 Deployment Flow

```
Development → qa branch → Preview Deployment (used as QA)
                              ↓ (test & verify)
                          Merge to bookiji → Production Deployment
```

## 🎯 How It Works

1. **QA Testing:**
   - Push changes to `qa` branch
   - Vercel creates a **Preview deployment** (this is your QA environment)
   - The preview deployment stays named "Preview" in Vercel (can't be renamed on free tier)
   - Test the preview deployment

2. **Production Deployment:**
   - Merge `qa` branch to `bookiji` branch
   - Vercel automatically deploys `bookiji` to **Production**
   - Production is live!

## ✅ Key Points

- ✅ Preview environment **stays named "Preview"** (not renamed to QA)
- ✅ We use preview deployments from `qa` branch as our QA environment
- ✅ Works perfectly with Vercel free tier
- ✅ Clear workflow: QA = Preview deployments, Production = Production deployments

## 📝 Updated Deployment Hooks

All deployment hooks deploy to `qa` branch, which creates preview deployments:
- Preview deployments serve as QA environment
- Preview name stays as "Preview" in Vercel
- No renaming needed or possible on free tier

## 🔗 Dashboard

- Vercel Dashboard: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookiji/settings/git
- Preview deployments from `qa` branch = QA environment
- Production deployments from `bookiji` branch = Production
