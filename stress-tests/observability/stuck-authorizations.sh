#!/bin/bash
# PART 5.2: Identify Stuck Authorizations

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
ADMIN_TOKEN=${ADMIN_TOKEN:-""}
SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-""}
SUPABASE_KEY=${SUPABASE_SECRET_KEY:-""}

echo "=== OBSERVABILITY CHECK 5.2 ==="
echo "Identify Stuck Authorizations"
echo ""

# Check 1: Reservations in AUTHORIZED_BOTH state > 1 hour
echo "=== CHECK 1: Stuck Reservations ==="
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "Querying database for stuck reservations..."
  
  # Use psql or Supabase client to query
  # For now, we'll use curl to Supabase REST API if available
  echo "⚠️  Direct database query requires psql or Supabase client"
  echo "    Query: SELECT * FROM reservations WHERE state = 'AUTHORIZED_BOTH' AND created_at < NOW() - INTERVAL '1 hour'"
else
  echo "⚠️  Supabase credentials not provided"
fi

# Check 2: Payment intents authorized but not captured
echo ""
echo "=== CHECK 2: Stuck Payment Intents ==="
if [ -n "$STRIPE_SECRET_KEY" ]; then
  echo "⚠️  Stripe API query requires Stripe CLI or API access"
  echo "    Query Stripe for payment intents:"
  echo "    - status: 'requires_capture'"
  echo "    - created > 1 hour ago"
  echo "    - metadata.reservation_id exists"
else
  echo "⚠️  Stripe secret key not provided"
fi

# Check 3: Reservations past expiry
echo ""
echo "=== CHECK 3: Expired Reservations ==="
if [ -n "$ADMIN_TOKEN" ]; then
  echo "Attempting to query expired reservations..."
  RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/reservations?state=EXPIRED&expired=true" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "404")
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Expired reservations endpoint available"
  else
    echo "⚠️  Expired reservations endpoint not available (HTTP $HTTP_CODE)"
  fi
else
  echo "⚠️  Admin token not provided"
fi

echo ""
echo "=== VALIDATION ==="
echo "Check if you can:"
echo "1. Query reservations in AUTHORIZED_BOTH state > 1 hour old"
echo "2. List payment intents that are authorized but not captured"
echo "3. Identify reservations past expiry that haven't been cleaned up"
echo "4. Get alerts for stuck authorizations"
echo ""
echo "If these capabilities are missing, flag as observability gap"
