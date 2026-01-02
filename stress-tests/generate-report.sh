#!/bin/bash
# Generate comprehensive stress test report

set -e

RESULTS_DIR="${1:-}"
REPORT_FILE="${2:-stress-test-report-$(date +%Y%m%d-%H%M%S).md}"

if [ -z "$RESULTS_DIR" ]; then
  echo "Usage: $0 <results-directory> [report-file]"
  echo ""
  echo "Example:"
  echo "  $0 ./results-20250127-120000"
  exit 1
fi

if [ ! -d "$RESULTS_DIR" ]; then
  echo "Error: Results directory not found: $RESULTS_DIR"
  exit 1
fi

echo "=== GENERATING STRESS TEST REPORT ==="
echo "Results directory: $RESULTS_DIR"
echo "Report file: $REPORT_FILE"
echo ""

# Initialize report
cat > "$REPORT_FILE" <<EOF
# BOOKIJI Stress Test Report

**Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
**Results Directory:** $RESULTS_DIR

---

## Executive Summary

This report summarizes the results of comprehensive stress testing performed on the BOOKIJI system.

### Test Execution

- **Start Time:** $(find "$RESULTS_DIR" -name "*.log" -type f -exec stat -c %y {} \; 2>/dev/null | head -1 | cut -d' ' -f1-2 || echo "Unknown")
- **End Time:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
- **Duration:** $(echo "Calculated from logs" || echo "Unknown")

---

## PART 0: Sanity Check

EOF

# Parse sanity check results
if [ -f "$RESULTS_DIR/sanity-check.log" ]; then
  if grep -q "SANITY CHECK PASSED" "$RESULTS_DIR/sanity-check.log"; then
    echo "✅ **PASSED**" >> "$REPORT_FILE"
  else
    echo "❌ **FAILED**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Errors:" >> "$REPORT_FILE"
    grep -i "error\|failed\|blocker" "$RESULTS_DIR/sanity-check.log" | head -10 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
  fi
else
  echo "⚠️  **NOT RUN**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

---

## PART 1: Postman/Newman Tests

EOF

# Parse Postman test results
for test in concurrent-reservations idempotency-replay stale-version retry-classification; do
  if [ -f "$RESULTS_DIR/$test.log" ]; then
    echo "### Test 1.X: $test" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if grep -q "TEST PASSED\|✅" "$RESULTS_DIR/$test.log"; then
      echo "✅ **PASSED**" >> "$REPORT_FILE"
    elif grep -q "TEST FAILED\|❌" "$RESULTS_DIR/$test.log"; then
      echo "❌ **FAILED**" >> "$REPORT_FILE"
      echo "" >> "$REPORT_FILE"
      echo "Errors:" >> "$REPORT_FILE"
      grep -i "error\|failed\|blocker" "$RESULTS_DIR/$test.log" | head -5 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
    else
      echo "⚠️  **PARTIAL**" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
  fi
done

cat >> "$REPORT_FILE" <<EOF

---

## PART 2: Playwright Tests

EOF

# Parse Playwright test results
if [ -f "$RESULTS_DIR/playwright.log" ]; then
  PASSED=$(grep -c "passed\|✅" "$RESULTS_DIR/playwright.log" 2>/dev/null || echo "0")
  FAILED=$(grep -c "failed\|❌" "$RESULTS_DIR/playwright.log" 2>/dev/null || echo "0")
  
  echo "**Results:** $PASSED passed, $FAILED failed" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  
  if [ "$FAILED" -eq 0 ]; then
    echo "✅ **ALL TESTS PASSED**" >> "$REPORT_FILE"
  else
    echo "❌ **SOME TESTS FAILED**" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    echo "Failed tests:" >> "$REPORT_FILE"
    grep -i "failed\|❌" "$RESULTS_DIR/playwright.log" | head -10 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
  fi
else
  echo "⚠️  **NOT RUN**" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

---

## PART 3: Chaos/Load Tests

EOF

# Parse chaos test results
for test in volume-reservations chaos-injection stripe-failures worker-crashes repair-loop; do
  if [ -f "$RESULTS_DIR/$test.log" ]; then
    echo "### Test 3.X: $test" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if grep -q "TEST PASSED\|✅" "$RESULTS_DIR/$test.log"; then
      echo "✅ **PASSED**" >> "$REPORT_FILE"
    elif grep -q "TEST FAILED\|❌" "$RESULTS_DIR/$test.log"; then
      echo "❌ **FAILED**" >> "$REPORT_FILE"
      echo "" >> "$REPORT_FILE"
      echo "Errors:" >> "$REPORT_FILE"
      grep -i "error\|failed\|blocker" "$RESULTS_DIR/$test.log" | head -5 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
    else
      echo "⚠️  **PARTIAL**" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
  fi
done

cat >> "$REPORT_FILE" <<EOF

---

## PART 4: Failure Choreography

EOF

