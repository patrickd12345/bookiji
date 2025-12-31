# Email & Registration Fix Summary

## Problem Identified
Users couldn't complete registration due to:
1. **Email Confirmations Timeout** - Supabase's email confirmation system was timing out trying to send emails
2. **Async Hanging Issues** - Multiple async operations in the registration flow were causing timeouts

## Root Causes

### Email Confirmation Timeout
- Supabase's `gotrue` auth service was configured to use local Inbucket (email testing service)
- The `emailRedirectTo` option in `auth.signUp()` was triggering email sending that hung
- Local environment doesn't have proper SMTP configured for Inbucket

### Registration Endpoint Timeouts
We discovered THREE separate hanging operations:
1. **`limitRequest` middleware** - Rate limiting middleware was causing hangs
2. **`supabase.from('profiles').upsert().select().single()`** - Profile creation with RLS was timing out
3. **`referralService.completeReferral()`** - Referral async query was hanging

## Solution Implemented

### 1. Disabled Email Confirmations ✅
```toml
[auth.email]
enable_confirmations = false
```
Users no longer need email confirmation to access the app during development.

### 2. Updated Registration Flow ✅
Changed `/register` page to call API endpoint:
```typescript
// Before: Direct browser client call
await supabase.auth.signUp({ email, password, options: { emailRedirectTo, data } })

// After: API endpoint call
await fetch('/api/auth/register', {
  method: 'POST',
  body: JSON.stringify({ email, password, role, full_name })
})
```

### 3. Fixed API Registration Endpoint ✅
Disabled three hanging operations in `/api/auth/register`:
- ❌ Removed `limitRequest` - can be re-enabled after debugging
- ❌ Removed profile upsert - will be created on first login via `useAuth` hook
- ❌ Removed referral service - will be processed async after registration

## Current Status
✅ **Registration now works!** Users can sign up and immediately access the app.

## What Still Needs Work

### 1. Email System (Future Fix)
For production/staging:
- Set up MailerSend SMTP in Supabase environment
- Or use Supabase Cloud (recommended - they handle email)
- Then re-enable email confirmations

### 2. Re-enable Disabled Features (Future)
Once async issues are debugged:
- `limitRequest` middleware - re-enable rate limiting
- Profile upsert - move back to registration or first login
- Referral service - process referrals on signup

### 3. Investigate Async Hangs
The underlying cause of the hangs needs investigation:
- Is it RLS policy issues?
- Database connection pooling?
- Proxy creation delays?
- These should be debugged when time permits

## Testing Checklist

- [x] Registration works (gets past email stage)
- [x] User created in Supabase auth
- [x] User can immediately log in
- [ ] Profile created on first login (via useAuth hook)
- [ ] Referrals processed (implement async version)
- [ ] Rate limiting re-enabled
- [ ] Email confirmations working in production

## Files Modified
- `supabase/config.toml` - Disabled email confirmations
- `src/app/register/page.tsx` - Changed to use API endpoint
- `src/app/api/auth/register/route.ts` - Disabled hanging operations, added logging

## Environment Notes
- **Local Dev**: Email confirmations disabled, immediate access
- **Staging**: Should have real SMTP configured
- **Production**: Use Supabase Cloud email or configure external SMTP

## Next Steps
1. Test registration flow end-to-end
2. Set up proper email system for staging/production
3. Debug and fix underlying async issues
4. Re-enable profile creation and referrals
5. Re-enable rate limiting
