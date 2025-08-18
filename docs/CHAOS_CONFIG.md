# 🌪️ Chaos Engineering Configuration

## Environment Variables

Add these to `.env.local` or CI secrets for chaos testing:

```bash
# Master switch
CHAOS_ENABLED=false

# Base chaos parameters  
CHAOS_LATENCY_MS=0          # baseline extra latency (ms)
CHAOS_FAILURE_RATE=0        # 0-1 float (e.g. 0.1 = 10% random 500s)
CHAOS_TIMEOUT_RATE=0        # 0-1 float (e.g. 0.05 = 5% request aborts)

# Targeted chaos for critical services
CHAOS_SUPABASE_FAIL_RATE=0  # 0-1 float (Supabase 503s)
CHAOS_AI_FAIL_RATE=0        # 0-1 float (Ollama/AI endpoints)
CHAOS_PAYMENT_FAIL_RATE=0   # 0-1 float (Stripe/payment flows)
```

## Chaos Presets

### Light Chaos (CI-safe, must pass 100%)
```bash
CHAOS_ENABLED=true
CHAOS_LATENCY_MS=150
CHAOS_FAILURE_RATE=0.05
CHAOS_TIMEOUT_RATE=0.02
CHAOS_SUPABASE_FAIL_RATE=0.10
```

### Storm Chaos (allowed flakiness, tests graceful degradation)
```bash
CHAOS_ENABLED=true
CHAOS_LATENCY_MS=400
CHAOS_FAILURE_RATE=0.15
CHAOS_TIMEOUT_RATE=0.08
CHAOS_SUPABASE_FAIL_RATE=0.30
CHAOS_AI_FAIL_RATE=0.25
```

## Commands

```bash
# Light chaos (CI-safe)
pnpm qa:chaos:light

# Storm chaos (report-only)
pnpm qa:chaos:storm

# Offline mode testing
pnpm qa:chaos:offline
```
