# 🏙️ SimCity Production Runbook

## Overview

This runbook documents how to use Bookiji's **SimCity Testing Engine** as a **production validator** with guard-railed chaos engineering. The engine transforms your staging environment into a persistent simulation sandbox where synthetic citizens interact autonomously, continuously validating system health and performance.

## 🎯 What We've Built

A **continuous validation engine** that's not just load testing, but a **living ecosystem** that pressure-tests:
- **Product functionality** (booking flows, vendor responses)
- **Infrastructure** (cache performance, database scaling)
- **Operations** (monitoring, alerting, self-healing)

## 🚀 Quick Start

### 1. Access the Dashboard

Navigate to `/admin/simcity` (admin access required).

### 2. Choose Your Scenario

**Baseline (12 min real = 20 sim hours)**
- Normal load testing
- All invariants checked
- Perfect for CI/CD validation

**Growth Curve (29 min real = 48 sim hours)**
- 2x spawn every 6 sim hours
- Tests scaling under load
- Monitors p99, cache performance

**Disaster Mix (3.6 min real = 6 sim hours)**
- Cache invalidation storm
- MV refresh pause
- RLS misconfiguration
- Tests self-healing capabilities

**Soak (16.8 hours real = 7 sim days)**
- Low/steady traffic
- Catches memory leaks
- Monitors long-term drift

## 🔧 API Reference

### Start Simulation

```bash
# Start with seed for reproducibility
curl -X POST /api/simcity/start \
  -H 'Content-Type: application/json' \
  -d '{
    "seed": 42,
    "scenario": "baseline",
    "policies": {
      "customerSpawnRate": 0.3,
      "maxConcurrentAgents": 50
    },
    "durationMinutes": 15
  }'
```

*Tip:* Provide `durationMinutes` to auto-stop timed drills (e.g., `30` for the vendor SLA run) even when overriding scenario defaults.

### Adjust Policies

```bash
# Real-time policy adjustment
curl -X POST /api/simcity/policy \
  -H 'Content-Type: application/json' \
  -d '{
    "policies": {
      "customerSpawnRate": 0.8,
      "maxConcurrentAgents": 200
    }
  }'
```

### Trigger Events

```bash
# Manual chaos engineering
curl -X POST /api/simcity/event \
  -H 'Content-Type: application/json' \
  -d '{
    "type": "CACHE_INVALIDATION_STORM",
    "durationMin": 30,
    "parameters": {
      "invalidationRate": 0.8
    }
  }'
```

### Get Summary

```bash
# Comprehensive run results
curl /api/simcity/summary?runId=latest
```

## 🛡️ Invariants (Pass/Fail Gates)

### API SLOs (Critical)
- **P95 Response Time**: < 500ms
- **P99 Response Time**: < 1000ms  
- **Error Rate**: < 1%

### Business Metrics (Critical)
- **Booking Funnel Success**: ≥ 85% (book → confirm)
- **Vendor SLA Response**: ≥ 90% within 2 sim hours

### Cache Performance (Warning)
- **Cache Hit Rate**: ≥ 50% for search
- **Invalidation Spike**: < 35% sustained

### Data Integrity (Critical)
- **Zero Double Bookings**: 0 occurrences
- **No Orphaned References**: 0 orphaned vendor/customer refs

### System Health (Critical)
- **Tick Drift**: < 100ms per real second
- **Memory Usage**: < 80% of available

## 📊 Scenario Pack

### Baseline (Normal Load)
```typescript
{
  duration: { realMinutes: 12, simHours: 20 },
  policies: {
    customerSpawnRate: 0.3,
    vendorSpawnRate: 0.1,
    maxConcurrentAgents: 50
  },
  events: [],
  invariants: ['api_p95_response_time', 'api_p99_response_time', 'api_error_rate', 'booking_funnel_success', 'vendor_sla_response', 'cache_hit_rate', 'zero_double_bookings', 'no_orphaned_references', 'orchestrator_tick_drift']
}
```

