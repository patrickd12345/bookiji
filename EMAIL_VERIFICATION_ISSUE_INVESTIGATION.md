# Email Verification Issue - Investigation & Findings

## Status
🚨 **PARTIALLY RESOLVED** - Configuration in place, runtime issue remains

## Problem Statement
Users reported not receiving verification emails after registration, despite Supabase being configured for email confirmations.

## Root Cause Analysis

### What We Discovered

1. **Supabase Email Handling**
   - Local Supabase uses `gotrue` (auth service) to send confirmation emails
   - By default, it's configured to use local Inbucket (email testing service)
   - Environment variables: `GOTRUE_SMTP_*` control the SMTP configuration
   - The docker container receives these env vars at start time only

2. **Configuration Attempts**
   - ❌ Setting env vars in PowerShell shell session doesn't persist to docker containers
   - ❌ TOML-based configuration (`supabase/config.toml`) doesn't support external SMTP settings
   - ✅ Created `start-supabase-with-mailersend.ps1` script to set env vars before starting

3. **Verification Tests Performed**
   - ✅ Confirmed Supabase auth service responds directly (`/auth/v1/signup` works)
   - ✅ Confirmed MailerSend SMTP is reachable from dev machine (port 587)
   - ✅ Confirmed Supabase auth container still receives default Inbucket config (not MailerSend)
   - ✅ Registration API endpoint hangs when email confirmations are enabled

4. **Registration Timeout Issue**
   - When `enable_confirmations = true`, registration times out
   - Appears to be happening in the Supabase auth service when it tries to send the email
   - Since Supabase is still using local Inbucket (not MailerSend), the email pipeline hangs
   - Likely due to network isolation or Inbucket service not being fully operational

## Solution Path

### Short Term (Development)
1. **Disable email confirmations for dev**
   ```toml
   [auth.email]
   enable_confirmations = false
   ```
   This allows registration to proceed without email verification.

2. **Use Startup Script**
   ```bash
   powershell -ExecutionPolicy Bypass -File start-supabase-with-mailersend.ps1
   ```
   This script sets GOTRUE SMTP env vars before starting Supabase.

### Long Term (Production/Staging)
1. **Use Supabase Cloud** - Supabase Cloud handles email sending for you
2. **Custom SMTP Integration** - If self-hosting, configure Supabase with external SMTP at deployment time
3. **Environment Variables** - Document required env vars for deployment:
   ```
   GOTRUE_SMTP_HOST=smtp.mailersend.net
   GOTRUE_SMTP_PORT=587
   GOTRUE_SMTP_USER=MS_DHvbrC@bookiji.com
   GOTRUE_SMTP_PASS=<api_key>
   GOTRUE_SMTP_ADMIN_EMAIL=noreply@bookiji.com
   GOTRUE_SMTP_SENDER_NAME=Bookiji
   ```

## Files Modified
- `supabase/config.toml` - Email confirmation settings adjusted
- `start-supabase-with-mailersend.ps1` - Script to start Supabase with SMTP config
- `src/app/api/auth/register/route.ts` - Reverted to original (should use supabaseAdmin for profile creation when fixed)

## Next Steps
1. Test registration flow WITHOUT email confirmations
2. For production, use Supabase Cloud or implement proper SMTP configuration at deployment time
3. Consider adding pre-signup email validation or post-signup email verification via separate service
4. Document the email setup process for team/deployment

## References
- Supabase GoTrue documentation: Configuration options
- MailerSend SMTP: `smtp.mailersend.net:587`
- Local development: Email confirmations should be disabled or use internal service
