# Support RAG SimCity Environment Setup - Status Report

## ✅ Completed Steps

### Step 1: API Preflight Check
- ✅ Added preflight check to `chaos/scenarios/support_rag/support_rag_shadow_run.mjs`
- ✅ Scenario will fail immediately if API is unreachable with clear error message

### Step 2: Database Minimum Wiring
- ✅ Verified all required tables exist:
  - `kb_articles` ✅
  - `kb_article_chunks` ✅
  - `kb_embeddings` ✅
  - `kb_rag_usage` ✅
  - `simcity_runs` ✅
  - `simcity_run_events` ✅ (created via migration `20251224015718_ensure_simcity_run_events_exists.sql`)
- ✅ Verified `kb_search` RPC function exists
- ✅ All migrations applied successfully

### Step 3: Support RAG Path Sanity Check
- ⏳ **PENDING**: API needs to be running
- ✅ Test script created: `scripts/test-support-rag-api.mjs`

### Step 4: SimCity Scenario Re-run
- ⏳ **PENDING**: Waiting for API to be available

## 🔧 Next Steps (Manual)

### 1. Start the Bookiji API

```powershell
# In a new terminal window
pnpm dev
```

Wait for: `Ready on http://localhost:3000`

### 2. Verify API is Working

```powershell
# In another terminal
node scripts/test-support-rag-api.mjs http://localhost:3000
```

Expected output:
```
✅ API is reachable and returns valid response
   Status: 200
   Fallback used: true (or false if LangChain enabled)
   Citations: X
   Confidence: X.X
   Trace ID: <uuid>
```

### 3. Run SimCity Scenario

```powershell
node chaos/scenarios/support_rag/support_rag_shadow_run.mjs \
  --seed 42 \
  --duration 1800 \
  --concurrency 3 \
  --target-url http://localhost:3000
```

## 📋 Verification Scripts Created

1. **`scripts/verify-support-rag-db.mjs`** - Checks all required database objects
2. **`scripts/test-support-rag-api.mjs`** - Tests the Support RAG API endpoint
3. **`scripts/apply-pending-migrations.ps1`** - Applies migrations using Supabase CLI

## 🎯 Expected Outcome

When the scenario runs successfully:
- Preflight check passes (API reachable)
- Events are executed (`executed > 0`)
- Events are recorded in `simcity_run_events` table
- Run is recorded in `simcity_runs` table
- Output: `PASS seed: 42 events: X duration: Ys`

If failures occur, they will be:
- Real invariant violations (not transport errors)
- Deterministic and reproducible
- Clearly reported with failure details

## 📝 Notes

- The scenario uses port 3000 by default (matches `pnpm dev`)
- Database is fully configured and ready
- All required tables and functions exist
- Preflight check will catch API availability issues early

