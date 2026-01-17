#!/bin/bash
# PART 5.4: Lifecycle Reconstruction
# Can the full lifecycle of a booking be reconstructed?

set -e

RESERVATION_ID="${1:-}"
BASE_URL="${BOOKIJI_BASE_URL:-http://localhost:3000}"
PARTNER_API_KEY="${BOOKIJI_PARTNER_API_KEY:-}"
SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SUPABASE_KEY="${SUPABASE_SECRET_KEY:-}"

if [ -z "$RESERVATION_ID" ]; then
  echo "Usage: $0 <reservation-id>"
  echo ""
  echo "Example:"
  echo "  $0 abc123-def456-ghi789"
  exit 1
fi

echo "=== LIFECYCLE RECONSTRUCTION TEST ==="
echo "Reservation ID: $RESERVATION_ID"
echo ""

# Method 1: Get reservation with state history
echo "Method 1: Getting reservation details..."
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET \
  "$BASE_URL/api/v1/reservations/$RESERVATION_ID" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY" 2>&1)

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Failed to get reservation: HTTP $HTTP_CODE"
  exit 1
fi

echo "✅ Reservation retrieved"
echo ""

# Extract key fields
CREATED_AT=$(echo "$BODY" | jq -r '.createdAt // empty' 2>/dev/null || echo "")
STATE=$(echo "$BODY" | jq -r '.state // empty' 2>/dev/null || echo "")
EXPIRES_AT=$(echo "$BODY" | jq -r '.expiresAt // empty' 2>/dev/null || echo "")
STATE_HISTORY=$(echo "$BODY" | jq -r '.stateHistory // []' 2>/dev/null || echo "[]")
PAYMENT_STATE=$(echo "$BODY" | jq -r '.paymentState // {}' 2>/dev/null || echo "{}")
BOOKING_ID=$(echo "$BODY" | jq -r '.bookingId // empty' 2>/dev/null || echo "")

echo "=== RESERVATION DETAILS ==="
echo "Created: $CREATED_AT"
echo "State: $STATE"
echo "Expires: $EXPIRES_AT"
echo "Booking ID: $BOOKING_ID"
echo ""

# Check state history
HISTORY_COUNT=$(echo "$STATE_HISTORY" | jq '. | length' 2>/dev/null || echo "0")
echo "State History Entries: $HISTORY_COUNT"

if [ "$HISTORY_COUNT" -gt 0 ]; then
  echo "✅ State history available"
  echo ""
  echo "State Transitions:"
  echo "$STATE_HISTORY" | jq -r '.[] | "  \(.timestamp): \(.fromState) → \(.toState) (\(.triggeredBy))"' 2>/dev/null || echo "  (Cannot parse)"
else
  echo "⚠️  No state history found"
fi

echo ""

# Check payment state
VENDOR_PI=$(echo "$PAYMENT_STATE" | jq -r '.vendorPaymentIntentId // empty' 2>/dev/null || echo "")
REQUESTER_PI=$(echo "$PAYMENT_STATE" | jq -r '.requesterPaymentIntentId // empty' 2>/dev/null || echo "")

if [ -n "$VENDOR_PI" ] || [ -n "$REQUESTER_PI" ]; then
  echo "Payment State:"
  if [ -n "$VENDOR_PI" ]; then
    echo "  Vendor PaymentIntent: $VENDOR_PI"
  fi
  if [ -n "$REQUESTER_PI" ]; then
    echo "  Requester PaymentIntent: $REQUESTER_PI"
  fi
else
  echo "⚠️  No payment state found"
fi

echo ""

# Method 2: Query database for complete history (if Supabase configured)
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_KEY" ]; then
  echo "Method 2: Querying database for complete history..."
  echo "⚠️  NOTE: Direct database query requires psql or Supabase client"
  echo "   Run these queries manually:"
  echo ""
  echo "   -- Get reservation"
  echo "   SELECT * FROM reservations WHERE id = '$RESERVATION_ID';"
  echo ""
  echo "   -- Get state transitions"
  echo "   SELECT * FROM reservation_state_transitions WHERE reservation_id = '$RESERVATION_ID' ORDER BY timestamp;"
  echo ""
  echo "   -- Get payment events"
  echo "   SELECT * FROM payments_outbox WHERE reservation_id = '$RESERVATION_ID' ORDER BY created_at;"
  echo ""
  echo "   -- Get webhook events"
  echo "   SELECT * FROM webhook_events WHERE reservation_id = '$RESERVATION_ID' ORDER BY received_at;"
else
  echo "⚠️  Supabase not configured, skipping database query"
fi

echo ""
echo "=== VALIDATION ==="

# Check completeness
MISSING=0

if [ -z "$CREATED_AT" ]; then
  echo "❌ Missing: created_at timestamp"
  ((MISSING++))
fi

if [ -z "$STATE" ]; then
  echo "❌ Missing: current state"
  ((MISSING++))
fi

if [ "$HISTORY_COUNT" -eq 0 ]; then
  echo "⚠️  Missing: state history"
  ((MISSING++))
fi

if [ -z "$VENDOR_PI" ] && [ -z "$REQUESTER_PI" ] && [ "$STATE" != "HELD" ] && [ "$STATE" != "EXPIRED" ]; then
  echo "⚠️  Missing: payment state (may be expected for some states)"
fi

if [ "$MISSING" -eq 0 ]; then
  echo "✅ TEST PASSED: Lifecycle can be reconstructed"
  exit 0
else
  echo "❌ TEST FAILED: Missing $MISSING critical fields"
  exit 1
fi
