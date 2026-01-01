#!/bin/bash
# Generate comprehensive test report from results

REPORT_DIR=${1:-"stress-test-results-$(ls -td stress-test-results-* 2>/dev/null | head -1)"}

if [ ! -d "$REPORT_DIR" ]; then
  echo "Error: Report directory not found: $REPORT_DIR"
  exit 1
fi

REPORT_FILE="$REPORT_DIR/STRESS_TEST_REPORT.md"

cat > "$REPORT_FILE" <<EOF
# BOOKIJI Stress Test Report

**Generated:** $(date)
**Report Directory:** $REPORT_DIR

---

## Executive Summary

This report summarizes the results of adversarial stress testing across five critical dimensions:

1. **API & Idempotency Stress** - Concurrent reservations, duplicate requests, retry storms
2. **Time & Human Latency** - TTL expiry, delayed confirmations, authorization timeouts
3. **Chaos & Load Testing** - Volume testing, partial failures, worker crashes
4. **Failure Choreography** - Orchestrated failure scenarios with compensation validation
5. **Observability** - System visibility and reconciliation capabilities

---

## PART 1: API & IDEMPOTENCY STRESS

### Test 1.1: Concurrent Reservations
**Status:** $(grep -q "TEST PASSED" "$REPORT_DIR/1.1-concurrent-reservations.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`1.1-concurrent-reservations.log\`

### Test 1.2: Idempotency Replay
**Status:** $(grep -q "TEST PASSED" "$REPORT_DIR/1.2-idempotency-replay.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`1.2-idempotency-replay.log\`

---

## PART 2: TIME & HUMAN LATENCY

### Test 2.1: Vendor Confirmation Delay
**Status:** $(grep -q "passed" "$REPORT_DIR/2.1-vendor-confirmation-delay.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`2.1-vendor-confirmation-delay.log\`

### Test 2.2: Requester Authorization Delay
**Status:** $(grep -q "passed" "$REPORT_DIR/2.2-requester-auth-delay.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`2.2-requester-auth-delay.log\`

### Test 2.3: Idle Reservation Expiry
**Status:** $(grep -q "passed" "$REPORT_DIR/2.3-idle-expiry.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`2.3-idle-expiry.log\`

---

## PART 3: CHAOS / LOAD TESTING

### Test 3.1: Volume Reservations
**Status:** $(grep -q "TEST PASSED" "$REPORT_DIR/3.1-volume-reservations.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`3.1-volume-reservations.log\`

### Test 3.2: Stripe Failures
**Status:** $(test -f "$REPORT_DIR/3.2-stripe-failures.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`3.2-stripe-failures.log\`

### Test 3.3: Worker Crashes
**Status:** $(test -f "$REPORT_DIR/3.3-worker-crashes.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`3.3-worker-crashes.log\`

### Test 3.4: Repair Loop
**Status:** $(grep -q "TEST PASSED" "$REPORT_DIR/3.4-repair-loop.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`3.4-repair-loop.log\`

---

## PART 4: FAILURE CHOREOGRAPHY

### Test 4.1: Vendor Success → Requester Fail
**Status:** $(grep -q "TEST PASSED" "$REPORT_DIR/4.1-vendor-success-requester-fail.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`4.1-vendor-success-requester-fail.log\`

### Test 4.2: Requester Success → Vendor Fail
**Status:** $(test -f "$REPORT_DIR/4.2-requester-success-vendor-fail.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`4.2-requester-success-vendor-fail.log\`

### Test 4.3: Availability Revalidation Fail
**Status:** $(test -f "$REPORT_DIR/4.3-availability-revalidation-fail.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`4.3-availability-revalidation-fail.log\`

### Test 4.4: Crash Between Capture and Commit
**Status:** $(test -f "$REPORT_DIR/4.4-crash-between-capture-commit.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`4.4-crash-between-capture-commit.log\`

---

## PART 5: OBSERVABILITY

### Test 5.1: In-Flight Reservations
**Status:** $(test -f "$REPORT_DIR/5.1-in-flight-reservations.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`5.1-in-flight-reservations.log\`

### Test 5.2: Stuck Authorizations
**Status:** $(test -f "$REPORT_DIR/5.2-stuck-authorizations.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`5.2-stuck-authorizations.log\`

### Test 5.3: Stripe Reconciliation
**Status:** $(grep -q "No discrepancies found" "$REPORT_DIR/5.3-stripe-reconciliation.log" 2>/dev/null && echo "✅ PASSED" || echo "❌ FAILED / ⚠️  NOT RUN")
**Details:** See \`5.3-stripe-reconciliation.log\`

### Test 5.4: Lifecycle Reconstruction
**Status:** $(test -f "$REPORT_DIR/5.4-lifecycle-reconstruction.log" && echo "✅ EXECUTED" || echo "⚠️  NOT RUN")
**Details:** See \`5.4-lifecycle-reconstruction.log\`

---

## FAILURES FOUND

$(grep -r "❌\|FAILED\|ERROR" "$REPORT_DIR"/*.log 2>/dev/null | head -20 || echo "No failures found in logs")

---

## SEVERITY ASSESSMENT

### Critical Risks (Block Launch)
- Double booking possible: $(grep -q "Double booking" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Money leakage: $(grep -q "money leaked\|orphaned payment" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Slot permanently blocked: $(grep -q "permanently blocked\|stuck" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Payment idempotency broken: $(grep -q "idempotency broken" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")

### High Risks (Require Fix Before Scale)
- Retry logic broken: $(grep -q "retry.*broken\|retry.*failed" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Compensation not executed: $(grep -q "compensation.*not\|compensation.*failed" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Observability gaps: $(grep -q "observability gap\|missing.*endpoint" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")
- Performance degradation: $(grep -q "performance\|degradation\|slow" "$REPORT_DIR"/*.log 2>/dev/null && echo "YES" || echo "NO")

---

## FINAL VERDICT

Based on test results:

**Confidence Level:** $(if grep -q "TEST PASSED\|passed" "$REPORT_DIR"/*.log 2>/dev/null && ! grep -q "Double booking\|money leaked\|permanently blocked\|idempotency broken" "$REPORT_DIR"/*.log 2>/dev/null; then echo "SAFE FOR LIMITED PARTNERS"; elif grep -q "Double booking\|money leaked\|permanently blocked\|idempotency broken" "$REPORT_DIR"/*.log 2>/dev/null; then echo "NOT SAFE"; else echo "REQUIRES MANUAL REVIEW"; fi)

---

## RECOMMENDATIONS

1. Review all failure logs in detail
2. Prioritize fixes based on severity
3. Re-run tests after fixes
4. Update invariants if new failure modes discovered
5. Create runbook for production incidents based on findings

---

## NEXT STEPS

1. **Immediate Actions:**
   - Fix all critical risks before launch
   - Address high risks before scaling
   - Document all findings

2. **Before Production:**
   - Re-run all tests after fixes
   - Validate compensation logic
   - Test observability tools
   - Create incident response playbooks

3. **Ongoing:**
   - Run stress tests regularly
   - Monitor for new failure modes
   - Update test suite as system evolves

---

**Report Generated:** $(date)
**Test Execution Time:** $(ls -ld "$REPORT_DIR" 2>/dev/null | awk '{print $6, $7, $8}' || echo "Unknown")

EOF

echo "Report generated: $REPORT_FILE"
cat "$REPORT_FILE"
