# Phase 14 — Baseline City Soak

The goal of Phase 14 is to capture what "normal" looks like for Bookiji when SimCity v2 runs continuously at default rates. This is an **observational-only** soak: no tuning, no retries changes, no chaos, and no OpsAI feedback. Every artifact must be labeled **"Phase 14 Baseline"** and treated as read-only once captured.

## Guardrails (do not bend)
- SimCity runs continuously once started; no mid-run configuration edits or rate changes.
- No fault injection, adversarial behavior, or retry policy modifications.
- No production deployments; `BOOKIJI_ENV` must not be `prod` and `SIMCITY_ALLOWED` must be explicitly true before the daemon starts. `SIMCITY_TARGET_BASE_URL` must point to an allowlisted host (localhost or staging) per the daemon guardrails.【F:src/simcity/daemon.ts†L1-L27】
- OpsAI observes only—no coupling or automated reactions to what it sees.
- No alert tuning or correctness assertions. Results are descriptive, not evaluative.

## Run pre-checks
1. **Environment fingerprint**
   - Capture Git SHA: `git rev-parse HEAD`.
   - Generate deployment fingerprint for reproducibility: `node scripts/generate-deployment-fingerprint.mjs --output ops/phase14/fingerprints/<timestamp>-fingerprint.json` (export `DEPLOY_ENV`/`DEPLOY_ENV_LABEL` if needed for clarity).【F:scripts/generate-deployment-fingerprint.mjs†L52-L106】
2. **Safety gates**
   - Export `SIMCITY_ALLOWED=true`.
   - Export `BOOKIJI_ENV` to a non-prod value (e.g., `dev` or `staging`).
   - Export `SIMCITY_TARGET_BASE_URL` to an allowlisted base URL (localhost or staging).
3. **Starting conditions**
   - Use the default SimCity scenario and policies; do not override rates once running.
   - Ensure observability sinks (Supabase, logging) are reachable so snapshots can be read without retries logic changes.

## Execution steps
1. **Power on SimCity** via the usual control plane (e.g., `POST /api/simcity/start`). Record the exact start timestamp, seed (if set), and scenario used.
2. **Let it run continuously** for the planned soak window (hours → days). Do not touch configuration after start; pause/restart only if a safety intervention is required, and then restart Phase 14 from zero.
3. **Passive observability capture** (no control changes):
   - Request volume distributions and endpoint hit frequencies.
   - Latency percentiles (p50, p95, p99) and timing jitter.
   - Error rates broken down by class plus natural retries.
   - Database read/write ratios and queue/worker throughput if available.
   - Payment intent creation patterns where applicable.
4. **Noise characterization**
   - Mark expected background error rates and benign transient failures.
   - Note rare-but-valid sequences and load variance across endpoints.
5. **Baseline artifact generation**
   - Write summaries (traffic distributions, latency histograms, error taxonomy, endpoint heat maps, environment fingerprint) into `ops/phase14` using the provided templates below.
   - Timestamp every artifact and prefix filenames with `phase14-baseline-<timestamp>-...`.
   - Do not alter artifacts after writing; treat them as immutable snapshots.
6. **Synthetic purge**
   - After the soak completes, run the standard synthetic purge to return the environment to zero residue; record completion time in the report.

## Data sources to lean on
- **Metrics APIs in SimCity mode**: `/api/ops/metrics/*` endpoints already switch to SimCity snapshots when `OPS_MODE` is `simcity`; use them for passive reads (system, bookings, errors, latency).【F:src/app/api/ops/metrics/system/route.ts†L16-L39】【F:src/app/api/ops/metrics/bookings/route.ts†L19-L31】
- **Deployment fingerprint**: use `scripts/generate-deployment-fingerprint.mjs` to capture code/config hashes tied to the soak environment.【F:scripts/generate-deployment-fingerprint.mjs†L52-L106】
- **Baseline store**: the Ops baseline store persists JSON artifacts under `ops/baseline/` for comparison without changing runtime behavior.【F:scripts/ops-baseline-store.ts†L6-L78】

## Templates (ops/phase14)
Create a timestamped copy of each template before filling it out:
- `phase14-baseline-runlog.template.md` — capture start conditions, environment fingerprint path, runtime notes, and purge confirmation.
- `phase14-baseline-artifacts.template.json` — record distributions (traffic, latency, errors), endpoint heat maps, and database/payment ratios with sample counts and percentile summaries.

## Completion criteria
Phase 14 is complete only when:
- SimCity ran continuously with no mid-run edits or rate tuning.
- Baseline metrics and noise observations are captured and stored under `ops/phase14` with Phase 14 labels.
- OpsAI remained passive throughout the soak.
- Synthetic purge completed and is logged in the run log.
