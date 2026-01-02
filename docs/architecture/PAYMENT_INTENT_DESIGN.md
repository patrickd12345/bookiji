# PaymentIntent Design Document

## Overview

The PaymentIntent entity is the core of Bookiji's Payments layer, linking every money-moving operation to a Credit Ledger intent and booking. It ensures that all payment operations are auditable, idempotent, and cannot bypass the Credit Ledger.

## Entity Schema

```sql
CREATE TABLE public.payment_intents (
  id UUID PRIMARY KEY,
  owner_type TEXT NOT NULL CHECK (owner_type IN ('customer','provider')),
  owner_id UUID NOT NULL,
  booking_id UUID,
  credit_intent_id UUID NOT NULL, -- FK to credit_ledger_entries
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','authorized','captured','refunded','cancelled','failed')),
  external_provider TEXT, -- e.g. 'stripe'
  external_id TEXT, -- provider's payment_intent id
  idempotency_key TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_payment_intents_idempotency UNIQUE (idempotency_key),
  CONSTRAINT ux_payment_intents_external UNIQUE (external_provider, external_id),
  CONSTRAINT fk_payment_intents_credit_ledger FOREIGN KEY (credit_intent_id) 
    REFERENCES public.credit_ledger_entries(credit_intent_id) ON DELETE RESTRICT
);
```

## Key Constraints

### 1. Ledger Linkage (FK Constraint)
- **Constraint**: `fk_payment_intents_credit_ledger`
- **Purpose**: Ensures every PaymentIntent is tied to a Credit Ledger entry
- **Enforcement**: Database-level foreign key constraint
- **Invariant**: "Do NOT bypass Credit Ledger" - all money movements must have ledger basis

### 2. Idempotency (Unique Constraint)
- **Constraint**: `ux_payment_intents_idempotency` on `idempotency_key`
- **Purpose**: Prevents duplicate PaymentIntent creation with same idempotency key
- **Enforcement**: Database unique constraint + repository idempotent insert logic

### 3. External ID Uniqueness (Unique Constraint)
- **Constraint**: `ux_payment_intents_external` on `(external_provider, external_id)`
- **Purpose**: Prevents duplicate recording of same external payment (e.g., Stripe payment_intent.id)
- **Enforcement**: Database unique constraint
- **Use Case**: Webhook handlers use this to resolve PaymentIntent from Stripe events

## Status State Machine

```
created → authorized → captured → refunded (terminal)
  ↓           ↓
cancelled   cancelled
(terminal) (terminal)
  ↓
failed
(terminal)
```

### Valid Transitions

| From | To | Notes |
|------|-----|-------|
| `created` | `authorized` | After Stripe payment intent created |
| `created` | `cancelled` | Payment cancelled before authorization |
| `created` | `failed` | Payment creation failed |
| `authorized` | `captured` | Payment succeeded (webhook) |
| `authorized` | `cancelled` | Payment cancelled after authorization |
| `authorized` | `failed` | Payment authorization failed |
| `captured` | `refunded` | Refund processed |
| `refunded` | - | Terminal state (no further transitions) |
| `cancelled` | - | Terminal state (no further transitions) |
| `failed` | - | Terminal state (no further transitions) |

### Invalid Transitions (Prevented)

- `created` → `captured` (must authorize first)
- `created` → `refunded` (must capture first)
- `captured` → `captured` (double-capture prevented)
- `refunded` → `captured` (terminal state)
- `refunded` → `refunded` (double-refund prevented)
- Any transition from terminal states

## Payment Flow

### 1. Payment Intent Creation

```
1. Create credit_ledger_entry
   └─> Generate credit_intent_id (UUID)
   └─> Insert into credit_ledger_entries

2. Create PaymentIntent (status: 'created')
   └─> Insert with credit_intent_id
   └─> Use idempotency_key

3. Call Stripe API
   └─> Create Stripe PaymentIntent
   └─> Use same idempotency_key

4. Update PaymentIntent
   └─> Set external_id = Stripe payment_intent.id
   └─> Set status = 'authorized'
```

**Code Path**: `src/lib/paymentsCreateIntentHandler.ts`

### 2. Webhook Processing

