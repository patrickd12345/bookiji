#!/bin/bash
# Test script for LLM-powered support chat endpoint

BASE_URL="${1:-http://localhost:3000}"

echo "🧪 Testing LLM-powered Support Chat Endpoint"
echo "=============================================="
echo ""

# Test 1: Simple question (should use LLM generation)
echo "Test 1: Simple question (should generate LLM answer)"
echo "----------------------------------------------------"
curl -s -X POST "${BASE_URL}/api/support/chat" \
  -H 'Content-Type: application/json' \
  -d '{"message":"How do I book a service?","email":"test@example.com"}' | jq '.' || echo "Failed"
echo ""
echo ""

# Test 2: Question with history context
echo "Test 2: Question with history (should use LLM with context)"
echo "------------------------------------------------------------"
curl -s -X POST "${BASE_URL}/api/support/chat" \
  -H 'Content-Type: application/json' \
  -d '{
    "message":"Can you tell me more about that?",
    "email":"test@example.com",
    "history":[{"confidence":0.85}]
  }' | jq '.' || echo "Failed"
echo ""
echo ""

# Test 3: Complex question (should escalate)
echo "Test 3: Complex question (should escalate to ticket)"
echo "----------------------------------------------------"
curl -s -X POST "${BASE_URL}/api/support/chat" \
  -H 'Content-Type: application/json' \
  -d '{"message":"I need a refund immediately","email":"test@example.com"}' | jq '.' || echo "Failed"
echo ""
echo ""

echo "✅ Tests completed!"
echo ""
echo "Expected behavior:"
echo "- Test 1 & 2: Should return LLM-generated answers (not raw KB chunks)"
echo "- Test 3: Should escalate and create a ticket"
