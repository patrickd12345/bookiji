# Background Jobs & Cron Invariants

## INV-1: Idempotent Job Execution
**Rule**: Background jobs must be idempotent (safe to run multiple times).

**FAIL Condition**:
- Job run twice causes duplicate processing
- Job not idempotent causes data corruption

**Allowed Behavior**:
- Job checks existing state before processing
- Duplicate job run → no-op or safe re-processing
- Idempotency key used for job execution

**Enforcement**: 
- Idempotency check in job handlers
- Database unique constraint on `(job_type, idempotency_key)`
- Runtime check before job processing

---

## INV-2: Job Failure Visibility
**Rule**: Job failures must be logged and visible, never silent.

**FAIL Condition**:
- Job failure not logged
- Job failure not reported to monitoring
- Silent job failure causes data inconsistency

**Allowed Behavior**:
- Job failure → error log with full context
- Job failure → monitoring alert
- Job failure → retry or manual intervention

**Enforcement**: 
- Error logging in all job handlers
- Monitoring integration for job failures
- Job status tracked in database

---

## INV-3: Hold Expiry Reconciliation
**Rule**: Expired holds must be cancelled and slots released within reconciliation window.

**FAIL Condition**:
- Expired hold (`hold_expires_at < NOW()`) not cancelled
- Expired hold cancellation job not running
- Slot not released after hold expiry

**Allowed Behavior**:
- Cron job `/api/cron/cancel-expired-holds` runs regularly
- Job finds expired holds and cancels them
- Cancellation releases slot and updates booking state

**Enforcement**: 
- Cron job must run at least every `hold_timeout_minutes`
- Job queries expired holds efficiently
- Job updates booking state and releases slots

---

## INV-4: No Concurrent Job Execution
**Rule**: Same job type must not run concurrently (prevents race conditions).

**FAIL Condition**:
- Two instances of same job run simultaneously
- Concurrent job execution causes data corruption

**Allowed Behavior**:
- Job acquires lock before execution
- Lock released after job completion
- Concurrent job attempts → error or wait

**Enforcement**: 
- Database advisory lock or job queue with locking
- Runtime check: Job already running → skip or error
- Job status tracked in database

---

## INV-5: Job Timeout Handling
**Rule**: Long-running jobs must have timeout and cleanup.

**FAIL Condition**:
- Job runs indefinitely
- Job timeout not handled
- Job cleanup not performed on timeout

**Allowed Behavior**:
- Job has maximum execution time
- Timeout → job marked as failed, cleanup performed
- Long-running jobs split into smaller chunks

**Enforcement**: 
- Timeout configuration in job handlers
- Timeout handling and cleanup logic
- Monitoring for job timeouts

---

## INV-6: Job Retry Logic
**Rule**: Failed jobs must have retry logic with exponential backoff.

**FAIL Condition**:
- Job failure causes permanent failure (no retry)
- Retry logic causes infinite retry loop
- Retry without backoff causes system overload

**Allowed Behavior**:
- Job failure → retry with exponential backoff
- Maximum retry count prevents infinite retries
- Retry only for transient errors (not permanent failures)

**Enforcement**: 
- Retry logic in job handlers
- Exponential backoff implementation
- Maximum retry count configuration

---

## INV-7: Job Audit Trail
**Rule**: All job executions must be logged for audit and debugging.

**FAIL Condition**:
- Job execution not logged
- Missing job execution details in audit log

**Allowed Behavior**:
- Job execution → audit log insert
- Audit log includes: `job_type`, `started_at`, `completed_at`, `status`, `error`

**Enforcement**: 
- Audit log insert in job handlers
- Database job audit log table
- Runtime assertion: Audit log must be created





