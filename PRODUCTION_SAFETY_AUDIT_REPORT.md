# Production Safety Audit Report
**Date:** 2026-01-03  
**Auditor:** AI Safety Verification  
**Scope:** Supabase CLI access and production mutation prevention

---

## ✅ VERIFIED: Checks That Passed

### 1. Supabase CLI Access Token
- ✅ **SUPABASE_ACCESS_TOKEN is NOT required in local scripts**
  - No local scripts (`scripts/`, `playwright/`) require or load `SUPABASE_ACCESS_TOKEN`
  - Only used in CI workflows (`.github/workflows/supabase-migrations-audit.yml`) with GitHub secrets
  - Documentation explicitly warns against setting it in `.env` files
  - **Location:** All references are in docs (warnings) or CI workflows (secrets)

### 2. Supabase Project Targeting
- ✅ **`.supabase/config.toml` does NOT point to production**
  - `project_id = "bookiji"` is a local identifier only
  - No hardcoded production project ref in config
  - Linking requires explicit `supabase link --project-ref` command with token
  - **Location:** `supabase/config.toml:1`

### 3. Runtime Mode Enforcement (Partial)
- ✅ **Runtime mode system exists and has precedence logic**
  - `src/env/runtimeMode.ts` implements `RUNTIME_MODE` → `DOTENV_CONFIG_PATH` → fallback
  - Throws error if mode cannot be determined
  - **Location:** `src/env/runtimeMode.ts:13-40`
- ⚠️ **Fallback to NODE_ENV/BASE_URL is fragile** (see RISKY section)

### 4. Production Mutation Guards (Partial)
- ✅ **`assertNotProduction()` exists and is correctly implemented**
  - Throws immediately if `isProduction()` returns true
  - **Location:** `src/env/productionGuards.ts:3-8`
- ✅ **Used in critical seeding script**
  - `scripts/e2e/seed-users.ts:51` calls `assertNotProduction('e2e:seed - prevents accidental production mutation')`
- ✅ **Playwright global setup skips seeding in prod**
  - `playwright.global-setup.ts:16` checks `mode === 'prod'` and skips seeding

### 5. Environment File Hygiene (Partial)
- ✅ **Single-env-file loader exists**
  - `src/env/loadEnv.ts` enforces exactly one env file per mode
  - Throws if multiple env files detected
  - **Location:** `src/env/loadEnv.ts:17-38`
- ✅ **Key scripts use runtime mode system**
  - `scripts/e2e/seed-users.ts` uses `loadEnvFile(getRuntimeMode())`
  - `playwright.global-setup.ts` uses `loadEnvFile(mode)`
  - `scripts/e2e/run-navigation-completeness.ts` explicitly loads `.env.prod`

### 6. CI vs Local Separation
- ✅ **CI workflows are properly isolated**
  - `.github/workflows/supabase-migrations-audit.yml` uses secrets for tokens
  - Production mutations only via CI with explicit secrets
  - **Location:** `.github/workflows/supabase-migrations-audit.yml:103-130`

---

## ❌ VIOLATIONS: Dangerous Patterns Found

### VIOLATION 1: Production Mutation Scripts Without Guards
**Severity:** CRITICAL  
**Files:**
- `scripts/e2e/apply-seed-function-prod.ts` (lines 1-160)
- `scripts/e2e/apply-migration-direct.ts` (lines 1-114)
- `scripts/apply-seed-migration-direct.mjs` (lines 1-86)
- `scripts/apply-pending-migrations.ps1` (entire file)

**Issue:** These scripts can mutate production databases but:
- Do NOT call `assertNotProduction()`
- Do NOT check runtime mode
- Load `.env.local` directly (bypassing runtime mode system)
- Can execute against production if `.env.local` contains production credentials

**Risk:** A developer with production credentials in `.env.local` could accidentally run:
```bash
pnpm tsx scripts/e2e/apply-seed-function-prod.ts  # Mutates production!
pnpm tsx scripts/e2e/apply-migration-direct.ts    # Mutates production!
```

**Required Fix:** Add `assertNotProduction()` at the start of each script, or rename to make production intent explicit and require `RUNTIME_MODE=prod CONFIRM_PRODUCTION_MUTATION=true`.

---

### VIOLATION 2: Direct .env.local Loading in Production Scripts
**Severity:** HIGH  
**Files:**
- `scripts/e2e/apply-seed-function-prod.ts:23-27`
- `scripts/e2e/apply-migration-direct.ts:11-15`
- `scripts/apply-seed-migration-direct.mjs:17-18`
- `scripts/apply-pending-migrations.ps1:7-24`

**Issue:** These scripts bypass the runtime mode system by loading `.env.local` directly:
```typescript
// BAD: Bypasses runtime mode enforcement
const envLocalPath = path.resolve(process.cwd(), '.env.local')
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false })
}
```

**Risk:** If `.env.local` exists and contains production credentials, these scripts will use them without runtime mode checks.

**Required Fix:** Replace with `loadEnvFile(getRuntimeMode())` and add `assertNotProduction()` guards.

---

