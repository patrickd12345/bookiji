# Chaos Session - FIXED

## Issue
Chaos session failed because infrastructure (Supabase + dev server) was not running.

## Fix Applied
Created execution script that:
1. ✅ Checks prerequisites (Supabase + dev server)
2. ✅ Sets required environment variables
3. ✅ Executes chaos harness with proper parameters
4. ✅ Records results for analysis

## Files Created
- `chaos/sessions/run-chaos-session.ps1` - Automated execution script
- `chaos/sessions/README.md` - Execution instructions

## To Run

**Step 1**: Start Docker Desktop

**Step 2**: Start Supabase
```powershell
supabase start
```

**Step 3**: Start dev server (in separate terminal)
```powershell
pnpm dev
```

**Step 4**: Run chaos session
```powershell
.\chaos\sessions\run-chaos-session.ps1
```

## What Will Happen

The chaos harness will:
- Execute 1000 events in 30 seconds
- Use 100 concurrent connections
- Test all invariants:
  - No double booking
  - Cancelled booking never resurrects
  - Notification idempotency
  - Booking requires availability
  - No payment/billing state touched
  - No cross-vendor data leakage

**Expected Outcomes**:
- ✅ **PASS**: All invariants hold (system is resilient)
- ❌ **FAIL**: Invariant violation detected (system broke - this is what we want to observe!)

Failures include full forensic data for analysis.

## Current Status

**READY TO EXECUTE** - Once prerequisites are met, the script will run the chaos session and record what breaks.




