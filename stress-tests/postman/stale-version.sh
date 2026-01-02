#!/bin/bash
# Test stale computed_version handling

set -e

BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
VENDOR_ID="${BOOKIJI_VENDOR_TEST_ID:-}"
REQUESTER_ID="${BOOKIJI_PARTNER_ID:-test-requester-1}"

if [ -z "$PARTNER_API_KEY" ] || [ -z "$VENDOR_ID" ]; then
  echo "Error: BOOKIJI_PARTNER_API_KEY and BOOKIJI_VENDOR_TEST_ID must be set"
  exit 1
fi

echo "=== STALE VERSION TEST ==="
echo ""

# Step 1: Get availability and computedVersion
echo "Step 1: Getting availability..."
START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)
END_TIME=$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)

RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/v1/vendors/$VENDOR_ID/availability?startTime=$START_TIME&endTime=$END_TIME" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ TEST FAILED: Availability endpoint failed (HTTP $HTTP_CODE)"
  exit 1
fi

COMPUTED_VERSION=$(echo "$BODY" | jq -r '.computedVersion // empty' 2>/dev/null || echo "")

if [ -z "$COMPUTED_VERSION" ]; then
  echo "❌ TEST FAILED: computedVersion not found in availability response"
  exit 1
fi

echo "✓ Got computedVersion: $COMPUTED_VERSION"
echo ""

# Step 2: Wait 5 seconds (simulate stale version)
echo "Step 2: Waiting 5 seconds to simulate stale version..."
sleep 5
echo ""

# Step 3: Try to create reservation with stale version
echo "Step 3: Creating reservation with stale computedVersion..."
FUTURE_DATE=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+2H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")
END_DATE=$(date -u -d '+3 hours' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v+3H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")

RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"slotStartTime\": \"$FUTURE_DATE\",
    \"slotEndTime\": \"$END_DATE\",
    \"requesterId\": \"$REQUESTER_ID\",
    \"computedVersion\": \"$COMPUTED_VERSION\"
  }" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

echo "Response: HTTP $HTTP_CODE"
echo "Body: $BODY"
echo ""

# Validate response
if [ "$HTTP_CODE" = "412" ]; then
  ERROR_CODE=$(echo "$BODY" | jq -r '.error.code // empty' 2>/dev/null || echo "")
  RETRYABLE=$(echo "$BODY" | jq -r '.error.retryable // false' 2>/dev/null || echo "false")
  
  if [ "$ERROR_CODE" = "AVAILABILITY_CHANGED" ] || [ "$ERROR_CODE" = "PRECONDITION_FAILED" ]; then
    if [ "$RETRYABLE" = "true" ]; then
      echo "✅ TEST PASSED: Stale version correctly rejected with retryable=true"
      exit 0
    else
      echo "⚠️  TEST PARTIAL: Stale version rejected but retryable=false (expected true)"
      exit 1
    fi
  else
    echo "⚠️  TEST PARTIAL: Wrong error code: $ERROR_CODE (expected AVAILABILITY_CHANGED)"
    exit 1
  fi
elif [ "$HTTP_CODE" = "201" ]; then
  echo "❌ TEST FAILED: Request succeeded with stale version - version check broken!"
  exit 1
else
  echo "⚠️  TEST UNEXPECTED: HTTP $HTTP_CODE (expected 412)"
  exit 1
fi
