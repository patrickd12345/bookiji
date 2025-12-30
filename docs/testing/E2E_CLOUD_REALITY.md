# E2E Testing in Cloud Environments - The Reality

## TL;DR

**Yes, E2E tests CAN run in cloud environments (Cursor, Codex, CI), but you need a Supabase project.**

You have two options:
1. **Local Supabase** (requires Docker) - Not available in most cloud environments
2. **Remote Supabase** (requires a Supabase project) - Works everywhere

## The Requirement

E2E tests need a Supabase database because they:
- Create test users (vendor, customer, admin)
- Test booking flows that require database state
- Verify authentication and authorization
- Test real database operations

**You cannot run E2E tests without a Supabase instance.**

## Option 1: Local Supabase (Docker Required)

✅ **Works if:** You have Docker Desktop installed and running

```bash
pnpm db:start    # Start local Supabase
pnpm e2e         # Run tests
```

❌ **Doesn't work in:** Cursor, Codex, most cloud IDEs (no Docker)

## Option 2: Remote Supabase (Free Tier Available)

✅ **Works everywhere:** Cursor, Codex, CI, any cloud environment

### Getting a Free Supabase Project

1. **Sign up for free:**
   - Go to https://app.supabase.com
   - Sign up (free tier includes 500MB database, 2GB bandwidth)

2. **Create a test project:**
   - Click "New Project"
   - Name it something like "bookiji-e2e-test"
   - Choose a region close to you
   - Set a database password (save it!)

3. **Get your credentials:**
   - Wait for project to finish setting up (~2 minutes)
   - Go to **Settings** → **API**
   - Copy:
     - **Project URL** (e.g., `https://xxxxx.supabase.co`)
     - **anon/public key** (under "Project API keys")
     - **service_role key** (under "Project API keys" - click "Reveal")

4. **Apply migrations:**
   ```bash
   # Link to your project
   supabase link --project-ref your-project-ref
   
   # Push migrations
   supabase db push
   ```

5. **Configure E2E:**
   ```bash
   pnpm e2e:setup-remote
   # Enter your credentials when prompted
   ```

6. **Run tests:**
   ```bash
   pnpm e2e
   ```

### Free Tier Limits

Supabase free tier is generous for E2E testing:
- ✅ 500MB database (plenty for test data)
- ✅ 2GB bandwidth (enough for many test runs)
- ✅ Unlimited API requests
- ✅ No credit card required

**Note:** Free tier projects pause after 1 week of inactivity, but you can resume them instantly.

## Option 3: Skip Seeding (Advanced)

If you already have users in your Supabase project and don't want to recreate them:

```bash
E2E_SKIP_SEED=true pnpm e2e
```

⚠️ **Warning:** Tests may fail if they expect specific test users that don't exist.

## Why Not Just Mock Everything?

Some tests could be mocked, but E2E tests are specifically designed to test the **real** system:
- Real database queries
- Real authentication flows
- Real booking creation
- Real payment processing (mocked Stripe, but real database)

Mocking would defeat the purpose of E2E testing.

## Recommended Setup for Cloud Development

1. **Create a dedicated test Supabase project**
   - Use Supabase free tier
   - Name it clearly (e.g., "bookiji-e2e-dev")
   - Keep it separate from production

2. **Configure once:**
   ```bash
   pnpm e2e:setup-remote
   ```

3. **Run tests anytime:**
   ```bash
   pnpm e2e
   ```

4. **Reset if needed:**
   ```bash
   # In Supabase dashboard: Settings → Database → Reset database
   # Or via CLI:
   supabase db reset --linked
   ```

## CI/CD Setup

For GitHub Actions and other CI, use secrets:

```yaml
env:
  SUPABASE_URL: ${{ secrets.E2E_SUPABASE_URL }}
  SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.E2E_SUPABASE_SERVICE_ROLE_KEY }}
  E2E_ALLOW_REMOTE_SUPABASE: true
```

## Summary

| Environment | Docker Available? | Solution |
|------------|------------------|----------|
| Local machine | ✅ Yes | Use local Supabase (`pnpm db:start`) |
| Local machine | ❌ No | Use remote Supabase (free tier) |
| Cursor/Codex | ❌ No | Use remote Supabase (free tier) |
| GitHub Actions | ✅ Yes | Use local Supabase (recommended) or remote |
| Other CI | ❌ Usually no | Use remote Supabase |

**Bottom line:** You need a Supabase project. The free tier is perfect for E2E testing and takes 5 minutes to set up.

## Quick Start (Remote Supabase)

```bash
# 1. Create free Supabase project at https://app.supabase.com
# 2. Get credentials from Settings → API
# 3. Configure:
pnpm e2e:setup-remote

# 4. Apply migrations:
supabase link --project-ref YOUR_PROJECT_REF
supabase db push

# 5. Run tests:
pnpm e2e
```

That's it! 🎉
