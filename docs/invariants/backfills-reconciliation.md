# Backfills & Reconciliation Invariants

## INV-1: Reconciliation Scripts Read-Only by Default
**Rule**: Reconciliation scripts must be read-only unless explicitly authorized.

**FAIL Condition**:
- Reconciliation script modifies data without authorization
- Script runs in production without explicit flag

**Allowed Behavior**:
- Reconciliation scripts default to read-only mode
- Data modification requires explicit `--write` flag
- Production runs require explicit authorization

**Enforcement**: 
- Runtime check: Script mode (read-only vs write)
- Environment check: Production requires explicit flag
- Static check: Reconciliation scripts have mode parameter

---

## INV-2: Reconciliation Script Idempotency
**Rule**: Reconciliation scripts must be idempotent (safe to run multiple times).

**FAIL Condition**:
- Reconciliation script run twice causes duplicate processing
- Script not idempotent causes data corruption

**Allowed Behavior**:
- Script checks existing state before processing
- Duplicate run → no-op or safe re-processing
- Idempotency key used for script execution

**Enforcement**: 
- Idempotency check in reconciliation scripts
- Database unique constraint on `(script_type, idempotency_key)`
- Runtime check before script processing

---

## INV-3: Reconciliation Script Dry-Run Mode
**Rule**: Reconciliation scripts must support dry-run mode for testing.

**FAIL Condition**:
- Reconciliation script cannot be tested without modifying data
- Dry-run mode not available

**Allowed Behavior**:
- Script supports `--dry-run` flag
- Dry-run mode shows what would be changed without modifying data
- Dry-run output can be reviewed before actual run

**Enforcement**: 
- Dry-run mode in reconciliation scripts
- Runtime check: Dry-run mode prevents data modification
- Static check: All reconciliation scripts support dry-run

---

## INV-4: Reconciliation Script Audit Trail
**Rule**: All reconciliation script executions must be logged.

**FAIL Condition**:
- Reconciliation script execution not logged
- Missing script execution details in audit log

**Allowed Behavior**:
- Script execution → audit log insert
- Audit log includes: `script_type`, `started_at`, `completed_at`, `records_processed`, `status`, `error`

**Enforcement**: 
- Audit log insert in reconciliation scripts
- Database reconciliation audit log table
- Runtime assertion: Audit log must be created

---

## INV-5: Reconciliation Script Batch Processing
**Rule**: Reconciliation scripts must process data in batches to prevent system overload.

**FAIL Condition**:
- Script processes all data at once causes system overload
- Large dataset causes script timeout

**Allowed Behavior**:
- Script processes data in batches (e.g., 1000 records per batch)
- Batch size configurable
- Progress tracking and resumability

**Enforcement**: 
- Batch processing in reconciliation scripts
- Batch size configuration
- Progress tracking and checkpointing

---

## INV-6: Reconciliation Script Error Handling
**Rule**: Reconciliation script errors must not cause silent failures.

**FAIL Condition**:
- Script error not logged
- Error causes partial data update
- Silent failure causes data inconsistency

**Allowed Behavior**:
- Script error → error logged with full context
- Partial updates rolled back on error
- Error reported to monitoring

**Enforcement**: 
- Error handling in reconciliation scripts
- Transaction rollback on error
- Error logging and monitoring

---

## INV-7: Reconciliation Script Validation
**Rule**: Reconciliation scripts must validate data before processing.

**FAIL Condition**:
- Invalid data causes script to fail or corrupt data
- Data validation bypassed

**Allowed Behavior**:
- Data validation before processing
- Invalid data → error logged, skipped or failed
- Validation rules documented

**Enforcement**: 
- Data validation in reconciliation scripts
- Runtime check: Validation before processing
- Static check: All reconciliation scripts validate data