### Growth Curve (Load Testing)
```typescript
{
  duration: { realMinutes: 29, simHours: 48 },
  policies: {
    customerSpawnRate: 0.6, // Start at 2x
    maxConcurrentAgents: 100
  },
  events: [
    { type: 'RATE_LIMIT_BURST', triggerAt: 360, duration: 60, parameters: { multiplier: 2.0 } },
    { type: 'RATE_LIMIT_BURST', triggerAt: 720, duration: 60, parameters: { multiplier: 2.5 } },
    { type: 'RATE_LIMIT_BURST', triggerAt: 1080, duration: 60, parameters: { multiplier: 3.0 } }
  ],
  invariants: ['api_p95_response_time', 'api_p99_response_time', 'api_error_rate', 'cache_hit_rate', 'cache_invalidation_spike', 'orchestrator_tick_drift', 'memory_usage']
}
```

### Disaster Mix (Chaos Engineering)
```typescript
{
  duration: { realMinutes: 3.6, simHours: 6 },
  policies: {
    customerSpawnRate: 0.8, // High load
    maxConcurrentAgents: 150,
    tickSpeedMs: 2000 // Faster ticks
  },
  events: [
    { type: 'CACHE_INVALIDATION_STORM', triggerAt: 30, duration: 30, parameters: { invalidationRate: 0.8 } },
    { type: 'PAUSE_MV_REFRESH', triggerAt: 90, duration: 60, parameters: { pauseDuration: 60 } },
    { type: 'RLS_MISCONFIG', triggerAt: 180, duration: 30, parameters: { misconfigType: 'admin_access' } }
  ],
  invariants: ['api_error_rate', 'cache_hit_rate', 'cache_invalidation_spike', 'orchestrator_tick_drift', 'memory_usage']
}
```

### Vendor SLA Drill (Vendor Responsiveness)
```typescript
{
  duration: { realMinutes: 30, simHours: 50 },
  policies: {
    customerSpawnRate: 0.4,
    vendorSpawnRate: 0.25,
    maxConcurrentAgents: 60,
  },
  events: [],
  invariants: ['vendor_sla_response', 'booking_funnel_success', 'api_p95_response_time'],
  scenarioOverride: 'vendor_sla'
}
```

### Soak (Stability Testing)
```typescript
{
  duration: { realMinutes: 1008, simHours: 168 }, // 7 sim days
  policies: {
    customerSpawnRate: 0.1, // Low load
    maxConcurrentAgents: 25,
    tickSpeedMs: 5000 // Slower ticks
  },
  events: [],
  invariants: ['orchestrator_tick_drift', 'memory_usage', 'api_error_rate', 'cache_hit_rate']
}
```

## 🔄 CI Integration

### GitHub Actions Workflow

```yaml
name: SimCity Validation
on:
  pull_request:
    paths: ['src/**', 'supabase/**']
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM

jobs:
  simcity-validation:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
      - name: Install dependencies
        run: pnpm install
      - name: Start SimCity
        run: |
          # Start baseline scenario
          curl -X POST http://localhost:3000/api/simcity/start \
            -H 'Content-Type: application/json' \
            -d '{"seed": 42, "scenario": "baseline"}'
      - name: Wait for completion
        run: |
          # Wait 12 minutes for baseline
          sleep 720
      - name: Check results
        run: |
          # Get summary and check for violations
          SUMMARY=$(curl -s http://localhost:3000/api/simcity/summary)
          VIOLATIONS=$(echo $SUMMARY | jq '.data.violations | length')
          
          if [ "$VIOLATIONS" -gt 0 ]; then
            echo "❌ SimCity validation failed with $VIOLATIONS violations"
            echo "$SUMMARY" | jq '.data.violations'
            exit 1
          else
            echo "✅ SimCity validation passed"
          fi
      - name: Stop simulation
        run: |
          curl -X POST http://localhost:3000/api/simcity/stop
```

### Failure Handling

When invariants are violated, the CI job will:
1. **Fail immediately** (no waiting for completion)
2. **Capture violation details** with run ID and seed
3. **Auto-open GitHub issue** with:
   - Violated invariant details
   - Run ID and seed for reproduction
   - Performance metrics and charts
   - Links to admin dashboards

## 🎮 Quick Control Examples

### High Load Testing
```bash
curl -X POST /api/simcity/policy \
  -d '{"policies": {"customerSpawnRate": 0.8, "maxConcurrentAgents": 200}}'
```

