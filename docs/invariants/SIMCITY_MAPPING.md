# Invariant → SimCity Phase Mapping

## Tier 1 Invariants (Get SimCity Phases)

Only Tier 1 invariants are tested via SimCity phases. Tier 2 and Tier 3 are enforced via static policy checks and runtime assertions.

### Bookings Lifecycle → Phase 1

**Invariant**: INV-1: Atomic Slot Claim
- **SimCity Phase**: Phase 1 — Atomic Slot Invariant
- **Test**: One slot = at most one confirmed booking
- **Script**: `scripts/adversarial-certification.ts` → `executePhase1()`

**Invariant**: INV-2: Payment-Booking Consistency
- **SimCity Phase**: Phase 2 — Payment ↔ Booking Consistency
- **Test**: Payment and booking never out of sync
- **Script**: `scripts/adversarial-certification.ts` → `executePhase2()`

**Invariant**: INV-3: No Direct State Transitions
- **Enforcement**: Static policy check + runtime assertions
- **Not tested via SimCity** (covered by Phase 1 & 2)

**Invariant**: INV-4: Slot Release on Cancellation
- **Enforcement**: Runtime assertion in webhook handlers
- **Not tested via SimCity** (covered by Phase 1 & 2)

### Payments & Refunds → Phase 2

**Invariant**: INV-1: Payment Intent Verification
- **SimCity Phase**: Phase 2 — Payment ↔ Booking Consistency
- **Test**: Cannot create booking with fake payment intent
- **Script**: `scripts/adversarial-certification.ts` → `executePhase2()`

**Invariant**: INV-2: No Payment Without Booking
- **SimCity Phase**: Phase 2 — Payment ↔ Booking Consistency
- **Test**: Payment cannot succeed without booking
- **Script**: `scripts/adversarial-certification.ts` → `executePhase2()`

**Invariant**: INV-6: Webhook Idempotency
- **SimCity Phase**: Phase 2 — Payment ↔ Booking Consistency
- **Test**: Duplicate webhooks are idempotent
- **Script**: `scripts/adversarial-certification.ts` → `executePhase2()`

### Availability & Slots → Phase 1

**Invariant**: INV-1: Atomic Slot Claim
- **SimCity Phase**: Phase 1 — Atomic Slot Invariant
- **Test**: One slot = at most one confirmed booking
- **Script**: `scripts/adversarial-certification.ts` → `executePhase1()`

**Invariant**: INV-2: Slot-Booking Consistency
- **SimCity Phase**: Phase 1 — Atomic Slot Invariant
- **Test**: Slot availability matches booking state
- **Script**: `scripts/adversarial-certification.ts` → `executePhase1()`

### Time & Scheduling → Phase 3

**Invariant**: INV-1: No Past Bookings
- **SimCity Phase**: Phase 3 — Temporal Boundary Attacks
- **Test**: Past is never bookable
- **Script**: `scripts/adversarial-certification.ts` → `executePhase3()`

**Invariant**: INV-2: Timezone Consistency
- **SimCity Phase**: Phase 3 — Temporal Boundary Attacks
- **Test**: Time is enforced consistently everywhere
- **Script**: `scripts/adversarial-certification.ts` → `executePhase3()`

## Tier 2 & 3 Invariants (Static/CI Only)

These invariants are enforced via:
- Static policy checks (`pnpm invariants:check`)
- Runtime assertions (where state mutates)
- CI integration (`.github/workflows/invariants-check.yml`)

**Not tested via SimCity phases** — they are operational/administrative invariants that don't require adversarial simulation.

## CI Integration

### Scheduling Invariant Check (Phase 1 & 2)
- **Workflow**: `.github/workflows/scheduling-certification-check.yml`
- **Triggers**: PRs affecting booking/payment/slot code
- **Runs**: SimCity Phase 1 & 2
- **Status**: Warning mode (non-blocking initially)

### Invariant Policy Check (All Surfaces)
- **Workflow**: `.github/workflows/invariants-check.yml`
- **Triggers**: PRs affecting API endpoints, guards, services
- **Runs**: `pnpm invariants:check`
- **Status**: Warning mode (non-blocking initially)

## Upgrade Path

When ready to enforce:
1. Mark workflows as "required" in branch protection
2. Invariant failures will block merge
3. See: `docs/invariants/PROCESS_INVARIANT_ENFORCEMENT_SUMMARY.md`











