#!/bin/bash

# Bookiji E2E Test Runner
echo "🚀 Starting Bookiji E2E Tests..."

# Check if Playwright is installed
if ! command -v npx playwright &> /dev/null; then
    echo "❌ Playwright not found. Installing..."
    pnpm exec playwright install
fi

# Run tests
echo "🧪 Running Playwright tests..."
pnpm e2e

echo "✅ E2E tests completed!"
