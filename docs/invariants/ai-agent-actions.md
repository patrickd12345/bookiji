# AI & Agent Actions Invariants

## INV-1: AI Actions Require Explicit Authorization
**Rule**: AI/agent actions affecting production data must require explicit authorization.

**FAIL Condition**:
- AI action modifies production data without authorization
- AI action bypasses authorization checks
- Client-provided authorization used for AI actions

**Allowed Behavior**:
- AI actions require admin approval or explicit user consent
- Authorization verified server-side
- AI actions logged with authorization details

**Enforcement**: 
- Runtime check: AI action endpoints verify authorization
- RLS policies enforce authorization
- Audit log includes authorization details

---

## INV-2: AI Action Rate Limiting
**Rule**: AI actions must be rate-limited to prevent abuse.

**FAIL Condition**:
- AI actions not rate-limited
- Rate limit bypassed
- Unlimited AI actions cause system overload

**Allowed Behavior**:
- AI actions rate-limited per user/IP
- Rate limit enforced server-side
- Rate limit exceeded → 429 error

**Enforcement**: 
- Rate limiting middleware in AI action endpoints
- Database rate limit tracking
- Runtime check: Rate limit before processing

---

## INV-3: AI Action Idempotency
**Rule**: Duplicate AI action requests must not cause duplicate effects.

**FAIL Condition**:
- Same AI action processed twice causes duplicate data
- AI action not idempotent

**Allowed Behavior**:
- Idempotency key used for AI actions
- Duplicate request → no-op or error
- AI action checks existing state before processing

**Enforcement**: 
- Idempotency check in AI action handlers
- Database unique constraint on `(action_type, idempotency_key)`
- Runtime check before AI action processing

---

## INV-4: AI Action Audit Trail
**Rule**: All AI actions must be logged with full context.

**FAIL Condition**:
- AI action not logged
- Missing AI action details in audit log

**Allowed Behavior**:
- AI action → audit log insert
- Audit log includes: `action_type`, `user_id`, `input`, `output`, `timestamp`, `status`

**Enforcement**: 
- Audit log insert in AI action handlers
- Database AI action audit log table
- Runtime assertion: Audit log must be created

---

## INV-5: AI Action Input Validation
**Rule**: AI action inputs must be validated before processing.

**FAIL Condition**:
- Invalid input causes AI action to fail or corrupt data
- Input validation bypassed
- Malicious input processed by AI

**Allowed Behavior**:
- Input validation before AI processing
- Invalid input → 400 error, no AI processing
- Input sanitization for security

**Enforcement**: 
- Input validation in AI action endpoints
- Runtime check: Input validation before AI processing
- Static check: All AI endpoints validate input

---

## INV-6: AI Action Output Validation
**Rule**: AI action outputs must be validated before applying to production data.

**FAIL Condition**:
- Invalid AI output applied to production data
- AI output not validated
- Malicious AI output processed

**Allowed Behavior**:
- AI output validated before applying to data
- Invalid output → error, no data modification
- Output sanitization for security

**Enforcement**: 
- Output validation in AI action handlers
- Runtime check: Output validation before data modification
- Static check: All AI handlers validate output

---

## INV-7: AI Action Failure Handling
**Rule**: AI action failures must not cause silent data corruption.

**FAIL Condition**:
- AI action failure not handled
- Failure causes partial data update
- Silent failure causes data inconsistency

**Allowed Behavior**:
- AI action failure → error logged, no data modification
- Partial updates rolled back on failure
- Failure response returned to client

**Enforcement**: 
- Error handling in AI action handlers
- Transaction rollback on failure
- Error logging and monitoring











