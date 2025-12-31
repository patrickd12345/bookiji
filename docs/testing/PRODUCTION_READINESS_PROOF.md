# Production Readiness Proof System

This document describes the comprehensive production-readiness proof system for Bookiji scheduling.

## Overview

The proof system provides **absolute proof** that Bookiji scheduling is production-ready through:

1. **Safe User Reset**: Keeps exactly one admin user, removes all others
2. **Deterministic E2E Seeding**: Creates predictable test users
3. **Full Playwright Demo**: Visible, recorded walkthrough of all critical paths
4. **Single Command Execution**: One command runs everything

## Prerequisites

- Supabase local instance running (`pnpm supabase:start`)
- Next.js dev server running (`pnpm dev`)
- Environment variables configured (see below)

## Environment Setup

**IMPORTANT**: Do not manually set environment variables. Use the environment mode system instead.

### For Certification (Staging)

Use the certification macro which handles all environment setup:

```bash
pnpm certify:staging
```

This macro:
- Loads `.env.staging` (canonical staging configuration)
- Sets `ALLOW_DESTRUCTIVE_USER_RESET=true` (required for reset)
- Sets `ADMIN_EMAIL` (from `.env.staging` or default)
- Runs the full proof ritual

### Environment Files

Create `.env.staging` from the template:

```bash
cp env.staging.template .env.staging
```

Then fill in your staging Supabase credentials and other values.

See `docs/operations/ENVIRONMENT_MODES.md` for complete environment mode documentation.

## Part 1: Safe User Reset

**Purpose**: Reset database to contain only one admin user.

**Script**: `scripts/reset-users.ts`

**Usage**:
```bash
ALLOW_DESTRUCTIVE_USER_RESET=true APP_ENV=staging ADMIN_EMAIL=admin@bookiji.com pnpm db:reset-users
```

**Safety Gates**:
- Requires `ALLOW_DESTRUCTIVE_USER_RESET=true` (explicit permission)
- Blocks production environment (`APP_ENV=production` or `NODE_ENV=production`)
- Only allows staging, development, or localhost Supabase
- Shows 3-second warning before proceeding

**What it does**:
- Verifies admin user exists and has admin role
- Deletes all other users from `auth.users`
- Cascades delete all dependent app data
- Verifies exactly 1 user remains

**Safety**:
- Requires `ADMIN_EMAIL` environment variable
- Aborts if admin not found
- Aborts if admin doesn't have admin role
- Uses Supabase Admin API (safe, handles cascades)

## Part 2: E2E User Seeding

**Purpose**: Create deterministic test users for Playwright.

**Script**: `scripts/e2e/seed-users.ts`

**Usage**:
```bash
pnpm e2e:seed
```

**What it does**:
- Creates/updates E2E test users:
  - `e2e-vendor@bookiji.test` (vendor role)
  - `e2e-customer@bookiji.test` (customer role)
  - `e2e-admin@bookiji.test` (optional, admin role)
- Creates profiles with correct roles
- Sets up `app_users` and `user_roles` for vendors
- Idempotent (safe to run multiple times)

**Output**:
- Prints created/updated user IDs
- Prints credentials for test use

## Part 3: Full Playwright Proof Suite

**Purpose**: Comprehensive visible demo of all critical scheduling paths.

**Config**: `playwright.proof.config.ts`
- Headed mode (browser visible)
- Video recording enabled
- Screenshots enabled
- Trace recording enabled
- HTML report generated

**Test**: `tests/e2e/bookiji-full-proof.spec.ts`

**What it tests**:

### Provider Path
- Login as vendor (using stable form selectors)
- Access scheduling UI (using data-test selectors only)
- Access scheduling UI
- Create availability in future (2030)
- Verify availability appears

### Customer Path
- Login as customer (using stable form selectors)
- Search for service (using data-test selectors)
- See privacy-first results
- Select slot (using data-test selectors)
- Handle payment (Stripe test mode or mock)
- Confirm booking
- See success confirmation (using data-test selectors)

### Guardrails
- Cannot book past date (validated)
- No slots → correct empty state
- Invalid actions blocked

### Support/Content
- Help Center loads
- Sanitized content renders (XSS-safe)

