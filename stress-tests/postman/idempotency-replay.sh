#!/bin/bash
# Test idempotency key replay - same request twice

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
VENDOR_ID=${VENDOR_ID:-""}
REQUESTER_ID=${REQUESTER_ID:-""}

if [ -z "$PARTNER_API_KEY" ] || [ -z "$VENDOR_ID" ] || [ -z "$REQUESTER_ID" ]; then
  echo "Error: PARTNER_API_KEY, VENDOR_ID, and REQUESTER_ID must be set"
  exit 1
fi

FUTURE_DATE=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+2H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
END_DATE=$(date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+3H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")

PARTNER_REF="test-idempotency-$(date +%s)"
IDEMPOTENCY_KEY="idempotency-replay-test"

echo "=== IDEMPOTENCY REPLAY TEST ==="
echo "Making first request with idempotency key: $IDEMPOTENCY_KEY"
echo ""

# First request
RESPONSE1=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"slotStartTime\": \"$FUTURE_DATE\",
    \"slotEndTime\": \"$END_DATE\",
    \"requesterId\": \"$REQUESTER_ID\",
    \"partnerBookingRef\": \"$PARTNER_REF\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | sed '$d')

echo "First Request: HTTP $HTTP_CODE1"
echo "Response: $BODY1"
echo ""

# Extract reservation_id from first response
RESERVATION_ID1=$(echo "$BODY1" | grep -o '"reservationId":"[^"]*"' | cut -d'"' -f4 || echo "")

if [ "$HTTP_CODE1" != "201" ] && [ "$HTTP_CODE1" != "200" ]; then
  echo "❌ TEST FAILED: First request failed with HTTP $HTTP_CODE1"
  exit 1
fi

echo "Waiting 2 seconds before replay..."
sleep 2

# Second request (identical)
echo "Making second request with SAME idempotency key: $IDEMPOTENCY_KEY"
echo ""

RESPONSE2=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reservations" \
  -H "Content-Type: application/json" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" \
  -d "{
    \"vendorId\": \"$VENDOR_ID\",
    \"slotStartTime\": \"$FUTURE_DATE\",
    \"slotEndTime\": \"$END_DATE\",
    \"requesterId\": \"$REQUESTER_ID\",
    \"partnerBookingRef\": \"$PARTNER_REF\",
    \"idempotencyKey\": \"$IDEMPOTENCY_KEY\"
  }")

HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | sed '$d')

echo "Second Request: HTTP $HTTP_CODE2"
echo "Response: $BODY2"
echo ""

# Extract reservation_id from second response
RESERVATION_ID2=$(echo "$BODY2" | grep -o '"reservationId":"[^"]*"' | cut -d'"' -f4 || echo "")

echo "=== VALIDATION ==="
echo "First reservation_id: $RESERVATION_ID1"
echo "Second reservation_id: $RESERVATION_ID2"
echo ""

# Validate idempotency
if [ -z "$RESERVATION_ID1" ] || [ -z "$RESERVATION_ID2" ]; then
  echo "❌ TEST FAILED: Could not extract reservation IDs from responses"
  exit 1
fi

if [ "$RESERVATION_ID1" = "$RESERVATION_ID2" ]; then
  echo "✅ TEST PASSED: Same reservation_id returned (idempotency working)"
  exit 0
else
  echo "❌ TEST FAILED: Different reservation_ids returned - idempotency broken!"
  echo "   First:  $RESERVATION_ID1"
  echo "   Second: $RESERVATION_ID2"
  exit 1
fi
