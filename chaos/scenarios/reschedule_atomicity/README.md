# SC-4 — Reschedule Atomicity (SimCity)

This scenario certifies **atomic reschedule correctness** under **at-least-once delivery** and simulated restarts.

## Run

```bash
# Requires the app running locally, and E2E mode enabled for dev test endpoints.
E2E=true node chaos/scenarios/reschedule_atomicity/sc4_reschedule_atomicity.mjs \
  --seed sc4-1 \
  --iterations 50 \
  --target-url http://localhost:3000
```

## What it does

- Seeds fixtures (vendor, two slots, one confirmed booking).
- Repeatedly issues **fire-and-forget** reschedule requests (retries reuse the same `intent_id`).
- After *every* action, queries DB truth via Supabase REST (service role) and enforces:
  - Single booking existence
  - Slot exclusivity (exactly one booked)
  - Booking ↔ slot coherence
  - Availability ↔ booking coherence
  - Idempotency (a retry does not change state)

## Output

- **PASS** prints a summary with final state.
- **FAIL** prints a forensic snapshot (booking row, both slots, derived slot reference, and last action).


