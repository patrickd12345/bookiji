# SimCity Phase 3: Live Telemetry + Mission Control

Phase 3 introduces real-time observability and control for SimCity testing runs.

## Database Schema Extensions

### New Tables
- `simcity_run_events`: Append-only event stream for each run.
- `simcity_run_snapshots`: Sparse metrics snapshots (every 5-10 events).
- `simcity_run_live`: Single-row per run for fast polling and heartbeats.

### Table: `simcity_runs` (Extended)
- `pass`: Boolean pass/fail status.
- `fail_forensic`: JSON bundle for the first failure.
- `duration_seconds_actual`: Exact run duration.

## API Contracts

### Metadata
`GET /api/ops/simcity/runs/:runId`
Returns full run metadata including live status.

### Event Stream (REST)
`GET /api/ops/simcity/runs/:runId/events?from=N&limit=K`
Fetch historical events.

### Snapshots (REST)
`GET /api/ops/simcity/runs/:runId/snapshots?from=N&limit=K`
Fetch sparse snapshots for charting.

### Live Stream (SSE)
`GET /api/ops/simcity/runs/:runId/stream`
Server-Sent Events channel.
Events:
- `heartbeat`: Current run status and latest metrics.
- `event`: New event processed.
- `snapshot`: New metrics snapshot.
- `end`: Run finished (PASS/FAIL/STOPPED).

## Mission Control UI

Access: `/admin/simcity/mission-control`

Features:
- **Live Monitoring**: Watch event index and metrics update in real-time.
- **Charts**: Visualizing bookings, cancellations, and slot availability.
- **Forensics**: View invariant failures and full state bundles.
- **Replay**: Scrubber to view historical snapshots and event sequence.
- **Control**: Stop any running simulation instantly.

## Developer Guide

### Running Telemetry Locally
1. Apply migrations: `supabase/migrations/20251222220000_simcity_control_plane_phase3.sql`
2. Start the runner: `ts-node ops/simcity/runner.ts`
3. Visit the Mission Control page to launch and monitor runs.

### Telemetry Implementation
Telemetry is pushed directly from the `chaos-harness` container to Supabase via REST calls. The runner handles high-level status management and stop requests.














