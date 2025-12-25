# SimCity CLI - Natural Language Chaos Testing

Run chaos engineering tests using natural language commands. The CLI uses an LLM planner (Gemini) to generate structured test plans and execute them.

## Quick Start

### 1. Set Environment Variables

```bash
# For LLM planner (recommended)
export SIMCITY_PLANNER=llm
export GEMINI_API_KEY=your_key_here
export GEMINI_API_MODEL=gemini-1.5-flash  # Optional, defaults to gemini-1.5-flash

# For stub planner (no API key needed, uses hardcoded plans)
export SIMCITY_PLANNER=stub

# Required for execution
export SUPABASE_URL=your_supabase_url
export SUPABASE_SERVICE_ROLE_KEY=your_service_key
export TARGET_URL=http://localhost:3000  # Optional, defaults to localhost:3000
```

### 2. Run a 30-Minute Soak Test

```bash
node chaos/simcity/cli.mjs \
  "Run all scheduling attacks in sequence for 30 minutes. Escalate retries and restarts. Stop on invariant violation."
```

## What It Does

The planner will:
- ✅ Pick multiple scheduling attack capabilities
- ✅ Compose them into a sequence
- ✅ Set escalated chaos rates (retry=30%, restart=5%)
- ✅ Run for the specified duration (default: 30 minutes)
- ✅ Stop immediately on invariant violation
- ✅ Generate forensic snapshots on failure

## Available Capabilities

- `double_booking_attack` - Tests slot exclusivity under concurrent demand
- `reschedule_atomicity` - Tests atomic reschedule operations
- `concurrent_booking_attempt` - Tests concurrent booking attempts
- `slot_availability_race` - Tests slot availability race conditions

## Examples

### Basic 30-minute soak
```bash
node chaos/simcity/cli.mjs "Run all scheduling attacks for 30 minutes"
```

### Escalated chaos (higher retry/restart rates)
```bash
node chaos/simcity/cli.mjs "Run all scheduling attacks for 30 minutes. Escalate retries and restarts."
```

### Custom duration
```bash
node chaos/simcity/cli.mjs "Run scheduling attacks for 60 minutes with escalated chaos"
```

### Single capability
```bash
node chaos/simcity/cli.mjs "Run double booking attack for 15 minutes"
```

## Output

### Success
```
✅ PASS: All invariants held
   Duration: 1800s
   Events: 1234
```

### Failure
```
❌ FAIL: Invariant violation detected
   Invariant: no_double_booking
   Event index: 567
   Forensic: { ... }
```

## Architecture

- **CLI** (`cli.mjs`) - Entry point, parses natural language commands
- **Planner** (`planner.mjs`) - Generates structured plans (stub or LLM)
- **Runner** (`runner.mjs`) - Executes plans using the harness

The runner delegates to `chaos/harness/index.mjs` which performs the actual chaos testing.
