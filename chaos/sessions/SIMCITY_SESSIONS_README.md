# SimCity Chaos Sessions — Observation Mode

## Overview

These sessions are **OBSERVATION ONLY**. They test whether the system produces incidents, handles noise, and recovers correctly. **NO FIXES ARE APPLIED**.

## Sessions

### Session 1: Valid Path Degradation (Slow Failure)

**Objective**: Test whether valid booking flows, when degraded, produce incidents instead of silence.

**What it does**:
- Uses canonical endpoints (`/api/bookings/create`)
- Uses syntactically valid payloads
- Authenticates properly
- Allows requests to reach business logic and DB
- Introduces degradation via:
  - Latency injection (500ms → 2000ms)
  - Partial DB failures (10% → 30%)
  - Stripe timeouts (simulated)
- Maintains pressure for 2-3 minutes
- Observes incident creation (or lack thereof)

**What it observes**:
- Incident creation (or lack thereof)
- Jarvis classification behavior
- Error aggregation vs per-request handling
- Whether failures become quieter or noisier over time

### Session 2: Mixed Traffic (Noise vs Signal)

**Objective**: Verify that invalid noise does not drown out valid distress.

**What it does**:
- Runs two parallel streams:
  - High-volume invalid traffic (bad paths, malformed payloads)
  - Low-volume but valid booking traffic that degrades slowly
- Ensures invalid traffic is rejected fast
- Ensures valid traffic reaches deep execution paths

**What it observes**:
- Whether valid failures still surface
- Whether incidents ignore noise
- Whether Jarvis stays factual and calm
- Whether metrics are polluted by junk

### Session 3: Recovery & Quietening

**Objective**: Test whether the system gets quieter after stress.

**What it does**:
- Gradually removes stressors
- Restores dependencies
- Stops traffic entirely
- Observes post-failure behavior for at least 60 seconds

**What it observes**:
- Incident resolution behavior
- Lingering alerts or silence
- Whether Jarvis de-escalates cleanly
- Whether any "ghost activity" remains

## Prerequisites

1. **Docker Desktop** — Must be running
2. **Supabase** — Run: `supabase start`
3. **Development Server** — Run: `pnpm dev` (in separate terminal)

## Quick Start

```powershell
# Terminal 1: Start Supabase
supabase start

# Terminal 2: Start dev server  
pnpm dev

# Terminal 3: Run all sessions
node chaos/sessions/run-simcity-sessions.mjs
```

## Running Individual Sessions

```powershell
# Session 1: Valid Path Degradation
node chaos/sessions/session1-valid-path-degradation.mjs

# Session 2: Mixed Traffic
node chaos/sessions/session2-mixed-traffic.mjs

# Session 3: Recovery & Quietening
node chaos/sessions/session3-recovery-quietening.mjs
```

## Output Files

Each session generates:
- **`{session-id}-observations.json`** — Structured observation data including:
  - Incident IDs (when created in STAGING)
  - Jarvis explain output (badges, layers, escalation decisions)
  - Incident creation status
  - Quietening behavior
- **`{session-id}-report.md`** — Markdown report

The master runner also generates:
- **`consolidated-findings-{timestamp}.json`** — Consolidated findings
- **`consolidated-findings-{timestamp}.md`** — Consolidated report

### Observation Output Details

In STAGING mode, observations capture:
- **Incident IDs**: Real incident IDs from `POST /api/jarvis/detect`
- **Jarvis Explanations**: Raw explain output from `GET /api/jarvis/incidents/[id]/explain`
- **Badges**: Classification badges returned by Jarvis
- **Layer Relevance**: Layer 0/1/2/3 awareness (Layer 4/5 should never appear)
- **Escalation Decisions**: Decision type (DO_NOT_NOTIFY, SEND_SILENT_SMS, SEND_LOUD_SMS, WAIT)
- **Quietening Status**: Whether system quiets after recovery

All observations are **raw data only** — no interpretation or labeling as "good" or "bad".

## Configuration

### Environment Variables

- `BASE_URL` — Base URL for API (default: `http://localhost:3000`)
- `APP_ENV` — Environment mode: `local`, `staging`, or `prod` (required for STAGING mode)
- `ENABLE_STAGING_INCIDENTS` — Set to `true` to enable real incident creation in STAGING (required for STAGING mode)
- `JARVIS_OWNER_PHONE` — Phone number for incident notifications (optional, defaults to `+1234567890`)

### STAGING Mode

To run chaos sessions in STAGING with real incident creation:

```powershell
# Set environment variables
$env:APP_ENV = "staging"
$env:ENABLE_STAGING_INCIDENTS = "true"
$env:BASE_URL = "https://staging.bookiji.com"  # Your staging URL
$env:JARVIS_OWNER_PHONE = "+1234567890"  # Optional

# Run sessions
node chaos/sessions/run-simcity-sessions.mjs
```

**STAGING Mode Behavior:**
- ✅ **Real incidents ARE created** (unlike local mode)
- ✅ **Notifications are sandboxed** (dry-run, test channel, or noop sender)
- ✅ **All observations are recorded** (incident IDs, Jarvis explanations, badges, layers, escalation decisions)
- ❌ **Hard-fails if APP_ENV=prod** (production is forbidden)
- ❌ **Hard-fails if ENABLE_STAGING_INCIDENTS is not set** (requires explicit opt-in)

**Safety Checks:**
- Script will hard-fail immediately if `APP_ENV=prod` or `APP_ENV=production`
- Script requires `ENABLE_STAGING_INCIDENTS=true` when running in STAGING
- 3-second warning is displayed before execution starts
- Exit code will be non-zero if validation fails (no incidents created, Layer 4/5 detected, etc.)

### Local Mode (Default)

In local mode (default), sessions observe behavior but do not create real incidents:

```powershell
# Local mode (default)
node chaos/sessions/run-simcity-sessions.mjs
```

**Local Mode Behavior:**
- ✅ Observations are recorded
- ✅ Incident checks are performed (GET /api/jarvis/detect)
- ❌ Real incidents are NOT created (POST /api/jarvis/detect is not called)
- ❌ Notifications are not sent

## What These Sessions Do NOT Do

- ❌ Apply fixes
- ❌ Add guardrails
- ❌ Modify invariants
- ❌ Change code behavior
- ❌ "Improve" anything

## What These Sessions DO

- ✅ Execute scenarios
- ✅ Observe behavior
- ✅ Record evidence
- ✅ Emit findings

## Interpreting Results

### Good Signs
- Incidents are created for valid failures
- Noise is rejected quickly
- Valid failures surface despite noise
- System quiets down after stress
- No ghost activity

### Concerning Signs
- Valid failures do not create incidents
- Noise drowns out signal
- System does not quieten after stress
- Ghost activity observed
- Jarvis becomes noisy or inaccurate

## Next Steps After Observation

1. Review consolidated findings
2. Determine if observed behavior matches expectations
3. Decide what (if anything) to change
4. Apply fixes (outside these sessions)

## Hard Rules

- **No fixes** — These sessions measure reality, not improve it
- **No guardrails** — We want to see what happens without protection
- **No retries added** — We observe natural retry behavior
- **No invariant edits** — We test existing invariants
- **No code changes** — Pure observation only

Humans will decide what (if anything) to change later.

