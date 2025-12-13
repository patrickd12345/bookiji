# Bookiji Operational Readiness (MVP Pilot → Staged Beta)

## SLOs (Service Level Objectives)
- Latency: P95 ≤ 500 ms, P99 ≤ 1,000 ms for **/api/quote** and **/api/bookings/confirm** under pilot load.
- Availability: 99% monthly during pilot, error budget 1%.
- Payments Integrity: Double-charge rate = 0.0% in tests and pilot.
- Privacy Ops: PII export/delete ≤ 60 seconds.

## SLI Instrumentation
- Timing histograms on quote and confirm handlers.
- Stripe webhook outcomes: success/failure/idempotent-skip counters.
- Outbox state machine metrics: queued, in-flight, committed, DLQ depth.
- Access log writes/sec and failure rate.
- Map adapter health check (primary vs fallback ratio).

## Alerts
- Page when: P99 > 1s for 10 min; DLQ depth > 0 for 5 min; double-charge counter > 0; export/delete > 60s P95.
- Ticket when: P95 > 500ms for 1 hour; access log write error > 0.1% for 15 min.

## Rollback
- **Command**: `bkctl rollback --booking <id>` (refunds, state reversion, audit append).
- Target execution: ≤ 60 seconds.
- Drill cadence: weekly during pilot; store evidence in `/ops/drills/YYYY-MM-DD.md`.

## Privacy Boundaries
- PII map kept in `/docs/privacy/pii_map.yml` with data owners.
- Access logs include: subject id, actor id, purpose, timestamp; immutable.
- Export includes all user-related records across schemas; delete uses soft-delete with tombstone + background shredder.

## Simulator (“SimCity”) Integration
- Entry: SimCity synthetic traffic daemon (power toggled via /api/simcity/power/on|off).
- All failure-mode E2Es in `tests_manifest.yml` must use the simulator to generate timings and races.
- Simulator reuses the same domain services used by production to avoid drift.

## Runbooks
- **Incident-001: Stripe DLQ Growth**: pause confirm processor; drain DLQ with exponential backoff; verify idempotent skips; reconcile ledger.
- **Incident-002: Provider Slow/Down**: activate fallback map tiles; raise SLA breach banner; auto-cancel > T; notify vendor.
- **Incident-003: Privacy Export/Delete Slowness**: scale worker pool; prioritize export/delete queue; verify audit of accesses.
- **Incident-004: Latency Regression**: enable sampling profiler; warm caches; roll back last feature flag.

## Feature Flags
- `beta.public_directory` OFF for MVP.
- `payments.outbox` MUST be ON.
- `ops.force_cancel` ON, behind `admin_only` guard.
