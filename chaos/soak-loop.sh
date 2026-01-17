#!/bin/bash
# Multi-hour chaos soak program (autopilot)
# Continuously stress booking-slot consistency guarantees

set -euo pipefail

LOG_FILE="/workspace/chaos/soak-log.txt"
RUN_COUNT=0
CHAOS_DIR="/workspace/chaos"
WORKSPACE_DIR="/workspace"

# Function to generate random seed
random_seed() {
    echo $((RANDOM * RANDOM + RANDOM))
}

# Function to check if Supabase is reachable
check_supabase() {
    if curl -sf http://localhost:54321/rest/v1/ > /dev/null 2>&1; then
        return 0
    else
        echo "ERROR: PostgREST unreachable at http://localhost:54321/rest/v1/"
        return 1
    fi
}

# Function to check if app is reachable
check_app() {
    if curl -sf http://localhost:3000/api/health > /dev/null 2>&1; then
        return 0
    else
        echo "WARNING: App not reachable at http://localhost:3000/api/health (continuing anyway)"
        return 0  # Non-fatal, harness may still work
    fi
}

# Function to reset database
reset_db() {
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Resetting database..."
    
    # Try supabase CLI first
    if command -v supabase > /dev/null 2>&1; then
        cd "$WORKSPACE_DIR"
        supabase db reset || {
            echo "ERROR: Database reset failed"
            exit 1
        }
    # Try pnpm script
    elif command -v pnpm > /dev/null 2>&1; then
        cd "$WORKSPACE_DIR"
        pnpm db:reset || {
            echo "ERROR: Database reset failed via pnpm"
            exit 1
        }
    else
        echo "ERROR: Neither supabase CLI nor pnpm found. Cannot reset database."
        exit 1
    fi
    
    # Wait a moment for services to stabilize
    sleep 2
    
    # Verify Supabase is reachable
    local retries=0
    while [ $retries -lt 10 ]; do
        if check_supabase; then
            echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Database reset complete"
            return 0
        fi
        retries=$((retries + 1))
        sleep 1
    done
    
    echo "ERROR: PostgREST unreachable after reset"
    exit 1
}

# Function to run chaos test
run_chaos_test() {
    local seed=$1
    local duration=$2
    local max_events=$3
    local concurrency=$4
    
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Running chaos test: seed=$seed duration=${duration}s events=$max_events concurrency=$concurrency"
    
    # Load environment variables from .env.chaos
    if [ -f "$CHAOS_DIR/.env.chaos" ]; then
        set -a
        source "$CHAOS_DIR/.env.chaos"
        set +a
    fi
    
    # Run the harness directly with Node.js
    cd "$CHAOS_DIR"
    node harness/index.mjs \
        --seed "$seed" \
        --duration "$duration" \
        --max-events "$max_events" \
        --concurrency "$concurrency" \
        --target-url http://localhost:3000 2>&1
}

# Function to log result
log_result() {
    local run_num=$1
    local seed=$2
    local duration=$3
    local events=$4
    local result=$5
    local invariant=${6:-""}
    local event_index=${7:-""}
    
    local log_line="RUN $run_num | seed=$seed | duration=${duration}s | events=$events | result=$result"
    if [ "$result" = "FAIL" ]; then
        log_line="$log_line | invariant=$invariant | event_index=$event_index"
    fi
    
    echo "$log_line" >> "$LOG_FILE"
    echo "$log_line"
}

# Main loop
echo "=== Chaos Soak Test Started ===" | tee -a "$LOG_FILE"
echo "Start time: $(date)" | tee -a "$LOG_FILE"

# Initial checks
echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Checking prerequisites..."
if ! check_supabase; then
    echo "ERROR: Supabase not reachable. Please start Supabase first."
    echo "Try: cd $WORKSPACE_DIR && pnpm supabase:start"
    exit 1
fi
check_app

echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Prerequisites OK, starting soak loop..."
echo ""

