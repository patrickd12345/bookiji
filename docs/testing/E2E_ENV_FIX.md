# E2E Environment Configuration Fix

## Problem

E2E tests were configured to only use `.env.e2e`, but Supabase credentials were in `.env`. This caused tests to fail in cloud environments (Cursor, Codex) where Docker isn't available.

## Solution

Updated E2E configuration to:
1. **Use `.env` as fallback** - If `.env.e2e` doesn't exist, automatically use `.env` or `.env.local`
2. **Allow remote Supabase** - Support remote Supabase instances when `E2E_ALLOW_REMOTE_SUPABASE=true` or in cloud environments
3. **Auto-detect remote mode** - Automatically enables remote mode when Supabase URL is not localhost

## What Changed

### Files Updated

1. **`playwright.config.ts`**
   - Loads `.env.e2e` first, falls back to `.env.local` or `.env`
   - Allows remote Supabase when flag is set or in cloud environments
   - Auto-detects remote Supabase URLs

2. **`scripts/e2e/seed-users.ts`**
   - Checks `.env.e2e` first, falls back to `.env.local` or `.env`
   - Works with credentials from any source

3. **`scripts/e2e/sync-env.ts`** (new)
   - Syncs Supabase credentials from `.env` to `.env.e2e`
   - Auto-detects remote Supabase and sets `E2E_ALLOW_REMOTE_SUPABASE=true`
   - Preserves existing E2E-specific variables

### New Scripts

- `pnpm e2e:sync-env` - Syncs credentials from `.env` to `.env.e2e`

## How to Use

### Option 1: Use `.env` directly (automatic)

Just run the tests - they'll automatically use `.env` if `.env.e2e` doesn't exist:

```bash
pnpm e2e
```

### Option 2: Create `.env.e2e` from `.env` (recommended)

Sync your credentials once:

```bash
pnpm e2e:sync-env
pnpm e2e
```

This creates `.env.e2e` with:
- All Supabase credentials from `.env`
- `E2E=true` flag
- `E2E_ALLOW_REMOTE_SUPABASE=true` (if using remote Supabase)

### Option 3: Manual `.env.e2e` setup

Create `.env.e2e` manually with:

```env
E2E=true
E2E_ALLOW_REMOTE_SUPABASE=true  # Only if using remote Supabase
SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_URL=your-url
SUPABASE_SERVICE_ROLE_KEY=your-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
```

## Remote Supabase Detection

The system automatically detects remote Supabase URLs (anything not `localhost` or `127.0.0.1`). When detected:

- `E2E_ALLOW_REMOTE_SUPABASE=true` is set automatically
- A warning is shown that you're using remote Supabase
- Tests proceed normally

## Environment Priority

1. `.env.e2e` (if exists)
2. `.env.local` (if exists)
3. `.env` (if exists)
4. `process.env` (already loaded variables)

## Cloud Environments

In cloud environments (Cursor, Codex, CI):

- Remote Supabase is automatically allowed
- No Docker required
- Just ensure Supabase credentials are in `.env` or environment variables

## Troubleshooting

### "Missing SUPABASE_URL"
- Check that `.env` has `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- Run `pnpm e2e:sync-env` to sync from `.env`

### "Refusing to run E2E against non-local Supabase"
- Set `E2E_ALLOW_REMOTE_SUPABASE=true` in `.env.e2e`
- Or run `pnpm e2e:sync-env` (auto-detects remote)

### Tests still fail
- Check `pnpm e2e:check` for prerequisite issues
- Verify Supabase URL is reachable
- Ensure service role key has admin permissions

