# Production Log Investigation Report

**Date:** January 1, 2026  
**Status:** 🔴 **UNHEALTHY** - Critical issues detected

## Executive Summary

Production site is experiencing **critical Supabase API key configuration issues** causing database and search services to fail. The site is serving HTML but backend services are non-functional.

## Issues Found

### 1. 🔴 Database Service: UNHEALTHY
- **Error:** "Unregistered API key"
- **Latency:** 298ms
- **Impact:** Database queries failing

### 2. 🔴 Search Service: UNHEALTHY  
- **Error:** "Unregistered API key"
- **Latency:** 282ms
- **Impact:** Search functionality unavailable

### 3. ⚠️ Cache Service: DEGRADED
- **Status:** Cache queue check unavailable
- **Impact:** Reduced performance

### 4. ✅ Webhooks Service: HEALTHY
- **Status:** Normal operation
- **DLQ Size:** 0

### 5. ✅ Auth Service: HEALTHY
- **Status:** Operational
- **Latency:** 2ms

## Root Cause

The production environment is missing or has incorrect Supabase API keys configured in Vercel. According to the codebase:

1. **Required Environment Variables:**
   - `PROD_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
   - `PROD_SUPABASE_PUBLISHABLE_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
   - `PROD_SUPABASE_SECRET_KEY` or `SUPABASE_SECRET_KEY`

2. **Key Model:** The project uses the NEW Supabase key model (not legacy keys):
   - ✅ `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (not `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
   - ✅ `SUPABASE_SECRET_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`)

## Health Check Results

```json
{
  "status": "unhealthy",
  "subsystems": {
    "db": {
      "status": "unhealthy",
      "latency": 298,
      "error": "Unregistered API key"
    },
    "webhooks": {
      "status": "healthy",
      "dlqSize": 0
    },
    "cache": {
      "status": "degraded",
      "message": "Cache queue check unavailable"
    },
    "search": {
      "status": "unhealthy",
      "latency": 282,
      "error": "Unregistered API key"
    },
    "auth": {
      "status": "healthy",
      "latency": 2
    }
  }
}
```

## Log Analysis

- **Error Logs:** 0 errors in last 24 hours (logs are empty, suggesting logging may not be capturing these errors)
- **System Logs:** 0 system logs in last 24 hours
- **Incidents:** 0 active incidents
- **SLO Status:** Low risk, but SLO monitoring not configured

## Immediate Actions Required

### 1. Verify Vercel Environment Variables
Check Vercel dashboard → Project Settings → Environment Variables:

**Required for Production:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` - Supabase publishable key
- `SUPABASE_SECRET_KEY` - Supabase secret key (server-only)

**Optional (if using environment-specific keys):**
- `PROD_SUPABASE_URL`
- `PROD_SUPABASE_PUBLISHABLE_KEY`
- `PROD_SUPABASE_SECRET_KEY`

### 2. Verify Supabase Project Keys
1. Go to Supabase Dashboard → Project Settings → API
2. Verify the keys match what's configured in Vercel
3. Ensure keys haven't been rotated or expired

### 3. Check APP_ENV Variable
The code checks `APP_ENV` to determine which keys to use:
- If `APP_ENV=prod`, it looks for `PROD_SUPABASE_*` keys
- Otherwise, it falls back to `NEXT_PUBLIC_SUPABASE_*` keys

### 4. Redeploy After Fix
After updating environment variables:
```bash
# Trigger a new deployment to pick up the changes
vercel deploy --prod
```

## Testing After Fix

1. **Health Check:**
   ```bash
   curl https://www.bookiji.com/api/ops/health
   ```
   Expected: All subsystems should show "healthy"

2. **Database Test:**
   ```bash
   curl https://www.bookiji.com/api/ops/logs/errors
   ```
   Should return without "Unregistered API key" errors

3. **Search Test:**
   ```bash
   curl https://www.bookiji.com/api/ops/logs/system
   ```
   Should return without "Unregistered API key" errors

## Additional Notes

- The site HTML is loading correctly, indicating frontend deployment is working
- The issue is specifically with backend API services that require Supabase
- No errors are being logged, suggesting the error handling may need improvement
- The "Unregistered API key" error typically means:
  - Key is missing
  - Key is incorrect/typo
  - Key has been rotated/expired
  - Key doesn't have proper permissions

## References

- Supabase Migration Guide: `docs/deployment/SUPABASE_MIGRATION_GUIDE.md`
- Environment Configuration: `src/lib/env/supabaseEnv.ts`
- Health Check Endpoint: `src/app/api/ops/health/route.ts`
