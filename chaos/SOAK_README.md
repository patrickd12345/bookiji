# Multi-Hour Chaos Soak Program (Autopilot)

## Overview

This program continuously stress-tests booking-slot consistency guarantees under:
- Long runtime
- Repeated resets
- Varied seeds
- Sustained concurrency

## Prerequisites

1. **Supabase must be running** on `http://localhost:54321`
   - Start with: `cd /workspace && pnpm supabase:start`
   - Or: `cd /workspace && pnpm db:start`

2. **App should be running** on `http://localhost:3000` (optional but recommended)
   - Start with: `cd /workspace && pnpm dev`

3. **Environment file** `.env.chaos` must exist (already created)

## Usage

Run the soak loop:

```bash
cd /workspace/chaos
./soak-loop.sh
```

The script will:
1. Check prerequisites
2. Enter continuous loop:
   - **Step A**: Reset database
   - **Step B**: Medium soak (5 min, 3k events, concurrency 12)
   - **Step C**: Heavy soak (10 min, 6k events, concurrency 12)
   - Repeat

## Logging

Results are logged to `/workspace/chaos/soak-log.txt` in format:

```
RUN <n> | seed=<seed> | duration=<s> | events=<n> | result=PASS
RUN <n> | seed=<seed> | duration=<s> | events=<n> | result=FAIL | invariant=<name> | event_index=<n>
```

## Stop Conditions

The script will stop immediately if:
- Invariant failure detected
- Deadlock
- Trigger recursion
- PostgREST unreachable
- Database connection exhaustion
- Harness error

## Manual Stop

Press `Ctrl+C` to stop the loop gracefully.

## Notes

- The harness runs directly with Node.js (no Docker required)
- Each run uses random seeds
- Database is reset before each run
- Observation only - no code modifications
