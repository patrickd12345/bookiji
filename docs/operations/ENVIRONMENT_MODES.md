# Environment Modes - Operator Guide

## Why This Exists

**Humans must never manually assemble environment variables.**

Manual env var assembly is:
- Error-prone (typos, wrong values)
- Dangerous (accidental production access)
- Inconsistent (different developers use different values)
- Unmaintainable (no single source of truth)

Instead, Bookiji uses **named execution modes** (macros) that enforce correct configuration.

## The Three Universes

Bookiji operates in three distinct environments:

### 1. Development (`development`)
- **Purpose**: Local development and testing
- **Database**: Local Supabase instance (`localhost:54321`)
- **Payments**: Mock mode (no real charges)
- **Access**: Open (any developer can run)
- **Destructive Operations**: Allowed (local only)

### 2. Staging (`staging`)
- **Purpose**: Pre-production testing and certification
- **Database**: Staging Supabase project
- **Payments**: Test mode (Stripe test keys)
- **Access**: Controlled (requires staging credentials)
- **Destructive Operations**: Allowed (via `certify:staging` only)
- **Note**: `NODE_ENV=production` is intentional (optimized builds)

### 3. Production (`production`)
- **Purpose**: Live customer-facing system
- **Database**: Production Supabase project
- **Payments**: Live mode (real Stripe charges)
- **Access**: Highly restricted (production credentials only)
- **Destructive Operations**: **NEVER ALLOWED**

## The Golden Rule

> **If you can delete users, you are not in production.**

Production environments must never allow destructive operations. This is enforced mechanically.

## One-Line Commands

Humans should only use these commands:

### Development
```bash
pnpm dev:start
```
- Loads `.env.development`
- Starts Next.js dev server
- Local Supabase required (`pnpm supabase:start`)

### Staging
```bash
pnpm staging:start
```
- Loads `.env.staging`
- Starts Next.js production server (optimized)
- Requires staging Supabase project

### Production
```bash
pnpm prod:start
```
- Loads `.env.production`
- Starts Next.js production server
- Requires production Supabase project

### Certification (Staging Only)
```bash
pnpm certify:staging
```
- Loads `.env.staging`
- Sets `ALLOW_DESTRUCTIVE_USER_RESET=true`
- Runs full production-readiness proof:
  1. Resets users (admin-only)
  2. Seeds E2E test users
  3. Runs Playwright proof suite
  4. Generates reports
- **This is the ONLY way to run destructive operations**

## Environment Files

### Canonical Files

Three canonical environment files serve as the single source of truth:

- `.env.development` - Development configuration
- `.env.staging` - Staging configuration
- `.env.production` - Production configuration

### Template Files

Template files are provided for reference:
- `env.development.template`
- `env.staging.template`
- `env.production.template`

**Copy templates to create your `.env.*` files and fill in real values.**

### File Rules

1. **APP_ENV is mandatory** - Must be set to `development`, `staging`, or `production`
2. **NO destructive flags in env files** - Flags like `ALLOW_DESTRUCTIVE_USER_RESET` are set by macros, not files
3. **DO NOT commit real secrets** - Use `.gitignore` to exclude `.env.*` files
4. **NODE_ENV may differ** - Staging uses `NODE_ENV=production` for optimized builds

## How It Works

### Environment Macros

The system uses `dotenv-cli` to load environment files:

```json
{
  "env:dev": "dotenv -e .env.development --",
  "env:staging": "dotenv -e .env.staging --",
  "env:prod": "dotenv -e .env.production --"
}
```

These macros load the correct `.env` file and forward execution to the next command.

### Intent-Based Commands

Intent-based commands combine environment macros with actions:

```json
{
  "dev:start": "pnpm env:dev next dev -p 3000",
  "staging:start": "pnpm env:staging next start -p 3000",
  "prod:start": "pnpm env:prod next start -p 3000"
}
```

### Certification Macro

The certification macro is special - it:
1. Loads staging environment
2. Sets destructive permission flag
3. Runs the full proof ritual

```json
{
  "certify:staging": "pnpm env:staging sh -c 'ALLOW_DESTRUCTIVE_USER_RESET=true pnpm proof:all'"
}
```

## Safety Enforcement

### Hard Safety Assertions

Destructive scripts enforce multiple layers of protection:

1. **Permission Flag**: `ALLOW_DESTRUCTIVE_USER_RESET=true` required
2. **APP_ENV Check**: Must be exactly `staging`
3. **NODE_ENV Check**: Cannot be `production` unless `APP_ENV=staging`
4. **Production Block**: `APP_ENV=production` is always blocked

### Error Messages

If you try to run destructive operations incorrectly, you'll see:

```
🚨🚨🚨 DESTRUCTIVE OPERATION BLOCKED 🚨🚨🚨

User reset is only allowed via: pnpm certify:staging

DO NOT run this script directly.
Use the safe certification macro instead.
```

## Setup Instructions

### 1. Install Dependencies

```bash
pnpm install
```

This installs `dotenv-cli` automatically.

### 2. Create Environment Files

Copy templates and fill in values:

```bash
cp env.development.template .env.development
cp env.staging.template .env.staging
cp env.production.template .env.production
```

Edit each file with your actual credentials.

### 3. Verify Setup

```bash
# Development
pnpm dev:start

# Staging (requires staging Supabase)
pnpm staging:start

# Production (requires production Supabase)
pnpm prod:start
```

## Common Mistakes

### ❌ Don't Do This

```bash
# Manual env var assembly - DANGEROUS
ALLOW_DESTRUCTIVE_USER_RESET=true APP_ENV=staging ADMIN_EMAIL=admin@bookiji.com pnpm db:reset-users
```

### ✅ Do This Instead

```bash
# Use the safe macro
pnpm certify:staging
```

### ❌ Don't Do This

```bash
# Running reset-users directly - BLOCKED
pnpm db:reset-users
```

### ✅ Do This Instead

```bash
# Use the safe macro
pnpm certify:staging
```

## Troubleshooting

### "APP_ENV is not set"

**Problem**: Environment file not loaded or missing `APP_ENV`.

**Solution**: 
1. Ensure `.env.*` file exists
2. Verify `APP_ENV=development|staging|production` is set
3. Use the correct macro (`dev:start`, `staging:start`, `prod:start`)

### "User reset is only allowed via pnpm certify:staging"

**Problem**: Trying to run destructive operations directly.

**Solution**: Use `pnpm certify:staging` instead.

### "PRODUCTION ENVIRONMENT DETECTED"

**Problem**: `APP_ENV=production` detected.

**Solution**: This is correct behavior. Destructive operations are never allowed in production.

## Migration Guide

If you're currently using manual env var assembly:

1. **Stop using manual env vars** - Remove all `VAR=value` prefixes from commands
2. **Create environment files** - Copy templates and fill in values
3. **Use macros** - Replace manual commands with `dev:start`, `staging:start`, `prod:start`
4. **Update documentation** - Remove any examples showing manual env var assembly

## Summary

- **Three environments**: development, staging, production
- **One-line commands**: `dev:start`, `staging:start`, `prod:start`, `certify:staging`
- **No manual env vars**: Use macros instead
- **Safety enforced**: Destructive operations only via `certify:staging`
- **Golden rule**: If you can delete users, you're not in production











