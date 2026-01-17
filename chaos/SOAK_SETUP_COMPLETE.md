# Chaos Soak Program - Setup Complete ✅

## What Was Set Up

1. **Environment file**: `/workspace/chaos/.env.chaos` - Contains Supabase connection settings
2. **Soak loop script**: `/workspace/chaos/soak-loop.sh` - Main autonomous soak test program
3. **Log file**: `/workspace/chaos/soak-log.txt` - Will contain test results (created on first run)

## Current Status

⚠️ **Supabase is not running** - The soak loop cannot start until Supabase is available.

## To Start the Soak Loop

1. **Start Supabase** (requires Docker):
   ```bash
   cd /workspace
   pnpm supabase:start
   ```
   
   Or if Supabase CLI is available:
   ```bash
   cd /workspace
   supabase start
   ```

2. **Verify Supabase is running**:
   ```bash
   curl http://localhost:54321/rest/v1/
   ```

3. **Start the soak loop**:
   ```bash
   cd /workspace/chaos
   ./soak-loop.sh
   ```

## Script Behavior

The script will:
- ✅ Check prerequisites (Supabase must be running)
- ✅ Enter continuous loop:
  - **Step A**: Reset database (`supabase db reset`)
  - **Step B**: Medium soak (5 min, 3k events, concurrency 12)
  - **Step C**: Heavy soak (10 min, 6k events, concurrency 12)
  - Repeat forever
- ✅ Log results to `soak-log.txt`
- ✅ Stop immediately on invariant failure

## Log Format

```
RUN <n> | seed=<seed> | duration=<s> | events=<n> | result=PASS
RUN <n> | seed=<seed> | duration=<s> | events=<n> | result=FAIL | invariant=<name> | event_index=<n>
```

## Stop Conditions

The script stops on:
- Invariant failure
- Deadlock
- Trigger recursion
- PostgREST unreachable
- Database connection exhaustion
- Harness error

## Manual Stop

Press `Ctrl+C` to stop gracefully.

## Notes

- The harness runs directly with Node.js (no Docker required for the harness itself)
- Each run uses random seeds
- Database is reset before each run
- Observation only - no code modifications

## Next Steps

Once Supabase is running, the soak loop will start automatically and run continuously until stopped manually or an invariant failure is detected.
