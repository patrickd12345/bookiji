# Support RAG Shadow Run Scenario

## Overview

This SimCity scenario stress-tests the Support RAG system via `/api/support/ask` endpoint. It generates realistic and adversarial support questions, exercises both LangChain and fallback paths, and validates system resilience.

## Usage

```bash
node chaos/scenarios/support_rag/support_rag_shadow_run.mjs \
  --seed 42 \
  --duration 600 \
  --concurrency 3 \
  --target-url http://localhost:3000
```

## Parameters

- `--seed`: Random seed for reproducibility (required)
- `--duration`: Duration in seconds (required)
- `--concurrency`: Number of concurrent requests (required)
- `--target-url`: Base URL of the application (required)
- `--tier`: Scenario tier (default: `support_rag`)
- `--out`: Optional path to write failure details JSON

## Environment Variables

- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`: Supabase instance URL
- `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SECRET_KEY`: Service role key

## Question Corpus

The scenario uses a weighted corpus of questions:

- **Core (60%)**: High-frequency support questions
  - "How do I book an appointment?"
  - "Can I cancel a booking?"
  - "How do refunds work?"
  - etc.

- **Edge (25%)**: Ambiguous or edge-case questions
  - "Can I reschedule after payment?"
  - "Is there a penalty for no-shows?"
  - etc.

- **Out-of-scope (15%)**: Intentional nonsense questions
  - "Can I book a flight?"
  - "Is Bookiji a dating app?"
  - etc.

## Assertions

The scenario fails if ANY of the following occur:

- ❌ API returns non-200 status
- ❌ Request exceeds 3.2 seconds
- ❌ LangChain path returns zero citations
- ❌ Process crashes or stalls
- ❌ Unhandled exception escapes

The scenario does NOT fail based on:
- Answer wording
- Confidence value alone
- Fallback usage (fallback is expected)

## Event Recording

Every request emits a `support.ask` event to `simcity_run_events` with:

```json
{
  "question": "...",
  "status": 200,
  "latencyMs": 1234,
  "fallbackUsed": false,
  "citationsCount": 3,
  "confidence": 0.8
}
```

## Output

- **PASS**: `PASS seed: <seed> events: <count> duration: <seconds>s`
- **FAIL**: `FAIL invariant: support_rag_assertions seed: <seed> ...`


