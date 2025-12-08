# QA Environment Setup for Vercel Free Tier

## ⚠️ Free Tier Limitation

On Vercel's free tier, you **cannot rename preview environments** to "QA". You have:
- **Production** environment (one branch)
- **Preview** environments (all other branches)

## ✅ Recommended Approach for Free Tier

### Option 1: QA as Preview Environment (Recommended)

**Setup:**
- Keep `bookiji` as **production branch** (actual production)
- Use `qa` branch for **QA testing** (preview deployments)
- All deployment hooks deploy to `qa` branch → Creates preview deployments
- When ready, merge `qa` to `bookiji` → Deploys to production

**Benefits:**
- Clear separation: QA = preview, Production = production
- Easy to test QA without affecting production
- Free tier compatible

**Workflow:**
```
qa branch → Preview deployment (QA testing)
  ↓ (after testing)
bookiji branch → Production deployment
```

### Option 2: QA as Production Branch (Current Approach)

**Setup:**
- Set `qa` as **production branch** (QA environment uses production)
- `bookiji` branch creates preview deployments
- When ready, change production branch back to `bookiji`

**Limitation:**
- QA environment is technically "production" in Vercel
- Can be confusing

## 🔧 Updated Configuration

Since you're on free tier, we should use **Option 1**:

1. **Keep production branch as `bookiji`**
2. **Deploy to `qa` branch** for QA testing (preview deployments)
3. **Update deployment hooks** to deploy to `qa` branch
4. **Manual promotion**: Merge `qa` → `bookiji` when ready

## 📋 Next Steps

1. **Revert production branch** to `bookiji` (if changed)
2. **Update deployment hooks** to deploy to `qa` branch (preview)
3. **Test QA** using preview deployments from `qa` branch
4. **Promote to production** by merging to `bookiji` branch

## 🎯 Deployment Flow (Free Tier)

```
Development → qa branch → Preview Deployment (QA)
                              ↓ (test & verify)
                          bookiji branch → Production Deployment
```

This approach works perfectly with free tier limitations!
