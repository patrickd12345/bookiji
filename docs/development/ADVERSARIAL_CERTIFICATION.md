# 🎯 Adversarial Certification Protocol

## Overview

This document describes the adversarial certification process for Bookiji Scheduling as a market-entry product. The certification executes 7 phases of rigorous testing through SimCity to validate critical invariants.

## Purpose

The adversarial certification protocol is designed to:
- **Certify or fail** Bookiji Scheduling as launch-ready
- Test **critical invariants** that must never be violated
- Execute **adversarial simulations** through SimCity
- Provide **evidence-based verdicts** (no interpretation, no optimism)

## Execution Model

The certification is executed by:
1. **Cursor** (Senior Reliability Engineer) - Feeds prompts to SimCity and records results
2. **SimCity** - Autonomous multi-actor reasoning system that simulates users, failures, retries, delays, and partial outages
3. **Bookiji Scheduling** - The system under test

## Global Instructions

For each phase:
- Feed the phase prompt **verbatim** to SimCity
- Allow SimCity to **fully execute** its reasoning and simulation
- Capture SimCity's output as **evidence**
- Record **PASS or FAIL** strictly against the stated invariant
- **Do NOT** fix issues mid-phase
- **Do NOT** merge phases
- Proceed **sequentially**
- If any phase **FAILS** → stop execution and report failure

## Phase 1: Atomic Slot Invariant

**Invariant**: "One availability slot can result in at most one confirmed booking."

**Test Protocol**:
1. Create one provider with exactly one slot
2. Launch at least 10 concurrent customer booking attempts
3. Mix auth states, retries, refreshes, and millisecond-level timing overlap
4. Attempt to:
   - Double-book the slot
   - Leave bookings in pending or ambiguous states
   - Cause disagreement between UI, API, and database

**PASS Condition**:
- Exactly one confirmed booking
- All other attempts fail deterministically
- No orphan or pending states

**Implementation**: `scripts/adversarial-certification.ts::executePhase1()`

## Phase 2: Payment ↔ Slot Consistency

**Invariant**: "A confirmed booking and payment decision are never out of sync."

**Test Protocol**:
1. Simulate interrupted Stripe redirects
2. Simulate delayed, duplicated, and reordered webhooks
3. Aggressive retries of confirmation endpoints
4. Attempt to:
   - Create a paid booking without a slot
   - Create a slot without payment resolution
   - Trigger duplicate charges or refunds

**PASS Condition**:
- No orphan payments
- No zombie bookings
- Ledger reconciles exactly

**Status**: Implementation pending

## Phase 3: Time Hostility

**Invariant**: "Scheduling respects time absolutely."

**Test Protocol**:
1. Bookings at NOW ± boundary conditions
2. Timezone mismatches and DST transitions
3. Cancellations just before and after slot start
4. Server clock skew of ±5 minutes
5. Attempt to:
   - Book past slots
   - Create time ambiguity between UI and backend
   - Produce contradictory interpretations of start time

**PASS Condition**:
- Past is never bookable
- Time is enforced consistently everywhere

**Status**: Implementation pending

## Phase 4: Abuse & Probing

**Invariant**: "The system resists abuse, probing, and inference attacks."

**Test Protocol**:
1. Rapid repeated searches
2. Small geo-delta probing to infer provider identity
3. Commitment fee bypass attempts
4. Automation-style retries
5. Attempt to:
   - Leak provider identity
   - Infer protected information
   - Degrade the system silently

**PASS Condition**:
- Rate limits engage
- Provider privacy holds
- Abuse is visible and unrewarding

**Status**: Implementation pending

## Phase 5: Degraded Reality

**Invariant**: "When dependencies fail, Scheduling tells the truth."

**Test Protocol**:
1. Partial database write failures
2. Read-only database mode
3. Notification delivery failures
4. Delayed background jobs
5. Attempt to:
   - Produce false confirmations
   - Corrupt booking state
   - Hide failures from users

**PASS Condition**:
- No false positives
- No silent corruption

**Status**: Implementation pending

## Phase 6: Forensics & Explainability

**Invariant**: "The truth is fully inspectable."

**Test Protocol**:
1. Select one failed or aborted booking
2. Attempt to fully reconstruct:
   - User
   - Slot
   - Timeline
   - Failure cause
   - Resolution path

**PASS Condition**:
- No critical unknowns
- Clear causal chain

**Status**: Implementation pending

## Phase 7: Soak & Time Decay

**Invariant**: "System tomorrow behaves like today."

**Test Protocol**:
1. Continuous mixed traffic over extended time
2. Attempt to detect:
   - State drift
   - Queue buildup
   - Memory or logic decay
   - Silent long-term failures

**PASS Condition**:
- System tomorrow behaves like today

**Status**: Implementation pending

## Execution

### Prerequisites

1. **Environment Setup**:
   ```bash
   export DEPLOY_ENV=test  # or staging, recovery
   export SIMCITY_ALLOWED_ENVS=test,staging,recovery
   ```

2. **Database Access**: Supabase must be running and accessible

3. **Dependencies**: All npm packages installed

### Running the Certification

```bash
# Using tsx (TypeScript executor)
tsx scripts/adversarial-certification.ts

# Or using node with ts-node
node --loader ts-node/esm scripts/adversarial-certification.ts
```

### Output

The script generates:
1. **Console Output**: Real-time progress and results for each phase
2. **JSON Report**: `certification-report-{timestamp}.json` with:
   - Phase results (PASS/FAIL/ERROR)
   - Violations found
   - Evidence collected
   - Execution times
   - Final verdict (CERTIFIED/NOT_CERTIFIED)
   - Unresolved risks

### Exit Codes

- `0`: CERTIFIED - All phases passed
- `1`: NOT_CERTIFIED - One or more phases failed or errored

## Final Verdict

The certification provides a binary verdict:

- **CERTIFIED**: All phases PASS → Scheduling is launch-certified
- **NOT_CERTIFIED**: Any phase FAILS → Report and stop

The verdict is **strictly evidence-based**:
- No interpretation
- No optimism
- Evidence only

## Integration with SimCity

The certification script uses SimCity's infrastructure:
- `simcity-llm-executor.ts` - Executes proposed events
- `simcity-llm-invariants.ts` - Checks invariants after execution
- Database functions (e.g., `claim_slot_and_create_booking`) - Tests atomicity

## Current Status

- ✅ **Phase 1**: Implemented and ready for testing
- ⏳ **Phases 2-7**: Implementation pending

## Next Steps

1. Execute Phase 1 to validate the framework
2. Implement remaining phases
3. Integrate with CI/CD for automated certification
4. Create SimCity scenarios for each phase
5. Document violations and remediation steps

## References

- SimCity Testing Engine: `docs/development/SIMCITY_TESTING_ENGINE.md`
- SimCity Runbook: `docs/development/SIMCITY_RUNBOOK.md`
- Scheduling Invariants: `docs/development/SCHEDULING_INVARIANTS.md` (if exists)
- Continuity Kernel: `docs/BOOKIJI_CONTINUITY_KERNEL.md`

