# 🚀 Staging Environment Setup - Ready for Execution

## ✅ What's Been Prepared

### 1. Setup Script Created
**File:** `scripts/setup-staging-env.ps1`

Automated PowerShell script that:
- Creates staging Supabase project
- Links local repo to staging (not prod)
- Retrieves API keys
- Applies migrations via CLI
- Provides environment variable configuration

### 2. Documentation Created
- **`docs/operations/STAGING_SETUP.md`** - Complete setup guide
- **`docs/operations/STAGING_SETUP_EXECUTION_REPORT.md`** - Step-by-step execution instructions

### 3. Environment Isolation Ready
- ✅ `src/lib/env/supabaseEnv.ts` - Environment-aware Supabase config
- ✅ `src/lib/env/operationalInvariants.ts` - Operational rules enforced
- ✅ CI guards prevent prod credentials
- ✅ Boot-time validation in place

## 🎯 Next Steps (Manual Execution Required)

### Prerequisite: CLI Authentication

```bash
supabase login
```

This opens a browser for authentication. Complete the login flow.

**Important:** This is CLI authentication (uses `sbp_...` token stored internally), **NOT** the same as:
- `SUPABASE_ANON_KEY` (app runtime credential)
- `SERVICE_ROLE_KEY` (app runtime credential)
- Database password (for direct DB access)

**If you see "Invalid access token format":**
- ✅ Run `supabase login` (ONLY valid fix)
- ❌ Do NOT set `SUPABASE_ACCESS_TOKEN` in `.env`
- ❌ Do NOT use app credentials for CLI

### Step 1: Get Organization ID

**Option A - From Organizations Page:**
1. Go to: https://supabase.com/dashboard/organizations
2. Find your organization
3. Copy the Organization ID

**Option B - From Production Project:**
1. Go to: https://supabase.com/dashboard/project/uradoazoyhhozbemrccj/settings/general
2. Find "Organization" section
3. Copy the Organization ID

### Step 2: Execute Setup Script

```powershell
.\scripts\setup-staging-env.ps1 -OrgId "<YOUR_ORG_ID>" -Region "us-east-1"
```

**Example:**
```powershell
.\scripts\setup-staging-env.ps1 -OrgId "nydhlxaqetemxrvtmokm" -Region "us-east-1"
```

The script will:
1. ✅ Create staging project
2. ✅ Link to staging (unlinks any existing project)
3. ✅ Retrieve API keys
4. ✅ Apply migrations
5. ✅ Provide environment variable configuration

### Step 3: Configure Environment Variables

After script completes, add to `.env.local`:

```env
APP_ENV=staging
STAGING_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
STAGING_SUPABASE_ANON_KEY=<anon_key>
STAGING_SUPABASE_SERVICE_KEY=<service_role_key>
```

### Step 4: Add CI Secrets

In GitHub → Settings → Secrets and variables → Actions:
- `STAGING_SUPABASE_URL`
- `STAGING_SUPABASE_ANON_KEY`
- `STAGING_SUPABASE_SERVICE_KEY`

Set `APP_ENV=staging` in CI workflow environment.

## 🔒 Production Safety

**CRITICAL:** Production project `uradoazoyhhozbemrccj` is protected:
- ✅ Script never touches production
- ✅ Local repo links to staging only
- ✅ CI guards prevent prod credentials
- ✅ Environment isolation enforced at code level

## ✅ Verification After Setup

```bash
# 1. Boot test
APP_ENV=staging pnpm dev

# 2. Migration check
supabase migration list --remote

# 3. Invariant check
APP_ENV=staging pnpm invariants:check

# 4. SimCity test (should work)
APP_ENV=staging SIMCITY_ENABLED=true # ... start SimCity

# 5. SimCity prod test (should fail)
APP_ENV=prod SIMCITY_ENABLED=true # ... should throw error
```

## 📋 Expected Results

After successful execution:

1. **Staging Project**
   - Ref: `<new_ref>`
   - URL: `https://<new_ref>.supabase.co`
   - Dashboard: `https://supabase.com/dashboard/project/<new_ref>`

2. **Local Configuration**
   - `supabase/config.toml` → linked to staging
   - Production project NOT linked

3. **Migrations**
   - All migrations applied via CLI
   - Schema matches production

4. **Environment Variables**
   - Staging credentials ready
   - Production credentials untouched

## 🆘 Troubleshooting

### "Invalid access token"
```bash
supabase login
```

### "Organization not found"
- Verify org ID from dashboard
- Ensure correct account authenticated

### "Migration history mismatch"
```bash
supabase migration list --remote
supabase migration repair  # If needed
supabase db push
```

### Script Fails
See: `docs/operations/STAGING_SETUP.md` for manual step-by-step instructions.

## 📚 Documentation

- **Setup Guide:** `docs/operations/STAGING_SETUP.md`
- **Execution Report:** `docs/operations/STAGING_SETUP_EXECUTION_REPORT.md`
- **Environment Model:** `docs/architecture/ENVIRONMENT_MODEL.md`

---

**Status:** ✅ Ready for execution  
**Blockers:** None (requires CLI authentication)  
**Estimated Time:** 10-15 minutes

