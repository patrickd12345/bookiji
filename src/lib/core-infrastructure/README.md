# Core Infrastructure

This directory contains the production-grade core infrastructure for Bookiji's availability + reservation + transaction coordination platform.

## Overview

Bookiji is **NOT a booking app**. It is an **availability + reservation + transaction coordination platform** that:

1. **OWNS** availability computation
2. **EXPOSES** availability to partners
3. **COORDINATES** vendor confirmation + dual-bank authorization
4. **COMMITS** transactions atomically or not at all

## Architecture

See `docs/architecture/CORE_INFRASTRUCTURE_DESIGN.md` for the complete architecture overview.

## Files

### `reservationStateMachine.ts`

Explicit state machine implementation for reservation lifecycle.

**Key Features:**
- 17 states (from `INTENT_CREATED` to `COMMITTED`)
- Valid transition enforcement
- State deadline calculation
- Idempotent transitions
- Append-only logging

**Usage:**
```typescript
import { transitionState, isValidTransition } from './reservationStateMachine'

const result = transitionState(
  reservation,
  'HELD',
  'system',
  'Reservation created'
)

if (result.success) {
  // Update reservation with new state
}
```

### `paymentOrchestrator.ts`

Dual authorization + atomic capture for payments.

**Key Features:**
- Vendor authorization (deposit)
- Requester authorization (service payment)
- Atomic commit (capture both)
- Compensation on failure

**Usage:**
```typescript
import { PaymentOrchestrator } from './paymentOrchestrator'

const orchestrator = new PaymentOrchestrator({
  stripe,
  stripeConnectAccountId: 'acct_...',
  vendorDepositAmount: 1000, // cents
  requesterAmount: 5000, // cents
  currency: 'usd',
})

// Authorize vendor
const vendorResult = await orchestrator.authorizeVendor(reservation)

// Authorize requester
const requesterResult = await orchestrator.authorizeRequester(reservation)

// Atomic commit
const commitResult = await orchestrator.atomicCommit(reservation)
```

### `availabilityEngine.ts`

Computes availability for vendors based on calendar data and business rules.

