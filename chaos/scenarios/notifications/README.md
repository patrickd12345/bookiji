# Notification Exactly-Once Attack Scenario

## Overview

This SimCity scenario validates V-1 Notification Exactly-Once Semantics by testing:
1. **Retry same transition**: Multiple retries of the same booking transition
2. **Webhook replay**: Simulated webhook replay with different idempotency keys
3. **Worker crash**: Worker crash and retry simulation

## Usage

```bash
node chaos/scenarios/notifications/exactly_once_attack.mjs \
  --seed 42 \
  --duration 60 \
  --concurrency 10 \
  --target-url http://localhost:3000
```

## Parameters

- `--seed`: Random seed for reproducibility (required)
- `--duration`: Duration in seconds (default: 60)
- `--concurrency`: Number of concurrent requests per test (default: 10)
- `--target-url`: Base URL of the application (required)
- `--tier`: Scenario tier (default: `notification_exactly_once`)
- `--out`: Optional path to write failure details JSON

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: Service role key

## Test Cases

### Test 1: Retry Same Transition

Fires N concurrent requests to transition the same booking with the same idempotency key.

**Success Criteria:**
- Exactly one outbox entry is created per (booking_id, event_type, channel)
- All transition requests succeed (idempotent replays)
- No duplicate notifications enqueued

### Test 2: Webhook Replay

Simulates webhook replay where the same transition is attempted with a different idempotency key.

**Success Criteria:**
- Second transition is treated as idempotent replay (booking already in target state)
- Exactly one outbox entry exists
- No duplicate notifications

### Test 3: Worker Crash

Simulates worker processing notification, crashing, then retrying.

**Success Criteria:**
- Outbox entry is marked as 'sent' after successful processing
- Retry doesn't create duplicate outbox entries
- Status transitions correctly (pending → sent)

## Assertions

The scenario fails if ANY of the following occur:

- ❌ Multiple outbox entries for same (booking_id, event_type, channel)
- ❌ Duplicate notifications sent
- ❌ Worker retry creates new outbox entries
- ❌ Unexpected server errors (500, 502, 503)
- ❌ Request exceeds timeout (5 seconds)
- ❌ Process crashes or stalls

## Related Invariants

- **V-1**: Notification Exactly-Once Semantics
- **II-3**: Idempotent Transitions

