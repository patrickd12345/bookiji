# SimCity v1 Architecture — FROZEN

**Status**: FROZEN  
**Effective Date**: 2025-12-25  
**Scope**: Execution Kernel, Plan Runner, Transport System

## What's Frozen

- **Kernel API**: `ExecutionKernel` interface and all primitive operations (`createFixture`, `sendRequest`, `restartProcess`, `queryState`, `assertInvariant`, `snapshotState`) are frozen. No breaking changes.

- **Runner Semantics**: Plan execution logic, chaos loop, invariant checking, and sequence handling are frozen. No refactors without invariant justification.

- **Transport Interface**: Transport contract (`execute({ intentId, endpoint, payload, context })`) is frozen. New transports may be added, but the interface cannot change.

## What Can Change

- **Capabilities**: New capabilities may be added via JSON files. Existing capabilities may be extended with new intents/invariants.

- **Planner**: Planner implementation may evolve (stub → LLM → future), but must output valid PLAN objects.

## Change Process

Any proposed changes to frozen components must:
1. Document which invariant is violated by current implementation
2. Prove the change maintains backward compatibility
3. Update this document with new freeze date if approved

**This protects you from future-you and well-meaning helpers.**

