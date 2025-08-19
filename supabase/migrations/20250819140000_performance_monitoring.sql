-- Create performance_metrics table for monitoring database performance
CREATE TABLE IF NOT EXISTS performance_metrics (
  id BIGSERIAL PRIMARY KEY,
  query TEXT NOT NULL,
  table_name VARCHAR(255) NOT NULL,
  operation VARCHAR(50) NOT NULL CHECK (operation IN ('SELECT', 'INSERT', 'UPDATE', 'DELETE', 'RPC')),
  execution_time INTEGER NOT NULL, -- milliseconds
  row_count INTEGER DEFAULT 0,
  cost_estimate DECIMAL(10,6) DEFAULT 0, -- estimated cost in USD
  warnings TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  endpoint VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_performance_metrics_created_at ON performance_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_operation ON performance_metrics(operation);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_table_name ON performance_metrics(table_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_user_id ON performance_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_execution_time ON performance_metrics(execution_time);

-- Create a view for performance summary
CREATE OR REPLACE VIEW performance_summary AS
SELECT 
  DATE_TRUNC('hour', created_at) as hour_bucket,
  operation,
  table_name,
  COUNT(*) as query_count,
  AVG(execution_time) as avg_execution_time,
  MAX(execution_time) as max_execution_time,
  SUM(cost_estimate) as total_cost,
  COUNT(CASE WHEN execution_time > 500 THEN 1 END) as slow_queries,
  COUNT(CASE WHEN cost_estimate > 0.01 THEN 1 END) as expensive_queries
FROM performance_metrics
GROUP BY DATE_TRUNC('hour', created_at), operation, table_name
ORDER BY hour_bucket DESC, total_cost DESC;

-- Create RLS policies
ALTER TABLE performance_metrics ENABLE ROW LEVEL SECURITY;

-- Only admins can view all performance metrics
CREATE POLICY "Admins can view all performance metrics" ON performance_metrics
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- Users can only view their own performance metrics
CREATE POLICY "Users can view own performance metrics" ON performance_metrics
  FOR SELECT USING (auth.uid() = user_id);

-- Only system can insert performance metrics
CREATE POLICY "System can insert performance metrics" ON performance_metrics
  FOR INSERT WITH CHECK (true);

-- Create function to clean old performance metrics (keep last 30 days)
CREATE OR REPLACE FUNCTION clean_old_performance_metrics()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM performance_metrics 
  WHERE created_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a scheduled job to clean old metrics (runs daily)
SELECT cron.schedule(
  'clean-performance-metrics',
  '0 2 * * *', -- Daily at 2 AM
  'SELECT clean_old_performance_metrics();'
);

-- Create function to get performance alerts
CREATE OR REPLACE FUNCTION get_performance_alerts(
  p_hours INTEGER DEFAULT 24,
  p_threshold_ms INTEGER DEFAULT 1000
)
RETURNS TABLE (
  alert_type VARCHAR(50),
  table_name VARCHAR(255),
  operation VARCHAR(50),
  query_count BIGINT,
  avg_execution_time DECIMAL(10,2),
  total_cost DECIMAL(10,6),
  alert_message TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN avg_execution_time > p_threshold_ms THEN 'SLOW_QUERIES'
      WHEN total_cost > 0.10 THEN 'EXPENSIVE_QUERIES'
      ELSE 'PERFORMANCE_ISSUES'
    END as alert_type,
    pm.table_name,
    pm.operation,
    COUNT(*) as query_count,
    AVG(pm.execution_time) as avg_execution_time,
    SUM(pm.cost_estimate) as total_cost,
    CASE 
      WHEN AVG(pm.execution_time) > p_threshold_ms THEN 
        'Average execution time ' || AVG(pm.execution_time) || 'ms exceeds threshold of ' || p_threshold_ms || 'ms'
      WHEN SUM(pm.cost_estimate) > 0.10 THEN 
        'Total cost $' || SUM(pm.cost_estimate) || ' exceeds threshold of $0.10'
      ELSE 'Performance issues detected'
    END as alert_message
  FROM performance_metrics pm
  WHERE pm.created_at > NOW() - INTERVAL '1 hour' * p_hours
  GROUP BY pm.table_name, pm.operation
  HAVING 
    AVG(pm.execution_time) > p_threshold_ms OR 
    SUM(pm.cost_estimate) > 0.10
  ORDER BY avg_execution_time DESC, total_cost DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT SELECT ON performance_metrics TO authenticated;
GRANT SELECT ON performance_summary TO authenticated;
GRANT EXECUTE ON FUNCTION get_performance_alerts TO authenticated;
GRANT EXECUTE ON FUNCTION clean_old_performance_metrics TO authenticated;

-- Insert initial configuration
INSERT INTO performance_metrics (query, table_name, operation, execution_time, row_count, cost_estimate, warnings, endpoint, metadata)
VALUES (
  '-- Performance monitoring initialized',
  'system',
  'RPC',
  0,
  0,
  0,
  'Performance monitoring system initialized',
  '/api/system/init',
  '{"version": "1.0.0", "component": "performance_monitoring"}'
) ON CONFLICT DO NOTHING;
