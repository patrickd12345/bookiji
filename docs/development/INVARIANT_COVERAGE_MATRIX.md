# Invariant Coverage Matrix

**Last Updated:** 2025-12-25  
**Purpose:** Map each invariant from `SCHEDULING_INVARIANTS.md` to its enforcement mechanisms and assess coverage.

**Coverage Legend:**
- 🟢 **Strong** - Multiple enforcement layers, database constraints, and runtime checks
- 🟡 **Partial** - Some enforcement exists but gaps remain
- 🔴 **Missing** - No enforcement found or only implied

---

## I. Slot & Availability Invariants

### I-1. Slot Uniqueness
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **DB Constraint**: `supabase/migrations/20251222160000_atomic_booking_claim.sql` - Exclusion constraint prevents overlapping bookings per provider/time
  ```sql
  EXCLUDE USING gist (provider_id WITH =, tstzrange(start_time, end_time) WITH &&)
  WHERE (status NOT IN ('cancelled', 'no_show'))
  ```
- **DB Constraint**: `supabase/migrations/20251222190000_enforce_slot_consistency.sql` - Unique constraint on `(provider_id, start_time, end_time)` for slots
- **Atomic Function**: `claim_slot_and_create_booking()` uses `FOR UPDATE` lock to prevent race conditions
- **SimCity Check**: `chaos/harness/index.mjs:948` - `no_double_booking` invariant check
- **SimCity Check**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts:196` - `checkForDuplicateBookings()`

**Notes:** Well-protected at database level with row-level locking and exclusion constraints. SimCity actively tests this.

---

### I-2. Atomic Claim
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Atomic Function**: `supabase/migrations/20251222160000_atomic_booking_claim.sql` - `claim_slot_and_create_booking()` performs slot claim + booking creation in single transaction with `FOR UPDATE` lock
- **Exception Handling**: Function includes `EXCEPTION` block that rolls back slot availability on failure
- **Usage**: `chaos/harness/index.mjs:705` - Harness uses atomic function for all bookings

**Notes:** Atomicity guaranteed at database level. No code path should bypass this function for booking creation.

---

### I-3. Availability Integrity
**Coverage:** 🟡 **Partial**

**Enforced by:**
- **API Validation**: `src/app/api/vendor/schedule/route.ts:26` - `checkForOverlaps()` function validates time ranges don't overlap
- **Search Filter**: `src/app/api/availability/search/route.ts:28` - Filters slots by `is_booked = false` and `start_time >= date`

**Missing:**
- No database constraint preventing `end_time < start_time` (time travel)
- No validation that slots fall within vendor's defined availability windows
- No deterministic invalidation of downstream slots when availability is edited

**Notes:** Overlap checking exists in API but not at database level. Time travel and window validation are missing.

---

## II. Booking Lifecycle Invariants

### II-1. Single Source of Truth
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **State Machine**: `src/lib/services/bookingStateMachine.ts:44` - `allowedTransitions` map defines valid state transitions
- **State Machine Validation**: `bookingStateMachine.ts:53` - Rejects invalid transitions with clear error
- **Database**: Single `status` column in `bookings` table

**Notes:** State machine enforces valid transitions. No mechanism for ambiguous states.

---

### II-2. No Resurrection
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **State Machine**: `bookingStateMachine.ts:50` - `cancelled: []` means no transitions allowed from cancelled state
- **SimCity Check**: `chaos/harness/index.mjs:973` - `cancelled_booking_never_resurrects` invariant check
- **Reschedule Function**: `supabase/migrations/20251222180000_atomic_reschedule.sql:26` - Checks `IF v_booking.status = 'cancelled'` and rejects

**Notes:** Multiple layers prevent resurrection. Reschedule creates new booking or transitions same booking, never both.

---

### II-3. Idempotent Transitions
**Coverage:** 🟡 **Partial**

**Enforced by:**
- **Webhook Idempotency**: `src/lib/paymentsWebhookHandler.ts:149` - `wasEventProcessed()` prevents duplicate webhook processing
- **Payment Outbox**: `src/app/api/webhooks/stripe/route.ts:106` - Checks `payments_outbox` for already-processed events
- **Idempotency Keys**: `supabase/migrations/20250824164338_core_booking_flow.sql:32` - `idempotency_key TEXT UNIQUE` on bookings

**Missing:**
- No idempotency for booking creation via direct API calls (only via atomic function)
- No idempotency for confirmation/cancellation operations
- No protection against state oscillation from retries

**Notes:** Webhook idempotency is strong. Other operations may create duplicates on retry.

---

## III. Subscription & Gating Invariants

### III-1. Server-Side Gating
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Canonical Guard**: `src/lib/guards/subscriptionGuard.ts` - `assertVendorHasActiveSubscription()` function
- **Schedule Endpoint**: `src/app/api/vendor/schedule/route.ts:57` - Subscription check before schedule mutations
- **Availability Generation**: `src/app/api/availability/generate/route.ts:189` - Subscription check before availability creation
- **Booking Confirmation**: `src/app/api/bookings/confirm/route.ts:93` - Subscription check before booking confirmation
- **SimCity Check**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts:176` - `checkSubscriptionInvariants()` verifies subscription status

