# Vercel Preview Authentication Setup for SimCity

**Purpose:** Configure Vercel preview deployments to allow SimCity authentication access.

## Problem

Preview deployments were password-protected, blocking external requests to the SimCity authentication endpoint (`/api/(dev)/simcity-auth`). This prevented chaos testing from authenticating.

## Solution

### Step 1: Disable Preview Password Protection

**Option A: Via vercel.json (Recommended)**

The `vercel.json` file has been updated to disable preview password protection:

```json
{
  "preview": {
    "passwordProtection": false
  }
}
```

**Option B: Via Vercel Dashboard**

1. Go to: https://vercel.com/[your-team]/bookiji/settings/security
2. Find "Preview Protection" section
3. Set to **OFF** or **Disabled**
4. Save changes

**Important:** This only affects Preview deployments. Production protection remains unchanged.

### Step 2: Set Environment Variables in Vercel

In Vercel → Project → Settings → Environment Variables, add for **Preview** only:

| Variable | Value | Environment |
|----------|-------|-------------|
| `ENABLE_STAGING_INCIDENTS` | `true` | Preview |
| `APP_ENV` | `staging` | Preview |
| `NODE_ENV` | `development` | Preview |

**Critical:** 
- ✅ Apply to **Preview** only
- ❌ Do **NOT** apply to Production
- ✅ Redeploy preview after setting variables

### Step 3: Verify Route Accessibility

After redeploying, verify the endpoint is accessible:

```bash
curl https://your-preview-url.vercel.app/api/(dev)/simcity-auth
```

**Expected Response:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "userId": "uuid",
  "email": "simcity-staging@bookiji.test",
  "expiresAt": 1234567890,
  "expiresIn": 3600
}
```

**If you get HTML:**
- Preview password protection is still enabled
- Check Vercel dashboard settings
- Verify `vercel.json` was deployed

**If you get 403:**
- Environment variables not set
- `ENABLE_STAGING_INCIDENTS` not `true`
- `NODE_ENV` is `production`

### Step 4: Run Deployment Precheck

Before running chaos, verify preview access:

```bash
STAGING_URL=https://your-preview-url.vercel.app \
  node chaos/sessions/verify-preview-access.mjs
```

This script:
- ✅ Fetches `/api/(dev)/simcity-auth`
- ✅ Asserts HTTP 200 JSON (NOT HTML)
- ✅ Exits non-zero if blocked

## Verification Checklist

After configuration:

- [ ] `vercel.json` includes `"preview": { "passwordProtection": false }`
- [ ] Preview password protection disabled in Vercel dashboard
- [ ] Environment variables set for Preview only:
  - [ ] `ENABLE_STAGING_INCIDENTS=true`
  - [ ] `APP_ENV=staging`
  - [ ] `NODE_ENV=development`
- [ ] Preview redeployed after changes
- [ ] `/api/(dev)/simcity-auth` returns JSON (not HTML)
- [ ] Precheck script passes: `verify-preview-access.mjs`

## Security Notes

1. **Preview Only:** Password protection disabled only for Preview deployments
2. **Production Unchanged:** Production deployments remain protected
3. **Gated Endpoint:** SimCity auth endpoint still gated by:
   - `NODE_ENV !== 'production'`
   - `ENABLE_STAGING_INCIDENTS === 'true'`
4. **Reversible:** Can re-enable preview protection anytime

## Troubleshooting

### "Authentication Required" HTML Response

**Cause:** Preview password protection still enabled

**Fix:**
1. Check `vercel.json` includes preview config
2. Verify in Vercel dashboard: Settings → Security → Preview Protection = OFF
3. Redeploy preview

### 403 Forbidden Response

**Cause:** Environment gates not met

**Fix:**
1. Verify `ENABLE_STAGING_INCIDENTS=true` in Vercel Preview env vars
2. Verify `NODE_ENV` is NOT `production` in Preview env vars
3. Redeploy preview

### Endpoint Not Found (404)

**Cause:** Route not deployed or path incorrect

**Fix:**
1. Verify route exists: `src/app/api/(dev)/simcity-auth/route.ts`
2. Check deployment logs for build errors
3. Verify Next.js route group syntax is correct

## Files Modified

1. **`vercel.json`** - Added preview password protection disable
2. **`chaos/sessions/verify-preview-access.mjs`** - Deployment precheck script (NEW)
3. **`docs/deployment/VERCEL_PREVIEW_AUTH_SETUP.md`** - This documentation (NEW)

## Next Steps

Once preview access is verified:
1. Run preflight: `node chaos/sessions/verify-staging-auth.mjs`
2. Run authenticated chaos: `node chaos/sessions/authenticated-chaos-staging.mjs`






















