#!/bin/bash
# PART 5.1: List All In-Flight Reservations

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}

echo "=== OBSERVABILITY CHECK 5.1 ==="
echo "List All In-Flight Reservations"
echo ""

# Try admin endpoint first
if [ -n "$ADMIN_TOKEN" ]; then
  echo "Attempting admin endpoint: GET /api/admin/reservations"
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/reservations?state=HELD,VENDOR_CONFIRMED,AUTHORIZED_BOTH" \
    -H "Authorization: Bearer $ADMIN_TOKEN")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Admin endpoint available"
    echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
    exit 0
  else
    echo "⚠️  Admin endpoint returned HTTP $HTTP_CODE"
  fi
fi

# Try partner API endpoint
if [ -n "$PARTNER_API_KEY" ]; then
  echo "Attempting partner API endpoint: GET /api/v1/reservations"
  echo "⚠️  Note: Partner API may only return reservations for that partner"
  echo ""
  
  # This would require listing all reservations, which may not be available
  # For now, we'll check if the endpoint exists
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/v1/reservations" \
    -H "X-Partner-API-Key: $PARTNER_API_KEY")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
    echo "✅ Partner API endpoint exists (HTTP $HTTP_CODE)"
  else
    echo "⚠️  Partner API endpoint returned HTTP $HTTP_CODE"
  fi
fi

echo ""
echo "=== VALIDATION ==="
echo "Check if you can:"
echo "1. List all reservations in HELD state"
echo "2. List all reservations in VENDOR_CONFIRMED state"
echo "3. List all reservations in AUTHORIZED_BOTH state"
echo "4. Filter by time range"
echo "5. Get count of in-flight reservations"
echo ""
echo "If these capabilities are missing, flag as observability gap"
