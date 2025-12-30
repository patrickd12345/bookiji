# UI Determinism in E2E: Render First, Enrich Later

Forms and shells vanished because we gated DOM creation on async data and service readiness. Playwright had nothing to click, so tests “failed” while business logic was fine.

## Failure Signature
- Selectors for form fields/buttons never appear; test times out waiting for DOM.
- UI renders blank until Supabase/profile queries resolve; slow Supabase made the page look empty.
- Adding sleeps “fixed” it locally but failed in CI with the same missing elements.

## Why It Happened
- Components refused to render until remote data arrived (feature flags, profile fetch, vendor availability).
- Error/loading boundaries replaced whole sections instead of showing deterministic shells.
- UI assumed “service ready” before painting, so infra flakiness became UI flakiness.

## Invariants
- Primary shells render immediately with deterministic placeholders; async data only enriches.
- Form controls exist with disabled states before data loads; labels and aria attributes are present for selectors.
- Loading/error UI never removes critical containers; they swap contents, not existence.

## Principles to Apply
- Progressive rendering is a feature: render skeleton + disabled actions, hydrate when data arrives.
- Treat async data as decoration, not permission to exist.
- Explicitly model “unknown” state in the UI and keep DOM stable across unknown/loading/resolved.

## How E2E Enforces This
- Tests assert containers exist before waiting on data-specific content.
- Snapshots include loading shells; missing shells is a regression, not a flaky wait.
- Avoid `await query()`-gated JSX; prefer immediate render with derived state updates.
