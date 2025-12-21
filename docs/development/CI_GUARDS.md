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