while true; do
    RUN_COUNT=$((RUN_COUNT + 1))
    
    # Step A: Reset substrate
    reset_db
    
    # Step B: Medium soak (baseline churn)
    SEED_B=$(random_seed)
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] === RUN $RUN_COUNT - Step B: Medium Soak ==="
    
    OUTPUT_B=$(run_chaos_test "$SEED_B" 300 3000 12) || {
        EXIT_CODE=$?
        if echo "$OUTPUT_B" | grep -q "FAIL"; then
            INVARIANT=$(echo "$OUTPUT_B" | grep "invariant:" | sed 's/.*invariant: //' | cut -d' ' -f1)
            EVENT_INDEX=$(echo "$OUTPUT_B" | grep "event_index:" | sed 's/.*event_index: //' | cut -d' ' -f1)
            log_result "$RUN_COUNT" "$SEED_B" "300" "0" "FAIL" "$INVARIANT" "$EVENT_INDEX"
            echo "STOPPING: Invariant failure detected"
            exit 1
        else
            log_result "$RUN_COUNT" "$SEED_B" "300" "0" "FAIL" "harness_error" "-1"
            echo "STOPPING: Harness error"
            exit 1
        fi
    }
    
    # Parse output for events executed
    EVENTS_B=$(echo "$OUTPUT_B" | grep "events:" | sed 's/.*events: //' | cut -d' ' -f1 || echo "0")
    DURATION_B=$(echo "$OUTPUT_B" | grep "duration:" | sed 's/.*duration: //' | cut -d's' -f1 || echo "300")
    
    if echo "$OUTPUT_B" | grep -q "PASS"; then
        log_result "$RUN_COUNT" "$SEED_B" "$DURATION_B" "$EVENTS_B" "PASS"
    else
        INVARIANT=$(echo "$OUTPUT_B" | grep "invariant:" | sed 's/.*invariant: //' | cut -d' ' -f1 || echo "unknown")
        EVENT_INDEX=$(echo "$OUTPUT_B" | grep "event_index:" | sed 's/.*event_index: //' | cut -d' ' -f1 || echo "-1")
        log_result "$RUN_COUNT" "$SEED_B" "$DURATION_B" "$EVENTS_B" "FAIL" "$INVARIANT" "$EVENT_INDEX"
        echo "STOPPING: Invariant failure detected"
        exit 1
    fi
    
    # Step C: Heavy soak (pressure spike) - no reset, same DB state
    SEED_C=$(random_seed)
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] === RUN $RUN_COUNT - Step C: Heavy Soak ==="
    
    OUTPUT_C=$(run_chaos_test "$SEED_C" 600 6000 12) || {
        EXIT_CODE=$?
        if echo "$OUTPUT_C" | grep -q "FAIL"; then
            INVARIANT=$(echo "$OUTPUT_C" | grep "invariant:" | sed 's/.*invariant: //' | cut -d' ' -f1)
            EVENT_INDEX=$(echo "$OUTPUT_C" | grep "event_index:" | sed 's/.*event_index: //' | cut -d' ' -f1)
            log_result "$RUN_COUNT" "$SEED_C" "600" "0" "FAIL" "$INVARIANT" "$EVENT_INDEX"
            echo "STOPPING: Invariant failure detected"
            exit 1
        else
            log_result "$RUN_COUNT" "$SEED_C" "600" "0" "FAIL" "harness_error" "-1"
            echo "STOPPING: Harness error"
            exit 1
        fi
    }
    
    # Parse output for events executed
    EVENTS_C=$(echo "$OUTPUT_C" | grep "events:" | sed 's/.*events: //' | cut -d' ' -f1 || echo "0")
    DURATION_C=$(echo "$OUTPUT_C" | grep "duration:" | sed 's/.*duration: //' | cut -d's' -f1 || echo "600")
    
    if echo "$OUTPUT_C" | grep -q "PASS"; then
        log_result "$RUN_COUNT" "$SEED_C" "$DURATION_C" "$EVENTS_C" "PASS"
    else
        INVARIANT=$(echo "$OUTPUT_C" | grep "invariant:" | sed 's/.*invariant: //' | cut -d' ' -f1 || echo "unknown")
        EVENT_INDEX=$(echo "$OUTPUT_C" | grep "event_index:" | sed 's/.*event_index: //' | cut -d' ' -f1 || echo "-1")
        log_result "$RUN_COUNT" "$SEED_C" "$DURATION_C" "$EVENTS_C" "FAIL" "$INVARIANT" "$EVENT_INDEX"
        echo "STOPPING: Invariant failure detected"
        exit 1
    fi
    
    echo "[$(date +%Y-%m-%d\ %H:%M:%S)] === RUN $RUN_COUNT Complete ===="
    echo ""
    
    # Continue to next run (loop back to Step A)
done
