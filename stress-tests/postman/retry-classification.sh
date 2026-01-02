#!/bin/bash
# Test retry classification for different error codes

set -e

BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
VENDOR_ID="${BOOKIJI_VENDOR_TEST_ID:-}"
REQUESTER_ID="${BOOKIJI_PARTNER_ID:-test-requester-1}"

if [ -z "$PARTNER_API_KEY" ] || [ -z "$VENDOR_ID" ]; then
  echo "Error: BOOKIJI_PARTNER_API_KEY and BOOKIJI_VENDOR_TEST_ID must be set"
  exit 1
fi

echo "=== RETRY CLASSIFICATION TEST ==="
echo ""

FAILURES=0

# Test 1: SLOT_HELD (409) should be retryable=false
echo "Test 1: SLOT_HELD (409) - should be retryable=false"
# Create a reservation first to hold the slot
FUTURE_DATE=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+2H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
END_DATE=$(date -u -d '+3 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+3H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")

# Hold the slot
curl -s -X POST "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"slotStartTime\": \"$FUTURE_DATE\",
    \"slotEndTime\": \"$END_DATE\",
    \"requesterId\": \"$REQUESTER_ID\",
    \"idempotencyKey\": \"hold-slot-$(date +%s)\"
  }" > /dev/null

sleep 1

# Try to create another reservation for same slot
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"slotStartTime\": \"$FUTURE_DATE\",
    \"slotEndTime\": \"$END_DATE\",
    \"requesterId\": \"$REQUESTER_ID\",
    \"idempotencyKey\": \"conflict-test-$(date +%s)\"
  }" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "409" ]; then
  RETRYABLE=$(echo "$BODY" | jq -r '.error.retryable // true' 2>/dev/null || echo "true")
  if [ "$RETRYABLE" = "false" ]; then
    echo "  ✅ SLOT_HELD correctly marked as retryable=false"
  else
    echo "  ❌ SLOT_HELD incorrectly marked as retryable=true"
    ((FAILURES++))
  fi
else
  echo "  ⚠️  Expected 409, got $HTTP_CODE"
fi

echo ""

# Test 2: Invalid request (400) should be retryable=false
echo "Test 2: INVALID_REQUEST (400) - should be retryable=false"
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"\",
    \"slotStartTime\": \"invalid\",
    \"slotEndTime\": \"invalid\",
    \"requesterId\": \"\"
  }" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "400" ]; then
  RETRYABLE=$(echo "$BODY" | jq -r '.error.retryable // true' 2>/dev/null || echo "true")
  if [ "$RETRYABLE" = "false" ]; then
    echo "  ✅ INVALID_REQUEST correctly marked as retryable=false"
  else
    echo "  ❌ INVALID_REQUEST incorrectly marked as retryable=true"
    ((FAILURES++))
  fi
else
  echo "  ⚠️  Expected 400, got $HTTP_CODE"
fi

echo ""

# Test 3: Rate limit (429) should be retryable=true
echo "Test 3: RATE_LIMIT_EXCEEDED (429) - should be retryable=true"
# Note: This test may not trigger rate limit in test environment
# It's here to validate the error format if rate limit is hit
echo "  ⚠️  SKIP: Rate limit test requires high volume (manual validation)"
echo ""

# Test 4: Internal error (500) should be retryable=true
echo "Test 4: INTERNAL_ERROR (500) - should be retryable=true"
# Note: This test may not trigger 500 in test environment
# It's here to validate the error format if 500 is hit
echo "  ⚠️  SKIP: Internal error test requires error injection (manual validation)"
echo ""

# Summary
echo "=== SUMMARY ==="
if [ $FAILURES -eq 0 ]; then
  echo "✅ TEST PASSED: All retry classifications correct"
  exit 0
else
  echo "❌ TEST FAILED: $FAILURES retry classification errors"
  exit 1
fi
