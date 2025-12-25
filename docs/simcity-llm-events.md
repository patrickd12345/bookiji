# SimCity LLM-Driven Event Source

## Overview

This document describes the LLM-driven event source implementation for SimCity. The system allows an LLM to propose events while preserving system truth, invariants, and observability.

## Architecture

```
LLM (proposes events)
→ Schema Validation
→ Feasibility Classification
→ Attempted Execution (real code paths)
→ Outcome Recording
→ Invariant Checks
→ Metrics + Snapshots
```

## Key Principles

1. **LLM proposes events** - The LLM generates proposed events in a strict JSON schema
2. **SimCity harness remains sole authority** - All execution goes through real code paths, preserving RLS, validation, etc.
3. **Impossible events are allowed** - The system intentionally allows invalid, impossible, and nonsensical events
4. **Failure is acceptable, silent corruption is not** - Events can fail, but invariants must never be violated
5. **Invariants must NEVER be violated** - If an invariant fails, the run is marked as failed

## Components

### 1. Event Schema (`simcity-llm-events.ts`)

Defines the strict event schema that LLM must output:

```typescript
{
  "event_id": "evt_xxx",
  "event_type": "CUSTOMER_REGISTER | VENDOR_REGISTER | ...",
  "actor": {
    "kind": "customer | vendor | admin",
    "ref": "string-id"
  },
  "params": { "any": "json" },
  "intent": "short human-readable explanation",
  "chaos_level": "normal | edge | impossible"
}
```

### 2. LLM Event Generator (`simcity-llm-generator.ts`)

Generates proposed events from LLM based on world snapshot. Features:
- Builds prompts with world state
- Calls LLM service (configurable endpoint)
- Parses and validates JSON responses
- Returns empty array on failure (fail-closed)

### 3. Event Executor (`simcity-llm-executor.ts`)

Executes proposed events by calling existing APIs/services:
- Maps event types to API endpoints
- Executes through real code paths
- Records execution results
- Never mutates state directly

### 4. Invariant Checker (`simcity-llm-invariants.ts`)

Checks invariants after event execution:
- No data corruption
- No duplicate bookings
- RLS not bypassed
- Vendor/customer isolation maintained
- Subscription gates respected

### 5. Event Recorder (`simcity-llm-recorder.ts`)

Records proposed events and execution outcomes:
- Stores in `simcity_run_events` table
- Records both proposal and outcome
- Preserves complete truth

### 6. Integration (`simcity.ts`)

Integrated into SimCity run loop:
- Generates world snapshot
- Calls LLM to generate events
- Validates, classifies, executes, and records events
- Checks invariants and marks run as failed if violated

## Event Types Supported

- `CUSTOMER_REGISTER` - Register a new customer
- `VENDOR_REGISTER` - Register a new vendor
- `CUSTOMER_SEARCH` - Customer searches for providers
- `CUSTOMER_BOOK` - Customer creates a booking
- `VENDOR_CONFIRM_BOOKING` - Vendor confirms a booking
- `VENDOR_CANCEL_BOOKING` - Vendor cancels a booking
- `CUSTOMER_RATE_VENDOR` - Customer rates a vendor
- `VENDOR_CREATE_AVAILABILITY` - Vendor creates availability slots
- `VENDOR_SUBSCRIBE` - Vendor subscribes to service

## Feasibility Classification

Events are classified before execution:
- **FEASIBLE** - Normal events that should succeed
- **EXPECTED_REJECTION** - Edge cases that might fail (chaos_level: "edge")
- **INVALID** - Malformed or clearly nonsensical (chaos_level: "impossible")

## Metrics

New metrics added:
- `llm.expected_rejection_rate` - Rate of expected rejections
- `llm.unexpected_error_rate` - Rate of unexpected errors
- `llm.invariant_violation_rate` - Rate of invariant violations
- `llm.silent_failure_rate` - Rate of silent failures (must be zero)

## Configuration

Enable LLM events in SimCity config:

```typescript
{
  llmEvents: {
    enabled: true,
    maxEventsPerTick: 1,
    probability: 0.5, // 50% chance per tick
    runId: "optional-run-id" // For recording events
  }
}
```

## Environment Variables

- `SIMCITY_LLM_ENABLED=true` - Enable LLM event generation
- `SIMCITY_LLM_ENDPOINT=http://localhost:11434/api/generate` - LLM endpoint
- `SIMCITY_LLM_MODEL=llama3.2` - LLM model name

## Database Schema

Events are recorded in `simcity_run_events` with:
- `event_type`: `llm.{EVENT_TYPE}`
- `event_payload`: Contains proposed event, classification, execution result, and invariant check
- `invariant_context`: Invariant check results

## Invariants

The system checks these invariants:
1. No data corruption after failed execution
2. No duplicate bookings (same customer + vendor + slot)
3. Booking ownership (vendor can only act on own bookings)
4. Subscription gates (if scheduling requires subscription)

## Failure Handling

- Invalid schema events are rejected and recorded
- Execution failures are recorded with error details
- Invariant violations mark the run as failed but continue execution
- Silent failures (success=true but invariant violated) are detected and recorded

## Testing

The system is designed to:
- Work in CI without LLM (returns empty array)
- Be fully mockable
- Fail closed (never throws, returns empty array on error)
- Preserve system truth (all execution through real APIs)
