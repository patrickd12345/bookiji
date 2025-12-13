# Tests Overview

Quick map of what lives under `tests/` and how to run it.

## Layout
- `components/` UI and hook suites (Vitest + Testing Library).
- `api/` route handler tests (import Next.js handlers directly).
- `integration/` fast flows that stay in-process (no servers).
- `e2e/` Playwright specs (`tests/e2e` and top-level `a11y*.spec.ts`).
- `utils/` shared mocks/helpers (`supabase-mocks`, `resetTestEnv`, etc.).

## Running
- All Vitest suites: `pnpm test` or `pnpm test:run`.
- Specific file: `pnpm vitest run tests/api/blocks.spec.ts`.
- Playwright: `pnpm e2e` (`pnpm e2e:ui` for the headed runner).

## Naming
- Use `.spec.ts` for API/unit/integration, `.test.tsx` for React-heavy suites.
- Keep filenames descriptive by surface: `blocks.spec.ts`, `ProviderMap.test.tsx`.

## Shared utilities
- Supabase factory: `tests/utils/supabase-mocks.ts` (`createSupabaseClientMocks`, `getSupabaseMock`).
- Env + global mocks live in `tests/setup.ts` (router, i18n, auth, fetch).
- Reset helper available at `tests/utils/resetTestEnv.ts` when you need a clean spy/module slate mid-suite.

## Mocking responsibilities
- Prefer per-suite overrides that extend the shared Supabase mock instead of redefining it.
- Keep fetch/router/i18n mocks centralized in `tests/setup.ts`; only shadow them locally when the behavior differs.
- For API routes, mock `next/headers` cookies and any server clients close to the tests for readability.

## Adding new tests
- Start by copying the closest neighbor (component → `tests/components`, API → `tests/api`, integration → `tests/integration`).
- Reuse helper utilities before adding new ones; place new shared helpers in `tests/utils/`.
- Run `pnpm test:run --watch=false` to ensure deterministic output before opening a PR.
