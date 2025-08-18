#!/bin/bash
# Reschedule System Smoke Test
# Tests happy path and edge cases

set -e

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
JWT="${JWT:-your_jwt_token_here}"
BOOKING_ID="${BOOKING_ID:-your_booking_id_here}"

echo "🧪 Reschedule System Smoke Test"
echo "================================"
echo "Base URL: $BASE_URL"
echo "JWT: ${JWT:0:20}..."
echo "Booking ID: $BOOKING_ID"
echo ""

# ========================================
# 1. INITIATE RESCHEDULE
# ========================================
echo "1️⃣ Initiating reschedule..."
INIT_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/$BOOKING_ID/terminate" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -d '{"action":"reschedule"}')

echo "Response: $INIT_RESPONSE"

# Extract token from response
TOKEN=$(echo "$INIT_RESPONSE" | jq -r '.token // empty')
if [ -z "$TOKEN" ]; then
  echo "❌ Failed to get reschedule token"
  exit 1
fi

echo "✅ Got reschedule token: ${TOKEN:0:20}..."
echo ""

# ========================================
# 2. COMPLETE RESCHEDULE
# ========================================
echo "2️⃣ Completing reschedule..."
IDEMPOTENCY_KEY=$(uuidgen)
COMPLETE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/reschedule/complete" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $IDEMPOTENCY_KEY" \
  -d "{\"token\":\"$TOKEN\",\"newStart\":\"2025-08-20T15:00:00Z\",\"newEnd\":\"2025-08-20T15:30:00Z\"}")

echo "Response: $COMPLETE_RESPONSE"

# Check if successful
if echo "$COMPLETE_RESPONSE" | jq -e '.success' > /dev/null; then
  NEW_BOOKING_ID=$(echo "$COMPLETE_RESPONSE" | jq -r '.bookingId')
  echo "✅ Reschedule completed! New booking ID: $NEW_BOOKING_ID"
else
  echo "❌ Reschedule failed: $(echo "$COMPLETE_RESPONSE" | jq -r '.error // "Unknown error"')"
  exit 1
fi

echo ""

# ========================================
# 3. EDGE CASE: REUSE TOKEN (EXPECT 409)
# ========================================
echo "3️⃣ Testing token reuse (expect 409)..."
REUSE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/reschedule/complete" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $(uuidgen)" \
  -d "{\"token\":\"$TOKEN\",\"newStart\":\"2025-08-20T16:00:00Z\",\"newEnd\":\"2025-08-20T16:30:00Z\"}")

echo "Response: $REUSE_RESPONSE"

if echo "$REUSE_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "✅ Token reuse correctly rejected"
else
  echo "❌ Token reuse should have been rejected"
fi

echo ""

# ========================================
# 4. EDGE CASE: OVERLAPPING SLOT (EXPECT 409)
# ========================================
echo "4️⃣ Testing overlapping slot (expect 409)..."
OVERLAP_RESPONSE=$(curl -s -X POST "$BASE_URL/api/bookings/reschedule/complete" \
  -H "Authorization: Bearer $JWT" \
  -H "Content-Type: application/json" \
  -H "x-idempotency-key: $(uuidgen)" \
  -d "{\"token\":\"$TOKEN\",\"newStart\":\"2025-08-20T15:00:00Z\",\"newEnd\":\"2025-08-20T15:30:00Z\"}")

echo "Response: $OVERLAP_RESPONSE"

if echo "$OVERLAP_RESPONSE" | jq -e '.error' > /dev/null; then
  echo "✅ Overlapping slot correctly rejected"
else
  echo "❌ Overlapping slot should have been rejected"
fi

echo ""

# ========================================
# 5. VERIFY DATABASE STATE
# ========================================
echo "5️⃣ Verifying database state..."
echo "Run these queries in Supabase SQL Editor:"
echo ""
echo "-- Check reschedule tokens"
echo "SELECT jti, used_at, expires_at FROM reschedule_tokens WHERE jti = '$TOKEN';"
echo ""
echo "-- Check old booking status"
echo "SELECT id, status, reschedule_in_progress, replaced_by_booking_id FROM bookings WHERE id = '$BOOKING_ID';"
echo ""
echo "-- Check new booking"
echo "SELECT id, status, reschedule_of_booking_id, slot_start, slot_end FROM bookings WHERE id = '$NEW_BOOKING_ID';"
echo ""

echo "🎉 Smoke test completed!"
echo "Check the database queries above to verify the reschedule flow worked correctly."
