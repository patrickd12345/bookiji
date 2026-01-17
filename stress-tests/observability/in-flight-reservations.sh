#!/bin/bash
# PART 5.1: In-Flight Reservations
# Can all in-flight reservations be listed?

set -e

BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SECRET_KEY:-}"

echo "=== IN-FLIGHT RESERVATIONS TEST ==="
echo ""

# Method 1: Try admin endpoint (if exists)
echo "Method 1: Checking admin endpoint..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/admin/reservations/in-flight" \
  -H "Authorization: Bearer $PARTNER_API_KEY" 2>&1 || echo "404")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Admin endpoint exists"
  BODY=$(echo "$RESPONSE" | sed '$d')
  COUNT=$(echo "$BODY" | jq '. | length' 2>/dev/null || echo "0")
  echo "  Found $COUNT in-flight reservations"
else
  echo "⚠️  Admin endpoint not available (HTTP $HTTP_CODE)"
fi

echo ""

# Method 2: Query database directly (if Supabase configured)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "Method 2: Querying database directly..."
  
  # Non-terminal states
  NON_TERMINAL_STATES=(
    "INTENT_CREATED"
    "HELD"
    "AWAITING_VENDOR_CONFIRMATION"
    "CONFIRMED_BY_VENDOR"
    "AWAITING_VENDOR_AUTH"
    "VENDOR_AUTHORIZED"
    "AWAITING_REQUESTER_AUTH"
    "AUTHORIZED_BOTH"
    "COMMIT_IN_PROGRESS"
  )
  
  # Build query (requires psql or Supabase client)
  echo "  Querying reservations table for non-terminal states..."
  echo "  States: ${NON_TERMINAL_STATES[*]}"
  echo ""
  echo "⚠️  NOTE: Direct database query requires psql or Supabase client"
  echo "   Run this query manually:"
  echo ""
  echo "   SELECT id, state, created_at, expires_at"
  echo "   FROM reservations"
  echo "   WHERE state IN ("
  for state in "${NON_TERMINAL_STATES[@]}"; do
    echo "     '$state',"
  done | sed '$ s/,$//'
  echo "   )"
  echo "   ORDER BY created_at DESC;"
else
  echo "⚠️  Supabase not configured, skipping database query"
fi

echo ""
echo "=== VALIDATION ==="

# Check if we can list in-flight reservations
if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ Can list in-flight reservations via admin endpoint"
  echo "✅ TEST PASSED"
  exit 0
elif [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "⚠️  Admin endpoint missing, but database query possible"
  echo "⚠️  TEST PARTIAL: Observability gap (missing admin endpoint)"
  exit 1
else
  echo "❌ Cannot list in-flight reservations"
  echo "❌ TEST FAILED: Observability blocker"
  exit 1
fi
