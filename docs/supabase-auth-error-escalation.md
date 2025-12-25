# Supabase Auth Error Escalation

## Issue Summary

**Error**: `Database error querying schema` during `signInWithPassword`
**Status Code**: HTTP 500
**Error Code**: `unexpected_failure`
**Endpoint**: `/auth/v1/token?grant_type=password`

## Timing Proof (COMPLETED)

### Test Execution
- **Date**: 2025-01-25
- **Test User**: `e2e-vendor@bookiji.test`
- **Method**: Added logging around `signInWithPassword` call

### Console Logs
```
[LOG] 🔍 [TIMING PROOF] BEFORE signInWithPassword
[LOG] 🔍 [TIMING PROOF] Email: e2e-vendor@bookiji.test
[ERROR] Failed to load resource: the server responded with a status of 500 () 
        @ https://uradoazoyhhozbemrccj.supabase.co/auth/v1/token?grant_type=password:0
[LOG] 🔍 [TIMING PROOF] AFTER signInWithPassword
[ERROR] 🔍 [TIMING PROOF] signInWithPassword ERROR: {
  message: Database error querying schema, 
  status: 500, 
  name: AuthApiError, 
  code: unexpected_failure, 
  details: undefined
}
```

### Conclusion
**Error occurs INSIDE `signInWithPassword`** - before any application code executes.

## Database Introspection (COMPLETED)

### Triggers on auth.users
**Result**: 0 triggers found
```sql
SELECT tg.tgname, n.nspname, c.relname, p.proname, pg_get_triggerdef(tg.oid, true)
FROM pg_trigger tg
JOIN pg_class c ON c.oid = tg.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_proc p ON p.oid = tg.tgfoid
WHERE n.nspname = 'auth' AND c.relname = 'users' AND NOT tg.tgisinternal;
```

### Functions Referencing profiles/roles
**Result**: Only `calculate_profile_completion_score` found (not called during auth)
- Function is `SECURITY DEFINER`
- Queries `profiles` by `id` (not `auth_user_id`)
- Not executed during auth flow

### RLS Policies on profiles
**Result**: 3 policies found, all correct
1. `Anyone can view public profile info` - `SELECT` with `qual: true`
2. `Users can update own profile` - `UPDATE` with `qual: (auth.uid() = auth_user_id)`
3. `Users can view own profile` - `SELECT` with `qual: (auth.uid() = auth_user_id)`

**All policies use `auth_user_id` correctly.**

### Views
**Result**: No views with broken references found
- `user_role_summary` view does not exist (rolled back)
- No other views reference missing columns/tables

## Application Code Verification

### user_role_summary Query Disabled
- Query in `hooks/useAuth.ts` was commented out during timing proof
- Error still occurs, confirming it's not from app code

### No App Code Executed
- Error occurs before:
  - `useAuth` hook runs
  - `/api/auth/check-admin` is called
  - Any profile queries execute

## Root Cause Analysis

### Confirmed NOT:
- ❌ Database triggers on `auth.users`
- ❌ Broken RLS policies
- ❌ Missing/broken views
- ❌ Application code queries
- ❌ Migration issues

### Most Likely Cause:
**Supabase Auth Hook configured in Dashboard** that:
- Runs during `signInWithPassword` transaction
- References a missing/broken database object (view, function, or table)
- Uses incorrect column reference (`id` instead of `auth_user_id`)

### Required Investigation:
1. **Check Supabase Dashboard → Authentication → Hooks**
   - Look for hooks on: `before_login`, `after_login`, `before_user_created`, `after_user_created`
   - For each hook, identify:
     - Language (SQL / Edge Function)
     - Tables/views/functions queried
     - References to `profiles`, `roles`, `user_role_summary`
     - Column usage (`id` vs `auth_user_id`)

2. **Check Supabase Dashboard → Database → Functions**
   - Look for functions that might be called during auth
   - Check for `SECURITY DEFINER` functions that query `profiles`

## Reproduction Steps

1. Start development server: `pnpm dev`
2. Navigate to: `http://localhost:3000/login`
3. Attempt login with:
   - Email: `e2e-vendor@bookiji.test`
   - Password: `password123`
4. Observe error in browser console:
   ```
   AuthApiError: Database error querying schema
   ```

## Environment

- **Supabase Project**: `uradoazoyhhozbemrccj`
- **Supabase URL**: `https://uradoazoyhhozbemrccj.supabase.co`
- **Auth Endpoint**: `https://uradoazoyhhozbemrccj.supabase.co/auth/v1/token`
- **Database**: PostgreSQL (via Supabase)

## Request for Support

**Question**: What database objects (views, functions, triggers, or hooks) are queried during the `signInWithPassword` transaction that might reference:
- `profiles` table with incorrect column (`id` instead of `auth_user_id`)
- `user_role_summary` view (which does not exist)
- Other missing/broken database objects

**Expected Resolution**:
1. Identify the exact failing database object/reference
2. Provide minimal fix (correct column reference or remove broken reference)
3. Ensure fix does not widen permissions or create new objects

## Additional Context

- This is a **Permission Phase** project (no new features, correctness restoration only)
- Error blocks SimCity E2E Certification C-2 (Auth & Session Integrity)
- All database introspection completed - no issues found in application-managed objects
- Error occurs at Supabase Auth service level, not application level