### Ops (if enabled)
- Jarvis explain endpoint returns coherent payload

### Payment Handling
The proof suite handles payments in one of three ways:
1. **Stripe Mock Mode** (default if no Stripe keys): Uses mock payment flow
2. **Stripe Test Mode**: Uses real Stripe test keys with test card `4242 4242 4242 4242`
3. **Payment Bypass**: If `E2E_BYPASS_PAYMENT=true`, skips payment step (if supported)

**Selector Policy**: All selectors use `data-test` attributes or stable form `name` attributes. NO CSS selectors. NO text selectors.

**Usage**:
```bash
# Headed mode (visible browser)
pnpm e2e:proof:headed

# Headless mode
pnpm e2e:proof
```

**Output** (always generated):
- Videos in `test-results/proof/` (always recorded)
- Screenshots in `test-results/proof/` (always captured)
- Traces in `test-results/proof/` (always recorded)
- HTML report: `playwright-report/proof/index.html` (always generated)
- JSON results: `test-results/proof/results.json` (always generated)

**Exit Code**: `proof:all` exits non-zero on any failure, making it CI-safe.

## Part 4: Single Command "Prove It"

**Purpose**: Run everything in sequence.

**Command** (for staging certification):
```bash
pnpm certify:staging
```

**Note**: `proof:all` is an internal command. Use `certify:staging` instead, which:
- Loads staging environment
- Sets required safety flags
- Runs the full proof ritual
- Exits non-zero on any failure

**What it does**:
1. Resets users (admin-only)
2. Seeds E2E users
3. Runs Playwright in headed mode
4. Opens HTML report

**Manual sequence** (not recommended - use `certify:staging` instead):
```bash
# Step 1: Reset users (requires staging environment)
pnpm env:staging sh -c 'ALLOW_DESTRUCTIVE_USER_RESET=true ADMIN_EMAIL=admin@bookiji.com pnpm db:reset-users'

# Step 2: Seed E2E users
pnpm env:staging pnpm e2e:seed

# Step 3: Run proof tests
pnpm env:staging pnpm e2e:proof:headed

# Step 4: View report
pnpm playwright show-report
```

**Recommended**: Use `pnpm certify:staging` which handles all steps safely.

## Exit Criteria

The proof is **COMPLETE** only when:

- ✅ Only one admin user exists after reset
- ✅ E2E users are seeded deterministically
- ✅ Playwright visibly walks through:
  - Scheduling → Booking → Confirmation → Guardrails
- ✅ HTML report + videos are generated
- ✅ Any failure clearly shows where the hole is

## Troubleshooting

### Reset script fails: "Admin user not found"
- Ensure admin user exists: `ADMIN_EMAIL=your-admin@email.com`
- Verify admin has `role='admin'` in `profiles` table

### Seeding fails: "User creation error"
- Check Supabase is running: `pnpm supabase:start`
- Verify `SUPABASE_SECRET_KEY` is correct
- Check Supabase logs for detailed errors

### Playwright tests fail: "User not found"
- Run `pnpm e2e:seed` first
- Verify users exist in Supabase dashboard
- Check `.env.e2e` has correct email addresses

### Tests timeout or flake
- Ensure dev server is running: `pnpm dev`
- Check `BASE_URL` matches dev server (default: `http://localhost:3000`)
- Increase timeout in `playwright.proof.config.ts` if needed

## Files Created

- `scripts/db/reset_users_keep_admin.sql` - SQL reset script (reference)
- `scripts/reset-users.ts` - TypeScript reset wrapper
- `scripts/e2e/seed-users.ts` - E2E user seeding
- `playwright.proof.config.ts` - Proof-specific Playwright config
- `tests/e2e/bookiji-full-proof.spec.ts` - Comprehensive proof test
- `docs/testing/PRODUCTION_READINESS_PROOF.md` - This file

## Security Notes

- **NEVER** run reset script in production
- Reset script requires `SUPABASE_SECRET_KEY` (admin access)
- E2E users use test emails (`.test` domain)
- All operations are logged for audit

## Next Steps

After proof passes:
1. Review videos and screenshots
2. Check HTML report for any warnings
3. Verify all critical paths are covered
4. Document any gaps found
5. Fix any issues before production deployment

