# 🚀 Resilience Telemetry System Setup Guide

## Overview

This guide will walk you through setting up Bookiji's comprehensive resilience telemetry system. The system provides real-time monitoring of resilience patterns, automatic alerting, and historical analysis.

## 🎯 What You'll Get

- **Real-time Resilience Monitoring**: Track every optimistic action, retry, and error boundary
- **Automatic Alerting**: Get notified when metrics breach thresholds
- **Historical Analysis**: View trends and patterns over time
- **Admin Dashboard**: Beautiful UI for monitoring system health
- **Automated Cleanup**: Cron jobs for data maintenance

## 📋 Prerequisites

- Supabase project with service role key
- Node.js 18+ and pnpm
- Environment variables configured
- Admin access to Bookiji

## 🔧 Step 1: Database Setup

### Option A: Using Supabase CLI (Recommended)

```bash
# Navigate to your project directory
cd bookijibck

# Apply the resilience telemetry migration
supabase db push
```

### Option B: Manual SQL Execution

If the CLI fails, run this SQL in your Supabase dashboard:

```sql
-- Create resilience_metrics table
CREATE TABLE IF NOT EXISTS resilience_metrics (
  id UUID PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  component TEXT NOT NULL,
  signal TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_ts ON resilience_metrics(ts);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_user_id ON resilience_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_component ON resilience_metrics(component);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_signal ON resilience_metrics(signal);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_session ON resilience_metrics(session_id);

-- Enable RLS
ALTER TABLE resilience_metrics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own telemetry" ON resilience_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert telemetry" ON resilience_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can view all telemetry" ON resilience_metrics
  FOR SELECT USING (true);

-- Create materialized views
CREATE MATERIALIZED VIEW resilience_metrics_hourly AS
SELECT 
  DATE_TRUNC('hour', ts) as hour,
  component,
  signal,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM resilience_metrics
GROUP BY DATE_TRUNC('hour', ts), component, signal;

CREATE MATERIALIZED VIEW resilience_metrics_daily AS
SELECT 
  DATE_TRUNC('day', ts) as day,
  component,
  signal,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions
FROM resilience_metrics
GROUP BY DATE_TRUNC('day', ts), component, signal;

-- Create function to calculate metrics
CREATE OR REPLACE FUNCTION get_resilience_metrics(
  start_time TIMESTAMPTZ DEFAULT NOW() - INTERVAL '24 hours',
  end_time TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  metric_name TEXT,
  metric_value NUMERIC,
  threshold NUMERIC,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  WITH metrics AS (
    SELECT 
      'rollback_rate' as metric_name,
      (COUNT(*) FILTER (WHERE signal = 'optimistic_action_rollback')::NUMERIC / 
       COUNT(*) FILTER (WHERE signal IN ('optimistic_action_start', 'optimistic_action_success', 'optimistic_action_rollback'))::NUMERIC * 100) as metric_value,
       5.0 as threshold
    FROM resilience_metrics 
    WHERE ts BETWEEN start_time AND end_time
    
    UNION ALL
    
    SELECT 
      'retry_success_rate' as metric_name,
      (COUNT(*) FILTER (WHERE signal = 'retry_success')::NUMERIC / 
       COUNT(*) FILTER (WHERE signal IN ('retry_success', 'retry_failure'))::NUMERIC * 100) as metric_value,
       80.0 as threshold
    FROM resilience_metrics 
    WHERE ts BETWEEN start_time AND end_time
    
    UNION ALL
    
    SELECT 
      'error_recovery_rate' as metric_name,
      (COUNT(*) FILTER (WHERE signal = 'error_boundary_recovered')::NUMERIC / 
       COUNT(*) FILTER (WHERE signal = 'error_boundary_triggered')::NUMERIC * 100) as metric_value,
       95.0 as threshold
    FROM resilience_metrics 
    WHERE ts BETWEEN start_time AND end_time
  )
  SELECT 
    m.metric_name,
    COALESCE(m.metric_value, 0) as metric_value,
    m.threshold,
    CASE 
      WHEN m.metric_value IS NULL THEN 'no_data'
      WHEN m.metric_value <= m.threshold THEN 'healthy'
      ELSE 'alert'
    END as status
  FROM metrics m;
END;
$$ LANGUAGE plpgsql;

-- Create refresh function
CREATE OR REPLACE FUNCTION refresh_resilience_metrics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW resilience_metrics_hourly;
  REFRESH MATERIALIZED VIEW resilience_metrics_daily;
END;
$$ LANGUAGE plpgsql;
```

## 🔧 Step 2: Environment Variables

Add these to your `.env.local` file:

```bash
# Resilience Telemetry
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
ADMIN_EMAILS=admin@yourdomain.com,ops@yourdomain.com

# Supabase (if not already set)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## 🔧 Step 3: Component Integration

### Replace Existing Hooks

Update your components to use the telemetry-enhanced hooks:

```typescript
// Before
import { useOptimisticAction, useDebouncedClick } from '@/hooks'

// After
import { useOptimisticActionWithTelemetry, useDebouncedClickWithTelemetry } from '@/hooks'

