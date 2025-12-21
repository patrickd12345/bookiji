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
