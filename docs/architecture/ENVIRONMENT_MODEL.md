# Environment Model

**Version:** 1.0  
**Last Updated:** 2025-01-27  
**Status:** Active

## Overview

This document defines the environment isolation model for Bookiji. It enforces the fundamental operational invariant:

> **Invariant A-0**: Environments must be isolated by blast radius, not just by config.

This means separate Supabase projects for each environment, not just different environment variables pointing to the same database.

## Environments

Bookiji uses three environments, each with distinct purposes and isolation guarantees:

### 1. Local (`APP_ENV=local`)

**Purpose:**
- Development and testing
- Migration development and testing
- SimCity chaos engineering
- Breaking things intentionally
- Invariant development

**Supabase:**
- Uses Supabase Local (`supabase start`)
- URL: `http://localhost:54321`
- Standard demo keys (or `LOCAL_SUPABASE_*` env vars)

**Data Durability:**
- None - can be reset at will
- `supabase db reset` is safe

**Allowed Operations:**
- ✅ All operations
- ✅ SimCity enabled
- ✅ Destructive admin operations
- ✅ Migration auto-apply
- ✅ Direct database access (for development)

**Forbidden:**
- ❌ Live Stripe keys
- ❌ Production data

---

### 2. Staging (`APP_ENV=staging`)

**Purpose:**
- CI/CD testing
- SimCity certification
- Admin cockpit testing
- Migration rehearsal
- Integration testing

**Supabase:**
- Separate Supabase Cloud Project
- URL: `STAGING_SUPABASE_URL`
- Keys: `STAGING_SUPABASE_ANON_KEY`, `STAGING_SUPABASE_SERVICE_KEY`

**Data Durability:**
- Medium - may be wiped for testing
- Should mirror production schema

**Allowed Operations:**
- ✅ SimCity enabled
- ✅ Destructive admin operations (with caution)
- ✅ Migration auto-apply (via CI)
- ✅ Test Stripe keys only

**Forbidden:**
- ❌ Live Stripe keys
- ❌ Production data
- ❌ Manual production migrations

---

### 3. Production (`APP_ENV=prod`)

**Purpose:**
- Live user traffic
- Real bookings and payments
- Source of truth for business data

**Supabase:**
- Separate Supabase Cloud Project
- URL: `PROD_SUPABASE_URL`
- Keys: `PROD_SUPABASE_ANON_KEY`, `PROD_SUPABASE_SERVICE_KEY`

**Data Durability:**
- Absolute - never wipe, never corrupt
- All changes must be reversible

**Allowed Operations:**
- ✅ Read operations
- ✅ User-initiated writes (bookings, payments)
- ✅ Scheduled migrations (with review)
- ✅ Live Stripe keys

**Forbidden:**
- ❌ SimCity
- ❌ Destructive admin operations (unless explicitly confirmed)
- ❌ Migration auto-apply (must be reviewed)
- ❌ Test Stripe keys
- ❌ Direct database access
- ❌ Experiments or chaos testing

---

## Environment Configuration

### Required Environment Variables

Each environment requires `APP_ENV` to be set:

```bash
APP_ENV=local    # or staging, or prod
```

### Supabase Configuration

Environment-specific Supabase credentials:

**Local:**
```bash
# Optional - defaults to Supabase Local
LOCAL_SUPABASE_URL=http://localhost:54321
LOCAL_SUPABASE_ANON_KEY=eyJ...  # Standard demo key
LOCAL_SUPABASE_SERVICE_KEY=eyJ...  # Standard demo key
```

**Staging:**
```bash
STAGING_SUPABASE_URL=https://xxxxx.supabase.co
STAGING_SUPABASE_ANON_KEY=eyJ...
STAGING_SUPABASE_SERVICE_KEY=eyJ...
```

**Production:**
```bash
PROD_SUPABASE_URL=https://xxxxx.supabase.co
PROD_SUPABASE_ANON_KEY=eyJ...
PROD_SUPABASE_SERVICE_KEY=eyJ...
```

### Stripe Configuration

