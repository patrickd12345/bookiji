# Timing Proof Instructions

## Objective
Prove whether "Database error querying schema" happens:
- **A)** Inside `supabase.auth.signInWithPassword` (database-level issue)
- **B)** Immediately after, from app code querying a missing relation (likely `user_role_summary`)

## Changes Made

### 1. Added Logging to `src/app/login/page.tsx`
- Logs `🔍 [TIMING PROOF] BEFORE signInWithPassword`
- Logs full error details if `signInWithPassword` fails
- Logs `🔍 [TIMING PROOF] AFTER signInWithPassword` with success details
- Logs before/after `check-admin` API call

### 2. Disabled `user_role_summary` Query in `hooks/useAuth.ts`
- Commented out the `.from('user_role_summary')` query
- Now queries `profiles` table directly using `auth_user_id`
- Added logging to show when querying profiles directly

## How to Run the Test

1. **Start the development server:**
   ```bash
   pnpm dev
   ```

2. **Open browser DevTools Console** (F12 → Console tab)

3. **Navigate to login page:**
   ```
   http://localhost:3000/login
   ```

4. **Attempt login with test user:**
   - Email: `e2e-vendor@bookiji.test`
   - Password: `password123`

5. **Observe console logs:**
   Look for logs prefixed with `🔍 [TIMING PROOF]`:
   - If error appears **BEFORE** "AFTER signInWithPassword" → Error is in `signInWithPassword` (Option A)
   - If error appears **AFTER** "AFTER signInWithPassword" → Error is from app code (Option B)

## Expected Log Sequence

### If signInWithPassword succeeds:
```
🔍 [TIMING PROOF] BEFORE signInWithPassword
🔍 [TIMING PROOF] AFTER signInWithPassword
🔍 [TIMING PROOF] signInWithPassword SUCCESS: { userId: ..., email: ..., hasSession: true }
🔍 [TIMING PROOF] BEFORE check-admin API call
🔍 [TIMING PROOF] AFTER check-admin API call, status: 200
🔍 [TIMING PROOF] check-admin result: { isAdmin: false }
```

### If signInWithPassword fails:
```
🔍 [TIMING PROOF] BEFORE signInWithPassword
🔍 [TIMING PROOF] AFTER signInWithPassword
🔍 [TIMING PROOF] signInWithPassword ERROR: { message: "Database error querying schema", ... }
```

## Next Steps After Proof

### If Option A (error in signInWithPassword):
- Root cause is database-level (trigger, hook, or view referenced during auth)
- Need to check Supabase Dashboard → Authentication → Hooks
- May need to inspect database-level auth hooks

### If Option B (error from app code):
- Root cause is missing `user_role_summary` view
- **Option A (preferred)**: Replace `user_role_summary` usage with direct queries to `profiles` + `user_roles`
- **Option B (only if required)**: Recreate `user_role_summary` view with minimal grants (no `anon` access)

## Cleanup

After proof is complete, remove:
- All `🔍 [TIMING PROOF]` log statements
- Commented-out `user_role_summary` query code
- This instruction file

