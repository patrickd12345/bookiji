#!/bin/bash
# Setup script for stress test backend
# This script sets up Supabase and seeds test data for stress tests

set -e

echo "=========================================="
echo "BOOKIJI STRESS TEST BACKEND SETUP"
echo "=========================================="
echo ""

# Check Docker
if ! docker info > /dev/null 2>&1; then
    echo "❌ ERROR: Docker is not running"
    echo ""
    echo "Please start Docker Desktop (or your Docker daemon) and try again."
    echo ""
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check Supabase CLI
if ! command -v supabase &> /dev/null && ! npx supabase --version &> /dev/null; then
    echo "❌ ERROR: Supabase CLI not found"
    echo ""
    echo "Installing Supabase CLI..."
    npm install -g supabase || npx supabase --version
fi

echo "✅ Supabase CLI available"
echo ""

# Start Supabase
echo "Starting local Supabase..."
cd /workspace
npx supabase start

echo ""
echo "✅ Supabase started"
echo ""

# Apply migrations
echo "Applying migrations..."
npx supabase db push

echo ""
echo "✅ Migrations applied"
echo ""

# Seed test data
echo "Seeding test data..."
export SUPABASE_URL=$(npx supabase status --output json 2>/dev/null | grep -o '"API URL":"[^"]*' | cut -d'"' -f4 || echo "http://127.0.0.1:54321")
export SUPABASE_SECRET_KEY=$(npx supabase status --output json 2>/dev/null | grep -o '"service_role key":"[^"]*' | cut -d'"' -f4 || echo "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU")

pnpm tsx scripts/seed-stress-test-data.ts

echo ""
echo "=========================================="
echo "✅ SETUP COMPLETE"
echo "=========================================="
echo ""
echo "Export these environment variables:"
echo "  export PARTNER_API_KEY=\"<from seed output>\""
echo "  export VENDOR_ID=\"<from seed output>\""
echo "  export REQUESTER_ID=\"<from seed output>\""
echo ""
echo "Then run stress tests:"
echo "  bash stress-tests/run-all-tests.sh"
echo ""
