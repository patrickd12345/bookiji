# When to Stop Debugging: Protect Your Sanity

Deep debugging gets emotional. Knowing when to stop prevented tunnel vision and preserved truth.

## Failure Signature of Diminishing Returns
- Adding more sleeps/retries is the only remaining idea.
- Each run fails with the exact same signature despite “fixes.”
- You’re editing unrelated files or guessing at random toggles.

## Signs the System Is Finally Telling the Truth
- Preflight invariants pass consistently (Docker, Supabase health, env match, server live).
- Failures are stable and reproducible across runs and machines.
- Logs, traces, and visuals align (no “maybe CSP, maybe Supabase” ambiguity).

## Why Stopping Can Be Fastest
- Fatigue led to layering hacks (extra retries) that masked CSP/env issues and cost hours.
- A clean stop allowed a reset: repro steps, artifacts, and a fresh read of invariants exposed the real cause quickly.

## How to Pause Without Losing Ground
- Capture: save Playwright traces, screenshots, env printouts, and the exact command used.
- Mark the mode: are you in infra, env, CSP, UI determinism, or backend contract? Write it down.
- Define the next probe before stopping (e.g., “verify CSP connect-src contains Supabase host”).

## Emotional Realities
- Expect frustration and rage during cascading failures; acknowledge it and stop before code quality drops.
- Tunnel vision is a signal to switch modes or call for review; don’t keep hammering the same knob.

## Resume Checklist
- Re-run preflight invariants first.
- Reproduce the last stable failure without new hacks.
- Apply one surgical change at a time; if it doesn’t alter the signature, revert and change arenas (infra → env → CSP → UI → backend).
