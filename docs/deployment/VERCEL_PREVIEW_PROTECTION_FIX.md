# Vercel Preview Protection - Manual Fix Required

## Critical Information

**Preview Protection in Vercel is NOT controlled by `vercel.json`.**

The `preview` property is not a valid Vercel configuration option. Preview protection must be disabled manually in the Vercel Dashboard.

## Required Action

### Disable Preview Protection in Vercel Dashboard

1. Go to: **Vercel Dashboard** → Your Project → **Settings** → **Security**
2. Find **"Preview Protection"** section
3. Set to **OFF** or **Disabled**
4. **Save changes**

This must be done manually - it cannot be automated via `vercel.json`.

## Why This Matters

SimCity chaos testing requires external access to:
- `/api/(dev)/simcity-auth` - Authentication endpoint
- `/api/health` - Health check endpoint
- Other API endpoints for chaos scenarios

If Preview Protection is enabled, all requests return HTML authentication pages instead of JSON responses.

## Verification

After disabling Preview Protection in the dashboard:

1. Deploy a new preview:
   ```bash
   vercel deploy
   ```

2. Verify access:
   ```bash
   STAGING_URL=https://new-preview-url.vercel.app \
     node chaos/sessions/verify-preview-access.mjs
   ```

3. Expected result: ✅ PASS (HTTP 200 JSON, not HTML)

## Files

- `vercel.json` - Does NOT control preview protection (kept clean)
- `docs/deployment/VERCEL_PREVIEW_PROTECTION_FIX.md` - This document

## Next Steps

1. ✅ Disable Preview Protection in Vercel Dashboard
2. ✅ Deploy new preview deployment
3. ✅ Run `verify-preview-access.mjs`
4. ✅ If pass, proceed with authenticated chaos




