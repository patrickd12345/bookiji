# Testing Guide

Practical conventions for Bookiji tests (Vitest + Playwright) and how we mock Supabase.

## Supabase mocking (central factory)
- `tests/setup.ts` calls `createSupabaseClientMocks()` from `tests/utils/supabase-mocks.ts`, wiring `@/lib/supabaseClient`/`@/lib/supabase` to one shared mock instance.
- Override behaviors per test with `getSupabaseMock()` inside `beforeEach`. The mock is shared, so clear or reassign methods before assertions.
- `resetSupabaseMock()` clears spies without replacing the instance; use when you need a clean call history but want to keep module mocks intact.
- For custom module IDs (e.g., edge-only clients), call `createSupabaseClientMocks({ moduleIds: [...] })` in the test to add extra aliases.
- The mock is async-friendly: chained helpers like `select().eq().single()` resolve promises and default to `{ data: [], error: null }` for reads or `{ data: null, error: null }` for writes.

### Debugging “undefined chain” errors
- Symptom: `Cannot read properties of undefined (reading 'eq'/'gte'/...)` from a Supabase call.
- Cause: A new query shape that our default chain does not stub (e.g., calling `match`, `in`, or nested `select` shapes).
- Fixes:
  - Add a table-specific override in your test: `getSupabaseMock().from.mockImplementation(...)` that returns a chain containing the missing methods.
  - If it should be global, extend `createQueryChain` in `tests/utils/supabase-mocks.ts` to include the method (keep return objects immutable and promise-based).
  - Avoid creating brand-new mock clients per test—keep the shared instance to prevent leaking stale `vi.doMock` state.

### Writing new mocks safely
- Prefer table-specific overrides that delegate to the base chain to avoid breaking other suites:
  ```ts
  const supabase = getSupabaseMock()
  const baseFrom = supabase.from.getMockImplementation?.() ?? (() => ({} as any))
  supabase.from.mockImplementation((table) => {
    if (table === 'my_table') {
      const chain = baseFrom(table)
      chain.insert = vi.fn(() => ({ single: vi.fn(async () => ({ data: { id: 't1' }, error: null })) }))
      return chain
    }
    return baseFrom(table)
  })
  ```
- Always reset call counts in `beforeEach` (`vi.clearAllMocks()` or `resetSupabaseMock()`) so shared state does not influence later tests.
- Keep mocks minimal: only stub methods the test touches to avoid hiding real regressions.

## Component test patterns
- Use Testing Library (`@testing-library/react`) with the global setup in `tests/setup.ts` for router, i18n, and auth stubs.
- Wrap components with required providers (theme, stores) via small helpers instead of re-declaring contexts inline; mirror production defaults when unsure.
- For hooks that require hydration-sensitive APIs (e.g., `matchMedia`, `localStorage`), rely on the global mocks in setup and avoid duplicating them inside tests.
- Prefer `findBy*`/`findAllBy*` for async UI states and keep assertions scoped to user-visible text or `data-testid`s already present in the component.
- When adding new providers, extend `tests/setup.ts` once instead of per-file to keep hydration warnings down.

## API route test patterns
- Import route handlers directly (e.g., `import { POST } from '@/app/api/blocks/create/route'`) and call them with `NextRequest`.
- Mock `next/headers` cookies and any server-only utilities with `vi.mock` at the top of the file; keep header/cookie fixtures close to the test for readability.
- Supabase route code should reuse the shared mock—override table behaviors with `getSupabaseMock()` inside `beforeEach`.
- Assert response status, shape, and headers; prefer `await response.json()` with minimal fixtures instead of deep snapshots.

## Integration tests (stable examples)
- `tests/integration/forgot-password-flow.spec.ts` shows the pattern for supabase-auth flows: override a single method, run the flow, and assert call signatures.
- Keep integration fixtures light—reuse env defaults from `tests/setup.ts` and avoid spinning servers; these suites should stay deterministic and fast.
- Group setup in `beforeEach` to clear mock state and seed only what the scenario needs (e.g., one user, one block).

## Troubleshooting Supabase mocks
- Seeing stale data across tests: ensure `beforeEach` calls `vi.clearAllMocks()` or `resetSupabaseMock()`.
- New RPC/storage shape failing: extend the shared mock rather than stubbing `vi.doMock` per test to prevent duplicate module registrations.
- Intermittent “cannot read property 'then'”: ensure you return the chain object from your override; if you `await` early, the chain becomes a resolved object and loses methods.

## Adding new tests quickly
- Start from an existing file that matches your target layer: component (`tests/components/...`), API (`tests/api/...`), or integration (`tests/integration/...`).
- Reuse shared utilities from `tests/utils` and keep new helpers colocated under `tests/utils/` if they’ll be shared.
- Name files with `.spec.ts` or `.test.tsx` to match Vitest discovery and keep scope-focused titles.
