# Playwright vs SimCity: Right Tool, Right Phase

SimCity stresses invariants and race conditions; Playwright proves user reality. Mixing them cost us days of chasing ghosts.

## Failure Signature
- SimCity chaos runs reported “auth service unreachable” and “db timeout” while Playwright showed CSP fetch errors and missing DOM.
- A single suite tried to cover CSP, DOM rendering, and chaos timing, resulting in nondeterministic failures and useless traces.

## What SimCity Is For
- Chaos, races, time-skew, and invariant violation detection on backend/stateful flows.
- Proving contracts hold under load and adversarial sequences (scheduling replay, retries, idempotency).
- Truthfulness of event streams and metrics, not browser UX.

## What SimCity Is NOT For
- CSP policy validation, DOM structure, accessibility, or browser security enforcement.
- Visual correctness, navigation flows, or client-side hydration.
- Any test that needs a real browser or user gesture semantics.

## Why Playwright Is Mandatory for Proof
- Only Playwright caught the CSP block that curl/admin scripts missed.
- DOM absence and auth redirect loops were visible only in real browser traces/screenshots.
- User-facing regressions must be proven in the environment that ships to users.

## Cost of Mixing Responsibilities
- Chaos artifacts obscured root causes; we misattributed CSP failures to SimCity network noise.
- Debugging time doubled because we lacked clean, user-level evidence before injecting chaos.

## Correct Sequencing
- Phase 1: Playwright proof on a clean, deterministic stack (no chaos) until UI/auth flows pass with visual artifacts.
- Phase 2: Add SimCity chaos/invariant tests against the now-known-good baseline.
- Phase 3: Only after both pass, introduce races/time-skew; never merge the concerns into one suite.
