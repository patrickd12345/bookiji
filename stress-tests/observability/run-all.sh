#!/bin/bash
# Run all observability tests

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
RESULTS_DIR="${STRESS_TEST_RESULTS_DIR:-./results-$(date +%Y%m%d-%H%M%S)}"
mkdir -p "$RESULTS_DIR"

echo "=== RUNNING ALL OBSERVABILITY TESTS ==="
echo "Results directory: $RESULTS_DIR"
echo ""

TESTS=(
  "in-flight-reservations"
  "stuck-authorizations"
  "stripe-reconciliation"
)

FAILURES=0

for test in "${TESTS[@]}"; do
  echo "Running: $test"
  echo "---"
  
  if [ "$test" = "stripe-reconciliation" ]; then
    if node "$SCRIPT_DIR/$test.mjs" > "$RESULTS_DIR/$test.log" 2>&1; then
      echo "✅ $test: PASSED"
    else
      echo "❌ $test: FAILED"
      ((FAILURES++))
    fi
  else
    if bash "$SCRIPT_DIR/$test.sh" > "$RESULTS_DIR/$test.log" 2>&1; then
      echo "✅ $test: PASSED"
    else
      echo "❌ $test: FAILED"
      ((FAILURES++))
    fi
  fi
  
  echo ""
done

echo "=== SUMMARY ==="
echo "Total tests: ${#TESTS[@]}"
echo "Passed: $((${#TESTS[@]} - FAILURES))"
echo "Failed: $FAILURES"
echo ""
echo "Results saved to: $RESULTS_DIR"

if [ $FAILURES -eq 0 ]; then
  exit 0
else
  exit 1
fi
