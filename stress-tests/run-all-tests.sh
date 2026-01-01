#!/bin/bash
# Master script to run all stress tests

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
VENDOR_ID=${VENDOR_ID:-""}
REQUESTER_ID=${REQUESTER_ID:-""}
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-""}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}

REPORT_DIR="stress-test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REPORT_DIR"

echo "=========================================="
echo "BOOKIJI STRESS TEST EXECUTION"
echo "=========================================="
echo "Report Directory: $REPORT_DIR"
echo ""

# Check prerequisites
if [ -z "$PARTNER_API_KEY" ]; then
  echo "⚠️  Warning: PARTNER_API_KEY not set"
fi

if [ -z "$VENDOR_ID" ] || [ -z "$REQUESTER_ID" ]; then
  echo "⚠️  Warning: VENDOR_ID or REQUESTER_ID not set"
fi

echo ""
echo "=========================================="
echo "PART 1: POSTMAN/NEWMAN - API & IDEMPOTENCY"
echo "=========================================="
echo ""

# Test 1.1: Concurrent reservations
echo "Test 1.1: Concurrent Reservations..."
if [ -n "$PARTNER_API_KEY" ] && [ -n "$VENDOR_ID" ] && [ -n "$REQUESTER_ID" ]; then
  bash stress-tests/postman/run-concurrent-reservations.sh > "$REPORT_DIR/1.1-concurrent-reservations.log" 2>&1
  CONCURRENT_RESULT=$?
  if [ $CONCURRENT_RESULT -eq 0 ]; then
    echo "✅ PASSED"
  else
    echo "❌ FAILED"
  fi
else
  echo "⚠️  SKIPPED (missing credentials)"
  CONCURRENT_RESULT=0
fi

echo ""

# Test 1.2: Idempotency replay
echo "Test 1.2: Idempotency Replay..."
if [ -n "$PARTNER_API_KEY" ] && [ -n "$VENDOR_ID" ] && [ -n "$REQUESTER_ID" ]; then
  bash stress-tests/postman/idempotency-replay.sh > "$REPORT_DIR/1.2-idempotency-replay.log" 2>&1
  IDEMPOTENCY_RESULT=$?
  if [ $IDEMPOTENCY_RESULT -eq 0 ]; then
    echo "✅ PASSED"
  else
    echo "❌ FAILED"
  fi
else
  echo "⚠️  SKIPPED (missing credentials)"
  IDEMPOTENCY_RESULT=0
fi

echo ""

echo "=========================================="
echo "PART 2: PLAYWRIGHT - TIME & HUMAN LATENCY"
echo "=========================================="
echo ""

echo "Test 2.1: Vendor Confirmation Delay..."
if command -v pnpm &> /dev/null && pnpm exec playwright --version &> /dev/null; then
  pnpm exec playwright test stress-tests/playwright/vendor-confirmation-delay.spec.ts > "$REPORT_DIR/2.1-vendor-confirmation-delay.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Playwright not installed)"
fi

echo ""

echo "Test 2.2: Requester Authorization Delay..."
if command -v pnpm &> /dev/null && pnpm exec playwright --version &> /dev/null; then
  pnpm exec playwright test stress-tests/playwright/requester-auth-delay.spec.ts > "$REPORT_DIR/2.2-requester-auth-delay.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Playwright not installed)"
fi

echo ""

echo "Test 2.3: Idle Reservation Expiry..."
if command -v pnpm &> /dev/null && pnpm exec playwright --version &> /dev/null; then
  pnpm exec playwright test stress-tests/playwright/idle-expiry.spec.ts > "$REPORT_DIR/2.3-idle-expiry.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Playwright not installed)"
fi

echo ""

echo "=========================================="
echo "PART 3: CHAOS / LOAD TESTING"
echo "=========================================="
echo ""

echo "Test 3.1: Volume Reservations..."
if command -v node &> /dev/null; then
  node stress-tests/chaos/volume-reservations.mjs > "$REPORT_DIR/3.1-volume-reservations.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "Test 3.2: Stripe Failures..."
if command -v node &> /dev/null && [ -n "$STRIPE_SECRET_KEY" ]; then
  node stress-tests/chaos/stripe-failures.mjs > "$REPORT_DIR/3.2-stripe-failures.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed or STRIPE_SECRET_KEY not set)"
fi

echo ""

echo "Test 3.3: Worker Crashes..."
if command -v node &> /dev/null; then
  node stress-tests/chaos/worker-crashes.mjs > "$REPORT_DIR/3.3-worker-crashes.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "Test 3.4: Repair Loop..."
if command -v node &> /dev/null; then
  node stress-tests/chaos/repair-loop.mjs > "$REPORT_DIR/3.4-repair-loop.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "=========================================="
echo "PART 4: FAILURE CHOREOGRAPHY"
echo "=========================================="
echo ""

echo "Test 4.1: Vendor Success → Requester Fail..."
if command -v node &> /dev/null; then
  node stress-tests/failure-choreography/vendor-success-requester-fail.mjs > "$REPORT_DIR/4.1-vendor-success-requester-fail.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "Test 4.2: Requester Success → Vendor Fail..."
if command -v node &> /dev/null; then
  node stress-tests/failure-choreography/requester-success-vendor-fail.mjs > "$REPORT_DIR/4.2-requester-success-vendor-fail.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "Test 4.3: Availability Revalidation Fail..."
if command -v node &> /dev/null; then
  node stress-tests/failure-choreography/availability-revalidation-fail.mjs > "$REPORT_DIR/4.3-availability-revalidation-fail.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "Test 4.4: Crash Between Capture and Commit..."
if command -v node &> /dev/null; then
  node stress-tests/failure-choreography/crash-between-capture-commit.mjs > "$REPORT_DIR/4.4-crash-between-capture-commit.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed)"
fi

echo ""

echo "=========================================="
echo "PART 5: OBSERVABILITY"
echo "=========================================="
echo ""

echo "Test 5.1: In-Flight Reservations..."
bash stress-tests/observability/in-flight-reservations.sh > "$REPORT_DIR/5.1-in-flight-reservations.log" 2>&1 || true
echo "✅ Test executed (check log for results)"

echo ""

echo "Test 5.2: Stuck Authorizations..."
bash stress-tests/observability/stuck-authorizations.sh > "$REPORT_DIR/5.2-stuck-authorizations.log" 2>&1 || true
echo "✅ Test executed (check log for results)"

echo ""

echo "Test 5.3: Stripe Reconciliation..."
if command -v node &> /dev/null && [ -n "$STRIPE_SECRET_KEY" ]; then
  node stress-tests/observability/stripe-reconciliation.mjs > "$REPORT_DIR/5.3-stripe-reconciliation.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (Node.js not installed or STRIPE_SECRET_KEY not set)"
fi

echo ""

echo "Test 5.4: Lifecycle Reconstruction..."
if [ -n "$1" ]; then
  bash stress-tests/observability/lifecycle-reconstruction.sh "$1" > "$REPORT_DIR/5.4-lifecycle-reconstruction.log" 2>&1 || true
  echo "✅ Test executed (check log for results)"
else
  echo "⚠️  SKIPPED (reservation_id not provided)"
fi

echo ""

echo "=========================================="
echo "TEST EXECUTION COMPLETE"
echo "=========================================="
echo ""
echo "Results saved to: $REPORT_DIR"
echo ""
echo "Review logs for detailed results and failures."
echo "Generate summary report with:"
echo "  bash stress-tests/generate-report.sh $REPORT_DIR"