**Notes:** **ENFORCED** - All vendor scheduling mutations require active subscription. Guard uses webhook-synced `vendor_subscriptions` table as source of truth. SimCity actively tests for violations.

---

### III-2. Immediate Effect
**Coverage:** 🟡 **Partial**

**Enforced by:**
- **Webhook Handler**: `src/app/api/stripe/webhook/route.ts` - Updates subscription status immediately on webhook

**Missing:**
- No verification that gates lift/close immediately (no grace period enforcement)
- No test coverage for immediate effect

**Notes:** Webhook updates subscription immediately, but no explicit test that gates respond immediately.

---

### III-3. Webhook Supremacy
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Idempotency**: `src/lib/paymentsWebhookHandler.ts:149` - `wasEventProcessed()` prevents duplicate processing
- **Event Tracking**: `paymentsWebhookHandler.ts:172` - `markEventProcessed()` records processed events
- **Outbox Pattern**: `src/app/api/webhooks/stripe/route.ts:106` - Uses `payments_outbox` for idempotency
- **Test Coverage**: `tests/e2e/stripe-replay.spec.ts` - Tests duplicate webhook handling

**Notes:** Strong idempotency and replay protection. Out-of-order delivery handled via event tracking.

---

## IV. Isolation & Security Invariants

### IV-1. Vendor Isolation
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **RLS Policies**: `supabase/migrations/20251224205800_vendor_subscriptions.sql:26` - "Vendors can view own subscription" policy
- **RLS Policies**: Multiple migrations define vendor-specific policies for bookings, availability, slots
- **SimCity Check**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts:135` - `checkBookingOwnershipInvariants()` verifies vendor can only act on own bookings

**Notes:** RLS policies enforce isolation at database level. SimCity verifies ownership.

---

### IV-2. Customer Isolation
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **RLS Policies**: Customer-specific policies in base schema migrations
- **Search Filtering**: `src/app/api/availability/search/route.ts` - Returns only public availability, not vendor internal state

**Notes:** RLS prevents customers from seeing other customers' bookings. Availability search doesn't expose vendor internals.

---

### IV-3. Admin Superset
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **RLS Policies**: Admin-specific policies with explicit role checks
- **State Machine Override**: `bookingStateMachine.ts:57` - Admin override requires explicit `adminId` parameter
- **Audit Trail**: Admin actions tracked via `admin_override_by`, `admin_override_reason` fields

**Notes:** Admin access is explicit and auditable. No implicit escalation.

---

## V. Notification Invariants

### V-1. Notifications Are Consequences
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Architecture**: Notifications are triggered by state changes, not vice versa
- **Error Handling**: Notification failures don't roll back booking state (notifications are fire-and-forget)

**Notes:** Notifications reflect state but don't create it. Failure to notify doesn't corrupt booking truth.

---

### V-2. Idempotent Delivery
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Idempotency Keys**: `supabase/migrations/20251221120000_p2_ratings_notifications.sql:70` - `idempotency_key TEXT NOT NULL UNIQUE` on notification intents
- **Unique Index**: `supabase/migrations/20251221120000_p2_ratings_notifications.sql:90` - Unique index on `(intent_id, channel)` for deliveries
- **SimCity Check**: `chaos/harness/index.mjs:994` - `notification_idempotency` invariant check

**Notes:** Strong idempotency at database level. SimCity actively tests for duplicate notifications.

---

## VI. Time Invariants

### VI-1. No Past Booking
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Atomic Function**: `supabase/migrations/20251225150656_enforce_no_past_booking.sql` - `claim_slot_and_create_booking()` checks `v_slot.start_time > NOW()` before creating booking
- **Booking Engine**: `src/lib/bookingEngine.ts:135` - Validates `slotStart > now` before creating booking record
- **Create Endpoint**: `src/app/api/bookings/create/route.ts:70` - Validates `bookingStart > now` before creating booking
- **Confirm Endpoint**: `src/app/api/bookings/confirm/route.ts:106` - Validates `quoteStart > now` before confirming booking
- **SimCity Check**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts:249` - `checkPastBookingInvariant()` verifies no past bookings

