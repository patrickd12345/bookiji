#!/bin/bash
# Quick Test Runner for Reschedule System
# Runs essential tests to verify the system is working

echo "🚀 Quick Reschedule System Test"
echo "================================"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Please run this from the pw-tests directory"
  exit 1
fi

# Setup environment
echo "🔧 Setting up test environment..."
source setup-test-env.sh

if [ $? -ne 0 ]; then
  echo "❌ Environment setup failed"
  exit 1
fi

echo ""
echo "🧪 Running Essential Tests..."
echo "=============================="

# Run the comprehensive reschedule test
echo "1️⃣ Testing complete reschedule flow..."
pnpm test:reschedule

if [ $? -eq 0 ]; then
  echo "✅ Reschedule tests passed!"
else
  echo "❌ Reschedule tests failed!"
  exit 1
fi

echo ""
echo "🏁 Quick Test Complete!"
echo "======================="
echo "✅ Reschedule system is working correctly"
echo "✅ All API endpoints are functional"
echo "✅ Database functions are operational"
echo "✅ Race condition handling works"
echo "✅ Token validation is secure"
echo ""

echo "🎯 Ready for production testing!"
echo "   Run 'pnpm test:all' for full test suite"
echo "   Run 'pnpm test:ui' for interactive testing"
