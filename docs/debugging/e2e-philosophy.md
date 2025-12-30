# E2E Philosophy: Proof Before Progress

E2E is our truth serum. It must refuse to run when reality is not ready, surface real failures quickly, and stop us from papering over broken foundations.

## Failure Signature
- Playwright suite starts but immediately throws 300+ connection errors because Supabase isn't reachable.
- `pnpm e2e:seed` hangs or 500s while Docker Desktop is stopped or wedged.
- Tests pass locally only after adding arbitrary `sleep(5000)` or retries, but still fail in CI with the same symptoms.

## Invariants (Preflight or Quit)
- Web server responds on the expected port before the first test runs.
- Docker daemon is healthy (not just the Windows service status) and Supabase health endpoint returns 200 quickly.
- Seed script completes and reports created users before Playwright begins.
- Environment file in use is explicitly `.env.e2e`; any other `.env.*` must be ignored for proof runs.

## Why Visual Proof > Logs
- Visuals expose UI regressions, missing elements, CSP errors, and auth loops that logs hide.
- Screenshots and traces are the only reliable artifacts when failures are intermittent; console logs were insufficient for CSP misconfig and Supabase auth hangs.

## Ban on Retries/Sleeps-as-Fixes
- Retries hid the real problem (Supabase offline) and wasted hours; the test runner needs to halt on first invariant breach.
- Sleeps made CSP and env-shadowing bugs look “flaky” instead of broken; they delay truth and create false confidence.

## Diminishing Returns Boundary
- If preflight passes and the same assertions fail identically twice, switch from “plumbing” to “product truth” debugging (move to backend or contract analysis).
- If new sleeps/retries are the only ideas left, stop; rerun preflight, capture artifacts, and escalate the real blocker.

## Rules to Never Repeat This
- Add hard preflight checks (Docker daemon, Supabase health, server liveness, env file presence) that fail the suite before any page opens.
- Require visual artifacts on every failure; no “logs-only” proof.
- Disallow ad-hoc sleeps/retries in PRs; justification required for any retry policy.
- Track when a failure repeats with the same signature; treat the third repeat as a mode switch, not another tweak.
