# 📡 Bookiji Resilience Telemetry System

## Overview

The Resilience Telemetry System is Bookiji's "black box recorder" that tracks every $1 fee, click, and retry in real-time. It provides comprehensive observability into how our resilience patterns perform under real-world conditions.

## 🎯 Core Signals Tracked

### 1. Optimistic Actions
- **Start**: When optimistic UI begins
- **Success**: When action completes successfully
- **Rollback**: When optimistic state reverts due to failure

**Data Captured:**
```typescript
{
  action_id: string,
  duration_ms: number,
  rollback_reason?: string
}
```

### 2. Retry Logic
- **Attempt**: Each retry attempt with backoff
- **Success**: Successful retry completion
- **Failure**: Final retry failure

**Data Captured:**
```typescript
{
  api_endpoint: string,
  retry_count: number,
  backoff_ms: number,
  total_duration_ms: number,
  final_error?: string
}
```

### 3. Error Boundaries
- **Triggered**: When component crashes
- **Recovered**: When user recovers from error

**Data Captured:**
```typescript
{
  error_type: string,
  error_message: string,
  recovery_method: string,
  recovery_time_ms: number
}
```

### 4. Loading States
- **Shown**: When skeleton appears
- **Hidden**: When skeleton disappears

**Data Captured:**
```typescript
{
  duration_ms: number
}
```

### 5. Debounced Clicks
- **Suppressed**: When duplicate clicks are prevented

**Data Captured:**
```typescript
{
  suppression_reason: 'already_processing' | 'too_soon'
}
```

## 🚀 Implementation

### Client-Side Telemetry

```typescript
import { useResilienceTelemetry } from '@/lib/telemetry/resilienceTelemetry'

// In your component
const { setUserId, track } = useResilienceTelemetry()

// Set user ID when user logs in
useEffect(() => {
  if (userId) {
    setUserId(userId)
  }
}, [userId])

// Track specific events
track.optimisticActionStart('PaymentButton', 'payment_123')
track.loadingSkeletonShown('VendorInbox')
```

### Enhanced Hooks

```typescript
// Telemetry-enhanced optimistic action
const { execute, status, error } = useOptimisticActionWithTelemetry({
  action: async () => { /* ... */ },
  component: 'PaymentButton', // Required for telemetry
  onSuccess: (result) => { /* ... */ },
  onError: (error) => { /* ... */ }
})

// Telemetry-enhanced debounced click
const debouncedPayment = useDebouncedClickWithTelemetry(
  () => executePayment(),
  { 
    delay: 500,
    component: 'PaymentButton' // Required for telemetry
  }
)
```

## 📊 High-Value Derived Metrics

### 1. Rollback Rate
```
Rollback Rate = (rollbacks / optimistic_actions) × 100
```
- **Healthy Baseline**: <5%
- **Alert Threshold**: >10%
- **Spike Indicates**: API instability, network issues

### 2. Retry Success Rate
```
Retry Success Rate = (successful_retries / total_retries) × 100
```
- **Healthy Baseline**: ~80%
- **Alert Threshold**: <60%
- **Low Indicates**: API flakiness, persistent failures

### 3. Error Recovery Rate
```
Error Recovery Rate = (recovered_sessions / total_boundary_triggers) × 100
```
- **Healthy Baseline**: >95%
- **Alert Threshold**: <90%
- **Low Indicates**: UX degradation, user frustration

### 4. Duplicate Suppression Rate
```
Duplicate Suppression Rate = (suppressed_clicks / attempted_duplicates) × 100
```
- **Target**: 100%
- **Any Leakage**: Indicates a bug in debouncing logic

## 🗄️ Database Schema

### Core Table: `resilience_metrics`
```sql
CREATE TABLE resilience_metrics (
  id UUID PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id),
  session_id TEXT NOT NULL,
  component TEXT NOT NULL,
  signal TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb
);
```

### Materialized Views
- **`resilience_metrics_hourly`**: Hourly aggregations
- **`resilience_metrics_daily`**: Daily aggregations

