#!/bin/bash
# Run all stress tests and generate report

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${STRESS_TEST_RESULTS_DIR:-./stress-test-results-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$RESULTS_DIR"

echo "=== BOOKIJI COMPREHENSIVE STRESS TEST ==="
echo "Results directory: $RESULTS_DIR"
echo ""

# Phase 0: Sanity Check
echo "PHASE 0: Sanity Check"
echo "===================="
if bash "$SCRIPT_DIR/sanity-check.sh" > "$RESULTS_DIR/sanity-check.log" 2>&1; then
  echo "✅ Sanity check passed"
else
  echo "❌ Sanity check failed - stopping tests"
  echo "See $RESULTS_DIR/sanity-check.log for details"
  exit 1
fi
echo ""

# Phase 1: Postman/Newman Tests
echo "PHASE 1: Postman/Newman Tests"
echo "============================="
if bash "$SCRIPT_DIR/postman/run-all.sh" > "$RESULTS_DIR/postman.log" 2>&1; then
  echo "✅ Postman tests completed"
else
  echo "⚠️  Some Postman tests failed (see log)"
fi
echo ""

# Phase 2: Playwright Tests
echo "PHASE 2: Playwright Tests"
echo "========================="
echo "⚠️  NOTE: Playwright tests require browser and may take 30+ minutes"
echo "   Skipping for now (run manually: playwright test stress-tests/playwright/)"
echo ""

# Phase 3: Chaos Tests
echo "PHASE 3: Chaos/Load Tests"
echo "========================="
cd "$SCRIPT_DIR/chaos"
for test in volume-reservations.mjs chaos-injection.mjs; do
  if [ -f "$test" ]; then
    echo "Running: $test"
    if node "$test" > "$RESULTS_DIR/$(basename $test .mjs).log" 2>&1; then
      echo "✅ $test completed"
    else
      echo "⚠️  $test failed (see log)"
    fi
  fi
done
cd - > /dev/null
echo ""

# Phase 4: Failure Choreography
echo "PHASE 4: Failure Choreography"
echo "=============================="
cd "$SCRIPT_DIR/failure-choreography"
for test in vendor-success-requester-fail.mjs; do
  if [ -f "$test" ]; then
    echo "Running: $test"
    if node "$test" > "$RESULTS_DIR/$(basename $test .mjs).log" 2>&1; then
      echo "✅ $test completed"
    else
      echo "⚠️  $test failed (see log)"
    fi
  fi
done
cd - > /dev/null
echo ""

# Phase 5: Observability
echo "PHASE 5: Observability Tests"
echo "============================="
if bash "$SCRIPT_DIR/observability/run-all.sh" > "$RESULTS_DIR/observability.log" 2>&1; then
  echo "✅ Observability tests completed"
else
  echo "⚠️  Some observability tests failed (see log)"
fi
echo ""

# Phase 6: Generate Report
echo "PHASE 6: Generate Report"
echo "========================="
if bash "$SCRIPT_DIR/generate-report.sh" "$RESULTS_DIR" "$RESULTS_DIR/report.md"; then
  echo "✅ Report generated: $RESULTS_DIR/report.md"
else
  echo "⚠️  Report generation had issues"
fi
echo ""

echo "=== STRESS TEST COMPLETE ==="
echo "Results: $RESULTS_DIR"
echo "Report: $RESULTS_DIR/report.md"
echo ""
echo "Review the report for failures and blockers."
