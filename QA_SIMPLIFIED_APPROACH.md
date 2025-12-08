# QA Environment Setup - Simplified Approach

## ✅ Simplified Configuration

Since you're handling promotion to production manually, we don't need a separate `qa` branch!

### Configuration

- **Branch**: `bookiji` → Preview deployments (serves as QA)
- **Deployment Hooks**: Deploy to `bookiji` branch (creates Preview deployments)
- **Promotion**: Manual promotion from Preview to Production in Vercel Dashboard

## 📋 Deployment Flow

```
Development → bookiji branch → Preview Deployment (QA)
                              ↓ (test & verify)
                          Manual Promotion → Production
```

## 🎯 How It Works

1. **QA Testing:**
   - Push changes to `bookiji` branch
   - Vercel creates a **Preview deployment** (this is your QA environment)
   - The preview deployment stays named "Preview" in Vercel
   - Test the preview deployment

2. **Production Deployment:**
   - When ready, go to Vercel Dashboard → Deployments
   - Find the Preview deployment you want to promote
   - Click "..." → "Promote to Production"
   - That deployment becomes Production!

## ✅ Benefits

- ✅ No separate `qa` branch needed
- ✅ Simpler workflow
- ✅ Preview deployments from `bookiji` = QA environment
- ✅ Manual control over promotion timing
- ✅ Works perfectly with Vercel free tier

## 📝 Updated Deployment Hooks

All deployment hooks deploy to `bookiji` branch:
- Creates Preview deployments (QA environment)
- You manually promote to Production when ready

## 🔗 Dashboard

- Vercel Dashboard: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookiji/settings/git
- Preview deployments from `bookiji` branch = QA environment
- Manual promotion: Preview → Production in Dashboard
