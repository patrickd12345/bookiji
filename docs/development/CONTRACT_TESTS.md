# Contract tests (API)

## What “contract tests” mean here

Contract tests validate that our **API endpoints** behave as promised:
- response status codes
- required JSON fields / envelopes
- (optionally) OpenAPI schema validation via AJV

They are intentionally **fast** and should not depend on production data.

## How to run

```bash
pnpm contract
```

This runs Playwright using `playwright.contract.config.ts` which:
- discovers tests under `tests/api/contracts`
- starts `pnpm dev` on port 3000 (reuses an existing server)

## Adding new contract tests

Add files to `tests/api/contracts/**/*.spec.ts`.

Keep these rules:
- avoid UI flows; prefer Playwright `request` for API calls
- no secrets in repo
- deterministic inputs and assertions

## ErrorEnvelope shape

The OpenAPI `ErrorEnvelope` uses a `oneOf` to match runtime responses:
- minimal `{ error: string }`
- structured `{ ok: false, code, message }` (optionally with `details`, `correlation_id`)




