#!/bin/bash
# Run 20 concurrent reservation requests using Newman

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
VENDOR_ID=${VENDOR_ID:-""}
REQUESTER_ID=${REQUESTER_ID:-""}

if [ -z "$PARTNER_API_KEY" ] || [ -z "$VENDOR_ID" ] || [ -z "$REQUESTER_ID" ]; then
  echo "Error: PARTNER_API_KEY, VENDOR_ID, and REQUESTER_ID must be set"
  exit 1
fi

# Create a temporary collection file with 20 iterations
TEMP_COLLECTION=$(mktemp)
cat > "$TEMP_COLLECTION" <<EOF
{
  "info": {
    "name": "Concurrent Reservations Stress Test",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Concurrent Reservation Requests",
      "item": []
    }
  ],
  "variable": [
    {"key": "BASE_URL", "value": "$BASE_URL"},
    {"key": "PARTNER_API_KEY", "value": "$PARTNER_API_KEY"},
    {"key": "VENDOR_ID", "value": "$VENDOR_ID"},
    {"key": "REQUESTER_ID", "value": "$REQUESTER_ID"}
  ]
}
EOF

# Generate 20 requests
FUTURE_DATE=$(date -u -d "+2 hours" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+2H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")
END_DATE=$(date -u -d "+3 hours" +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date -u -v+3H +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || echo "")

if [ -z "$FUTURE_DATE" ]; then
  echo "Error: Cannot calculate future dates. Please set SLOT_START and SLOT_END manually."
  exit 1
fi

# Use curl to fire 20 concurrent requests
echo "Firing 20 concurrent POST /v1/reservations requests..."
echo "Slot: $FUTURE_DATE to $END_DATE"
echo ""

SUCCESS_COUNT=0
FAILURE_COUNT=0
CONFLICT_COUNT=0
RESULTS_FILE=$(mktemp)

for i in {1..20}; do
  PARTNER_REF="test-concurrent-$(date +%s)-$i"
  IDEMPOTENCY_KEY="idempotency-$PARTNER_REF"
  
  (
    RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/v1/reservations" \
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
    
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    BODY=$(echo "$RESPONSE" | sed '$d')
    
    echo "Request $i: HTTP $HTTP_CODE" >> "$RESULTS_FILE"
    echo "$BODY" >> "$RESULTS_FILE"
    echo "---" >> "$RESULTS_FILE"
    
    if [ "$HTTP_CODE" = "201" ]; then
      ((SUCCESS_COUNT++))
    elif [ "$HTTP_CODE" = "409" ]; then
      ((CONFLICT_COUNT++))
      ((FAILURE_COUNT++))
    else
      ((FAILURE_COUNT++))
    fi
  ) &
done

wait

echo ""
echo "=== RESULTS ==="
echo "Total Requests: 20"
echo "Success (201): $SUCCESS_COUNT"
echo "Conflict (409): $CONFLICT_COUNT"
echo "Other Failures: $((FAILURE_COUNT - CONFLICT_COUNT))"
echo ""
echo "Full results saved to: $RESULTS_FILE"
echo ""

# Validate results
if [ "$SUCCESS_COUNT" -eq 1 ] && [ "$CONFLICT_COUNT" -eq 19 ]; then
  echo "✅ TEST PASSED: Exactly 1 success, 19 conflicts as expected"
  exit 0
elif [ "$SUCCESS_COUNT" -gt 1 ]; then
  echo "❌ TEST FAILED: Multiple successes ($SUCCESS_COUNT) - Double booking vulnerability!"
  exit 1
elif [ "$SUCCESS_COUNT" -eq 0 ]; then
  echo "❌ TEST FAILED: No successes - All requests failed"
  exit 1
else
  echo "⚠️  TEST PARTIAL: Unexpected result distribution"
  exit 1
fi
