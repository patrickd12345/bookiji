#!/bin/bash
# PART 5.4: Reconstruct Full Lifecycle of a Booking

set -e

BASE_URL=${BASE_URL:-"http://localhost:3000"}
PARTNER_API_KEY=${PARTNER_API_KEY:-""}
RESERVATION_ID=${1:-""}

if [ -z "$RESERVATION_ID" ]; then
  echo "Usage: $0 <reservation_id>"
  exit 1
fi

echo "=== OBSERVABILITY CHECK 5.4 ==="
echo "Reconstruct Full Lifecycle of Booking: $RESERVATION_ID"
echo ""

# Step 1: Get reservation details
echo "=== STEP 1: Reservation Details ==="
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/v1/reservations/$RESERVATION_ID" \
  -H "X-Partner-API-Key: $PARTNER_API_KEY")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" != "200" ]; then
  echo "❌ Failed to get reservation: HTTP $HTTP_CODE"
  exit 1
fi

echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
echo ""

# Step 2: Check for state transition log
echo "=== STEP 2: State Transition Log ==="
echo "Checking for state transition history..."

# Try to get state history from reservation response
STATE_HISTORY=$(echo "$BODY" | jq -r '.stateHistory // []' 2>/dev/null || echo "[]")

if [ "$STATE_HISTORY" != "[]" ] && [ -n "$STATE_HISTORY" ]; then
  echo "✅ State transition log available:"
  echo "$STATE_HISTORY" | jq '.' 2>/dev/null || echo "$STATE_HISTORY"
else
  echo "⚠️  State transition log not available in response"
fi

echo ""

# Step 3: Check for payment events
echo "=== STEP 3: Payment Events ==="
echo "Checking for payment event history..."

# Try to get payment events (may require admin endpoint)
if [ -n "$ADMIN_TOKEN" ]; then
  PAYMENT_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/reservations/$RESERVATION_ID/payment-events" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "404")
  
  PAYMENT_HTTP_CODE=$(echo "$PAYMENT_RESPONSE" | tail -n1)
  if [ "$PAYMENT_HTTP_CODE" = "200" ]; then
    echo "✅ Payment events available:"
    echo "$PAYMENT_RESPONSE" | sed '$d' | jq '.' 2>/dev/null || echo "$PAYMENT_RESPONSE"
  else
    echo "⚠️  Payment events endpoint not available"
  fi
else
  echo "⚠️  Admin token not provided, cannot check payment events"
fi

echo ""

# Step 4: Check for webhook events
echo "=== STEP 4: Webhook Events ==="
echo "Checking for webhook event history..."

# Try to get webhook events (may require admin endpoint)
if [ -n "$ADMIN_TOKEN" ]; then
  WEBHOOK_RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/admin/reservations/$RESERVATION_ID/webhook-events" \
    -H "Authorization: Bearer $ADMIN_TOKEN" 2>/dev/null || echo "404")
  
  WEBHOOK_HTTP_CODE=$(echo "$WEBHOOK_RESPONSE" | tail -n1)
  if [ "$WEBHOOK_HTTP_CODE" = "200" ]; then
    echo "✅ Webhook events available:"
    echo "$WEBHOOK_RESPONSE" | sed '$d' | jq '.' 2>/dev/null || echo "$WEBHOOK_RESPONSE"
  else
    echo "⚠️  Webhook events endpoint not available"
  fi
else
  echo "⚠️  Admin token not provided, cannot check webhook events"
fi

echo ""

# Step 5: Timeline reconstruction
echo "=== STEP 5: Timeline Reconstruction ==="
CREATED_AT=$(echo "$BODY" | jq -r '.createdAt // "N/A"' 2>/dev/null || echo "N/A")
UPDATED_AT=$(echo "$BODY" | jq -r '.updatedAt // "N/A"' 2>/dev/null || echo "N/A")
EXPIRES_AT=$(echo "$BODY" | jq -r '.expiresAt // "N/A"' 2>/dev/null || echo "N/A")
STATE=$(echo "$BODY" | jq -r '.state // "N/A"' 2>/dev/null || echo "N/A")

echo "Timeline:"
echo "  Created:  $CREATED_AT"
echo "  Updated:  $UPDATED_AT"
echo "  Expires:  $EXPIRES_AT"
echo "  State:    $STATE"
echo ""

echo "=== VALIDATION ==="
echo "Check if you can reconstruct:"
echo "1. ✅ User (requester_id, vendor_id)"
echo "2. ✅ Slot (slot_start_time, slot_end_time)"
echo "3. ⚠️  Timeline (created_at, updated_at, expires_at)"
echo "4. ⚠️  State transitions (state_history)"
echo "5. ⚠️  Payment events (payment_event_log)"
echo "6. ⚠️  Webhook events (webhook_event_log)"
echo "7. ⚠️  Failure cause (failure_reason)"
echo "8. ⚠️  Resolution path (compensation_actions)"
echo ""
echo "Missing items indicate observability gaps"
