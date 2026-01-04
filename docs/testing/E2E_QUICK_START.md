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

---

## Navigation completeness + runtime sanity (UI state machine)

This repo includes a Playwright E2E spec that verifies **navigation completeness** by simulating what a real user would click (menus, sidebars, nav links, and other intended UI navigation actions), and fails on **runtime sanity** issues on every visited page.

### What it is (and is not)

- **It is**: navigation-driven traversal based on **visible UI actions** and **revealed navigation state** (drawers/menus).
- **It is not**: SEO crawling, sitemap crawling, or “type in random URLs”.

### Role shells + entry points

The traversal is run **separately** per role:

- **Guest**: entry points `"/"` and `"/main"` using `MainNavigation` (`src/components/MainNavigation.tsx`).
- **Customer**: entry point `"/customer/dashboard"` using `CustomerNavigation` (`src/components/customer/CustomerNavigation.tsx`).
- **Vendor**: entry point `"/vendor/dashboard"` using `VendorNavigation` (`src/components/vendor/VendorNavigation.tsx`).
- **Admin**: entry point `"/admin"` using the admin shell (`src/app/admin/layout.tsx` + `src/components/admin/Sidebar.tsx`).

### Runtime failures that fail the test

- Uncaught JS errors (`pageerror`)
- React hydration errors (classified from console output)
- Same-origin HTTP **5xx** responses
- Redirect loops / pages that never stabilize after navigation

### Artifacts

Artifacts are written to `playwright/navigation-artifacts/`:

- `navigation-graph.json` (guest) + `navigation-graph.{customer|vendor|admin}.json`
- `navigation-orphans.json` (filesystem route patterns not reached by UI traversal)
- `runtime-failures.json` (guest) + `runtime-failures.{customer|vendor|admin}.json`

### How to run

**For local/staging:**
```bash
E2E=true pnpm e2e tests/e2e/navigation-completeness-and-sanity.spec.ts
```

**For production (bookiji.com) - READ-ONLY:**
```bash
# Production navigation test runs in read-only mode
# No seeding or mutations are performed
pnpm e2e:navigation
```

**Note:** Production mutations require explicit opt-in:
- `RUNTIME_MODE=prod ALLOW_PROD_MUTATIONS=true pnpm tsx scripts/e2e/apply-seed-function-prod.ts`