**Local & Staging:**
```bash
STRIPE_SECRET_KEY=sk_test_...  # Test keys only
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

**Production:**
```bash
STRIPE_SECRET_KEY=sk_live_...  # Live keys only
STRIPE_PUBLISHABLE_KEY=pk_live_...
```

---

## Operational Invariants

### SimCity Rules

- ✅ **Allowed:** Local, Staging
- ❌ **Forbidden:** Production

Enforcement: `assertSimCityAllowed()` throws in production.

### Stripe Key Rules

- ✅ **Local/Staging:** Must use `sk_test_*` keys
- ✅ **Production:** Must use `sk_live_*` keys
- ❌ **Cross-environment:** Live keys forbidden outside prod

Enforcement: `assertStripeKeyEnvironment()` validates key type matches environment.

### Destructive Operations

- ✅ **Local/Staging:** Allowed
- ❌ **Production:** Forbidden (unless `ALLOW_DESTRUCTIVE_OPS=true`)

Examples of destructive operations:
- Bulk deletes
- Schema resets
- Data purges
- Admin settings resets

Enforcement: `assertDestructiveOpAllowed()` throws in production.

### Migration Rules

- ✅ **Local:** Auto-apply allowed
- ✅ **Staging:** Auto-apply via CI allowed
- ❌ **Production:** Must be reviewed and scheduled

Enforcement: `assertMigrationAutoApplyAllowed()` throws in production.

---

## Promotion Flow

Changes flow through environments in this order:

```
Local → Staging → Production
```

### Local Development

1. Develop feature locally
2. Test with SimCity
3. Run migrations locally
4. Verify invariants

### Staging Deployment

1. Push to staging branch
2. CI runs tests with `APP_ENV=staging`
3. Migrations applied to staging project
4. SimCity certification runs
5. Manual testing

### Production Deployment

1. Merge to main branch
2. Migrations reviewed
3. Deploy to production
4. Migrations applied manually or via approved CI
5. Monitor for issues

---

## Boot-Time Validation

The application validates environment configuration at boot time:

1. **`instrumentation.ts`** - Runs once when server starts
   - Validates `APP_ENV` is set and valid
   - Validates Stripe keys match environment
   - Validates SimCity is not enabled in production

2. **`middleware.ts`** - Validates on first request
   - Ensures `APP_ENV` is valid before processing requests

If validation fails:
- **Production:** Application fails to start (fatal)
- **Non-Production:** Warning logged (allows development flexibility)

---

## Code Enforcement

### Centralized Configuration

All Supabase clients must use:

```typescript
import { getSupabaseUrl, getSupabaseAnonKey, getSupabaseServiceKey } from '@/lib/env/supabaseEnv';
```

**Never** access `process.env.SUPABASE_*` directly.

### Environment Assertions

Use operational invariants:

```typescript
import { assertSimCityAllowed } from '@/lib/env/operationalInvariants';
import { assertDestructiveOpAllowed } from '@/lib/env/operationalInvariants';
import { assertStripeKeyEnvironment } from '@/lib/env/operationalInvariants';
```

### Environment Checks

```typescript
import { isProduction, isStaging, isLocal } from '@/lib/env/assertAppEnv';

if (isProduction()) {
  // Production-only logic
}
```

---

## CI/CD Configuration

### CI Environment

CI must run with:

```bash
APP_ENV=staging
```

CI must:
- ✅ Use staging Supabase credentials
- ✅ Fail if prod credentials detected
- ✅ Fail if `APP_ENV=prod` in CI
- ✅ Allow SimCity in CI (staging)

### Deployment

Production deployments:
- ✅ Must set `APP_ENV=prod`
- ✅ Must use production Supabase project
- ✅ Must use live Stripe keys
- ❌ Must not enable SimCity
- ❌ Must not auto-apply migrations (review required)

---

## Supabase Project Setup

### Creating Projects

1. **Staging Project:**
   - Create new Supabase project: `bookiji-staging`
   - Copy schema from production (via migrations)
   - Configure RLS policies
   - Set up webhooks (test mode)

2. **Production Project:**
   - Create new Supabase project: `bookiji-prod`
   - Apply all migrations
   - Configure RLS policies
   - Set up webhooks (live mode)

### Migration Workflow

1. **Develop migration locally:**
   ```bash
   supabase migration new feature_name
   # Edit migration file
   supabase db push
   ```

2. **Test in staging:**
   ```bash
   supabase link --project-ref <staging-ref>
   supabase db push
   ```

3. **Apply to production:**
   ```bash
   supabase link --project-ref <prod-ref>
   # Review migration
   supabase db push  # Manual approval required
   ```

---

## Troubleshooting

### "APP_ENV is required but not set"

Set `APP_ENV` in your environment:
```bash
export APP_ENV=local  # or staging, or prod
```

### "SimCity is forbidden in production"

SimCity cannot run in production. Use staging or local.

### "Live Stripe keys forbidden outside prod"

Check your `STRIPE_SECRET_KEY`:
- Local/Staging: Must start with `sk_test_`
- Production: Must start with `sk_live_`

### "Missing Supabase credentials"

Ensure environment-specific credentials are set:
- Local: Uses defaults or `LOCAL_SUPABASE_*`
- Staging: Requires `STAGING_SUPABASE_*`
- Production: Requires `PROD_SUPABASE_*`

---

## Related Documentation

- [Database Management Policy](../development/DATABASE_MANAGEMENT_POLICY.md)
- [Operational Invariants](../invariants/admin-ops.md)
- [SimCity Testing Engine](../development/SIMCITY_TESTING_ENGINE.md)

---

## Changelog

### 2025-01-27 - Initial Version
- Defined three-environment model
- Established operational invariants
- Documented promotion flow
- Added boot-time validation











