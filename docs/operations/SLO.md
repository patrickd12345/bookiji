# Service Level Objectives (SLOs)

**Last Updated:** January 27, 2025  
**Status:** Active Monitoring

## Overview

Bookiji defines Service Level Objectives (SLOs) to measure and maintain platform reliability, performance, and user experience. SLOs provide objective truth for operational decisions and help prevent burnout by setting clear expectations.

## SLO Definitions

### 🧠 Jarvis Incident Commander SLOs

#### Jarvis Decision Latency
- **Definition:** Time from incident event → escalation decision emitted
- **Target:** 99% < 250ms
- **Alert:** p99 > 500ms for 5 minutes
- **Why:** Jarvis must be reflex-fast. Slow decisions mean delayed notifications.

#### Escalation Correctness
- **Definition:** % of decisions violating invariants
- **Target:** 0% (zero tolerance)
- **Measurement:** CI + runtime invariant counters
- **Alert:** Any non-zero value (immediate)
- **Why:** Jarvis correctness is binary, not statistical. One violation is one too many.

#### ACK Responsiveness
- **Definition:** Time from first notification → ACK received
- **Target:** 90% < 5 minutes
- **Observation-only:** No alert initially (data collection phase)
- **Why:** This becomes the input to Phase 5 policy suggestions later. We need baseline data.

### 📅 Booking Engine SLOs

#### Booking Success Rate
- **Definition:** Confirmed bookings / booking attempts
- **Target:** ≥ 99.5%
- **Alert:** < 99% over 10 minute window
- **Why:** Booking failures directly impact revenue and user trust.

#### Booking Latency
- **Definition:** API request → booking confirmation response
- **Target:** p95 < 400ms
- **Alert:** p95 > 700ms
- **Why:** Slow bookings create poor user experience and increase abandonment.

#### Payment Integrity
- **Definition:** Stripe-confirmed bookings without reconciliation error
- **Target:** 100% (zero tolerance)
- **Alert:** Any mismatch (immediate)
- **Why:** Money paths get no grace. Payment errors are critical.

### API Performance SLOs

#### General API (`api_general`)
- **P95 Latency:** ≤ 500ms
- **P99 Latency:** ≤ 1000ms
- **Error Rate:** ≤ 1% (0.01)
- **Cache Hit Rate:** ≥ 30% (0.30)
- **Warning Threshold:** 1.2x target (600ms P95, 1200ms P99)
- **Critical Threshold:** 2.0x target (1000ms P95, 2000ms P99)

#### Search API (`api_search`)
- **P95 Latency:** ≤ 300ms
- **P99 Latency:** ≤ 600ms
- **Error Rate:** ≤ 0.5% (0.005)
- **Cache Hit Rate:** ≥ 40% (0.40)
- **Warning Threshold:** 1.2x target (360ms P95, 720ms P99)
- **Critical Threshold:** 2.0x target (600ms P95, 1200ms P99)

#### Admin API (`api_admin`)
- **P95 Latency:** ≤ 800ms
- **P99 Latency:** ≤ 1500ms
- **Error Rate:** ≤ 2% (0.02)
- **Cache Hit Rate:** ≥ 20% (0.20)
- **Warning Threshold:** 1.2x target (960ms P95, 1800ms P99)
- **Critical Threshold:** 2.0x target (1600ms P95, 3000ms P99)

#### Booking API (`api_booking`)
- **P95 Latency:** ≤ 400ms
- **P99 Latency:** ≤ 800ms
- **Error Rate:** ≤ 1% (0.01)
- **Cache Hit Rate:** ≥ 35% (0.35)
- **Warning Threshold:** 1.2x target (480ms P95, 960ms P99)
- **Critical Threshold:** 2.0x target (800ms P95, 1600ms P99)

### Cache Performance SLOs

#### Overall Cache Hit Rate
- **Target:** ≥ 30%
- **Warning Threshold:** 25%
- **Critical Threshold:** 20%

#### Search Query Hit Rate
- **Target:** ≥ 50%
- **Warning Threshold:** 45%
- **Critical Threshold:** 40%

#### Average Response Time
- **Target:** ≤ 500ms
- **Warning Threshold:** 600ms
- **Critical Threshold:** 800ms

#### Cache Invalidation Efficiency
- **Target:** ≤ 20% invalidation rate
- **Warning Threshold:** 25%
- **Critical Threshold:** 35%

## Monitoring & Enforcement

### Database Schema

SLOs are stored in the `slo_config` table:

