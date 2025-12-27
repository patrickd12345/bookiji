# Staging Environment Setup Guide

This document provides step-by-step instructions for setting up the Bookiji staging Supabase environment.

## Prerequisites

1. **Supabase CLI installed and authenticated**
   ```bash
   supabase login
   ```
   
   **Important:** CLI authentication is separate from app credentials:**
   - CLI uses `sbp_...` token (stored internally by CLI)
   - **DO NOT** set `SUPABASE_ACCESS_TOKEN` in `.env`
   - **DO NOT** confuse with `SUPABASE_ANON_KEY` or `SERVICE_ROLE_KEY`
   - If you see "Invalid access token format" → run `supabase login`

2. **Preflight Check (REQUIRED)**
   ```bash
   pnpm supabase:doctor
   ```
   
   **Run this before any Supabase CLI operations.** It verifies CLI authentication and fails fast with clear instructions if not authenticated. This prevents 30-minute debugging spirals.

2. **Organization ID**
   - Get from: https://supabase.com/dashboard/organizations
   - Or from existing project settings

3. **Production project reference** (for reference only - DO NOT TOUCH)
   - Production ref: `uradoazoyhhozbemrccj`
   - This project must remain untouched

## Quick Setup (Automated)

Run the setup script:

```powershell
.\scripts\setup-staging-env.ps1 -OrgId "your-org-id" -Region "us-east-1"
```

The script will:
1. Create staging project
2. Link local repo to staging
3. Retrieve API keys
4. Apply migrations
5. Provide environment variable configuration

## Manual Setup (Step-by-Step)

### Step 1: Create Staging Project

```bash
supabase projects create "Bookiji – Staging" \
  --org-id <YOUR_ORG_ID> \
  --region us-east-1 \
  --db-password "Bookiji2024!"
```

Save the project reference (ref) from the output.

### Step 2: Link to Staging

```bash
# Unlink any existing project
supabase unlink

# Link to staging
supabase link --project-ref <STAGING_PROJECT_REF>
```

Verify in `supabase/config.toml` that the project is linked.

### Step 3: Retrieve API Keys

```bash
supabase projects api-keys list <STAGING_PROJECT_REF>
```

Or get from dashboard:
- https://supabase.com/dashboard/project/<STAGING_PROJECT_REF>/settings/api

Save:
- `anon` key → `STAGING_SUPABASE_ANON_KEY`
- `service_role` key → `STAGING_SUPABASE_SERVICE_KEY`

### Step 4: Apply Migrations

**Before applying migrations, run preflight check:**
```bash
pnpm supabase:doctor
```

Then apply migrations:
```bash
# Check current migration status
supabase migration list --remote

# Apply all migrations
supabase db push
```

**Important:** If migration history mismatches:
1. Check: `supabase migration list --remote`
2. Repair if needed: `supabase migration repair`
3. Retry: `supabase db push`

**Never** run SQL directly in dashboard.

### Step 5: Configure Environment Variables

#### Local Development (.env.local)

```env
APP_ENV=staging
STAGING_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
STAGING_SUPABASE_ANON_KEY=<anon_key>
STAGING_SUPABASE_SERVICE_KEY=<service_role_key>
```

#### CI/CD (GitHub Secrets)

Add these secrets:
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_KEY`
- `APP_ENV=staging` (as environment variable)

**Critical:** Ensure CI never uses `PROD_*` variables.

## Verification

### 1. Environment Boot Test

```bash
APP_ENV=staging pnpm dev
```

Should boot without errors.

### 2. Supabase Client Test

```typescript
import { getSupabaseUrl } from '@/lib/env/supabaseEnv';

console.log(getSupabaseUrl()); // Should show staging URL
```

### 3. Invariant Checks

```bash
APP_ENV=staging pnpm invariants:check
```

Should pass.

### 4. SimCity Test

```bash
# Should work in staging
APP_ENV=staging SIMCITY_ENABLED=true # ... start SimCity

# Should fail in prod
APP_ENV=prod SIMCITY_ENABLED=true # ... should throw error
```

### 5. Migration Safety

```bash
# Should fail in prod
APP_ENV=prod supabase db push # Should be blocked or require manual approval
```

## Environment Isolation Verification

### ✅ Staging Should:
- Allow SimCity
- Allow destructive admin ops
- Allow migration auto-apply
- Use test Stripe keys

### ❌ Production Should:
- Block SimCity
- Block destructive admin ops
- Block migration auto-apply
- Use live Stripe keys only

## Troubleshooting

### "Invalid access token format"

This means CLI is not authenticated. **DO NOT** try to fix by setting env vars.

**Correct fix:**
```bash
# Remove any SUPABASE_ACCESS_TOKEN from .env (if mistakenly added)
# Then authenticate CLI:
supabase login

# Verify:
supabase status
```

**Wrong fixes (DO NOT DO):**
- ❌ Setting `SUPABASE_ACCESS_TOKEN` in `.env`
- ❌ Using `SUPABASE_ANON_KEY` for CLI
- ❌ Using `SERVICE_ROLE_KEY` for CLI

**Remember:** CLI auth (`sbp_...` token) ≠ App credentials (`SUPABASE_ANON_KEY`, `SERVICE_ROLE_KEY`)

### "Migration history does not match"

```bash
# Check status
supabase migration list --remote

# Repair if needed
supabase migration repair

# Retry
supabase db push
```

### "Project already linked"

```bash
supabase unlink
supabase link --project-ref <STAGING_PROJECT_REF>
```

### "Missing API keys"

Get from dashboard:
https://supabase.com/dashboard/project/<STAGING_PROJECT_REF>/settings/api

## Production Safety

**CRITICAL RULES:**
- ❌ Never link local repo to production
- ❌ Never run `supabase db push` with `APP_ENV=prod`
- ❌ Never use production credentials in CI
- ❌ Never enable SimCity in production

**Production project ref:** `uradoazoyhhozbemrccj` (DO NOT TOUCH)

## Related Documentation

- [Environment Model](../architecture/ENVIRONMENT_MODEL.md)
- [Database Management Policy](../development/DATABASE_MANAGEMENT_POLICY.md)