```
1. Receive Stripe webhook event
   └─> Extract payment_intent.id

2. Resolve PaymentIntent
   └─> findByExternalId('stripe', payment_intent.id)

3. Verify credit_intent_id
   └─> Ensure PaymentIntent has valid credit_intent_id

4. Update PaymentIntent status
   └─> payment_intent.succeeded → status = 'captured'
   └─> payment_intent.payment_failed → status = 'failed'
   └─> payment_intent.canceled → status = 'cancelled'

5. Update booking state
   └─> Only after PaymentIntent verified
   └─> Transition booking state accordingly
```

**Code Path**: `src/app/api/webhooks/stripe/route.ts`, `src/lib/paymentsWebhookHandler.ts`

## Repository Layer

### Functions

#### `insertPaymentIntent(input)`
- **Purpose**: Idempotent insert of PaymentIntent
- **Idempotency**: If `idempotency_key` exists, returns existing record
- **Validation**: Verifies `credit_intent_id` exists in `credit_ledger_entries`
- **Returns**: `{ success, paymentIntent?, error? }`

#### `findByExternalId(provider, externalId)`
- **Purpose**: Resolve PaymentIntent from external provider ID
- **Use Case**: Webhook handlers to find PaymentIntent from Stripe events
- **Returns**: `PaymentIntent | null`

#### `updateStatus(id, newStatus, opts?)`
- **Purpose**: Safe status transition with validation
- **Validation**: Checks if transition is allowed per state machine
- **Idempotency**: Same status update is allowed (idempotent)
- **Returns**: `{ success, paymentIntent?, error? }`

#### `markCaptured(id, captureId?)`
- **Purpose**: Helper for capture operations
- **Transition**: `authorized` → `captured`
- **Returns**: `{ success, paymentIntent?, error? }`

#### `markRefunded(id, refundId?)`
- **Purpose**: Helper for refund operations
- **Transition**: `captured` → `refunded`
- **Returns**: `{ success, paymentIntent?, error? }`

**Code Path**: `src/lib/payments/repository.ts`

## Invariants Enforced

1. **Ledger Linkage**: Every PaymentIntent requires `credit_intent_id` (FK constraint)
2. **No Double-Capture**: Cannot capture already-captured PaymentIntent (status validation)
3. **No Double-Refund**: Cannot refund already-refunded PaymentIntent (status validation)
4. **Idempotency**: Duplicate requests with same `idempotency_key` return existing record
5. **External ID Uniqueness**: Same external payment ID cannot be recorded twice
6. **No Bypass**: Cannot create PaymentIntent without Credit Ledger entry

## Error Handling

### PaymentIntent Creation Failure
- If credit_ledger_entry creation fails → fail before Stripe call
- If PaymentIntent insert fails → fail before Stripe call
- If Stripe call fails → update PaymentIntent to `failed`, return error
- If update fails → log error (Stripe intent already created, idempotency handles retry)

### Webhook Processing Failure
- If PaymentIntent not found → log and return (idempotent, don't fail)
- If credit_intent_id missing → log error, don't process booking transition
- If status update fails → log error, but proceed with booking transition (idempotent)

## Testing

### Unit Tests
- `tests/lib/payments/repository.spec.ts`: Repository function tests
- `tests/lib/payments/double-capture-prevention.spec.ts`: Invariant enforcement tests

### Integration Tests
- `tests/api/payments.create-intent.spec.ts`: Creation flow end-to-end
- Webhook idempotency tests: Duplicate webhook handling

### Test Coverage
- Idempotent insert
- Cannot create PaymentIntent without credit_intent_id
- Duplicate external_id prevented
- Webhook duplicate events idempotent
- Double-capture/refund prevented

## Migration

**File**: `supabase/migrations/20260102165112_create_payment_intents.sql`

**Apply**: `supabase db push`

**Dependencies**: Requires `credit_ledger_entries` table (from `20260121000000_credit_ledger_schema.sql`)

## Related Documentation

- `docs/development/PAYMENT_CONSISTENCY_FIX.md`: Payment consistency fixes
- `docs/invariants/payments-refunds.md`: Payment and refund invariants
- `docs/design/credits-reconciliation-ledger.md`: Credit Ledger design
