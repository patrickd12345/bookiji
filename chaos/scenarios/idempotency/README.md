# Idempotency Attack Scenario

## Overview

This SimCity scenario validates that booking transitions (confirm, cancel, reschedule) are properly idempotent. It tests the II-3 invariant by intentionally attempting to violate idempotency guarantees through:

1. **Concurrent identical requests**: Fires N identical confirm requests concurrently with the same idempotency key
2. **Different keys, same action**: Fires N confirm requests with different keys but same underlying action (tests natural key constraints)
3. **Timeout then retry**: Simulates "timeout then retry" behavior to ensure retries don't create duplicate side effects

## Usage

```bash
node chaos/scenarios/idempotency/idempotency_attack.mjs \
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
- `--tier`: Scenario tier (default: `idempotency_attack`)
- `--out`: Optional path to write failure details JSON

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: Service role key

## Test Cases

### Test 1: Concurrent Identical Requests

Fires N identical confirm requests concurrently with the same idempotency key.

**Success Criteria:**
- Exactly one booking is created
- All requests return 200 OK
- Subsequent requests are marked as `idempotent_replay: true`
- No duplicate side effects (notifications, payments, etc.)

### Test 2: Different Keys, Same Action

Fires N confirm requests with different idempotency keys but same underlying action (same quote, provider, payment intent).

**Success Criteria:**
- Multiple bookings may be created (different keys = different operations)
- No unexpected errors (400/403 are acceptable for business logic)
- Each request with unique key creates a new booking

### Test 3: Timeout Then Retry

Simulates a network timeout followed by a retry with the same idempotency key.

**Success Criteria:**
- Retry returns the same booking ID as the first request (if first succeeded)
- Retry is marked as `idempotent_replay: true` if first request completed
- No duplicate bookings created

## Assertions

The scenario fails if ANY of the following occur:

- ❌ Concurrent identical requests create more than 1 booking
- ❌ Retry with same idempotency key creates a different booking
- ❌ Unexpected server errors (500, 502, 503)
- ❌ Request exceeds timeout (5 seconds)
- ❌ Process crashes or stalls

## Integration with SimCity

This scenario can be integrated into SimCity runs to continuously validate idempotency guarantees:

```typescript
{
  type: 'idempotency_attack',
  parameters: {
    concurrency: 20,
    duration: 120
  },
  invariants: ['zero_double_bookings', 'idempotent_transitions']
}
```

## Related Invariants

- **II-3**: Idempotent Transitions (Booking lifecycle)
- **I-1**: Zero Double Bookings
- **I-2**: Slot Claim Atomicity