### Aggressive Behavior
```bash
curl -X POST /api/simcity/policy \
  -d '{"policies": {"rescheduleChance": 0.7, "cancelChance": 0.4}}'
```

### Cache Storm
```bash
curl -X POST /api/simcity/event \
  -d '{"type": "CACHE_INVALIDATION_STORM", "durationMin": 30, "parameters": {"invalidationRate": 0.8}}'
```

### Rate Limit Burst
```bash
curl -X POST /api/simcity/event \
  -d '{"type": "RATE_LIMIT_BURST", "durationMin": 15, "parameters": {"multiplier": 3.0}}'
```

## 🛡️ Safety Features

### Staging-Only
- **Never targets production**
- **Synthetic user namespace**: `synthetic+id@example.com`
- **Test authentication endpoint**: `/api/test/login`

### Resource Limits
- **Maximum concurrent agents**: Configurable cap
- **Agent step limits**: Prevents infinite loops
- **Memory monitoring**: Automatic cleanup

### Data Isolation
- **Synthetic user flag**: Database separation
- **Nightly cleanup**: Automatic data purging
- **Test environment**: Isolated from real users

### Kill Switch
- **Immediate stop**: `/api/simcity/stop`
- **Agent cleanup**: Preempts all running agents
- **Queue draining**: Cancels pending operations

## 📈 Monitoring & Alerting

### Real-Time Metrics
- **Live KPI dashboard** at `/admin/simcity`
- **Server-Sent Events** for real-time updates
- **Performance charts** with drill-through to audit logs

### Alerting
- **Invariant violations** trigger immediate alerts
- **Performance degradation** warnings
- **System health** monitoring

### Drill-Through
- **SimCity dashboard** → Performance metrics
- **Performance charts** → Audit logs
- **Event timeline** → Detailed analysis

## 🔍 Troubleshooting

### Common Issues

#### Simulation Won't Start
- Check admin permissions
- Verify database connectivity
- Review server logs for errors

#### High Error Rates
- Reduce `maxConcurrentAgents`
- Increase `tickSpeedMs` for slower simulation
- Check system resources

#### Dashboard Not Updating
- Verify EventSource connection
- Check browser console for errors
- Ensure simulation is running

#### Invariant Violations
- Review violation details
- Check system performance
- Adjust thresholds if needed

### Debug Mode

Enable detailed logging:
```bash
DEBUG=simcity:* npm run dev
```

### Reproducing Failures

Use the run ID and seed to reproduce:
```bash
curl -X POST /api/simcity/start \
  -d '{"seed": 42, "scenario": "baseline"}'
```

## 🚀 What This Enables

### Development
- **Feature Testing**: Validate new functionality under load
- **Regression Testing**: Ensure changes don't break existing flows
- **Performance Optimization**: Identify bottlenecks and optimize

### QA
- **Load Testing**: Understand system limits
- **Stress Testing**: Find breaking points
- **Behavioral Testing**: Discover edge cases

### Operations
- **Capacity Planning**: Understand resource requirements
- **Monitoring**: Real-time system health
- **Alerting**: Proactive issue detection

### Business
- **Confidence**: Know your system works under realistic conditions
- **Scalability**: Understand growth limits
- **Reliability**: Continuous validation of system health

## 🎯 Next Steps

1. **Run baseline scenario** to establish performance baseline
2. **Execute growth curve** to test scaling capabilities
3. **Trigger disaster mix** to validate self-healing
4. **Integrate with CI/CD** for automated validation
5. **Set up monitoring** and alerting
6. **Document runbooks** for team members

## 🔮 Future Enhancements

### Planned Features
- **AI-Powered Agents**: GPT integration for realistic conversations
- **Playwright Integration**: Real browser automation
- **Advanced Metrics**: Conversion funnels, user journey analysis
- **Multi-Environment**: Test across staging, QA, and production-like environments

### Advanced Scenarios
- **Geographic Load**: Simulate users across different regions
- **Seasonal Patterns**: Holiday and peak season testing
- **Vendor Behavior**: Complex vendor response patterns
- **Payment Flows**: Stripe integration testing

---

**Your SimCity engine is now a production validator that continuously ensures your system works under realistic conditions. This is enterprise-grade testing infrastructure that gives you confidence to deploy with speed and reliability.** 🚀
