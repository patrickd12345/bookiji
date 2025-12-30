# Backend Contract Boundaries: Know When to Stop Patching UI

We burned hours tweaking UI and E2E plumbing while the real issue was broken backend contracts: schema drift and identity mismatches.

## Failure Signature
- Supabase returns `column "foo" does not exist` or `unexpected_failure` inside auth before any app code runs.
- Schema cache errors after deploy; UI fixes have zero effect on the failure.
- Identity confusion: `auth.user.id` vs `profiles.id` vs vendor/customer ids used interchangeably.

## Signals It’s a Backend Problem
- Same error reproduces with curl/Postman without the UI.
- Errors occur before React renders or before API route handlers execute.
- Seeds/migrations reference columns not present in the running database (cache drift, missing migration).

## Invariants
- Contracted schemas and migrations are authoritative; UI must not attempt to patch around missing data.
- Identity mapping is explicit: auth user id → profile.auth_user_id → domain ids; never guess.
- When Supabase/DB errors repeat twice with identical messages, stop UI work and fix the schema or auth hook.

## Playbook
- Reproduce the failure via direct API/SQL call; if it breaks there, freeze UI changes.
- Inspect schema cache/migrations; ensure missing columns/views are deployed.
- Reconcile identity fields; avoid mixing profile IDs with auth IDs in API payloads.
- Resume UI changes only after the backend contract passes its own proof.

## Outcome to Avoid
- Continuing UI changes past this point just hides the truth and wastes time; pause, fix the contract, then rerun Playwright for confirmation.
