#!/bin/bash
# Setup Test Environment for Reschedule Playwright Tests
# This script helps set up the required environment variables

echo "🧪 Setting up Reschedule Test Environment"
echo "=========================================="

# Check if .env file exists (try multiple possible locations)
ENV_FILE=""
for path in "../../.env" "../.env" ".env" "../../../.env"; do
  if [ -f "$path" ]; then
    ENV_FILE="$path"
    break
  fi
done

if [ -z "$ENV_FILE" ]; then
  echo "❌ .env file not found in any of these locations:"
  echo "   - ../../.env (packages/pw-tests from project root)"
  echo "   - ../.env (from packages directory)"
  echo "   - .env (current directory)"
  echo "   - ../../../.env (alternative path)"
  echo ""
  echo "🔧 Please create .env file in the project root with required variables"
  exit 1
fi

echo "✅ Found .env file at: $ENV_FILE"

# Source environment variables
source "$ENV_FILE"

# Required variables for testing
REQUIRED_VARS=(
  "SUPABASE_URL"
  "SUPABASE_SECRET_KEY"
  "CUSTOMER_JWT"
  "BOOKING_ID"
)

echo ""
echo "📋 Required Environment Variables:"
echo "=================================="

MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!var}" ]; then
    echo "❌ $var - MISSING"
    MISSING_VARS+=("$var")
  else
    echo "✅ $var - SET"
  fi
done

echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "🚨 Missing required variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "   - $var"
  done
  
  echo ""
  echo "🔧 How to set them up:"
  echo "   1. CUSTOMER_JWT: Get from browser dev tools or auth endpoint"
  echo "   2. BOOKING_ID: Create a test booking or use existing one"
  echo "   3. SUPABASE_URL: Your Supabase project URL"
  echo "   4. SUPABASE_SECRET_KEY: Your Supabase secret key"
  
  echo ""
  echo "📝 Add to .env file:"
  echo "   CUSTOMER_JWT=your_jwt_token_here"
  echo "   BOOKING_ID=your_booking_uuid_here"
  
  exit 1
fi

echo "✅ All required variables are set!"
echo ""
echo "🚀 Ready to run tests:"
echo "   pnpm test:reschedule"
echo "   pnpm test:all"
echo ""

# Export variables for current session
export SUPABASE_URL
export SUPABASE_SECRET_KEY
export CUSTOMER_JWT
export BOOKING_ID

echo "📊 Current Test Configuration:"
echo "   Base URL: $SUPABASE_URL"
echo "   Customer JWT: ${CUSTOMER_JWT:0:20}..."
echo "   Booking ID: $BOOKING_ID"
echo ""

echo "🎯 Test Environment Setup Complete!"
