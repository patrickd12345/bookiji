#!/bin/bash
# 30-Minute Soak Test Runner
# Checks prerequisites and runs the soak test

set -e

echo "🔍 Checking prerequisites..."

# Check Next.js
if ! curl -s http://localhost:3000 >/dev/null 2>&1; then
  echo "❌ Next.js not running on http://localhost:3000"
  echo "   Start it with: pnpm dev"
  exit 1
fi
echo "✅ Next.js is running"

# Check Supabase
if ! curl -s http://localhost:54321/rest/v1/ \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  >/dev/null 2>&1; then
  echo "❌ Supabase not running on http://localhost:54321"
  echo "   Start it with: supabase start"
  exit 1
fi
echo "✅ Supabase is running"

echo ""
echo "🚀 Starting 30-minute soak test..."
echo "   This will run for 30 minutes or until an invariant violation"
echo "   Press Ctrl+C to stop early"
echo ""

cd "$(dirname "$0")/../.."

SUPABASE_URL=http://localhost:54321 \
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321 \
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU \
SIMCITY_PLANNER=stub \
TARGET_URL=http://localhost:3000 \
node chaos/simcity/cli.mjs \
  "Run all scheduling attacks in sequence for 30 minutes. Escalate retries and restarts. Stop on invariant violation."
