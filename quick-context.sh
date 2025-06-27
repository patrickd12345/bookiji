#!/bin/bash

# Generate context summary
node startup-context.js

# Copy to clipboard (works on macOS, Linux, Windows)
if command -v pbcopy &> /dev/null; then
    # macOS
    cat ai-context.md | pbcopy
    echo "✅ Context copied to clipboard (macOS)"
elif command -v xclip &> /dev/null; then
    # Linux
    cat ai-context.md | xclip -selection clipboard
    echo "✅ Context copied to clipboard (Linux)"
elif command -v clip.exe &> /dev/null; then
    # Windows
    cat ai-context.md | clip.exe
    echo "✅ Context copied to clipboard (Windows)"
else
    echo "📋 Context saved to ai-context.md - copy manually"
fi

echo "🚀 Ready to paste into AI conversation!" 