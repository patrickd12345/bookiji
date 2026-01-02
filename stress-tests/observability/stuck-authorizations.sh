#!/bin/bash
# PART 5.2: Stuck Authorizations
# Can stuck authorizations be identified?

set -e

BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SECRET_KEY:-}"

echo "=== STUCK AUTHORIZATIONS TEST ==="
echo ""

# Stuck states: authorizations pending for > 1 hour
STUCK_STATES=(
  "AWAITING_VENDOR_AUTH"
  "AWAITING_REQUESTER_AUTH"
  "AUTHORIZED_BOTH"
)

ONE_HOUR_AGO=$(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1H +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || echo "")

if [ -z "$ONE_HOUR_AGO" ]; then
  echo "⚠️  Cannot calculate timestamp (date command issue)"
  ONE_HOUR_AGO="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
fi

echo "Looking for reservations in stuck states older than: $ONE_HOUR_AGO"
echo ""

# Method 1: Try admin endpoint
echo "Method 1: Checking admin endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/admin/reservations/stuck" \
  -H "Authorization: Bearer $PARTNER_API_KEY" 2>&1 || echo "404")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Admin endpoint exists"
  BODY=$(echo "$RESPONSE" | sed '$d')
  COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "0")
  echo "  Found $COUNT stuck reservations"
  
  # Validate response includes required fields
  FIRST=$(echo "$BODY" | jq '.[0]' 2>/dev/null || echo "{}")
  HAS_PAYMENT_INTENT=$(echo "$FIRST" | jq 'has("paymentIntentId")' 2>/dev/null || echo "false")
  HAS_TIMESTAMP=$(echo "$FIRST" | jq 'has("lastUpdateTimestamp")' 2>/dev/null || echo "false")
  
  if [ "$HAS_PAYMENT_INTENT" = "true" ] && [ "$HAS_TIMESTAMP" = "true" ]; then
    echo "  ✅ Response includes payment intent IDs and timestamps"
  else
    echo "  ⚠️  Response missing required fields"
  fi
else
  echo "⚠️  Admin endpoint not available (HTTP $HTTP_CODE)"
fi

echo ""

# Method 2: Query database directly
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "Method 2: Querying database directly..."
  echo "  Querying reservations table for stuck states..."
  echo ""
  echo "⚠️  NOTE: Direct database query requires psql or Supabase client"
  echo "   Run this query manually:"
  echo ""
  echo "   SELECT id, state, created_at, expires_at, payment_state"
  echo "   FROM reservations"
  echo "   WHERE state IN ("
  for state in "${STUCK_STATES[@]}"; do
    echo "     '$state',"
  done | sed '$ s/,$//'
  echo "   )"
  echo "   AND created_at < '$ONE_HOUR_AGO'"
  echo "   ORDER BY created_at DESC;"
else
  echo "⚠️  Supabase not configured, skipping database query"
fi

echo ""
echo "=== VALIDATION ==="

# Check if we can identify stuck authorizations
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Can identify stuck authorizations via admin endpoint"
  echo "✅ TEST PASSED"
  exit 0
elif [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "⚠️  Admin endpoint missing, but database query possible"
  echo "⚠️  TEST PARTIAL: Observability gap (missing admin endpoint)"
  exit 1
else
  echo "❌ Cannot identify stuck authorizations"
  echo "❌ TEST FAILED: Observability blocker"
  exit 1
fi