# Parse failure choreography results
for test in vendor-success-requester-fail requester-success-vendor-fail availability-revalidation-fail crash-between-capture-commit; do
  if [ -f "$RESULTS_DIR/$test.log" ]; then
    echo "### Test 4.X: $test" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if grep -q "TEST PASSED\|✅" "$RESULTS_DIR/$test.log"; then
      echo "✅ **PASSED**" >> "$REPORT_FILE"
    elif grep -q "TEST FAILED\|❌" "$RESULTS_DIR/$test.log"; then
      echo "❌ **FAILED**" >> "$REPORT_FILE"
      echo "" >> "$REPORT_FILE"
      echo "Errors:" >> "$REPORT_FILE"
      grep -i "error\|failed\|blocker" "$RESULTS_DIR/$test.log" | head -5 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
    else
      echo "⚠️  **PARTIAL**" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
  fi
done

cat >> "$REPORT_FILE" <<EOF

---

## PART 5: Observability

EOF

# Parse observability results
for test in in-flight-reservations stuck-authorizations stripe-reconciliation; do
  if [ -f "$RESULTS_DIR/$test.log" ]; then
    echo "### Test 5.X: $test" >> "$REPORT_FILE"
    echo "" >> "$REPORT_FILE"
    
    if grep -q "TEST PASSED\|✅" "$RESULTS_DIR/$test.log"; then
      echo "✅ **PASSED**" >> "$REPORT_FILE"
    elif grep -q "TEST FAILED\|❌" "$RESULTS_DIR/$test.log"; then
      echo "❌ **FAILED**" >> "$REPORT_FILE"
      echo "" >> "$REPORT_FILE"
      echo "Errors:" >> "$REPORT_FILE"
      grep -i "error\|failed\|blocker" "$RESULTS_DIR/$test.log" | head -5 >> "$REPORT_FILE" || echo "  (See log file for details)" >> "$REPORT_FILE"
    else
      echo "⚠️  **PARTIAL**" >> "$REPORT_FILE"
    fi
    echo "" >> "$REPORT_FILE"
  fi
done

cat >> "$REPORT_FILE" <<EOF

---

## Failures Found

### BLOCKER Severity

EOF

# Extract blockers
grep -r -i "blocker\|double booking\|money leakage\|slot permanently blocked\|payment idempotency broken" "$RESULTS_DIR"/*.log 2>/dev/null | head -20 >> "$REPORT_FILE" || echo "None found" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

### HIGH Severity

EOF

# Extract high severity
grep -r -i "high\|retry logic broken\|compensation not executed\|performance degradation\|state machine error" "$RESULTS_DIR"/*.log 2>/dev/null | head -20 >> "$REPORT_FILE" || echo "None found" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

### MEDIUM Severity

EOF

# Extract medium severity
grep -r -i "medium\|api contract violation\|observability gap\|edge case\|timing issue" "$RESULTS_DIR"/*.log 2>/dev/null | head -20 >> "$REPORT_FILE" || echo "None found" >> "$REPORT_FILE"

cat >> "$REPORT_FILE" <<EOF

---

## Final Verdict

EOF

# Calculate verdict
BLOCKERS=$(grep -r -i "blocker\|double booking\|money leakage" "$RESULTS_DIR"/*.log 2>/dev/null | wc -l || echo "0")
HIGH=$(grep -r -i "high severity\|retry logic broken\|compensation not executed" "$RESULTS_DIR"/*.log 2>/dev/null | wc -l || echo "0")

if [ "$BLOCKERS" -eq 0 ] && [ "$HIGH" -lt 3 ]; then
  echo "### ✅ SAFE FOR PILOT" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- No blockers found" >> "$REPORT_FILE"
  echo "- Less than 3 HIGH severity issues" >> "$REPORT_FILE"
elif [ "$BLOCKERS" -eq 0 ] && [ "$HIGH" -lt 5 ]; then
  echo "### ⚠️  SAFE FOR LIMITED PARTNERS" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- No blockers found" >> "$REPORT_FILE"
  echo "- Less than 5 HIGH severity issues" >> "$REPORT_FILE"
else
  echo "### ❌ NOT SAFE WITHOUT FIXES" >> "$REPORT_FILE"
  echo "" >> "$REPORT_FILE"
  echo "- Blockers found: $BLOCKERS" >> "$REPORT_FILE"
  echo "- HIGH severity issues: $HIGH" >> "$REPORT_FILE"
fi

cat >> "$REPORT_FILE" <<EOF

---

## Evidence References

All test logs are available in: \`$RESULTS_DIR\`

Key files:
- \`sanity-check.log\` - Sanity check results
- \`concurrent-reservations.log\` - Concurrent reservation test
- \`idempotency-replay.log\` - Idempotency test
- \`chaos-injection.log\` - Chaos injection test
- \`stripe-reconciliation.log\` - Stripe reconciliation test

---

**Report Generated:** $(date -u +"%Y-%m-%d %H:%M:%S UTC")
EOF

echo "✅ Report generated: $REPORT_FILE"
echo ""
echo "Summary:"
echo "  Blockers: $BLOCKERS"
echo "  High severity: $HIGH"
