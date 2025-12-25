# SC-1 — Double-Booking Attack (SimCity)

This scenario certifies **slot exclusivity under concurrent demand**. It proves that at most ONE confirmed booking may ever exist for a given slot, regardless of concurrency, retries, reordering, crashes, or duplicate intent delivery.

## Run

```bash
# Requires the app running locally, and E2E mode enabled for dev test endpoints.
E2E=true node chaos/scenarios/double_booking_attack/sc1_double_booking_attack.mjs \
  --seed sc1-1 \
  --iterations 50 \
  --target-url http://localhost:3000
```

## What it does

- Seeds fixtures (vendor, one free slot, two customers).
- Generates two distinct booking intents (intent_A for C1, intent_B for C2, both targeting the same slot).
- Repeatedly issues **fire-and-forget** booking requests with random actions:
  - `send_book(intent_A)` - C1 attempts to book
  - `send_book(intent_B)` - C2 attempts to book
  - `retry_book(intent_A)` - C1 retries (reuses same intent_id)
  - `retry_book(intent_B)` - C2 retries (reuses same intent_id)
  - `restart_simcity()` - Simulated process crash/restart
  - `no_op()` - No action
- After *every* action, queries DB truth via Supabase REST (service role) and enforces:
  - **Cardinality**: At most 1 confirmed booking (instant death if 2+)
  - **Slot coherence**: Slot state matches booking count
  - **Booking coherence**: Booking references correct slot and customer
  - **Idempotency**: Retries don't change state or flip winner

## Expected Terminal States

After chaos settles, exactly one of these must be true:

**STATE 1:**
- C1 has confirmed booking on S
- C2 failed (or is rejected)
- Slot S booked

**STATE 2:**
- C2 has confirmed booking on S
- C1 failed (or is rejected)
- Slot S booked

## Forbidden States (any → FAIL)

- ❌ Two confirmed bookings for S (DOUBLE-BOOKING)
- ❌ Slot S marked free with a confirmed booking
- ❌ Slot S booked with no booking
- ❌ Winner flips after retries
- ❌ Booking disappears after crash
- ❌ New booking appears without intent

## What this test proves

**If SC-1 PASSES:**
- ✅ Slot claiming is atomic
- ✅ Conditional update / unique constraint is correct
- ✅ External concurrency is safe
- ✅ Customers cannot race into corruption

**If SC-1 FAILS:**
- 🚨 This is a real production bug
- 🚨 SimCity caught it early
- 🚨 Fix will be surgical and obvious

## Relationship to SC-4

- **SC-4** proved internal atomicity (reschedule operations)
- **SC-1** proves external exclusivity (concurrent booking attempts)
- **Passing both** means: "Scheduling is safe both inside and at the edges."

## Output

- **PASS** prints a summary with final state and winner (C1 or C2).
- **FAIL** prints a forensic snapshot (slot state, all bookings, derived references, and last action).

