#!/bin/bash
# SimCity Environment Setup
# Source this file before running the CLI:
#   source chaos/simcity/setup-env.sh

# Planner mode (llm or stub)
export SIMCITY_PLANNER=${SIMCITY_PLANNER:-llm}
export SIMCITY_PLANNER_MODEL=${SIMCITY_PLANNER_MODEL:-gemini-1.5-flash}

# Required for LLM mode
if [ "$SIMCITY_PLANNER" = "llm" ]; then
  if [ -z "$GEMINI_API_KEY" ]; then
    echo "⚠️  GEMINI_API_KEY not set. Set it with:"
    echo "   export GEMINI_API_KEY=your_key_here"
  fi
fi

# Required for execution
if [ -z "$SUPABASE_URL" ]; then
  echo "⚠️  SUPABASE_URL not set. Set it with:"
  echo "   export SUPABASE_URL=your_supabase_url"
fi

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  echo "⚠️  SUPABASE_SERVICE_ROLE_KEY not set. Set it with:"
  echo "   export SUPABASE_SERVICE_ROLE_KEY=your_service_key"
fi

# Optional
export TARGET_URL=${TARGET_URL:-http://localhost:3000}

echo "✓ Environment configured for SimCity CLI"
echo "  Planner: $SIMCITY_PLANNER"
echo "  Model: $SIMCITY_PLANNER_MODEL"
echo "  Target: $TARGET_URL"
