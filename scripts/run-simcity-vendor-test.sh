#!/bin/bash
# Script to run SimCity vendor test for 30 minutes
# Requirements:
# 1. Supabase running locally (via `pnpm supabase:start` or Docker)
# 2. Next.js dev server running (via `pnpm dev`)
# 3. Docker available for chaos-harness containers

set -e

# Check if Supabase is running
if ! curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
    echo "❌ Supabase is not running. Please start it with: pnpm supabase:start"
    exit 1
fi

# Check if Next.js server is running
if ! curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
    echo "❌ Next.js server is not running. Please start it with: pnpm dev"
    exit 1
fi

# Check if Docker is available
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not available. SimCity requires Docker to run chaos-harness containers."
    exit 1
fi

echo "✅ Prerequisites met. Starting SimCity vendor test..."

# Start SimCity run via API
RESPONSE=$(curl -s -X POST http://localhost:3000/api/ops/simcity/run \
  -H "Content-Type: application/json" \
  -d '{
    "requested_by": "cursor-agent",
    "tier": "marketplace_bootstrap",
    "duration_seconds": 1800,
    "concurrency": 3,
    "max_events": 10000,
    "seed": 42
  }')

echo "Response: $RESPONSE"

# Check if request was created successfully
if echo "$RESPONSE" | grep -q '"id"'; then
    REQUEST_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    echo "✅ SimCity run request created successfully!"
    echo "Request ID: $REQUEST_ID"
    echo "Tier: marketplace_bootstrap (vendor-focused)"
    echo "Duration: 1800 seconds (30 minutes)"
    echo ""
    echo "The SimCity runner will pick up this request and start the test."
    echo "Monitor progress via:"
    echo "  - API: curl http://localhost:3000/api/ops/simcity/status"
    echo "  - Database: SELECT * FROM simcity_run_live WHERE run_id = (SELECT run_id FROM simcity_run_requests WHERE id = '$REQUEST_ID');"
else
    echo "❌ Failed to create SimCity run request:"
    echo "$RESPONSE"
    exit 1
fi
