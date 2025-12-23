# Local Cron Jobs Setup

This document explains how to run cron jobs locally during development.

## Overview

The project includes cron jobs for:
- **KB Auto-Deduplication**: Runs hourly to check for duplicate KB suggestions
- **KB Crawl**: Runs weekly (Mondays 2 AM UTC) to crawl and index the knowledge base
- **KB Ensure Embeddings**: Runs every 6 hours to ensure KB articles are vectorized
- **Sitemap Refresh**: Runs weekly (Mondays 3 AM UTC) to refresh and submit sitemap to search engines

In production, these run via Vercel Cron Jobs. For local development, use the local cron scheduler.

## Quick Start

### 1. Start the Local Cron Scheduler

In a separate terminal, run:

```bash
pnpm dev:cron
```

This will start the local cron scheduler which runs the same jobs as production, but on your local schedule.

### 2. Run Alongside Dev Server

You can run both the dev server and cron scheduler together:

**Terminal 1:**
```bash
pnpm dev
```

**Terminal 2:**
```bash
pnpm dev:cron
```

## Schedules

### KB Auto-Deduplication
- **Production**: Every hour (`0 * * * *`)
- **Local**: Every hour (`0 * * * *`)

### KB Crawl
- **Production**: Weekly, Mondays at 2 AM UTC (`0 2 * * 1`)
- **Local**: Weekly, Mondays at 2 AM UTC (`0 2 * * 1`)
- **Local Test Mode**: Every 6 hours (if `LOCAL_CRON_TEST_MODE=true`)

### KB Ensure Embeddings
- **Production**: Every 6 hours (`0 */6 * * *`)
- **Local**: Every 6 hours (`0 */6 * * *`)

### Sitemap Refresh
- **Production**: Weekly, Mondays at 3 AM UTC (`0 3 * * 1`)
- **Local**: Weekly, Mondays at 3 AM UTC (`0 3 * * 1`)
- **Local Test Mode**: Daily at 3 AM UTC (if `LOCAL_CRON_TEST_MODE=true`)

## Environment Variables

The local cron scheduler uses these environment variables:

```bash
# Required
NEXT_PUBLIC_APP_URL=http://localhost:3000
ADMIN_API_KEY=dev-admin-key

# Optional (defaults provided)
VERCEL_CRON_SECRET=local-dev-secret  # Defaults to 'local-dev-secret' in dev
LOCAL_CRON_TEST_MODE=true            # Enable more frequent test runs
```

## Test Mode

For faster testing during development, set `LOCAL_CRON_TEST_MODE=true`:

```bash
LOCAL_CRON_TEST_MODE=true pnpm dev:cron
```

This will run the KB crawl every 6 hours instead of weekly.

## Manual Triggering

You can also manually trigger cron jobs:

### Via Admin Cockpit
1. Open the admin cockpit
2. Go to the "Knowledge Base Status" section
3. Click "🕷️ Crawl" or "🔍 Dedupe" buttons

### Via API (with auth)
```bash
# KB Auto-Deduplication
curl -X GET http://localhost:3000/api/cron/kb-auto-dedupe \
  -H "Authorization: Bearer local-dev-secret"

# KB Crawl
curl -X GET http://localhost:3000/api/cron/kb-crawl \
  -H "Authorization: Bearer local-dev-secret"

# Sitemap Refresh
curl -X GET http://localhost:3000/api/cron/sitemap-refresh \
  -H "Authorization: Bearer local-dev-secret"
```

## Troubleshooting

### Cron scheduler won't start
- Make sure `NODE_ENV` is not set to `production`
- Check that the dev server is running on `http://localhost:3000`
- Verify environment variables are set in `.env.local`

### Jobs not running
- Check the cron scheduler logs for errors
- Verify the dev server is accessible at `NEXT_PUBLIC_APP_URL`
- Ensure `ADMIN_API_KEY` is set correctly

### Jobs running but failing
- Check the dev server logs for API errors
- Verify database connection is working
- Check that required environment variables are set

## Production vs Local

| Feature | Production | Local |
|---------|-----------|-------|
| Scheduler | Vercel Cron | node-cron |
| Authentication | VERCEL_CRON_SECRET | local-dev-secret (dev) |
| KB Crawl Schedule | Weekly (Mondays 2 AM) | Weekly (Mondays 2 AM) or every 6h (test mode) |
| KB Ensure Embeddings Schedule | Every 6 hours | Every 6 hours |
| Sitemap Refresh Schedule | Weekly (Mondays 3 AM) | Weekly (Mondays 3 AM) or daily (test mode) |
| Auto-Dedupe Schedule | Hourly | Hourly |

## Notes

- The local cron scheduler only runs when `NODE_ENV !== 'production'`
- In production, Vercel Cron Jobs handle scheduling automatically
- The same cron endpoints are used in both environments
- Local development uses a default secret (`local-dev-secret`) if `VERCEL_CRON_SECRET` is not set

