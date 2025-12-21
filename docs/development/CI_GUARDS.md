# CI guards

North star: if CI fails, it’s a real bug.

## Test tiers

- `unit`: pure logic/helpers (always on CI)
- `api`: route handlers with mocks (always on CI)
- `contract`: OpenAPI vs runtime (always on CI via `pnpm contract`)
- `integration`: orchestration / cross-service flows (opt-in; not part of default CI)
- `e2e`: Playwright real flows (opt-in)

## What CI guarantees

CI runs:

- `pnpm db:policy:check`
- `pnpm test:fast`
- `pnpm contract`

CI does not run:

- integration tests (`pnpm test:full` is opt-in)
- end-to-end tests (`pnpm e2e` is opt-in)

Integration tests (`pnpm test:integration`) are opt-in and may fail while scenarios evolve; CI enforces `pnpm test:fast` only.

SimCity note: Phase 1 state is in-memory only and resets on process restart.
SimCity events note: Phase 3 events are deterministic; event IDs are derived from (seed, tick, domain, type, payload) and there are no wall-clock timestamps in the event contract.
SimCity proposals note: Phase 4 proposals are advisory only and never executed. Proposals are read-only signals generated from LLM or rule-based analysis of SimCity events. Proposal IDs are content-hashed (deterministic) and proposals are disabled in production environments.
SimCity replay note: Phase 5 replay is non-prod only, read-only, and isolated. Replay runs on a fresh fork instance and never mutates the live engine state. Replay reports are deterministic (same inputs produce same reportHash). To run replay tests: `pnpm test:integration`. Example replay API: `POST /api/ops/controlplane/simcity/replay` with body `{ fromTick, toTick, baseline: true, variants: [{ name, interventions: [{ atTick, proposals: [...] }] }] }`.
SimCity metrics/dials/evaluator note: Phase 6 introduces deterministic metrics extraction, dial thresholds, and variant evaluation. All metrics are computed from event streams deterministically. Dials define green/yellow/red zones for metrics. Evaluation determines if a replay variant is "allowed" based on dial statuses. All Phase 6 endpoints are read-only, advisory only, and safe-by-default. Metrics, dials, and evaluation results are deterministic (same inputs produce same outputs).
SimCity governance note: Phase 7 introduces governance engine that evaluates proposals using dials, metrics, and replay evaluations. Governance produces promotion decisions (allow/warn/block) with explicit reasons and override requirements. Governance is advisory and read-only; promotions are never executed. Governance decisions are blocked in production and deterministic (same inputs produce same decisionHash). Override requirements are explicit and role-based (admin/safety/exec).
