# Availability Integrity Race Attack Scenario

## Overview

This SimCity scenario validates I-3 Availability Integrity by testing:
1. **Overlap insert race**: Concurrent attempts to insert overlapping slots
2. **Double-claim race**: Concurrent attempts to claim the same slot
3. **Time travel validation**: Attempts to create slots with invalid time ranges

## Usage

```bash
node chaos/scenarios/availability_integrity/availability_race_attack.mjs \
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
- `--tier`: Scenario tier (default: `availability_integrity`)
- `--out`: Optional path to write failure details JSON

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: Service role key

## Test Cases

### Test 1: Overlap Insert Race

Fires N concurrent requests to insert overlapping slots (same provider, overlapping time ranges).

**Success Criteria:**
- Exactly one slot is created successfully
- All other requests return 409 Conflict
- EXCLUDE constraint prevents overlapping available slots
- No unexpected errors (500, etc.)

### Test 2: Double-Claim Race

Fires N concurrent requests to claim the same slot using `claim_availability_slot_atomically()`.

**Success Criteria:**
- Exactly one claim succeeds
- All other claims fail gracefully
- Slot is marked as unavailable after successful claim
- No duplicate claims possible

### Test 3: Time Travel Validation

Attempts to create a slot with `end_time < start_time`.

**Success Criteria:**
- Request is rejected (409 or 400)
- CHECK constraint prevents invalid time ranges
- Clear error message indicating time travel violation

## Assertions

The scenario fails if ANY of the following occur:

- ❌ Overlapping slots are created (should be exactly 1)
- ❌ Multiple concurrent claims succeed for the same slot
- ❌ Time travel slots are accepted
- ❌ Unexpected server errors (500, 502, 503)
- ❌ Request exceeds timeout (5 seconds)
- ❌ Process crashes or stalls

## Related Invariants

- **I-3**: Availability Integrity
- **I-1**: Slot Uniqueness
- **I-2**: Atomic Claim

