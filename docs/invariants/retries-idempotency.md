# Retries & Idempotency Invariants

## INV-1: Idempotency Key Required
**Rule**: All state-changing operations must use idempotency keys.

**FAIL Condition**:
- State-changing operation without idempotency key
- Duplicate operation causes duplicate effects

**Allowed Behavior**:
- Idempotency key required for booking creation, payment processing, refunds
- Idempotency key stored in database
- Duplicate idempotency key → no-op or error

**Enforcement**: 
- Runtime check: Idempotency key required in state-changing endpoints
- Database unique constraint on `(operation_type, idempotency_key)`
- Static check: All state-changing endpoints require idempotency key

---

## INV-2: Idempotency Key Validation
**Rule**: Idempotency keys must be validated before processing.

**FAIL Condition**:
- Invalid idempotency key format accepted
- Idempotency key validation bypassed

**Allowed Behavior**:
- Idempotency key format validated (UUID or string)
- Invalid format → 400 error
- Idempotency key length and format checked

**Enforcement**: 
- Input validation in endpoints
- Runtime check: Idempotency key validation
- Static check: All endpoints validate idempotency key format

---

## INV-3: Idempotent Operation Processing
**Rule**: Operations with same idempotency key must return same result.

**FAIL Condition**:
- Same idempotency key returns different results
- Idempotent operation not properly implemented

**Allowed Behavior**:
- Check existing operation result for idempotency key
- Duplicate request → return existing result (no re-processing)
- Idempotency key stored with operation result

**Enforcement**: 
- Idempotency check in operation handlers
- Database query for existing idempotency key
- Runtime check: Return existing result for duplicate idempotency key

---

## INV-4: Retry with Exponential Backoff
**Rule**: Retries must use exponential backoff to prevent system overload.

**FAIL Condition**:
- Retries without backoff cause system overload
- Retry logic causes infinite retry loop
- Retry without maximum count

**Allowed Behavior**:
- Retry with exponential backoff (1s, 2s, 4s, 8s, ...)
- Maximum retry count prevents infinite retries
- Retry only for transient errors (not permanent failures)

**Enforcement**: 
- Retry logic with exponential backoff
- Maximum retry count configuration
- Runtime check: Retry count not exceeded

---

## INV-5: Retry Only for Transient Errors
**Rule**: Retries must only occur for transient errors, not permanent failures.

**FAIL Condition**:
- Permanent failure retried indefinitely
- Retry logic retries non-retryable errors

**Allowed Behavior**:
- Retry only for transient errors (5xx, network errors)
- Permanent errors (4xx, validation errors) not retried
- Error classification determines retry behavior

**Enforcement**: 
- Error classification in retry logic
- Runtime check: Only transient errors retried
- Static check: Retry logic classifies errors correctly

---

## INV-6: Idempotency Key Expiry
**Rule**: Idempotency keys must expire after reasonable time period.

**FAIL Condition**:
- Idempotency keys never expire
- Expired idempotency keys still used

**Allowed Behavior**:
- Idempotency keys expire after 24 hours (configurable)
- Expired keys can be reused
- Expired key cleanup job runs regularly

**Enforcement**: 
- Idempotency key expiry configuration
- Expiry check in idempotency validation
- Cleanup job for expired idempotency keys

---

## INV-7: Idempotency Key Audit Trail
**Rule**: All idempotency key usage must be logged for audit.

**FAIL Condition**:
- Idempotency key usage not logged
- Missing idempotency key details in audit log

**Allowed Behavior**:
- Idempotency key usage → audit log insert
- Audit log includes: `idempotency_key`, `operation_type`, `result`, `timestamp`

**Enforcement**: 
- Audit log insert in idempotency handlers
- Database idempotency audit log table
- Runtime assertion: Audit log must be created













