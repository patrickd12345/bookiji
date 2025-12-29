# Scheduling Proof Attempt - Dec 29 2025

## Login responsiveness
- Command: `curl -I http://localhost:3000/login`
- Result: HTTP 200 with immediate response after first compile.

## Dev server
- Started with `npx dotenv-cli -e .env.e2e -- pnpm dev`.
- Server reached "Ready on http://localhost:3000".

## E2E scheduling proof run
- Command: `E2E=true pnpm e2e:scheduling-proof`.
- Outcome: Failed before booking because Supabase at `http://localhost:55321` was unreachable; vendor profile for `e2e-vendor@bookiji.test` missing and `pnpm e2e:seed` would be required.
- No scheduling video produced due to upstream Supabase connection failure.
