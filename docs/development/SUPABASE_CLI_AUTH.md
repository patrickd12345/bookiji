# Supabase CLI Authentication Guide

## Critical Distinction: CLI Auth vs App Credentials

There are **three distinct credential domains** in Supabase. **Never confuse them.**

### 1. Supabase CLI Authentication

**Purpose:** Authenticate the CLI tool to manage projects

**Token Format:** `sbp_...` (starts with `sbp_`)

**How to Get:**
```bash
supabase login
```

**Storage:**
- Stored internally by CLI
- **NEVER** comes from `.env`
- **NEVER** comes from `SUPABASE_ANON_KEY`
- **NEVER** comes from `SERVICE_ROLE_KEY`
- **NEVER** comes from connection strings

**Usage:**
- Used by CLI commands: `supabase projects create`, `supabase link`, `supabase db push`
- **NOT** used by application code
- **NOT** used by database drivers

**Error: "Invalid access token format. Must be like `sbp_...`"**
- **Meaning:** CLI is not logged in
- **Fix:** Run `supabase login` (ONLY valid fix)
- **DO NOT:** Set `SUPABASE_ACCESS_TOKEN` in `.env`
- **DO NOT:** Use app credentials

---

### 2. Application Runtime Credentials

**Purpose:** Authenticate the application to Supabase API

**Variables:**
- `SUPABASE_ANON_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `SUPABASE_SERVICE_ROLE_KEY` (or `SUPABASE_SERVICE_KEY`)

**Token Format:** JWT tokens (start with `eyJ...`)

**Storage:**
- In `.env.local` or deployment environment variables
- **NEVER** used by CLI
- **NEVER** used for CLI authentication

**Usage:**
- Used by application code: `createClient(url, anonKey)`
- Used by Supabase JS client
- **NOT** used by CLI commands

---

### 3. Database Credentials

**Purpose:** Direct database access (Postgres)

**Format:** Connection string or password
```
postgresql://postgres:password@host:5432/postgres
```

**Storage:**
- In `.env.local` or deployment environment variables
- **NEVER** used by CLI for migrations
- **NEVER** used for CLI authentication

**Usage:**
- Used by `psql`, database drivers
- Used for direct SQL access (forbidden by policy)
- **NOT** used by CLI commands

---

## Common Mistakes (DO NOT DO)

### ❌ Mistake 1: Setting SUPABASE_ACCESS_TOKEN in .env
```bash
# WRONG
SUPABASE_ACCESS_TOKEN=sbp_...  # Don't do this
```

**Why wrong:** CLI stores auth internally. Setting in `.env` can cause conflicts.

**Fix:** Remove from `.env`, run `supabase login`

---

### ❌ Mistake 2: Using App Credentials for CLI
```bash
# WRONG - This won't work
export SUPABASE_ANON_KEY=eyJ...  # CLI doesn't use this
supabase projects list  # Will fail
```

**Why wrong:** CLI uses `sbp_...` token from `supabase login`, not app credentials.

**Fix:** Run `supabase login`

---

### ❌ Mistake 3: Trying to Fix CLI Auth with .env
```bash
# WRONG - Don't try to fix CLI auth errors by editing .env
# If you see "Invalid access token format"
# DO NOT add SUPABASE_ACCESS_TOKEN to .env
```

**Why wrong:** CLI auth is separate from app configuration.

**Fix:** Always use `supabase login` for CLI authentication issues.

---

## Correct Workflow

### Setting Up CLI Authentication

```bash
# 1. Authenticate CLI (one-time, or when token expires)
supabase login

# 2. Verify authentication
supabase status

# 3. Use CLI commands
supabase projects list
supabase link --project-ref <ref>
supabase db push
```

### Setting Up Application Credentials

```bash
# 1. Get credentials from Supabase Dashboard
#    https://supabase.com/dashboard/project/<ref>/settings/api

# 2. Add to .env.local (for app runtime)
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# 3. Use in application code
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, anonKey)
```

---

## Troubleshooting

### "Invalid access token format. Must be like `sbp_...`"

**Cause:** CLI not authenticated

**Fix:**
```bash
# Remove any SUPABASE_ACCESS_TOKEN from .env (if mistakenly added)
# Then authenticate:
supabase login

# Verify:
supabase status
```

**DO NOT:**
- Set `SUPABASE_ACCESS_TOKEN` in `.env`
- Use `SUPABASE_ANON_KEY` for CLI
- Use `SERVICE_ROLE_KEY` for CLI

---

### CLI Commands Fail After Environment Changes

**Cause:** Confusion between CLI auth and app credentials

**Fix:**
1. Remove any `SUPABASE_ACCESS_TOKEN` from `.env`
2. Run `supabase login`
3. Verify with `supabase status`

---

### "Project not found" or "Unauthorized"

**Cause:** CLI authenticated but wrong account, or project doesn't exist

**Fix:**
1. Verify you're logged into correct Supabase account: `supabase projects list`
2. Verify project exists in dashboard
3. Check organization permissions

---

## Absolute Rules

1. **CLI auth errors → ONLY fix is `supabase login`**
   - Never try to fix by editing `.env`
   - Never use app credentials for CLI

2. **App credentials → ONLY for application runtime**
   - Never used by CLI
   - Stored in `.env.local` or deployment env vars

3. **Database credentials → ONLY for direct DB access**
   - Never used by CLI for migrations
   - Direct SQL execution is forbidden by policy

4. **Never conflate the three domains**
   - CLI auth ≠ App credentials ≠ Database credentials
   - Each has distinct purpose and storage

---

## Related Documentation

- [Database Management Policy](./DATABASE_MANAGEMENT_POLICY.md)
- [Environment Model](../architecture/ENVIRONMENT_MODEL.md)
- [Staging Setup](../operations/STAGING_SETUP.md)