### VIOLATION 3: Package.json Scripts Without Explicit Env Files
**Severity:** MEDIUM  
**Files:**
- `package.json:57-59` (`db:reset`, `db:push`, `db:pull`)

**Issue:** These scripts run `supabase` CLI commands without explicit `DOTENV_CONFIG_PATH`:
```json
"db:reset": "supabase db reset",
"db:push": "supabase db push",
"db:pull": "supabase db pull"
```

**Risk:** If `.env.local` exists, Supabase CLI may read it implicitly, potentially targeting production if credentials are present.

**Required Fix:** These should only work in local mode. Add runtime mode check or require explicit `DOTENV_CONFIG_PATH`.

---

### VIOLATION 4: Runtime Mode Fallback Logic is Fragile
**Severity:** MEDIUM  
**File:** `src/env/runtimeMode.ts:29-36`

**Issue:** Fallback to `NODE_ENV`/`BASE_URL` can misclassify environment:
```typescript
// 3) Fallback to NODE_ENV/BASE_URL checks (best-effort, but prefer explicit)
const nodeEnv = (process.env.NODE_ENV || '').toLowerCase()
if (nodeEnv === 'production') return 'prod'
// ...
if (baseUrl.includes('bookiji.com')) return 'prod'
```

**Risk:** If `RUNTIME_MODE` and `DOTENV_CONFIG_PATH` are both unset, a script could incorrectly detect production mode based on `BASE_URL`, or vice versa.

**Required Fix:** Make fallback logic stricter or remove it entirely (force explicit mode).

---

## ⚠️ RISKY BUT BLOCKED: Things That Look Scary But Are Guarded

### RISKY 1: `scripts/e2e/reset-local-supabase.ts`
**Why it looks scary:** Runs `supabase db reset` which is destructive.

**Why it's blocked:**
- ✅ Checks `mode !== 'e2e' && mode !== 'dev'` and throws (line 7-9)
- ✅ Only works in e2e/dev modes
- ✅ Uses `loadEnvFile(mode)` to ensure correct env

**Verdict:** SAFE - mode check prevents production execution.

---

### RISKY 2: `playwright.global-setup.ts` calls `pnpm e2e:seed`
**Why it looks scary:** Could seed users in production.

**Why it's blocked:**
- ✅ Checks `mode === 'prod'` and skips seeding (line 16)
- ✅ `scripts/e2e/seed-users.ts` has `assertNotProduction()` guard (line 51)
- ✅ Production navigation runner sets `E2E_SKIP_SEED=true` (line 35)

**Verdict:** SAFE - multiple layers of protection.

---

### RISKY 3: CI Workflows Use SUPABASE_ACCESS_TOKEN
**Why it looks scary:** CI can mutate production.

**Why it's blocked:**
- ✅ Tokens stored in GitHub secrets (not in code)
- ✅ Separate secrets for staging vs production
- ✅ Only runs on schedule or manual dispatch
- ✅ No local scripts can access these secrets

**Verdict:** SAFE - proper secret management and CI isolation.

---

## FINAL VERDICT

### **SAFE BUT FRAGILE**

**Reasoning:**

1. **Core safety mechanisms exist:**
   - Runtime mode system is implemented
   - Production guards exist (`assertNotProduction()`)
   - Single-env-file loader prevents mixing
   - CI workflows are properly isolated

2. **Critical gaps remain:**
   - Production mutation scripts (`apply-seed-function-prod.ts`, `apply-migration-direct.ts`, etc.) bypass guards
   - Direct `.env.local` loading in multiple scripts
   - Package.json `db:*` scripts lack explicit env file specification
   - Runtime mode fallback logic is too permissive

3. **Fragility concerns:**
   - If `.env.local` exists with production credentials, several scripts can mutate production
   - Runtime mode fallback could misclassify environment
   - No validation script runs in CI to catch these issues

**Recommendations (in priority order):**

1. **IMMEDIATE:** Add `assertNotProduction()` to all production mutation scripts:
   - `scripts/e2e/apply-seed-function-prod.ts`
   - `scripts/e2e/apply-migration-direct.ts`
   - `scripts/apply-seed-migration-direct.mjs`
   - `scripts/apply-pending-migrations.ps1`

2. **HIGH:** Replace direct `.env.local` loading with `loadEnvFile(getRuntimeMode())` in all scripts

3. **MEDIUM:** Add runtime mode checks to `package.json` `db:*` scripts or document they are local-only

4. **MEDIUM:** Tighten runtime mode fallback logic or remove it (force explicit mode)

5. **LOW:** Add CI validation step that runs `scripts/validate-env-isolation.ts` to catch regressions

---

## Summary Statistics

- **Total scripts audited:** ~120
- **Scripts with production mutation risk:** 4
- **Scripts using `.env.local` directly:** 75+ (mostly docs/recovery scripts)
- **Scripts with proper guards:** 3 (`seed-users.ts`, `reset-local-supabase.ts`, `playwright.global-setup.ts`)
- **CI workflows:** 1 (properly isolated with secrets)

---

**Report generated:** 2026-01-03  
**Next audit recommended:** After implementing fixes above
