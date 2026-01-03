# Chaos Session Execution

## Prerequisites

**CRITICAL**: Both services must be running before executing chaos attacks:

1. **Docker Desktop** - Must be running
2. **Supabase** - Run: `supabase start`
3. **Development Server** - Run: `pnpm dev` (in separate terminal)

## Quick Start

```powershell
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start dev server  
pnpm dev

# Terminal 3: Run chaos session
.\chaos\sessions\run-chaos-session.ps1
```

## What It Does

The chaos session will:
- Execute 1000 events in 30 seconds
- Use 100 concurrent connections
- Test all invariants
- Record failures to `chaos/sessions/chaos-results-*.json`

## Expected Behavior

The chaos harness will:
- ✅ **PASS** if all invariants hold
- ❌ **FAIL** if any invariant is violated

Failures are recorded with full forensic data for analysis.

## Manual Execution

If you prefer to run manually:

```powershell
$env:SUPABASE_URL = "http://127.0.0.1:54321"
$env:SUPABASE_SECRET_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU"

node chaos/harness/index.mjs `
    --seed 999999 `
    --duration 30 `
    --max-events 1000 `
    --concurrency 100 `
    --target-url http://localhost:3000 `
    --out chaos-results.json
```

## Troubleshooting

**Error: "fetch failed"**
- Check that both Supabase and dev server are running
- Verify ports: Supabase API on 54321, dev server on 3000

**Error: "Docker Desktop not running"**
- Start Docker Desktop
- Wait for it to fully start
- Then run `supabase start`

**Error: "SUPABASE_URL env is required"**
- The script sets these automatically
- If running manually, set environment variables as shown above





















