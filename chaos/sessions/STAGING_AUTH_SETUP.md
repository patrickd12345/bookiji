# Staging Authentication Setup for SimCity

**Purpose:** Enable authenticated chaos testing in STAGING environment.

## Overview

This document describes the staging-only authentication mechanism that allows SimCity chaos sessions to make authenticated requests to the Bookiji staging API.

## Implementation Summary

### 1. Authentication Endpoint

**Endpoint:** `GET /api/(dev)/simcity-auth`

**Purpose:** Returns a Supabase JWT session token for SimCity chaos testing.

**Gates (ALL must pass):**
- `NODE_ENV` MUST NOT be `'production'`
- `ENABLE_STAGING_INCIDENTS` MUST be `'true'`
- `APP_ENV` MUST be `'staging'` or `'local'` (or undefined for backward compat)

**Behavior:**
- Creates/ensures test user: `simcity-staging@bookiji.test`
- Returns real Supabase JWT session token
- Logs all usage for audit
- Fails closed if gates are not met

### 2. Test User Identity

**Email:** `simcity-staging@bookiji.test`

**Role:** `system-tester`

**Metadata:**
- `is_synthetic: true`
- `created_for: 'simcity-chaos-testing'`

**Password:** Generated dynamically (stored in session, not committed)

### 3. Health Endpoint Enhancement

**Endpoint:** `GET /api/health`

**Behavior:**
- Works with or without authentication
- Returns user context if authenticated
- Returns basic health if unauthenticated

## Required Environment Variables

```bash
# Required for auth endpoint to work
NODE_ENV=development  # or 'staging', but NOT 'production'
ENABLE_STAGING_INCIDENTS=true
APP_ENV=staging  # or 'local', or undefined

# Required Supabase credentials (from .env.local)
NEXT_PUBLIC_SUPABASE_URL=<staging-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<staging-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<staging-service-role-key>
```

## How SimCity Should Authenticate

### Step 1: Get Authentication Token

```bash
curl -X GET "https://staging-url.vercel.app/api/(dev)/simcity-auth"
```

**Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid-here",
  "email": "simcity-staging@bookiji.test",
  "expiresAt": 1234567890,
  "expiresIn": 3600
}
```

### Step 2: Use Token in Requests

```bash
curl -X GET "https://staging-url.vercel.app/api/health" \
  -H "Authorization: Bearer <token>"
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-01-27T...",
  "version": "1.0.0",
  "environment": "staging",
  "authenticated": true,
  "userId": "uuid-here"
}
```

### Step 3: Use in Chaos Sessions

Set environment variable:
```bash
export CHAOS_AUTH_TOKEN="<token-from-step-1>"
```

Then use in requests:
```javascript
const response = await fetch(`${BASE_URL}/api/bookings/create`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CHAOS_AUTH_TOKEN}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
})
```

## Preflight Verification

Run the preflight verifier before chaos sessions:

```bash
STAGING_URL=https://staging-url.vercel.app \
  ENABLE_STAGING_INCIDENTS=true \
  node chaos/sessions/verify-staging-auth.mjs
```

This script:
1. Authenticates via `/api/(dev)/simcity-auth`
2. Verifies unauthenticated request returns 401
3. Verifies authenticated request returns 200 JSON
4. Exits non-zero on failure

## How to Revoke / Disable

### Option 1: Remove Environment Flag

```bash
unset ENABLE_STAGING_INCIDENTS
```

The endpoint will return 403.

### Option 2: Delete the Endpoint

Delete the file:
```
src/app/api/(dev)/simcity-auth/route.ts
```

### Option 3: Set Production Mode

```bash
export NODE_ENV=production
```

The endpoint will return 403.

## Security Notes

1. **Gated by Environment:** Only works when `NODE_ENV !== 'production'` and `ENABLE_STAGING_INCIDENTS=true`
2. **Audit Logging:** All access attempts are logged with IP, user agent, and environment context
3. **Fail Closed:** If gates are not met, endpoint returns 403
4. **Reversible:** Delete the endpoint file to disable completely
5. **No Production Impact:** Endpoint is in `(dev)` route group and gated by environment checks

## Verification Checklist

- [ ] Unauthenticated request to `/api/health` → Returns 200 (basic health) or 401 (if protected)
- [ ] Authenticated request to `/api/health` → Returns 200 JSON with `authenticated: true`
- [ ] Auth endpoint with `NODE_ENV=production` → Returns 403
- [ ] Auth endpoint without `ENABLE_STAGING_INCIDENTS=true` → Returns 403
- [ ] Auth endpoint with correct gates → Returns 200 with token
- [ ] Token works for authenticated requests
- [ ] Preflight verifier passes

## Files Created/Modified

1. **`src/app/api/(dev)/simcity-auth/route.ts`** - Authentication endpoint (NEW)
2. **`src/app/api/health/route.ts`** - Enhanced to support authenticated requests (MODIFIED)
3. **`chaos/sessions/verify-staging-auth.mjs`** - Preflight verification script (NEW)
4. **`chaos/sessions/STAGING_AUTH_SETUP.md`** - This documentation (NEW)

## Next Steps

Once authentication is verified:
1. Update chaos sessions to use authentication tokens
2. Run preflight verifier before each chaos run
3. Observe authenticated requests reaching business logic
4. Verify incidents are created with authenticated context






