### Key Functions
- **`get_resilience_metrics()`**: Calculate health metrics
- **`refresh_resilience_metrics_views()`**: Refresh aggregations

## 📈 Dashboard & Visualization

### Admin Dashboard
The `ResilienceDashboard` component provides real-time visibility:

```typescript
import { ResilienceDashboard } from '@/components/admin/ResilienceDashboard'

// In your admin page
<ResilienceDashboard />
```

### Key Panels
1. **Rollback Rate**: Should hug the floor (<5%)
2. **Retry Success**: Should slope down (80%+)
3. **Error Recovery**: Should plateau high (95%+)
4. **User Latency**: Median + 95th percentile

## 🚨 Alerting & Monitoring

### Alert Thresholds
- **Rollback Rate**: >10%
- **Retry Success**: <60%
- **Error Recovery**: <90%
- **Latency**: >2s for >5% of requests

### Alert Channels
- Slack notifications
- Email alerts
- Dashboard status changes

## 🔧 Setup & Configuration

### 1. Database Migration
```bash
# Apply the telemetry migration
supabase db push
```

### 2. Environment Variables
```bash
# Required for telemetry endpoint
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
SUPABASE_SECRET_KEY=your_secret_key
```

### 3. Component Integration
```typescript
// Replace existing hooks with telemetry versions
import { useOptimisticActionWithTelemetry } from '@/hooks/useOptimisticActionWithTelemetry'
import { useDebouncedClickWithTelemetry } from '@/hooks/useDebouncedClickWithTelemetry'

// Add component names to all telemetry calls
const { execute } = useOptimisticActionWithTelemetry({
  action: async () => { /* ... */ },
  component: 'YourComponentName', // Required!
  // ... other options
})
```

## 📊 Performance Benchmarks

### Response Time Targets
- **Optimistic UI**: <100ms
- **Rollback Recovery**: <200ms
- **Error Boundary**: <500ms
- **Loading Skeleton**: <1s

### Success Rate Targets
- **Duplicate Suppression**: 100%
- **Error Recovery**: 95%+
- **Retry Success**: 80%+
- **Overall Resilience**: 99%+

## 🔍 Troubleshooting

### Common Issues

#### 1. No Telemetry Data
- Check API endpoint `/api/telemetry/resilience`
- Verify database connection
- Check RLS policies

#### 2. High Rollback Rate
- Investigate API stability
- Check network conditions
- Review error handling

#### 3. Low Retry Success
- API endpoint health
- Backoff configuration
- Error classification

### Debug Commands
```sql
-- Check recent telemetry
SELECT * FROM resilience_metrics 
WHERE ts > NOW() - INTERVAL '1 hour'
ORDER BY ts DESC;

-- Check component health
SELECT component, signal, COUNT(*) 
FROM resilience_metrics 
WHERE ts > NOW() - INTERVAL '24 hours'
GROUP BY component, signal;
```

## 🚀 Future Enhancements

### Planned Features
1. **Real-time Streaming**: WebSocket updates for live dashboards
2. **Machine Learning**: Predictive failure detection
3. **A/B Testing**: Compare resilience pattern effectiveness
4. **User Journey Tracking**: End-to-end resilience monitoring
5. **Cost Analysis**: Impact of failures on business metrics

### Integration Points
- **Grafana**: Advanced time-series visualization
- **Datadog**: APM and infrastructure correlation
- **Slack**: Automated incident response
- **PagerDuty**: Escalation management

## 📚 Additional Resources

- [Resilience Patterns Documentation](./RESILIENCE_PATTERNS.md)
- [Chaos Testing Guide](./CHAOS_TESTING.md)
- [Performance Monitoring](./PERFORMANCE_MONITORING.md)
- [Admin Dashboard Guide](./ADMIN_DASHBOARD.md)

---

**The Resilience Telemetry System transforms Bookiji from "hoping resilience works" to "knowing exactly how well it performs" in production. Every $1 fee, every click, every retry is now observable, measurable, and actionable.** 🚀


