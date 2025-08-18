#!/bin/bash
# Simple Test Setup for Reschedule System
# This script helps you set up the test environment step by step

echo "🧪 Reschedule System Test Setup"
echo "==============================="

echo ""
echo "📋 Required Environment Variables:"
echo "=================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this from the pw-tests directory"
  exit 1
fi

echo "✅ In correct directory: pw-tests"

# Check for .env file
if [ -f ".env" ]; then
  echo "✅ Found .env file in current directory"
  source .env
elif [ -f "../.env" ]; then
  echo "✅ Found .env file in packages directory"
  source ../.env
elif [ -f "../../.env" ]; then
  echo "✅ Found .env file in project root"
  source ../../.env
else
  echo "❌ No .env file found"
  echo ""
  echo "🔧 Create a .env file with these variables:"
  echo "   SUPABASE_URL=https://your-project.supabase.co"
  echo "   SUPABASE_SECRET_KEY=sb_secret_your_secret_key_here"
  echo "   CUSTOMER_JWT=your_jwt_token_here"
  echo "   BOOKING_ID=your_booking_uuid_here"
  echo ""
  echo "📝 You can copy from env.example:"
  echo "   cp env.example .env"
  echo "   # Then edit .env with your actual values"
  echo ""
  exit 1
fi

echo ""
echo "🔍 Checking Required Variables:"
echo "================================"

MISSING_VARS=()

# Check each required variable
if [ -z "$SUPABASE_URL" ]; then
  echo "❌ SUPABASE_URL - MISSING"
  MISSING_VARS+=("SUPABASE_URL")
else
  echo "✅ SUPABASE_URL - SET"
fi

if [ -z "$SUPABASE_SECRET_KEY" ]; then
  echo "❌ SUPABASE_SECRET_KEY - MISSING"
  MISSING_VARS+=("SUPABASE_SECRET_KEY")
else
  echo "✅ SUPABASE_SECRET_KEY - SET"
fi

if [ -z "$CUSTOMER_JWT" ]; then
  echo "❌ CUSTOMER_JWT - MISSING"
  MISSING_VARS+=("CUSTOMER_JWT")
else
  echo "✅ CUSTOMER_JWT - SET"
fi

if [ -z "$BOOKING_ID" ]; then
  echo "❌ BOOKING_ID - MISSING"
  MISSING_VARS+=("BOOKING_ID")
else
  echo "✅ BOOKING_ID - SET"
fi

echo ""

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "🚨 Missing variables: ${MISSING_VARS[*]}"
  echo ""
  echo "🔧 How to get them:"
  echo "   1. SUPABASE_URL: Your Supabase project URL"
  echo "   2. SUPABASE_SECRET_KEY: From Supabase dashboard → Settings → API"
  echo "   3. CUSTOMER_JWT: Login to your app and check browser dev tools"
  echo "   4. BOOKING_ID: Create a test booking or use existing one"
  echo ""
  echo "📝 Add to .env file and run this script again"
  exit 1
fi

echo "✅ All required variables are set!"
echo ""
echo "🚀 Ready to run tests:"
echo "   pnpm test:reschedule    # Test reschedule system"
echo "   pnpm test:all           # Run all tests"
echo "   pnpm test:ui            # Interactive testing"
echo ""

# Export variables for current session
export SUPABASE_URL
export SUPABASE_SECRET_KEY
export CUSTOMER_JWT
export BOOKING_ID

echo "📊 Test Configuration:"
echo "   Base URL: $SUPABASE_URL"
echo "   Customer JWT: ${CUSTOMER_JWT:0:20}..."
echo "   Booking ID: $BOOKING_ID"
echo ""

echo "🎯 Test Environment Ready!"
echo "Run: pnpm test:reschedule"
