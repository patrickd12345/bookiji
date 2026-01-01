# Bookiji Core Infrastructure Design

**Version:** 1.0  
**Status:** Production-Grade Design  
**Last Updated:** 2025-01-27

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Core Philosophy](#core-philosophy)
3. [Availability Model](#availability-model)
4. [Reservation / Hold Semantics](#reservation--hold-semantics)
5. [Booking Workflow](#booking-workflow)
6. [State Machine](#state-machine)
7. [Payment Orchestration](#payment-orchestration)
8. [Partner API Contract](#partner-api-contract)
9. [Failure & Compensation Matrix](#failure--compensation-matrix)
10. [Idempotency & Retries](#idempotency--retries)
11. [Scalability & Trust](#scalability--trust)
12. [Future Evolution](#future-evolution)

---

## System Architecture Overview

### High-Level Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        PARTNER API (v1)                         │
│  GET /vendors/{id}/availability                                 │
│  POST /reservations                                              │
│  GET /reservations/{id}                                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AVAILABILITY ENGINE                           │
│  • Calendar Integration (Google, Outlook)                        │
│  • Deterministic Computation                                    │
│  • Confidence Scoring                                            │
│  • Versioning (hash/revision)                                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  RESERVATION COORDINATOR                        │
│  • Soft Hold Management                                          │
│  • TTL Enforcement                                              │
│  • Collision Prevention                                          │
│  • Abuse Prevention                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    VENDOR CONFIRMATION                           │
│  • Notification System                                           │
│  • Confirmation Tracking                                         │
│  • Timeout Handling                                              │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PAYMENT ORCHESTRATOR                           │
│  • Dual Authorization (Vendor + Requester)                      │
│  • Stripe Connect Integration                                   │
│  • Idempotency Management                                       │
│  • Compensation Logic                                           │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ATOMIC COMMIT ENGINE                          │
│  • Transaction Coordination                                      │
│  • Final Availability Revalidation                               │
│  • Dual Capture Execution                                        │
│  • Event Emission                                                │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AUDIT & RECONCILIATION                       │
│  • Append-Only Event Log                                        │
│  • State Transition History                                      │
│  • Reconciliation Jobs                                           │
│  • Repair Logic                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Principles

1. **Availability is computed, not stored** (except for caching with TTL)
2. **Reservations are soft holds** (TTL-based, reversible)
3. **Bookings are committed transactions** (irreversible without explicit cancellation)
4. **Payments are authorized before capture** (no money moves until commit)
5. **All transitions are logged** (append-only audit trail)

### External Dependencies

- **Stripe + Stripe Connect**: Payment processing
- **Google Calendar API**: Calendar integration (read-only)
- **Outlook Calendar API**: Calendar integration (read-only)
- **Partner Systems**: External booking systems consuming Bookiji APIs

---

## Core Philosophy

### Non-Negotiable Principles

1. **Bookiji OWNS availability computation**
   - Partners query, they don't compute
   - Availability is deterministic and recomputable
   - No guarantees, only computed availability

2. **Bookiji EXPOSES availability to partners**
   - Versioned API endpoints
   - Explicit confidence scores
   - No implicit promises

3. **Partners ATTEMPT bookings**
   - Partners create reservations (soft holds)
   - Bookiji coordinates confirmation
   - Partners are observers, not deciders

4. **Bookiji COORDINATES vendor confirmation + dual-bank authorization**
   - Vendor must confirm before payment
   - Both parties authorize before commit
   - No money captured before commit

5. **Bookiji COMMITS transactions atomically or not at all**
   - All-or-nothing finalization
   - Revalidation before commit
   - Explicit rollback paths

6. **Everything is auditable, idempotent, retry-safe, and explainable**
   - Append-only logs
   - Deterministic idempotency keys
   - Retry-safe operations
   - Human-readable explanations

---

## Availability Model

### VendorAvailability

Represents the computed availability for a vendor over a time range.

**Key Properties:**
- Deterministic computation (same inputs → same outputs)
- Recomputable (can regenerate from source data)
- Explainable (can show why a slot is/isn't available)
- Versioned (hash or revision ID for cache invalidation)

**Computation Factors:**
- Working hours (vendor-defined schedule)
- Free/busy blocks (from calendar integration)
- Buffers (pre/post booking buffers)
- Slot duration (minimum bookable time)
- Minimum notice (how far in advance bookings allowed)
- Booking horizon (how far out bookings allowed)

### AvailabilitySlot

A specific time slot that may be available for booking.

**Properties:**
- `startTime`: ISO 8601 timestamp
- `endTime`: ISO 8601 timestamp
- `isAvailable`: boolean (computed, not guaranteed)
- `confidence`: number (0.0 to 1.0)
- `reasons`: string[] (explanation of availability status)
- `computedAt`: ISO 8601 timestamp
- `computedVersion`: string (hash/revision ID)

**Confidence Scoring:**
- `1.0`: Calendar explicitly free, within business hours, all rules satisfied
- `0.8`: Calendar free, but near buffer zone
- `0.6`: Calendar free, but minimum notice not met
- `0.4`: Calendar free, but outside business hours
- `0.2`: Calendar shows tentative/busy
- `0.0`: Calendar explicitly busy

**Important:** Availability is NEVER a guarantee. It's a computed snapshot.

---

## Reservation / Hold Semantics

### Core Rules

- **Capacity = 1**: Only one active reservation per slot
- **Soft Holds Only**: No hard locks, all reversible
- **Staged TTLs**: Different expiration times per stage
- **Mandatory Revalidation**: Must check availability before commit

### Reservation Object

A reservation represents a partner's intent to book a slot.

**States:**
- `HELD`: Initial hold placed
- `AWAITING_VENDOR_CONFIRMATION`: Vendor notification sent
- `CONFIRMED_BY_VENDOR`: Vendor approved
- `AWAITING_VENDOR_AUTH`: Vendor payment authorization pending
- `VENDOR_AUTHORIZED`: Vendor deposit authorized
- `AWAITING_REQUESTER_AUTH`: Requester payment authorization pending
- `AUTHORIZED_BOTH`: Both authorizations complete
- `COMMIT_IN_PROGRESS`: Atomic commit executing
- `COMMITTED`: Finalized booking
- `FAILED_*`: Various failure states
- `EXPIRED`: TTL exceeded

### TTL Enforcement

**Staged TTLs:**

1. **Initial Hold**: 10 minutes
   - Starts when reservation created
   - Expires if vendor doesn't confirm

2. **After Vendor Confirmation**: +30 minutes
   - Extended when vendor confirms
   - Expires if authorizations don't complete

3. **After Both Auths**: +15 minutes
   - Extended when both authorizations complete
   - Expires if commit doesn't execute

**Revalidation Rules:**
- Before vendor confirmation: Check slot still available
- Before vendor auth: Check slot still available
- Before requester auth: Check slot still available
- Before commit: **MANDATORY** final availability check

### Collision Rules

- **Single Active Hold**: If slot already has active reservation, new reservation rejected
- **First-Come-First-Served**: Earliest reservation wins
- **Expired Holds**: Automatically released, slot becomes available again

### Abuse Prevention

- **Rate Limits**: Max N reservations per partner per hour
- **Hold Caps**: Max M active holds per partner
- **IP-Based Limits**: Additional limits per IP address
- **Partner Reputation**: Track hold-to-commit ratio

---

## Booking Workflow

### Strict Order (Non-Negotiable)

```
1. Partner selects slot
   └─> Reservation CREATED (HELD state)
       └─> TTL: 10 minutes

2. Vendor is notified
   └─> State: AWAITING_VENDOR_CONFIRMATION
       └─> Notification sent (email/SMS/webhook)

3. Vendor CONFIRMS
   └─> State: CONFIRMED_BY_VENDOR
       └─> TTL extended: +30 minutes (total 40 minutes)

4. Vendor DEPOSIT is AUTHORIZED
   └─> State: VENDOR_AUTHORIZED
       └─> Stripe PaymentIntent created (authorize only)
       └─> Bank hold placed on vendor account

5. Requester PAYMENT is AUTHORIZED
   └─> State: AUTHORIZED_BOTH
       └─> Stripe PaymentIntent created (authorize only)
       └─> Bank hold placed on requester account
       └─> TTL extended: +15 minutes (total 55 minutes)

6. Revalidate availability
   └─> MANDATORY final check
       └─> If unavailable: FAILED_AVAILABILITY_CHANGED
       └─> If available: proceed to commit

7. Atomic COMMIT
   └─> State: COMMIT_IN_PROGRESS
       └─> Capture vendor authorization
       └─> Capture requester authorization
       └─> Finalize booking (state: COMMITTED)
       └─> Emit final events
       └─> Release holds
```

### Reversibility Rules

**Before Step 6 (Revalidation):**
- All steps are reversible
- No money captured
- Holds can be released
- Authorizations can be canceled

**After Step 7 (Commit):**
- Booking is finalized
- Money is captured
- Requires explicit cancellation flow
- Refunds may apply

### Failure Points

- **Step 1-2**: Reservation expires, slot released
- **Step 3**: Vendor doesn't confirm, reservation expires
- **Step 4**: Vendor auth fails, reservation fails
- **Step 5**: Requester auth fails, reservation fails
- **Step 6**: Availability changed, reservation fails
- **Step 7**: Commit fails, compensation required

---

## State Machine

### Explicit States

```typescript
type ReservationState =
  | 'INTENT_CREATED'           // Initial creation, not yet held
  | 'HELD'                      // Slot held, awaiting vendor confirmation
  | 'AWAITING_VENDOR_CONFIRMATION'  // Vendor notified, awaiting response
  | 'CONFIRMED_BY_VENDOR'      // Vendor approved
  | 'AWAITING_VENDOR_AUTH'     // Vendor payment authorization pending
  | 'VENDOR_AUTHORIZED'        // Vendor deposit authorized
  | 'AWAITING_REQUESTER_AUTH'  // Requester payment authorization pending
  | 'AUTHORIZED_BOTH'          // Both authorizations complete
  | 'COMMIT_IN_PROGRESS'       // Atomic commit executing
  | 'COMMITTED'                // Finalized booking
  | 'FAILED_VENDOR_TIMEOUT'    // Vendor didn't confirm in time
  | 'FAILED_VENDOR_AUTH'       // Vendor authorization failed
  | 'FAILED_REQUESTER_AUTH'    // Requester authorization failed
  | 'FAILED_AVAILABILITY_CHANGED'  // Slot no longer available
  | 'FAILED_COMMIT'            // Commit failed (requires compensation)
  | 'EXPIRED'                  // TTL exceeded
  | 'CANCELLED'                // Explicitly cancelled
```

### State Transition Rules

**Valid Transitions:**

```
INTENT_CREATED → HELD
HELD → AWAITING_VENDOR_CONFIRMATION
AWAITING_VENDOR_CONFIRMATION → CONFIRMED_BY_VENDOR
AWAITING_VENDOR_CONFIRMATION → FAILED_VENDOR_TIMEOUT
AWAITING_VENDOR_CONFIRMATION → EXPIRED
CONFIRMED_BY_VENDOR → AWAITING_VENDOR_AUTH
AWAITING_VENDOR_AUTH → VENDOR_AUTHORIZED
AWAITING_VENDOR_AUTH → FAILED_VENDOR_AUTH
AWAITING_VENDOR_AUTH → EXPIRED
VENDOR_AUTHORIZED → AWAITING_REQUESTER_AUTH
AWAITING_REQUESTER_AUTH → AUTHORIZED_BOTH
AWAITING_REQUESTER_AUTH → FAILED_REQUESTER_AUTH
AWAITING_REQUESTER_AUTH → EXPIRED
AUTHORIZED_BOTH → COMMIT_IN_PROGRESS
AUTHORIZED_BOTH → FAILED_AVAILABILITY_CHANGED
AUTHORIZED_BOTH → EXPIRED
COMMIT_IN_PROGRESS → COMMITTED
COMMIT_IN_PROGRESS → FAILED_COMMIT
[ANY] → CANCELLED (explicit cancellation)
[ANY] → EXPIRED (TTL exceeded)
```

**Invalid Transitions:**
- Skipping states (e.g., HELD → VENDOR_AUTHORIZED)
- Backwards transitions (e.g., COMMITTED → HELD)
- Terminal state transitions (COMMITTED → anything)

### State Deadlines

Every state has a deadline:

- `HELD`: `created_at + 10 minutes`
- `AWAITING_VENDOR_CONFIRMATION`: `created_at + 10 minutes`
- `CONFIRMED_BY_VENDOR`: `vendor_confirmed_at + 30 minutes`
- `AWAITING_VENDOR_AUTH`: `vendor_confirmed_at + 30 minutes`
- `VENDOR_AUTHORIZED`: `vendor_auth_at + 30 minutes`
- `AWAITING_REQUESTER_AUTH`: `vendor_auth_at + 30 minutes`
- `AUTHORIZED_BOTH`: `requester_auth_at + 15 minutes`
- `COMMIT_IN_PROGRESS`: `authorized_both_at + 15 minutes`

### Append-Only Logging

Every state transition is logged:

```typescript
interface StateTransitionLog {
  id: string
  reservationId: string
  fromState: ReservationState
  toState: ReservationState
  triggeredBy: 'system' | 'vendor' | 'requester' | 'partner' | 'timeout'
  reason?: string
  metadata?: Record<string, unknown>
  timestamp: string
  idempotencyKey?: string
}
```

---

## Payment Orchestration

### Stripe Connect Model

**Assumptions:**
- Stripe Connect for vendor accounts
- Separate PaymentIntents for vendor and requester
- Authorization + delayed capture pattern
- Idempotency keys for all operations

### Payment State Tracking

```typescript
interface PaymentState {
  vendorPaymentIntentId?: string
  vendorPaymentIntentStatus?: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'succeeded' | 'canceled'
  vendorAuthorizedAt?: string
  vendorCaptureId?: string
  
  requesterPaymentIntentId?: string
  requesterPaymentIntentStatus?: string
  requesterAuthorizedAt?: string
  requesterCaptureId?: string
  
  vendorCaptureAttempts: number
  requesterCaptureAttempts: number
  lastCaptureError?: string
}
```

### Authorization Flow

1. **Vendor Authorization**
   - Create PaymentIntent with `capture_method: 'manual'`
   - Amount: Vendor deposit amount
   - Idempotency key: `vendor-auth-{reservationId}-{attempt}`
   - Store `vendorPaymentIntentId`

2. **Requester Authorization**
   - Create PaymentIntent with `capture_method: 'manual'`
   - Amount: Service price
   - Idempotency key: `requester-auth-{reservationId}-{attempt}`
   - Store `requesterPaymentIntentId`

3. **Both Authorized**
   - Wait for both PaymentIntents to reach `requires_capture`
   - Proceed to commit

### Capture Flow (Atomic Commit)

1. **Revalidate availability** (mandatory)
2. **Capture vendor authorization**
   - Idempotency key: `vendor-capture-{reservationId}-{attempt}`
   - Retry on failure (bounded exponential backoff)
3. **Capture requester authorization**
   - Idempotency key: `requester-capture-{reservationId}-{attempt}`
   - Retry on failure (bounded exponential backoff)
4. **If both succeed**: Update booking state to COMMITTED
5. **If either fails**: Execute compensation logic

### Compensation Logic

**If vendor capture fails but requester succeeds:**
- Cancel requester capture (refund)
- Release vendor authorization
- Mark reservation as FAILED_COMMIT
- Emit compensation event

**If requester capture fails but vendor succeeds:**
- Cancel vendor capture (refund)
- Release requester authorization
- Mark reservation as FAILED_COMMIT
- Emit compensation event

**If both fail:**
- Release both authorizations
- Mark reservation as FAILED_COMMIT
- Emit failure event

### Authorization Expiry Handling

- Stripe authorizations expire after 7 days
- Monitor authorization age
- If approaching expiry, extend TTL or fail fast
- Reconciliation job checks for expired authorizations

### External References

All Stripe operations include:
- `metadata.reservation_id`: Reservation ID
- `metadata.booking_id`: Booking ID (if committed)
- `metadata.partner_id`: Partner ID
- `metadata.attempt`: Attempt number for idempotency

---

## Partner API Contract

### Base URL

```
https://api.bookiji.com/v1
```

### Authentication

- API key authentication (header: `Authorization: Bearer {api_key}`)
- Rate limiting per API key
- Partner-specific quotas

### Endpoints

#### GET /vendors/{vendorId}/availability

**Query Parameters:**
- `startTime`: ISO 8601 timestamp (required)
- `endTime`: ISO 8601 timestamp (required)
- `slotDuration`: number (minutes, optional, default: 60)
- `includeConfidence`: boolean (optional, default: false)

**Response:**
```typescript
{
  vendorId: string
  startTime: string
  endTime: string
  computedAt: string
  computedVersion: string
  slots: AvailabilitySlot[]
  metadata: {
    confidenceThreshold: number
    computationTimeMs: number
  }
}
```

**HTTP Status Codes:**
- `200`: Success
- `400`: Invalid parameters
- `404`: Vendor not found
- `429`: Rate limit exceeded
- `500`: Internal error (retryable)
- `503`: Service unavailable (retryable)

#### POST /reservations

**Request Body:**
```typescript
{
  vendorId: string
  slotStartTime: string  // ISO 8601
  slotEndTime: string   // ISO 8601
  requesterId: string   // Partner's requester identifier
  metadata?: Record<string, unknown>
  idempotencyKey?: string  // Partner-provided idempotency key
}
```

**Response:**
```typescript
{
  reservationId: string
  state: ReservationState
  expiresAt: string
  vendorConfirmationRequired: boolean
  estimatedConfirmationTime: string
  webhookUrl?: string  // If partner provided webhook URL
}
```

**HTTP Status Codes:**
- `201`: Reservation created
- `400`: Invalid request (non-retryable)
- `409`: Slot already reserved (non-retryable)
- `429`: Rate limit exceeded (retryable with backoff)
- `500`: Internal error (retryable)
- `503`: Service unavailable (retryable)

#### GET /reservations/{reservationId}

**Response:**
```typescript
{
  reservationId: string
  state: ReservationState
  vendorId: string
  slotStartTime: string
  slotEndTime: string
  requesterId: string
  createdAt: string
  expiresAt: string
  stateHistory: StateTransitionLog[]
  paymentState?: PaymentState
  bookingId?: string  // If committed
  failureReason?: string  // If failed
}
```

**HTTP Status Codes:**
- `200`: Success
- `404`: Reservation not found
- `500`: Internal error (retryable)

### Error Taxonomy

**Retryable Errors:**
- `500 Internal Server Error`: Transient failure, retry with backoff
- `503 Service Unavailable`: Service degraded, retry with backoff
- `429 Too Many Requests`: Rate limit hit, retry after `Retry-After` header

**Non-Retryable Errors:**
- `400 Bad Request`: Invalid input, fix request
- `404 Not Found`: Resource doesn't exist
- `409 Conflict`: Business rule violation (e.g., slot already reserved)

**Error Response Format:**
```typescript
{
  error: {
    code: string
    message: string
    details?: Record<string, unknown>
    retryable: boolean
    retryAfter?: number  // seconds
  }
}
```

### Webhook Events

Partners can register webhook URLs to receive events:

- `reservation.created`: Reservation created
- `reservation.vendor_confirmed`: Vendor confirmed
- `reservation.vendor_authorized`: Vendor payment authorized
- `reservation.authorized_both`: Both payments authorized
- `reservation.committed`: Booking finalized
- `reservation.failed`: Reservation failed
- `reservation.expired`: Reservation expired
- `reservation.cancelled`: Reservation cancelled

**Webhook Payload:**
```typescript
{
  event: string
  reservationId: string
  timestamp: string
  data: ReservationState | PaymentState | FailureReason
  signature: string  // HMAC signature for verification
}
```

### Polling Fallback

If webhooks are unavailable, partners can poll `GET /reservations/{reservationId}` to check state.

---

## Failure & Compensation Matrix

### Failure Scenarios

| Step | Failure Point | Compensation | Reversibility |
|------|---------------|--------------|---------------|
| 1-2 | Reservation creation fails | None (no state changed) | N/A |
| 2-3 | Vendor notification fails | Retry notification, extend TTL | Yes |
| 3 | Vendor doesn't confirm | Release hold, expire reservation | Yes |
| 4 | Vendor auth fails | Release hold, expire reservation | Yes |
| 5 | Requester auth fails | Release vendor auth, expire reservation | Yes |
| 6 | Availability changed | Release both auths, expire reservation | Yes |
| 7a | Vendor capture fails | Cancel requester capture (refund), release vendor auth | Partial |
| 7b | Requester capture fails | Cancel vendor capture (refund), release requester auth | Partial |
| 7c | Both captures fail | Release both auths | Yes |

### Compensation Actions

**Before Commit (Steps 1-6):**
- Release holds (automatic on expiry)
- Cancel authorizations (automatic on expiry)
- No money captured, no compensation needed

**During Commit (Step 7):**
- If vendor capture fails: Cancel requester capture, refund if captured
- If requester capture fails: Cancel vendor capture, refund if captured
- Log compensation event
- Notify partners via webhook

### Repair Logic

**Reconciliation Job** (runs every 5 minutes):

1. Find reservations in `AUTHORIZED_BOTH` state older than TTL
2. Check if authorizations still valid
3. If expired: Release authorizations, mark as EXPIRED
4. If valid but commit didn't happen: Retry commit (with backoff)

**Stale Authorization Cleanup** (runs daily):

1. Find authorizations older than 7 days
2. Cancel unused authorizations
3. Mark associated reservations as EXPIRED
4. Emit cleanup events

---

## Idempotency & Retries

### Idempotency Keys

**Format:** `{operation}-{reservationId}-{attempt}`

**Examples:**
- `vendor-auth-{reservationId}-1`
- `requester-auth-{reservationId}-1`
- `vendor-capture-{reservationId}-1`
- `vendor-capture-{reservationId}-2` (retry)

**Storage:**
- Store in `idempotency_keys` table
- Include operation, result, timestamp
- TTL: 24 hours

### Retry Policy

**Retryable Operations:**
- External API calls (Stripe, calendar APIs)
- Database operations (transient failures)
- Network requests

**Non-Retryable Operations:**
- Business rule violations (slot already reserved)
- Invalid input (400 errors)
- Authentication failures (401 errors)

**Retry Strategy:**
- Bounded exponential backoff
- Max attempts: 5
- Initial delay: 1 second
- Max delay: 60 seconds
- Jitter: ±20%

### Retry Logic

```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts: number = 5,
  initialDelay: number = 1000
): Promise<T> {
  let attempt = 1
  let delay = initialDelay
  
  while (attempt <= maxAttempts) {
    try {
      return await operation()
    } catch (error) {
      if (attempt === maxAttempts || !isRetryable(error)) {
        throw error
      }
      
      await sleep(delay + jitter(delay * 0.2))
      delay = Math.min(delay * 2, 60000)
      attempt++
    }
  }
  
  throw new Error('Max attempts exceeded')
}
```

---

## Scalability & Trust

### Scalability Considerations

**Availability Computation:**
- Cache computed availability (TTL: 5 minutes)
- Cache invalidation via version hash
- Horizontal scaling: Stateless computation
- Database: Read replicas for availability queries

**Reservation Management:**
- Database: Partition by vendor_id or date
- Indexes: `(vendor_id, slot_start_time, state)`
- Connection pooling: PgBouncer or similar
- Rate limiting: Redis-based, per-partner

**Payment Orchestration:**
- Stripe API: Rate limit handling
- Idempotency: Database-backed
- Webhook processing: Queue-based (e.g., Bull/BullMQ)
- Retry logic: Exponential backoff with jitter

**State Machine:**
- State transitions: Database transactions
- Event logging: Append-only table (partitioned by date)
- Reconciliation: Scheduled jobs (cron)

### Trust & Security

**Partner Authentication:**
- API keys (rotated quarterly)
- Rate limiting per key
- IP whitelisting (optional)
- Webhook signature verification

**Vendor Authentication:**
- OAuth2 (Google, Outlook)
- Calendar read-only access
- Token encryption at rest
- Automatic token refresh

**Payment Security:**
- PCI compliance (Stripe handles)
- No card data stored
- Idempotency prevents double charges
- Audit trail for all operations

**Data Privacy:**
- GDPR compliance
- PII encryption at rest
- Audit logs for access
- Data retention policies

### Monitoring & Observability

**Metrics:**
- Reservation creation rate
- State transition rates
- Payment authorization success rate
- Commit success rate
- Compensation rate
- API latency (p50, p95, p99)
- Error rates by type

**Alerts:**
- High compensation rate (>1%)
- High commit failure rate (>5%)
- Stale reservations (>100)
- API error rate spike
- Payment authorization failures

**Logging:**
- All state transitions
- All payment operations
- All API requests (sanitized)
- All compensation actions
- All reconciliation actions

---

## Future Evolution

### Versioning Strategy

**Major Versions (Breaking Changes):**
- URL-based: `/v1`, `/v2`, etc.
- Parallel deployment
- Deprecation notice: 6 months
- Migration guides provided

**Minor Versions (Non-Breaking):**
- New optional fields
- New endpoints
- Backward compatible changes

**Webhook Versioning:**
- Separate versioning from API
- `X-Webhook-Version` header
- Default: latest version

### Potential Enhancements

**Availability:**
- Multi-calendar support (vendor has multiple calendars)
- Recurring availability patterns
- Custom availability rules (vendor-defined)
- Availability forecasting (ML-based)

**Reservations:**
- Multi-slot reservations
- Reservation groups (related reservations)
- Reservation templates (common patterns)
- Reservation sharing (vendor shares with team)

**Payments:**
- Split payments (multiple requesters)
- Installment payments
- Refund automation
- Payment method preferences

**Partner Features:**
- Bulk operations (create multiple reservations)
- Reservation pre-booking (hold before requester)
- Custom webhook formats
- Partner-specific SLA guarantees

### Migration Paths

**From Current System:**
1. Deploy new reservation system alongside existing
2. Migrate partners gradually
3. Dual-write period (write to both systems)
4. Cutover to new system
5. Deprecate old system

**Database Migrations:**
- Zero-downtime migrations
- Backward compatible schema changes
- Rollback procedures documented
- Migration testing in staging

---

## Conclusion

This infrastructure design provides:

✅ **Correctness**: Atomic commits, idempotency, auditability  
✅ **Reliability**: Retry logic, compensation, reconciliation  
✅ **Scalability**: Horizontal scaling, caching, partitioning  
✅ **Trust**: Security, monitoring, observability  
✅ **Evolution**: Versioning, migration paths, extensibility  

**No shortcuts. No hand-waving. Production-grade infrastructure.**

---

*Document Version: 1.0*  
*Last Updated: 2025-01-27*  
*Status: Design Complete - Implementation Pending*
