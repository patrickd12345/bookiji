# Staging Environment Setup - Execution Report

**Date:** 2025-01-27  
**Status:** Ready for Execution  
**Objective:** Create and wire staging Supabase environment

## Prerequisites Check

### ✅ Code Ready
- Environment isolation infrastructure implemented
- `src/lib/env/supabaseEnv.ts` configured
- `src/lib/env/operationalInvariants.ts` enforces rules
- CI guards in place
- Documentation created

### ⚠️ Required Before Execution
1. **Supabase CLI Authentication**
   ```bash
   supabase login
   ```
   
   **Critical distinction:**
   - CLI auth uses `sbp_...` token (stored by CLI internally)
   - **NOT** the same as `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` or `SUPABASE_SECRET_KEY`
   - **DO NOT** set `SUPABASE_ACCESS_TOKEN` in `.env`
   - If CLI commands fail with token errors → **ONLY** fix is `supabase login`

2. **Organization ID**
   - Get from: https://supabase.com/dashboard/organizations
   - Or from production project: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/general
   - Look for "Organization" field

## Execution Steps

### Step 1: Authenticate CLI

```bash
supabase login
```

This will open a browser for authentication.

### Step 1.5: Preflight Check (REQUIRED)

**Before proceeding, verify CLI authentication:**
```bash
pnpm supabase:doctor
```

This catches auth issues in 5 seconds instead of 30 minutes. If it fails, the fix is `supabase login` (ONLY valid fix).

### Step 2: Get Organization ID

From Supabase Dashboard:
1. Go to: https://supabase.com/dashboard/organizations
2. Find your organization
3. Copy the Organization ID (format: `nydhlxaqetemxrvtmokm`)

Or from production project:
1. Go to: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/general
2. Find "Organization" section
3. Copy the Organization ID

### Step 3: Run Setup Script

```powershell
.\scripts\setup-staging-env.ps1 -OrgId "<YOUR_ORG_ID>" -Region "us-east-1"
```

**Example:**
```powershell
.\scripts\setup-staging-env.ps1 -OrgId "nydhlxaqetemxrvtmokm" -Region "us-east-1"
```

### Step 4: Manual Alternative (If Script Fails)

If the script encounters issues, execute manually:

```bash
# 1. Create project
supabase projects create "Bookiji – Staging" \
  --org-id <YOUR_ORG_ID> \
  --region us-east-1 \
  --db-password "Bookiji2024!"

# 2. Note the project ref from output (e.g., "abc123xyz")

# 3. Link to staging
supabase unlink  # Remove any existing link
supabase link --project-ref <STAGING_PROJECT_REF>

# 4. Get API keys
supabase projects api-keys list <STAGING_PROJECT_REF>

# 5. Apply migrations
supabase db push
```

### Step 5: Configure Environment Variables

After setup completes, add to `.env.local`:

```env
APP_ENV=staging
STAGING_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
STAGING_SUPABASE_PUBLISHABLE_KEY=<publishable_key_from_step_4>
STAGING_SUPABASE_SECRET_KEY=<secret_key_from_step_4>
```

### Step 6: Add CI Secrets

In GitHub Settings → Secrets and variables → Actions, add:
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_PUBLISHABLE_KEY`
- `STAGING_SUPABASE_SECRET_KEY`

Set `APP_ENV=staging` in CI workflow environment variables.

## Verification Checklist

After setup, verify:

- [ ] `APP_ENV=staging` boots successfully
- [ ] `supabase migration list --remote` shows all migrations applied
- [ ] `pnpm invariants:check` passes
- [ ] SimCity runs in staging (`APP_ENV=staging SIMCITY_ENABLED=true`)
- [ ] SimCity fails in prod (`APP_ENV=prod SIMCITY_ENABLED=true` → should throw)
- [ ] Production project (`uradoazoyhhozbemrccj`) remains untouched

## Expected Output

After successful execution, you should have:

1. **Staging Project Created**
   - Project ref: `<new_ref>`
   - Region: `us-east-1`
   - URL: `https://<new_ref>.supabase.co`

2. **Local Repo Linked**
   - `supabase/config.toml` points to staging
   - Production project NOT linked locally

3. **Migrations Applied**
   - All migrations from `supabase/migrations/` applied
   - Schema matches production

4. **Environment Variables Ready**
   - Staging credentials documented
   - Ready for `.env.local` and CI

## Production Safety

**CRITICAL:** Production project `uradoazoyhhozbemrccj` must remain untouched.

Verification:
- ✅ Local repo linked to staging (not prod)
- ✅ No production credentials in staging env vars
- ✅ CI uses staging credentials only

## Troubleshooting

### "Invalid access token"
```bash
supabase login
```

### "Organization not found"
- Verify org ID from dashboard
- Ensure you're authenticated with correct account

### "Migration history mismatch"
```bash
supabase migration list --remote
supabase migration repair  # If needed
supabase db push
```

### "Project creation failed"
- Check free tier limits (2 projects max)
- Verify organization has capacity
- Try different region if needed

## Next Steps After Setup

1. Test staging environment
2. Configure CI to use staging
3. Run SimCity certification in staging
4. Document staging project ref in team docs

## Support

If setup fails:
1. Check Supabase CLI version: `supabase --version`
2. Run with debug: `supabase projects create ... --debug`
3. Review logs for specific error messages
4. Consult: `docs/operations/STAGING_SETUP.md`

