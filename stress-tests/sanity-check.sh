#!/bin/bash
# PART 0: Sanity / Testability Check
# Verifies system is testable before stress testing

set -e

BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
VENDOR_ID="${BOOKIJI_VENDOR_TEST_ID:-}"
REQUESTER_ID="${BOOKIJI_PARTNER_ID:-test-requester-1}"

echo "=== BOOKIJI SANITY CHECK ==="
echo "BASE_URL: $BASE_URL"
echo ""

# Check 1: GET /v1/vendors/{id}/availability
echo "✓ Checking GET /v1/vendors/{id}/availability..."
if [ -z "$VENDOR_ID" ]; then
  echo "⚠️  SKIP: BOOKIJI_VENDOR_TEST_ID not set"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/v1/vendors/$VENDOR_ID/availability?startTime=$(date -u +%Y-%m-%dT%H:%M:%SZ)&endTime=$(date -u -d '+1 day' +%Y-%m-%dT%H:%M:%SZ)" \
    -H "X-Partner-API-Key: $PARTNER_API_KEY" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Availability endpoint works"
    COMPUTED_VERSION=$(echo "$BODY" | jq -r '.computedVersion // empty' 2>/dev/null || echo "")
    if [ -n "$COMPUTED_VERSION" ]; then
      echo "  ✅ computedVersion present: $COMPUTED_VERSION"
      export BOOKIJI_COMPUTED_VERSION="$COMPUTED_VERSION"
    else
      echo "  ⚠️  WARNING: computedVersion missing"
    fi
  else
    echo "  ❌ BLOCKER: Availability endpoint failed (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    exit 1
  fi
fi

echo ""

# Check 2: POST /v1/reservations
echo "✓ Checking POST /v1/reservations..."
if [ -z "$PARTNER_API_KEY" ] || [ -z "$VENDOR_ID" ]; then
  echo "⚠️  SKIP: BOOKIJI_PARTNER_API_KEY or BOOKIJI_VENDOR_TEST_ID not set"
else
  FUTURE_DATE=$(date -u -d '+2 hours' +%Y-%m-%dT%H:%M:%SZ)
  END_DATE=$(date -u -d '+3 hours' +%Y-%m-%dT%H:%M:%SZ)
  IDEMPOTENCY_KEY="sanity-check-$(date +%s)"
  
  RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    "$BASE_URL/api/v1/reservations" \
    -H "Content-Type: application/json" \
    -H "X-Partner-API-Key: $PARTNER_API_KEY" \
    -d "{
      \"vendorId\": \"$VENDOR_ID\",
      \"slotStartTime\": \"$FUTURE_DATE\",
      \"slotEndTime\": \"$END_DATE\",
      \"requesterId\": \"$REQUESTER_ID\",
      \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
    }" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "201" ]; then
    echo "  ✅ Reservation creation works"
    RESERVATION_ID=$(echo "$BODY" | jq -r '.reservationId // empty' 2>/dev/null || echo "")
    EXPIRES_AT=$(echo "$BODY" | jq -r '.expiresAt // empty' 2>/dev/null || echo "")
    STATE=$(echo "$BODY" | jq -r '.state // empty' 2>/dev/null || echo "")
    
    if [ -n "$RESERVATION_ID" ]; then
      echo "  ✅ reservationId present: $RESERVATION_ID"
      export SANITY_RESERVATION_ID="$RESERVATION_ID"
    else
      echo "  ❌ BLOCKER: reservationId missing"
      exit 1
    fi
    
    if [ -n "$EXPIRES_AT" ]; then
      echo "  ✅ expiresAt present: $EXPIRES_AT"
    else
      echo "  ❌ BLOCKER: expiresAt missing"
      exit 1
    fi
    
    if [ -n "$STATE" ]; then
      echo "  ✅ state present: $STATE"
    else
      echo "  ⚠️  WARNING: state missing"
    fi
  else
    echo "  ❌ BLOCKER: Reservation creation failed (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    exit 1
  fi
fi

echo ""

# Check 3: GET /v1/reservations/{id}
echo "✓ Checking GET /v1/reservations/{id}..."
if [ -z "$PARTNER_API_KEY" ] || [ -z "$SANITY_RESERVATION_ID" ]; then
  echo "⚠️  SKIP: Reservation ID not available from previous check"
else
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
    "$BASE_URL/api/v1/reservations/$SANITY_RESERVATION_ID" \
    -H "X-Partner-API-Key: $PARTNER_API_KEY" 2>&1)
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "  ✅ Reservation retrieval works"
    STATE=$(echo "$BODY" | jq -r '.state // empty' 2>/dev/null || echo "")
    EXPIRES_AT=$(echo "$BODY" | jq -r '.expiresAt // empty' 2>/dev/null || echo "")
    
    if [ -n "$STATE" ] && [ -n "$EXPIRES_AT" ]; then
      echo "  ✅ Reservation state observable: $STATE"
      echo "  ✅ Expiry timestamp present: $EXPIRES_AT"
    else
      echo "  ❌ BLOCKER: Reservation state not fully observable"
      exit 1
    fi
  else
    echo "  ❌ BLOCKER: Reservation retrieval failed (HTTP $HTTP_CODE)"
    echo "  Response: $BODY"
    exit 1
  fi
fi

echo ""
echo "=== SANITY CHECK PASSED ==="
echo "System is testable. Proceeding with stress tests..."
