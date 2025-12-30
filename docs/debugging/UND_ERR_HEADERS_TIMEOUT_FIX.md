# UND_ERR_HEADERS_TIMEOUT Fix - Root Cause Analysis

## Problem Summary

The `pnpm e2e:seed` command was failing with `UND_ERR_HEADERS_TIMEOUT` errors when calling Supabase Admin APIs (`GoTrueAdminApi.listUsers` and `GoTrueAdminApi.createUser`).

## Root Cause Analysis

### Primary Causes (Ranked)

1. **IPv6 Resolution Issue (Most Likely)**
   - **Problem**: On Windows, `localhost` resolves to IPv6 address `::1`
   - **Impact**: Supabase Docker containers typically listen on IPv4 `127.0.0.1` only
   - **Result**: Node.js/undici attempts IPv6 connection, hangs, times out waiting for headers
   - **Evidence**: Error occurs before headers are received, indicating connection never establishes

2. **Default Timeout Too Short**
   - **Problem**: Default undici timeout may be insufficient for "cold" Supabase instances
   - **Impact**: Admin operations (listUsers, createUser) can take longer during initial connection
   - **Result**: Timeout occurs before operation completes

3. **Missing Error Diagnostics**
   - **Problem**: Generic `fetch failed` errors don't provide actionable guidance
   - **Impact**: Difficult to distinguish between network, configuration, and Supabase state issues
   - **Result**: Time wasted debugging wrong causes

### Secondary Factors

- **No Custom Fetch Configuration**: Supabase clients created without timeout/IPv4 handling
- **Environment-Specific**: Issue manifests on Windows more frequently due to IPv6 preference
- **Docker State**: Local Supabase containers may not be running or accessible

## Solution Implemented

### 1. Created Utility Function (`scripts/e2e/createSupabaseAdmin.ts`)

A centralized utility that:
- **Forces IPv4**: Automatically replaces `localhost` with `127.0.0.1` in URLs
- **Sets Explicit Timeout**: 60-second timeout using `AbortSignal.timeout()`
- **Provides Clear Diagnostics**: Detailed error messages for timeout scenarios

### 2. Applied Fix to Critical Paths

- ✅ `scripts/e2e/seed-users.ts` - Main seeding script
- ✅ `tests/e2e/helpers/supabaseAdmin.ts` - E2E test helper

### 3. Enhanced Error Handling

- Explicit checks for `UND_ERR_HEADERS_TIMEOUT` code
- Context-aware error messages (local vs remote Supabase)
- Actionable troubleshooting steps in error output

## Code Changes

### Before
```typescript
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})
```

### After
```typescript
import { createSupabaseAdminClient } from './createSupabaseAdmin'

const supabaseAdmin = createSupabaseAdminClient(
  SUPABASE_URL!,
  SUPABASE_SERVICE_ROLE_KEY!,
  {
    timeoutMs: 60000, // 60 second timeout
    forceIPv4: true   // Force IPv4 to avoid IPv6 issues
  }
)
```

## Verification

### Test Script
Created `scripts/e2e/test-admin-connection.ts` to verify:
- IPv4 normalization works
- Timeout configuration is applied
- Error diagnostics are helpful

### Manual Testing
```bash
# Test the connection utility
pnpm tsx scripts/e2e/test-admin-connection.ts

# Test the full seeding flow
pnpm e2e:seed
```

## Troubleshooting Guide

### If Error Persists

1. **Check Supabase Status**
   ```bash
   npx supabase status
   ```

2. **Verify Docker is Running**
   - Docker Desktop must be running
   - Check: `docker ps` shows Supabase containers

3. **Test Direct Connection**
   ```bash
   curl http://127.0.0.1:55321/rest/v1/
   ```

4. **Check Environment Variables**
   ```bash
   # Verify these are set correctly
   echo $SUPABASE_URL
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

5. **For Remote Supabase**
   - Verify project is active (not paused) in dashboard
   - Check API keys are valid
   - Test with curl:
     ```bash
     curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
          $SUPABASE_URL/rest/v1/
     ```

6. **Network Issues**
   - Disable VPN/proxy if interfering
   - Check firewall settings
   - Verify no port conflicts

## Related Files

- `scripts/e2e/createSupabaseAdmin.ts` - Utility function
- `scripts/e2e/seed-users.ts` - Main seeding script (updated)
- `tests/e2e/helpers/supabaseAdmin.ts` - Test helper (updated)
- `scripts/e2e/test-admin-connection.ts` - Test script

## Future Improvements

Consider applying the same fix to:
- `scripts/reset-users.ts`
- Other scripts that create admin clients
- Server-side admin client creation in API routes

## References

- [Node.js AbortSignal.timeout](https://nodejs.org/api/globals.html#abortsignaltimeoutdelay)
- [Supabase Admin API Docs](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Undici Timeout Errors](https://github.com/nodejs/undici/issues)

