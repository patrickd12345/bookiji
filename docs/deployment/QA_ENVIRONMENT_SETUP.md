# QA Environment Setup Guide

## Overview

This guide explains how to set up a QA environment in Vercel and configure all deployment hooks to deploy to QA instead of production.

## Vercel Environment Configuration

Vercel supports one production branch per project. To create a QA environment:

1. **Create QA Branch**
   ```bash
   git checkout -b qa
   git push origin qa
   ```

2. **Configure Vercel Production Branch**
   - Go to: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookijibck/settings/git
   - Change **Production Branch** from `bookiji` to `qa`
   - Save changes

3. **Result**
   - Deployments to `qa` branch → Production environment (QA)
   - Deployments to `bookiji` branch → Preview deployments
   - You can manually promote QA to production by changing the production branch back to `bookiji`

## Deployment Flow

### Current Setup (After Changes)
```
Push to qa branch → QA Environment (Vercel Production)
Push to bookiji branch → Preview Deployment
Manual Promotion → Change Vercel production branch to bookiji
```

### Manual Promotion Process
1. Test QA environment thoroughly
2. Go to Vercel Dashboard → Settings → Git
3. Change Production Branch from `qa` to `bookiji`
4. Vercel will automatically deploy `bookiji` branch to production

## Updated Deployment Hooks

All deployment hooks have been updated to deploy to QA:

- ✅ `trigger-deploy.js` - Deploys to QA branch
- ✅ GitHub Actions workflows - Deploy to QA environment
- ✅ Canary promotion - Promotes to QA instead of production

## Environment Variables

QA environment should have its own environment variables in Vercel:
- Go to: Project Settings → Environment Variables
- Configure QA-specific values (e.g., different API keys, test databases)

## Verification

After setup, verify:
1. Push to `qa` branch triggers QA deployment
2. QA environment is accessible at your production domain
3. All hooks deploy to QA, not production
4. Manual promotion process works
