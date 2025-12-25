#!/bin/bash
# Wait for Supabase to be ready, then start SimCity runner and trigger vendor test

echo "⏳ Waiting for Supabase to be ready..."
MAX_WAIT=1800  # 30 minutes
ELAPSED=0
INTERVAL=15

while [ $ELAPSED -lt $MAX_WAIT ]; do
    if curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
        echo "✅ Supabase is ready!"
        
        # Check Supabase status
        cd /workspace/supabase/e2e
        supabase status
        
        # Start SimCity runner in background
        echo "🚀 Starting SimCity runner..."
        cd /workspace
        export SUPABASE_URL=http://localhost:54321
        export SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
        export NEXT_PUBLIC_APP_URL=http://localhost:3000
        
        nohup pnpm tsx ops/simcity/runner.ts > /tmp/simcity-runner.log 2>&1 &
        RUNNER_PID=$!
        echo "SimCity runner started with PID: $RUNNER_PID"
        
        # Wait a moment for runner to initialize
        sleep 5
        
        # Trigger vendor test
        echo "📋 Triggering SimCity vendor test (30 minutes)..."
        RESPONSE=$(curl -s -X POST http://localhost:3000/api/ops/simcity/run \
          -H "Content-Type: application/json" \
          -d '{
            "requested_by": "cursor-agent",
            "tier": "marketplace_bootstrap",
            "duration_seconds": 1800,
            "concurrency": 3,
            "max_events": 10000,
            "seed": 42
          }')
        
        echo "Response: $RESPONSE"
        
        if echo "$RESPONSE" | grep -q '"id"'; then
            REQUEST_ID=$(echo "$RESPONSE" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
            echo "✅ SimCity vendor test started!"
            echo "Request ID: $REQUEST_ID"
            echo "Test will run for 30 minutes"
            echo "Monitor progress: tail -f /tmp/simcity-runner.log"
        else
            echo "❌ Failed to start test: $RESPONSE"
        fi
        
        exit 0
    fi
    
    echo "[$ELAPSED seconds] Still waiting for Supabase..."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo "❌ Timeout waiting for Supabase"
exit 1