**Key Features:**
- Deterministic computation
- Recomputable from source data
- Explainable (shows why slots are/aren't available)
- Versioned (hash/revision ID)

**Usage:**
```typescript
import { computeAvailability } from './availabilityEngine'

const result = await computeAvailability({
  vendorId: 'vendor-123',
  startTime: '2025-01-27T10:00:00Z',
  endTime: '2025-01-27T18:00:00Z',
  slotDuration: 60, // minutes
  includeConfidence: true,
  partnerId: 'partner-456',
})
```

### `reservationService.ts`

Manages reservation lifecycle: creation, state transitions, retrieval.

**Key Features:**
- Reservation creation
- State transition management
- TTL enforcement
- Collision detection
- Rate limiting

**Usage:**
```typescript
import { createReservation, getReservation } from './reservationService'

// Create reservation
const result = await createReservation({
  partnerId: 'partner-123',
  vendorId: 'vendor-456',
  requesterId: 'requester-789',
  slotStartTime: '2025-01-27T10:00:00Z',
  slotEndTime: '2025-01-27T11:00:00Z',
  idempotencyKey: 'unique-key',
})

// Get reservation
const reservation = await getReservation('reservation-id', 'partner-123')
```

### `partnerAuth.ts`

Authenticates partner API requests using API keys.

**Key Features:**
- API key validation
- Partner identification
- Rate limiting support

**Usage:**
```typescript
import { authenticatePartner } from './partnerAuth'

const result = await authenticatePartner(request)

if (result.success) {
  const { partnerId } = result.data
  // Proceed with request
}
```

## Types

All types are defined in `src/types/core-infrastructure.ts`:

- `VendorAvailability` - Computed availability
- `AvailabilitySlot` - Individual time slots
- `Reservation` - Soft hold with staged TTLs
- `ReservationState` - State machine states
- `PaymentState` - Dual authorization tracking
- `Booking` - Finalized booking
- Partner API request/response types
- Webhook event types

## API Endpoints

Partner API v1 endpoints are in `src/app/api/v1/`:

- `GET /v1/vendors/{vendorId}/availability` - Get availability
- `POST /v1/reservations` - Create reservation
- `GET /v1/reservations/{reservationId}` - Get reservation

See `docs/architecture/CORE_INFRASTRUCTURE_DESIGN.md` for complete API documentation.

## State Machine

### States

1. `INTENT_CREATED` - Initial creation
2. `HELD` - Slot held, awaiting vendor confirmation
3. `AWAITING_VENDOR_CONFIRMATION` - Vendor notified
4. `CONFIRMED_BY_VENDOR` - Vendor approved
5. `AWAITING_VENDOR_AUTH` - Vendor payment authorization pending
6. `VENDOR_AUTHORIZED` - Vendor deposit authorized
7. `AWAITING_REQUESTER_AUTH` - Requester payment authorization pending
8. `AUTHORIZED_BOTH` - Both authorizations complete
9. `COMMIT_IN_PROGRESS` - Atomic commit executing
10. `COMMITTED` - Finalized booking
11. `FAILED_*` - Various failure states
12. `EXPIRED` - TTL exceeded
13. `CANCELLED` - Explicitly cancelled

### Valid Transitions

See `reservationStateMachine.ts` for complete transition rules.

**Key Rules:**
- No skipping states
- No backwards transitions (except cancellation)
- Terminal states cannot transition
- Every state has a deadline

## Payment Flow

1. **Vendor Authorization** - Create PaymentIntent (authorize only)
2. **Requester Authorization** - Create PaymentIntent (authorize only)
3. **Revalidate Availability** - Check slot still available
4. **Atomic Commit** - Capture both authorizations
5. **Compensation** - If commit fails, reverse captures

See `docs/architecture/FAILURE_COMPENSATION_MATRIX.md` for failure scenarios.

## Failure Handling

All failure scenarios are documented in `docs/architecture/FAILURE_COMPENSATION_MATRIX.md`.

**Key Principle:** No money captured until both authorizations succeed AND availability revalidated.

**Compensation:**
- Pre-commit failures: Release holds, cancel authorizations
- Commit failures: Refund captures, release authorizations

## Testing

See `docs/architecture/CORE_INFRASTRUCTURE_IMPLEMENTATION_SUMMARY.md` for testing requirements.

**Test Scenarios:**
- State transitions
- Payment authorization
- Atomic commit
- Compensation logic
- Failure scenarios

## Implementation Status

See `docs/architecture/CORE_INFRASTRUCTURE_IMPLEMENTATION_SUMMARY.md` for implementation status.

**Completed:**
- ✅ Design & architecture
- ✅ Type definitions
- ✅ State machine
- ✅ Payment orchestrator (stubs)
- ✅ API endpoints (stubs)

**Pending:**
- 🔨 Database migrations
- 🔨 Calendar integration
- 🔨 Full service implementation
- 🔨 Reconciliation jobs
- 🔨 Monitoring & observability

## Documentation

- `docs/architecture/CORE_INFRASTRUCTURE_DESIGN.md` - Complete architecture
- `docs/architecture/FAILURE_COMPENSATION_MATRIX.md` - Failure scenarios
- `docs/architecture/CORE_INFRASTRUCTURE_IMPLEMENTATION_SUMMARY.md` - Implementation summary

## Key Principles

1. **No shortcuts** - Production-grade infrastructure
2. **No hand-waving** - Explicit design and implementation
3. **No UI-first thinking** - Infrastructure-first approach
4. **Correctness over convenience** - Prefer correctness
5. **Auditability** - Everything is logged
6. **Idempotency** - All operations are idempotent
7. **Retry-safe** - All operations are retry-safe
8. **Explainable** - Everything can be explained

---

*Last Updated: 2025-01-27*
