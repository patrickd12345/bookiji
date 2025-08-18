#!/bin/bash

# 🛡️ Pre-commit Guard: Check for naked icon buttons
# Usage: ./scripts/check-icon-buttons.sh
# Returns exit code 1 if naked icon buttons found

echo "🔍 Scanning for icon buttons without aria-label..."

# Find icon buttons without aria-label
NAKED_BUTTONS=$(grep -r --include="*.tsx" --include="*.ts" 'size="icon"' src/ | grep -v 'aria-label' | grep -v 'aria-labelledby')

if [ -n "$NAKED_BUTTONS" ]; then
    echo "❌ Found icon buttons without accessible names:"
    echo "$NAKED_BUTTONS"
    echo ""
    echo "🔧 Fix by adding aria-label:"
    echo '   <Button size="icon" aria-label="Close dialog">'
    echo "   OR add screen reader text:"
    echo '   <Button size="icon"><span className="sr-only">Close</span>...</Button>'
    echo ""
    exit 1
else
    echo "✅ All icon buttons have accessible names!"
    exit 0
fi
