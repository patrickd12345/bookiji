# E2E Tests Quick Start

## The Situation

**E2E tests require a Supabase database.** There's no way around this because the tests:
- Create real users
- Test real database operations
- Verify authentication flows
- Test booking creation

## Your Options

### ✅ Option 1: Free Supabase Project (5 minutes)

**Best for:** Cloud environments (Cursor, Codex), CI/CD

1. Go to https://app.supabase.com and sign up (free)
2. Create a new project (name it "bookiji-e2e-test")
3. Wait ~2 minutes for setup
4. Go to Settings → API, copy:
   - Project URL
   - anon key
   - service_role key
5. Run: `pnpm e2e:setup-remote` (enter credentials)
6. Run: `pnpm e2e`

**That's it!** Free tier is perfect for E2E testing.

### ✅ Option 2: Local Supabase (if Docker available)

**Best for:** Local development with Docker

```bash
pnpm db:start    # Start Supabase
pnpm e2e         # Run tests
```

### ⚠️ Option 3: Skip Seeding (Advanced)

If users already exist in your Supabase:

```bash
E2E_SKIP_SEED=true pnpm e2e
```

**Warning:** Tests may fail if they expect specific test users.

## Common Error: "Cannot connect to localhost:55321"

This means:
- ❌ Docker/Supabase is not running locally
- ✅ You need a remote Supabase project

**Fix:**
```bash
# Get a free Supabase project, then:
pnpm e2e:setup-remote
pnpm e2e
```

## Check Your Setup

```bash
pnpm e2e:check
```

This will tell you exactly what's missing.

## Need Help?

- **Full guide:** [CLOUD_E2E_SETUP.md](./CLOUD_E2E_SETUP.md)
- **Why you need Supabase:** [E2E_CLOUD_REALITY.md](./E2E_CLOUD_REALITY.md)
- **Troubleshooting:** See CLOUD_E2E_SETUP.md troubleshooting section

## TL;DR

**You need Supabase. Get a free one at https://app.supabase.com (5 min setup).**