**Notes:** **ENFORCED** - Strict policy: `start_time > now()`. Validation occurs at database level (atomic function) and API level. SimCity actively tests for violations.

---

### VI-2. Slot Expiry
**Coverage:** 🟡 **Partial**

**Enforced by:**
- **Search Filter**: `src/app/api/availability/search/route.ts:28` - Filters expired slots from search results
- **Atomic Function Check**: `claim_slot_and_create_booking()` checks `is_available` but not expiry

**Missing:**
- No explicit expiry check in atomic claim function
- No database constraint preventing claim of expired slots
- No mechanism to prevent resurrection of expired slots

**Notes:** Expired slots filtered from search but can still be claimed if `is_available = true`.

---

### VI-3. Clock Drift Tolerance
**Coverage:** 🟡 **Partial**

**Enforced by:**
- **Timezone Handling**: Database uses `TIMESTAMPTZ` for time-aware timestamps

**Missing:**
- No explicit clock skew detection
- No retry logic that accounts for time advancing
- No ordering guarantees for concurrent operations

**Notes:** Database handles timezones but no explicit clock drift tolerance logic.

---

## VII. Failure Transparency Invariants

### VII-1. No Silent Failure
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Error Returns**: All functions return explicit success/failure signals
- **Exception Handling**: `claim_slot_and_create_booking()` has `EXCEPTION` block that returns error message
- **State Machine**: `bookingStateMachine.ts:54` - Returns `{ success: false, error: ... }` for invalid transitions

**Notes:** Operations return clear failure signals. No silent failures observed.

---

### VII-2. Forensic Completeness
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Event Logging**: `chaos/harness/index.mjs` - Comprehensive event logging
- **SimCity Snapshots**: `supabase/migrations/20251222220000_simcity_control_plane_phase3.sql` - `simcity_run_snapshots` table
- **Invariant Evaluations**: `src/app/api/ops/controlplane/_lib/simcity-llm-invariants.ts` - Returns violations with forensic data
- **Ops Events**: `supabase/migrations/20251222230000_fusion_ops_bus.sql` - `ops_events` table for append-only event log

**Notes:** Strong forensic capabilities. Every SimCity run is explainable via events, snapshots, and invariant evaluations.

---

## VIII. Determinism Invariants

### VIII-1. Seeded Repeatability
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Seed Support**: `src/lib/simcity/orchestrator.ts:56` - `createRng(seed)` function for deterministic random number generation
- **Run Tracking**: SimCity tracks `seed` in run metadata
- **Event Recording**: All events recorded with seed for replay

**Notes:** SimCity uses seeded RNG. Same seed should produce same sequence (barring external factors).

---

### VIII-2. LLM Is Not Judge
**Coverage:** 🟢 **Strong**

**Enforced by:**
- **Separation**: LLM generates events (`simcity-llm-events.ts`), system validates (`simcity-llm-invariants.ts`)
- **Invariant Checks**: System checks invariants after LLM event execution, not before
- **No Override**: LLM cannot suppress invariant failures

**Notes:** LLM generates actions, system decides correctness. Clear separation of concerns.

---

## Summary Statistics

- 🟢 **Strong Coverage**: 15 invariants (71%)
- 🟡 **Partial Coverage**: 6 invariants (29%)
- 🔴 **Missing Coverage**: 0 invariants (0%)

## Critical Gaps

**All critical gaps have been resolved.**

## Recommended Actions

1. **Implement III-1**: Add subscription check to:
   - `src/app/api/vendor/schedule/route.ts` (POST)
   - Availability creation endpoints
   - Booking confirmation endpoints

2. **Implement VI-1**: Add past booking validation to:
   - `claim_slot_and_create_booking()` function
   - Booking creation API endpoints

3. **Strengthen I-3**: Add database constraints for:
   - `end_time >= start_time` check
   - Slot must fall within vendor availability windows

4. **Strengthen II-3**: Add idempotency keys to:
   - Booking creation API
   - Confirmation/cancellation operations

5. **Strengthen VI-2**: Add explicit expiry check to `claim_slot_and_create_booking()`

---

## Related Documentation

- [Scheduling Invariants Specification](./SCHEDULING_INVARIANTS.md)
- [Database Management Policy](./DATABASE_MANAGEMENT_POLICY.md)
- [SimCity Testing Engine](./SIMCITY_TESTING_ENGINE.md)

