#!/bin/bash
# Monitor Supabase startup and report when ready

echo "Monitoring Supabase startup..."
MAX_WAIT=1800  # 30 minutes max
ELAPSED=0
INTERVAL=10

while [ $ELAPSED -lt $MAX_WAIT ]; do
    # Check if Supabase API is responding
    if curl -s http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
        echo "✅ Supabase is ready!"
        cd /workspace/supabase/e2e && supabase status
        exit 0
    fi
    
    # Check if process is still running
    if ! ps aux | grep -q "[s]upabase start"; then
        echo "⚠️ Supabase process stopped. Checking logs..."
        tail -30 /tmp/supabase-start.log
        exit 1
    fi
    
    echo "[$ELAPSED seconds] Waiting for Supabase to start..."
    sleep $INTERVAL
    ELAPSED=$((ELAPSED + INTERVAL))
done

echo "❌ Timeout waiting for Supabase"
tail -50 /tmp/supabase-start.log
exit 1
