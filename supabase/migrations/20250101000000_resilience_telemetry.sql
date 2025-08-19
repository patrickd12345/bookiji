-- Create resilience_metrics table for tracking resilience patterns
CREATE TABLE IF NOT EXISTS resilience_metrics (
  id UUID PRIMARY KEY,
  ts TIMESTAMPTZ DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  component TEXT NOT NULL,
  signal TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_ts ON resilience_metrics(ts);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_user_id ON resilience_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_component ON resilience_metrics(component);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_signal ON resilience_metrics(signal);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_session ON resilience_metrics(session_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_component_signal ON resilience_metrics(component, signal);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_user_component ON resilience_metrics(user_id, component);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_ts_component ON resilience_metrics(ts, component);

-- Enable RLS for user data privacy
ALTER TABLE resilience_metrics ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own telemetry" ON resilience_metrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can insert telemetry" ON resilience_metrics
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can view all telemetry" ON resilience_metrics
  FOR SELECT USING (true);

-- Create materialized view for hourly aggregations
CREATE MATERIALIZED VIEW resilience_metrics_hourly AS
SELECT 
  DATE_TRUNC('hour', ts) as hour,
  component,
  signal,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(EXTRACT(EPOCH FROM (ts - LAG(ts) OVER (PARTITION BY component, signal ORDER BY ts))) * 1000) as avg_interval_ms
FROM resilience_metrics
GROUP BY DATE_TRUNC('hour', ts), component, signal;

-- Create materialized view for daily aggregations
CREATE MATERIALIZED VIEW resilience_metrics_daily AS
SELECT 
  DATE_TRUNC('day', ts) as day,
  component,
  signal,
  COUNT(*) as count,
  COUNT(DISTINCT user_id) as unique_users,
  COUNT(DISTINCT session_id) as unique_sessions,
  AVG(EXTRACT(EPOCH FROM (ts - LAG(ts) OVER (PARTITION BY component, signal ORDER BY ts))) * 1000) as avg_interval_ms
FROM resilience_metrics
GROUP BY DATE_TRUNC('day', ts), component, signal;

-- Create indexes on materialized views
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_hourly_hour ON resilience_metrics_hourly(hour);
CREATE INDEX IF NOT EXISTS idx_resilience_metrics_daily_day ON resilience_metrics_daily(day);

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_resilience_metrics_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW resilience_metrics_hourly;
  REFRESH MATERIALIZED VIEW resilience_metrics_daily;
END;
$$ LANGUAGE plpgsql;

-- Create function to calculate key resilience metrics
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
    -- Rollback Rate
    SELECT 
      'rollback_rate' as metric_name,
      (COUNT(*) FILTER (WHERE signal = 'optimistic_action_rollback')::NUMERIC / 
       COUNT(*) FILTER (WHERE signal IN ('optimistic_action_start', 'optimistic_action_success', 'optimistic_action_rollback'))::NUMERIC * 100) as metric_value,
      5.0 as threshold
    FROM resilience_metrics 
    WHERE ts BETWEEN start_time AND end_time
    
    UNION ALL
    
    -- Retry Success Rate
    SELECT 
      'retry_success_rate' as metric_name,
      (COUNT(*) FILTER (WHERE signal = 'retry_success')::NUMERIC / 
       COUNT(*) FILTER (WHERE signal IN ('retry_success', 'retry_failure'))::NUMERIC * 100) as metric_value,
      80.0 as threshold
    FROM resilience_metrics 
    WHERE ts BETWEEN start_time AND end_time
    
    UNION ALL
    
    -- Error Recovery Rate
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


