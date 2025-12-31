# Cloud E2E Testing Setup

This guide explains how to run E2E tests in cloud environments (Cursor, Codex, GitHub Codespaces, etc.) where Docker may not be available.

## Overview

E2E tests can run in two modes:

1. **Local Mode** (default): Requires Docker to run Supabase locally
2. **Cloud Mode**: Uses a remote Supabase test/staging instance

> ⚠️ **Important:** E2E tests require a Supabase database. If Docker isn't available, you **must** use a remote Supabase project. See [E2E_CLOUD_REALITY.md](./E2E_CLOUD_REALITY.md) for details on getting a free Supabase project.

## Prerequisites

Before running E2E tests, check your setup:

```bash
pnpm tsx scripts/e2e/check-prerequisites.ts
```

This script validates:
- Node.js version (>= 18)
- Playwright installation
- Docker availability (optional for cloud mode)
- Environment variables
- Supabase connectivity

## Local Mode Setup (Docker Required)

If you have Docker available:

1. **Start Supabase locally:**
   ```bash
   pnpm db:start
   ```

2. **Verify Supabase is running:**
   ```bash
   curl http://localhost:55321/rest/v1/
   ```

3. **Run E2E tests:**
   ```bash
   pnpm e2e
   ```

The `.env.e2e` file should already be configured for local Supabase:
```env
SUPABASE_URL=http://localhost:55321
NEXT_PUBLIC_SUPABASE_URL=http://localhost:55321
```

## Cloud Mode Setup (Remote Supabase)

When Docker is not available (e.g., in Cursor, Codex, or CI environments):

### Step 1: Get Remote Supabase Credentials

You need a **test/staging Supabase project** (never use production):

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Create or select a test project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key**
   - **service_role key** (from "Project API keys" section)

### Step 2: Configure Environment Variables

Create or update `.env.e2e` with remote Supabase credentials:

```env
# Enable cloud mode
E2E_ALLOW_REMOTE_SUPABASE=true

# Remote Supabase Configuration
SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_URL=https://your-test-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key-here
SUPABASE_SECRET_KEY=your-secret-key-here

# Test Credentials (managed by e2e:seed)
E2E_VENDOR_EMAIL=e2e-vendor@bookiji.test
E2E_VENDOR_PASSWORD=TestPassword123!
E2E_CUSTOMER_EMAIL=e2e-customer@bookiji.test
E2E_CUSTOMER_PASSWORD=password123
E2E_ADMIN_EMAIL=e2e-admin@bookiji.test
E2E_ADMIN_PASSWORD=TestPassword123!
CREATE_ADMIN=true

# Base URL (usually localhost:3000 for cloud dev)
E2E_BASE_URL=http://localhost:3000
BASE_URL=http://localhost:3000

# Feature Flags
E2E=true
NEXT_PUBLIC_E2E=true
```

### Step 3: Apply Database Migrations

Ensure your remote Supabase instance has the latest schema:

```bash
# Link to remote project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

Or manually apply migrations via Supabase Dashboard SQL Editor.

### Step 4: Run E2E Tests

```bash
pnpm e2e
```

The Playwright config will:
- Detect `E2E_ALLOW_REMOTE_SUPABASE=true`
- Allow remote Supabase URLs
- Warn that you're using a remote instance
- Seed test users automatically

## Automatic Detection

The Playwright config automatically enables cloud mode when:

- `E2E_ALLOW_REMOTE_SUPABASE=true` is set, OR
- `CI=true` (GitHub Actions, etc.), OR
- `CURSOR=true` (Cursor environment), OR
- `CODEX=true` (Codex environment)

## Security Considerations

⚠️ **Important Security Notes:**

1. **Never use production Supabase credentials** in E2E tests
2. **Use a dedicated test/staging project** for E2E runs
3. **Rotate credentials** if they're accidentally committed
4. **Use environment variables**, never hardcode credentials
5. **The test project should be isolated** from production data

## Troubleshooting

### "Refusing to run E2E against non-local Supabase"

**Solution:** Set `E2E_ALLOW_REMOTE_SUPABASE=true` in your environment.

### "Cannot connect to remote Supabase"

**Check:**
1. Verify `SUPABASE_URL` is correct
2. Check network connectivity
3. Ensure API keys are valid
4. Verify the Supabase project is active

### "Failed to seed e2e users"

**Check:**
1. `SUPABASE_SECRET_KEY` is set correctly
2. Service role key has admin permissions
3. Database migrations are applied
4. Network can reach Supabase API

### "Next.js server not starting"

**Check:**
1. Port 3000 is available
2. `BASE_URL` matches your Next.js server
3. All required environment variables are set

## CI/CD Integration

For GitHub Actions and other CI environments, see:
- `.github/workflows/ci-e2e.yml` - Example CI configuration
- `.github/workflows/e2e.yml` - E2E workflow with remote Supabase

CI workflows typically:
1. Set `E2E_ALLOW_REMOTE_SUPABASE=true` automatically
2. Use secrets for Supabase credentials
3. Run tests in parallel across browsers

## Helper Scripts

### Check Prerequisites

```bash
pnpm tsx scripts/e2e/check-prerequisites.ts
```

### Seed Test Users

```bash
pnpm e2e:seed
```

This creates the required test users:
- `e2e-vendor@bookiji.test`
- `e2e-customer@bookiji.test`
- `e2e-admin@bookiji.test` (if `CREATE_ADMIN=true`)

## Best Practices

1. **Use separate test projects** for different environments (dev, staging, CI)
2. **Reset test data** between runs if needed (the seed script handles this)
3. **Monitor test project usage** to avoid hitting Supabase limits
4. **Keep credentials secure** - use secrets management in CI
5. **Document your setup** - note which Supabase project is used for what

## Related Documentation

- [Testing Guide](../development/TESTING_GUIDE.md) - General testing conventions
- [E2E Philosophy](../debugging/e2e-philosophy.md) - E2E testing approach
- [Playwright Setup](../../docs/ci-cd/PLAYWRIGHT_SETUP.md) - Playwright configuration
