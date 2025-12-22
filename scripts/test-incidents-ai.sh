#!/bin/bash
# Test script for IncidentsAI endpoints
# Usage: ./scripts/test-incidents-ai.sh [base-url]

BASE_URL=${1:-http://localhost:3000}

echo "🧪 Testing IncidentsAI System"
echo "================================"
echo ""

# First, seed some test data
echo "📦 Seeding test data..."
pnpm tsx scripts/test-incidents-api.ts > /dev/null 2>&1
echo "✅ Test data seeded"
echo ""

# Test 1: List all incidents
echo "1️⃣  Testing GET /api/ops/incidents/list"
RESPONSE=$(curl -s "${BASE_URL}/api/ops/incidents/list")
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "   ✅ Success"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
  echo "   📊 Found $COUNT incidents"
else
  echo "   ❌ Failed"
  echo "$RESPONSE"
fi
echo ""

# Test 2: Get open incidents only
echo "2️⃣  Testing GET /api/ops/incidents/list?openOnly=true"
RESPONSE=$(curl -s "${BASE_URL}/api/ops/incidents/list?openOnly=true")
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "   ✅ Success"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
  echo "   📊 Found $COUNT open incidents"
else
  echo "   ❌ Failed"
fi
echo ""

# Test 3: Get triage summary
echo "3️⃣  Testing GET /api/ops/incidents/ai-triage"
RESPONSE=$(curl -s "${BASE_URL}/api/ops/incidents/ai-triage")
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "   ✅ Success"
  CRITICAL=$(echo "$RESPONSE" | grep -o '"criticalCount":[0-9]*' | grep -o '[0-9]*')
  HIGH=$(echo "$RESPONSE" | grep -o '"highCount":[0-9]*' | grep -o '[0-9]*')
  echo "   📊 Critical: $CRITICAL, High: $HIGH"
  IMMEDIATE=$(echo "$RESPONSE" | grep -o '"immediate":\[.*\]' | grep -o '\[.*\]')
  echo "   🚨 Immediate actions: $IMMEDIATE"
else
  echo "   ❌ Failed"
  echo "$RESPONSE"
fi
echo ""

# Test 4: List events
echo "4️⃣  Testing GET /api/ops/events"
RESPONSE=$(curl -s "${BASE_URL}/api/ops/events")
if echo "$RESPONSE" | grep -q '"ok":true'; then
  echo "   ✅ Success"
  COUNT=$(echo "$RESPONSE" | grep -o '"count":[0-9]*' | grep -o '[0-9]*')
  echo "   📊 Found $COUNT events"
else
  echo "   ❌ Failed"
fi
echo ""

echo "✨ Testing complete!"















