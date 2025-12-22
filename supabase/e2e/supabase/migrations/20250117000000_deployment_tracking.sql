-- Deployment Tracking System for DeployAI
-- Tracks canary deployments, baseline/production deployments, and deployment events

-- Deployments table - tracks all deployments (canary and production)
CREATE TABLE IF NOT EXISTS deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  environment TEXT NOT NULL CHECK (environment IN ('canary', 'production', 'staging')),
  commit_sha TEXT,
  branch TEXT,
  deployed_by TEXT, -- User or system that triggered deployment
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL CHECK (status IN ('deploying', 'active', 'promoted', 'rolled_back', 'failed')) DEFAULT 'deploying',
  url TEXT, -- Deployment URL
  metadata JSONB DEFAULT '{}'::jsonb, -- Additional deployment metadata
  promoted_at TIMESTAMPTZ,
  rolled_back_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment events table - tracks all deployment-related events
CREATE TABLE IF NOT EXISTS deployment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'deploy_started',
    'deploy_completed',
    'deploy_failed',
    'canary_activated',
    'canary_promoted',
    'canary_rolled_back',
    'metrics_collected',
    'slo_check',
    'health_check',
    'smoke_test_passed',
    'smoke_test_failed'
  )),
  event_data JSONB DEFAULT '{}'::jsonb, -- Event-specific data
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Deployment metrics table - stores metrics for canary vs baseline comparison
CREATE TABLE IF NOT EXISTS deployment_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deployment_id UUID REFERENCES deployments(id) ON DELETE CASCADE,
  metric_type TEXT NOT NULL CHECK (metric_type IN ('error_rate', 'p95_latency', 'p99_latency', 'throughput', 'availability')),
  metric_value NUMERIC NOT NULL,
  sample_count INTEGER DEFAULT 0,
  time_window_minutes INTEGER DEFAULT 15, -- Time window for this metric
  collected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_deployments_deployed_at ON deployments(deployed_at DESC);
CREATE INDEX IF NOT EXISTS idx_deployments_version ON deployments(version);

CREATE INDEX IF NOT EXISTS idx_deployment_events_deployment_id ON deployment_events(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_events_type ON deployment_events(event_type);
CREATE INDEX IF NOT EXISTS idx_deployment_events_created_at ON deployment_events(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_deployment_metrics_deployment_id ON deployment_metrics(deployment_id);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_type ON deployment_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_deployment_metrics_collected_at ON deployment_metrics(collected_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_deployments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for deployments updated_at
CREATE TRIGGER deployments_updated_at
  BEFORE UPDATE ON deployments
  FOR EACH ROW
  EXECUTE FUNCTION update_deployments_updated_at();

-- View for active deployments (canary and production)
CREATE OR REPLACE VIEW active_deployments AS
SELECT 
  d.*,
  COUNT(DISTINCT de.id) as event_count,
  MAX(de.created_at) as last_event_at
FROM deployments d
LEFT JOIN deployment_events de ON d.id = de.deployment_id
WHERE d.status IN ('active', 'deploying')
GROUP BY d.id
ORDER BY d.deployed_at DESC;

-- View for canary vs baseline comparison
CREATE OR REPLACE VIEW canary_baseline_comparison AS
SELECT 
  canary.id as canary_id,
  canary.version as canary_version,
  canary.deployed_at as canary_deployed_at,
  baseline.id as baseline_id,
  baseline.version as baseline_version,
  baseline.deployed_at as baseline_deployed_at,
  -- Error rate comparison
  canary_errors.metric_value as canary_error_rate,
  baseline_errors.metric_value as baseline_error_rate,
  -- P95 latency comparison
  canary_p95.metric_value as canary_p95_latency,
  baseline_p95.metric_value as baseline_p95_latency,
  -- P99 latency comparison
  canary_p99.metric_value as canary_p99_latency,
  baseline_p99.metric_value as baseline_p99_latency
FROM deployments canary
LEFT JOIN deployments baseline ON baseline.environment = 'production' AND baseline.status = 'active'
LEFT JOIN deployment_metrics canary_errors ON canary_errors.deployment_id = canary.id AND canary_errors.metric_type = 'error_rate'
LEFT JOIN deployment_metrics baseline_errors ON baseline_errors.deployment_id = baseline.id AND baseline_errors.metric_type = 'error_rate'
LEFT JOIN deployment_metrics canary_p95 ON canary_p95.deployment_id = canary.id AND canary_p95.metric_type = 'p95_latency'
LEFT JOIN deployment_metrics baseline_p95 ON baseline_p95.deployment_id = baseline.id AND baseline_p95.metric_type = 'p95_latency'
LEFT JOIN deployment_metrics canary_p99 ON canary_p99.deployment_id = canary.id AND canary_p99.metric_type = 'p99_latency'
LEFT JOIN deployment_metrics baseline_p99 ON baseline_p99.deployment_id = baseline.id AND baseline_p99.metric_type = 'p99_latency'
WHERE canary.environment = 'canary' AND canary.status = 'active'
ORDER BY canary.deployed_at DESC
LIMIT 1;

-- Enable RLS (read-only for ops endpoints, write requires service role)
ALTER TABLE deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_metrics ENABLE ROW LEVEL SECURITY;

-- RLS Policies - allow read access for authenticated service role
CREATE POLICY "Service role can read deployments"
  ON deployments FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert deployments"
  ON deployments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update deployments"
  ON deployments FOR UPDATE
  USING (true);

CREATE POLICY "Service role can read deployment_events"
  ON deployment_events FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert deployment_events"
  ON deployment_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can read deployment_metrics"
  ON deployment_metrics FOR SELECT
  USING (true);

CREATE POLICY "Service role can insert deployment_metrics"
  ON deployment_metrics FOR INSERT
  WITH CHECK (true);