```sql
CREATE TABLE slo_config (
    id SERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL UNIQUE,
    target_p95_ms INTEGER NOT NULL,
    target_p99_ms INTEGER NOT NULL,
    target_error_rate DECIMAL(5,4) NOT NULL,
    target_cache_hit_rate DECIMAL(5,4) NOT NULL,
    warning_threshold_multiplier DECIMAL(3,2) DEFAULT 1.2,
    critical_threshold_multiplier DECIMAL(3,2) DEFAULT 2.0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Violation Tracking

SLO violations are recorded in `slo_violations`:

```sql
CREATE TABLE slo_violations (
    id BIGSERIAL PRIMARY KEY,
    metric_name TEXT NOT NULL,
    violation_type TEXT NOT NULL, -- 'p95', 'p99', 'error_rate', 'cache_hit_rate'
    current_value DECIMAL(10,4) NOT NULL,
    threshold_value DECIMAL(10,4) NOT NULL,
    severity TEXT NOT NULL, -- 'warning', 'critical'
    endpoint TEXT,
    bucket TIMESTAMPTZ NOT NULL,
    violation_count INTEGER DEFAULT 1,
    first_violation_at TIMESTAMPTZ DEFAULT NOW(),
    last_violation_at TIMESTAMPTZ DEFAULT NOW(),
    resolved_at TIMESTAMPTZ,
    resolved_by TEXT
);
```

### Automated Compliance Checking

The `check_slo_compliance()` database function:
- Evaluates current metrics against SLO targets
- Records violations with severity (warning/critical)
- Aggregates violation counts
- Returns compliance summary

**Execution:** Called every 5 minutes via `SLOMonitor` class

### Monitoring Components

1. **SLOMonitor** (`src/lib/observability/sloMonitor.ts`)
   - Continuous monitoring with configurable interval
   - Automatic violation detection and recording
   - Compliance reporting

2. **SLO Probe Middleware** (`src/middleware/sloProbe.ts`)
   - Wraps API handlers to measure latency
   - Logs SLO violations in real-time
   - Provides endpoint-specific metrics

3. **Admin Dashboard** (`src/app/admin/slo/page.tsx`)
   - Visual SLO compliance dashboard
   - Violation history and trends
   - Configuration management

4. **API Endpoints**
   - `GET /api/admin/check-slos` - Manual compliance check
   - `GET /api/ops/slo/status` - Current SLO status
   - `GET /api/ops/slo/latency` - Latency metrics
   - `GET /api/ops/slo/errors` - Error rate metrics

## Alerting & Escalation

### Warning Level
- **Trigger:** Metric exceeds warning threshold (1.2x target)
- **Action:** Logged, visible in dashboard
- **Response:** Monitor trend, investigate if persistent

### Critical Level
- **Trigger:** Metric exceeds critical threshold (2.0x target)
- **Action:** 
  - Logged with high priority
  - Visible in dashboard with alert badge
  - May trigger Jarvis incident (if configured)
- **Response:** Immediate investigation required

### Resolution Tracking
- Violations remain in `slo_violations` until `resolved_at` is set
- Admin can mark violations as resolved
- Resolution history tracked for post-mortem analysis

## CI Integration

### SLO Dashboard Export

GitHub Actions workflow (`.github/workflows/slo-dashboard.yml`):
- Runs daily at 3 AM UTC
- Exports SLO compliance data to JSON
- Generates `slo/slo-summary.json` and `slo/slo-timeseries.json`
- Uploads as artifacts for dashboard integration

### Metrics Collection

CI runs collect:
- Pass/fail rates
- P50/P95 latencies for booking flows
- Synthetic uptime approximation
- Compliance against targets

## Best Practices

### Setting SLOs

1. **Start Conservative:** Set achievable targets based on current performance
2. **Measure First:** Collect baseline metrics before setting targets
3. **Review Regularly:** Adjust SLOs based on business needs and actual performance
4. **Document Rationale:** Explain why each SLO target was chosen

### Responding to Violations

1. **Don't Panic:** SLOs are targets, not hard limits
2. **Investigate Trends:** Single violations may be noise; patterns indicate issues
3. **Prioritize Critical:** Focus on critical violations first
4. **Document Actions:** Record what was done to resolve violations

### Preventing Burnout

- **Clear Expectations:** SLOs define what "good" looks like
- **Objective Truth:** No subjective "is it fast enough?" debates
- **Prioritization:** Focus on critical violations, not every warning
- **Automation:** Let the system detect violations, humans investigate

## Configuration

### Updating SLO Targets

```sql
UPDATE slo_config 
SET target_p95_ms = 450,
    target_p99_ms = 900,
    updated_at = NOW()
WHERE metric_name = 'api_booking';
```

### Adding New SLOs

```sql
INSERT INTO slo_config (
    metric_name,
    target_p95_ms,
    target_p99_ms,
    target_error_rate,
    target_cache_hit_rate
) VALUES (
    'api_new_endpoint',
    500,
    1000,
    0.01,
    0.30
);
```

## Related Documentation

- `docs/SLO_DASHBOARD.md` - Dashboard integration guide
- `src/lib/observability/sloMonitor.ts` - Monitoring implementation
- `src/middleware/sloProbe.ts` - Middleware for latency tracking
- `supabase/migrations/20250824000000_final_punchlist_implementation.sql` - Database schema

## Future Enhancements

- [ ] SLO-based auto-scaling
- [ ] Predictive violation alerts
- [ ] SLO budget tracking (error budget)
- [ ] Multi-environment SLOs (staging vs production)
- [ ] Custom SLO definitions per endpoint

