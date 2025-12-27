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

## IX. Deployment Safety Invariants (Ingress & Preview)

### I-INGRESS-1. Chaos must never run against HTML ingress

Chaos runs must only execute against JSON ingress surfaces. HTML responses, redirects, or authentication walls prove that Vercel Preview Protection (or similar tooling) is in the path and chaos must stop immediately.

- **Preflight guard**: `chaos/preflight/check-json-ingress.mjs` fetches `${BASE_URL}/api/health`, refuses redirects, rejects `text/html` content types, and fails if the response body contains `<html`. Violations raise `HTML ingress detected` with `Likely cause: Vercel Preview Protection`, capturing HTTP status, `Content-Type`, redirect headers, and a snippet of the offending payload.
- **Session enforcement**: `chaos/sessions/run-simcity-sessions.mjs` executes the preflight before any safety checks or warning countdowns, surfaces failures as `I-INGRESS-1`, and aborts the chaos run before any sessions or timers can fire. The invariant failure is loud, fatal, and auditable.
- **Preview verification**: `chaos/sessions/verify-preview-access.mjs` now prints HTTP status, `Content-Type`, redirect detection, and HTML detection for every fetch, and exits non-zero on failure so CI/ops catches preview-protected deployments before chaos ever starts.

Violating `I-INGRESS-1` is non-recoverable: the preflight aborts the run, the logs include the invariant ID plus a clear diagnostic summary, and operator tooling has enough context to unblock the deployment safely.

### I-AUTH-SESSION-1. Auth must be machine-valid

Chaos runs must never start unless authentication is proven machine-valid. Anonymous, guest, partial, or expired sessions are fatal. The session must have a valid user ID, a non-anonymous role that matches the expected chaos role (vendor vs customer), and an expiry timestamp in the future.

**What it protects against:**
- Running chaos with invalid, expired, or missing authentication
- Anonymous or guest sessions that cannot access protected endpoints
- Role mismatches (e.g., customer role when vendor role is required)
- Expired sessions that will fail during execution
- Redirects or HTML responses from session endpoints (reuses ingress detection rules)

**Where it runs:**
- Immediately after `I-INGRESS-1` ingress preflight
- Before any safety checks, warnings, timers, snapshots, or scenarios
- Only in staging mode with `ENABLE_STAGING_INCIDENTS=true` (skipped otherwise)

**Why failure is fatal:**
- Chaos scenarios require authenticated access to booking endpoints, database operations, and incident creation
- Running without valid authentication would produce invalid observations and waste resources
- Role mismatches would cause authorization failures during execution
- Expired sessions would fail mid-execution, producing incomplete results

**How tooling and runner enforce it consistently:**
- **Preflight guard**: `chaos/preflight/check-auth-session.mjs` fetches `${BASE_URL}/api/auth/session` with `Authorization: Bearer <token>`, uses `redirect: 'manual'`, enforces JSON-only responses (blocks redirects, `text/html`, `<html>`), and validates:
  - Session exists
  - `user.id` is present
  - `user.role !== 'anon'`
  - `user.role === expectedRole` (vendor or customer)
  - `session.expires_at` is in the future
- **Session enforcement**: `chaos/sessions/run-simcity-sessions.mjs` executes the preflight immediately after `runIngressPreflight()`, surfaces failures as `I-AUTH-SESSION-1`, and aborts the chaos run before any sessions, timers, or scenarios can start.
- **Verification tooling**: `chaos/sessions/verify-auth-session.mjs` prints HTTP status, Content-Type, redirect detection, user ID, role, and expiry (human-readable) for debugging, and fails fast before JSON parsing if redirect or HTML is detected.

**Constraints:**
- No retries
- No sleeps
- No heuristics
- No fallback logic
- Deterministic behavior only

Violating `I-AUTH-SESSION-1` is non-recoverable: the preflight aborts the run, the logs include the invariant ID plus a clear diagnostic summary (status, content-type, violations, reason), and operator tooling has enough context to obtain valid authentication before retrying.

---

## X. System Honesty Invariants (Meta-Level Binding)

### I-SYSTEM-HONESTY-1. The system must be incapable of lying

This meta-invariant binds all others (ingress, auth, authz, time, snapshot integrity, escalation) so chaos always presents deterministic truth. Every externally visible success is backed by explicit proofs, any violation is fatal or explicitly recorded, partial runs are labeled non-success, and no silent catch or fallback may simulate correctness.

To make this operational:

- The canonical `RunOutcome` model now publishes `{ status: SUCCESS | FAILURE | PARTIAL, proofs[], violations[] }` so every run carries auditable evidence.
- Every invariant registers a proof on success (for example: ingress reached JSON, auth session valid, terminal state coherent) and a violation on failure.
- The runner aggregates that evidence across `I-INGRESS-1`, `I-AUTH-SESSION-1`, `I-AUTHZ-CAPABILITY-1`, `I-TIMEBASE-1`, `I-SNAPSHOT-INTEGRITY-1`, and `I-ESCALATION-INVARIANTS-1`, downgrading the run if proofs are missing or violations appear.
- Verification tooling fails CI whenever `SUCCESS` is reported without the required proofs or whenever violations are present without a corresponding failure status.
- Run summaries (CLI and automation) now print final status, proof list, and violation list so operators and auditors see exactly what happened.

**The system prefers failure over uncertainty.**

**Silence is a violation.**

---

## Implementation References

- **Database-level enforcement**: `supabase/migrations/20251222160000_atomic_booking_claim.sql`
- **SimCity invariant checker**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts`
- **SimCity harness invariants**: `chaos/harness/index.mjs` (checkInvariants function)
- **SimCity runtime invariants**: `src/lib/simcity/invariants.ts`

## Related Documentation

- [Invariant Coverage Matrix](./INVARIANT_COVERAGE_MATRIX.md) - **See this for enforcement status and gaps**
- [SimCity LLM Events](./simcity-llm-events.md)
- [Database Management Policy](./DATABASE_MANAGEMENT_POLICY.md)
- [SimCity Phase 3](../simcity-phase3.md)
