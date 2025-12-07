#!/bin/bash
cd /Users/patri/Projects/bookijibck 2>/dev/null || cd c:/Users/patri/Projects/bookijibck

echo "=== Build Check ==="
echo "Testing TypeScript..."
npx tsc --noEmit 2>&1 | head -50

echo ""
echo "Testing Next.js version..."
npx next --version

echo ""
echo "Testing build..."
timeout 60 npm run build 2>&1 | tail -100

