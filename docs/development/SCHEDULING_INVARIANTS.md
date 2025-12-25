# Bookiji Scheduling — Invariant Specification (v1)

These invariants define what must never be violated, regardless of load, retries, race conditions, LLM chaos, or human confusion.

**If any invariant fails, the SimCity run is considered failed, even if the UI "looks fine".**

## I. Slot & Availability Invariants (Foundational)

### I-1. Slot Uniqueness

A scheduling slot is uniquely identifiable and may be claimed by at most one booking at a time.

- No two active bookings may reference the same slot.
- A slot transitions from available → claimed → booked atomically.

**Never allowed:**
- double booking
- two "successful" claims for the same slot

### I-2. Atomic Claim

Slot claiming is atomic and irreversible within a transaction.

**Either:**
- the slot is claimed and the booking is created

**Or:**
- nothing changes

**Never allowed:**
- booking created without slot claim
- slot claim without booking
- partial writes

### I-3. Availability Integrity

Availability windows must never:
- overlap illegally
- create time travel (end < start)
- produce slots outside the vendor's defined availability

**Edits must:**
- invalidate or adjust downstream slots deterministically

## II. Booking Lifecycle Invariants (State Truth)

### II-1. Single Source of Truth

A booking has exactly one authoritative state at any moment.

**Valid states (example):**
- pending
- confirmed
- cancelled
- rescheduled

**Never allowed:**
- two active states simultaneously
- ambiguous state combinations

### II-2. No Resurrection

Once a booking is cancelled:
- it may never return to an active state

**Rescheduling:**
- either creates a new booking and links to the old one
- or cleanly transitions the same booking
- but never both

### II-3. Idempotent Transitions

Repeating the same action:
- booking creation
- confirmation
- cancellation
- reschedule
- webhook delivery

must always converge to the same final state.

**Never allowed:**
- duplicate bookings
- duplicate notifications
- state oscillation

## III. Subscription & Gating Invariants (Money Guards Behavior)

### III-1. Server-Side Gating

Vendor subscription state must be enforced server-side, not via UI.

**If subscription is inactive:**
- vendor cannot create availability
- vendor cannot modify schedule
- vendor cannot confirm bookings

UI checks are optional; server checks are mandatory.

### III-2. Immediate Effect

Subscription state changes take effect immediately.

- Activation lifts gates immediately
- Cancellation closes gates immediately
- No grace periods unless explicitly designed.

### III-3. Webhook Supremacy

Stripe webhook state is the source of truth.

- Local state must reflect webhook events
- Replayed webhooks must be idempotent
- Out-of-order delivery must resolve deterministically

## IV. Isolation & Security Invariants (RLS / Trust)

### IV-1. Vendor Isolation

A vendor:
- may only read/write their own:
  - availability
  - slots
  - bookings
  - subscriptions

**Never allowed:**
- cross-vendor visibility
- cross-vendor mutation

### IV-2. Customer Isolation

A customer:
- may only see their own bookings
- may never see vendor internal scheduling state

### IV-3. Admin Superset

Admin access is:
- explicit
- auditable
- never assumed

No user may escalate to admin implicitly.

## V. Notification Invariants (Side Effects, Not Truth)

### V-1. Notifications Are Consequences

Notifications:
- reflect state changes
- do not create state

**Failure to notify:**
- must never corrupt scheduling or booking truth

### V-2. Idempotent Delivery

Repeated triggers:
- must not spam
- must not diverge message content

Delivery retries must converge.

## VI. Time Invariants (The Silent Killer)

### VI-1. No Past Booking

Bookings must not be created in the past (unless explicitly allowed and flagged).

### VI-2. Slot Expiry

Expired slots:
- cannot be claimed
- cannot be resurrected

### VI-3. Clock Drift Tolerance

System must tolerate:
- minor clock skew
- retries after time advances

**But must never:**
- violate ordering
- create contradictory timelines

## VII. Failure Transparency Invariants (Truthfulness)

### VII-1. No Silent Failure

Any failed operation must:
- return a clear failure signal
- leave the system in a consistent state

### VII-2. Forensic Completeness

Every SimCity run must be explainable using:
- event logs
- snapshots
- invariant evaluations

**If the system cannot explain why it failed, that is a failure.**

## VIII. Determinism Invariants (SimCity-Specific)

### VIII-1. Seeded Repeatability

Given the same seed:
- SimCity must reproduce the same failure
- or explicitly document why nondeterminism occurred

### VIII-2. LLM Is Not Judge

LLM may:
- generate actions
- narrate outcomes

**LLM may not:**
- decide correctness
- override invariant failures
- suppress errors

## ✅ What This Gives You

- A hard definition of correctness
- A shared language between:
  - you
  - SimCity
  - future contributors
- A way to say:
  - "The system failed — and here's the exact law it broke."

**This is the line between chaos and science.**

---

## Implementation References

- **Database-level enforcement**: `supabase/migrations/20251222160000_atomic_booking_claim.sql`
- **SimCity invariant checker**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts`
- **SimCity harness invariants**: `chaos/harness/index.mjs` (checkInvariants function)
- **SimCity runtime invariants**: `src/lib/simcity/invariants.ts`

## Related Documentation

- [SimCity LLM Events](./simcity-llm-events.md)
- [Database Management Policy](./DATABASE_MANAGEMENT_POLICY.md)
- [SimCity Phase 3](../simcity-phase3.md)