// Update hook usage
const { execute } = useOptimisticActionWithTelemetry({
  action: async () => { /* ... */ },
  component: 'YourComponentName', // Required for telemetry
  onSuccess: (result) => { /* ... */ },
  onError: (error) => { /* ... */ }
})

const debouncedAction = useDebouncedClickWithTelemetry(
  () => execute(),
  { 
    delay: 300,
    component: 'YourComponentName' // Required for telemetry
  }
)
```

### Add Telemetry to Components

```typescript
import { useResilienceTelemetry } from '@/hooks'

export function YourComponent() {
  const { setUserId, track } = useResilienceTelemetry()
  
  useEffect(() => {
    // Set user ID when user logs in
    if (userId) {
      setUserId(userId)
    }
  }, [userId, setUserId])
  
  // Track specific events
  const handleAction = () => {
    track.optimisticActionStart('YourComponent', 'action_123')
    // ... your action logic
  }
  
  return (
    // Your component JSX
  )
}
```

## 🔧 Step 4: Admin Dashboard Access

The resilience dashboard is now available at:

- **Main Dashboard**: `/admin/dashboard` (includes resilience section)
- **Dedicated Page**: `/admin/resilience` (full resilience monitoring)

### Navigation

The admin sidebar now includes a "Resilience Monitor" link for easy access.

## 🔧 Step 5: Alerting Configuration

### Slack Integration

1. Create a Slack app in your workspace
2. Add an incoming webhook
3. Copy the webhook URL to `SLACK_WEBHOOK_URL`

### Email Integration

1. Set `ADMIN_EMAILS` with comma-separated email addresses
2. The system will log alerts (integrate with your email service)

### Custom Thresholds

Modify `src/lib/alerting/resilienceAlerts.ts` to adjust alert thresholds:

```typescript
export const DEFAULT_ALERT_THRESHOLDS: AlertThreshold[] = [
  {
    metric: 'rollback_rate',
    threshold: 5.0, // Adjust this value
    operator: 'gt',
    severity: 'warning',
    message: 'Custom rollback rate message'
  }
  // ... other thresholds
]
```

## 🔧 Step 6: Automated Maintenance

### Cron Job Setup

Add this to your crontab to refresh metrics every hour:

```bash
# Refresh resilience metrics every hour
0 * * * * /usr/bin/node /path/to/bookijibck/scripts/refresh-resilience-metrics.js
```

### Manual Refresh

Run the refresh script manually:

```bash
node scripts/refresh-resilience-metrics.js
```

## 🧪 Step 7: Testing

### Test Telemetry Collection

1. Navigate to any page with resilient components
2. Perform actions (clicks, form submissions)
3. Check the browser console for telemetry logs
4. Verify data appears in `/api/admin/resilience-metrics`

### Test Alerting

1. Temporarily lower thresholds in the alerting config
2. Generate some test telemetry data
3. Verify alerts appear in the admin dashboard
4. Test acknowledgment functionality

### Test Chaos Scenarios

Use the chaos testing scripts from `TEST_PLAN.md` to validate resilience patterns.

## 📊 Step 8: Monitoring & Analysis

### Key Metrics to Watch

- **Rollback Rate**: Should stay below 5%
- **Retry Success Rate**: Should stay above 80%
- **Error Recovery Rate**: Should stay above 95%

### Dashboard Features

- Real-time metric updates (refreshes every 5 minutes)
- Alert acknowledgment system
- Historical trend analysis
- Component-level health monitoring

## 🚨 Troubleshooting

### Common Issues

#### 1. No Telemetry Data

```bash
# Check API endpoint
curl http://localhost:3000/api/telemetry/resilience

# Check database connection
curl http://localhost:3000/api/admin/resilience-metrics
```

#### 2. Database Migration Failed

```bash
# Check Supabase status
supabase status

# Verify environment variables
echo $NEXT_PUBLIC_SUPABASE_URL
echo $SUPABASE_SERVICE_ROLE_KEY
```

#### 3. Alerts Not Triggering

```bash
# Check alert thresholds
cat src/lib/alerting/resilienceAlerts.ts

# Verify notifier configuration
echo $SLACK_WEBHOOK_URL
echo $ADMIN_EMAILS
```

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

-- Verify materialized views
SELECT * FROM resilience_metrics_hourly LIMIT 5;
SELECT * FROM resilience_metrics_daily LIMIT 5;
```

## 🎯 Next Steps

1. **Monitor**: Watch the dashboard for the first 24-48 hours
2. **Tune**: Adjust thresholds based on your system's behavior
3. **Scale**: Add more components to the telemetry system
4. **Integrate**: Connect with external monitoring tools (Grafana, Datadog)

## 📚 Additional Resources

- [Resilience Telemetry Specification](./RESILIENCE_TELEMETRY_SPEC.md)
- [Chaos Testing Guide](./TEST_PLAN.md)
- [Admin Dashboard Documentation](./ADMIN_DASHBOARD.md)

---

**🎉 Congratulations! You now have a production-ready resilience telemetry system that will give you unprecedented visibility into how Bookiji handles real-world chaos.**

The system will automatically:
- Collect resilience signals from every user interaction
- Calculate health metrics in real-time
- Alert you when thresholds are breached
- Provide historical analysis and trends
- Clean up old data automatically

Your resilience patterns are now observable, measurable, and actionable! 🚀

