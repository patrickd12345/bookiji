-- 📊 Analytics Tables for Post-Launch Optimization
-- Comprehensive user behavior and conversion tracking

-- Main analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_name VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_name ON analytics_events (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_properties ON analytics_events USING gin(properties);

-- Conversion funnel tracking
CREATE TABLE IF NOT EXISTS conversion_funnels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  funnel_name VARCHAR(255) NOT NULL,
  step_name VARCHAR(255) NOT NULL,
  user_id VARCHAR(255),
  session_id VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for conversion_funnels
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_name ON conversion_funnels (funnel_name);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_step ON conversion_funnels (step_name);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_user_id ON conversion_funnels (user_id);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_session ON conversion_funnels (session_id);
CREATE INDEX IF NOT EXISTS idx_conversion_funnels_created_at ON conversion_funnels (created_at);

-- User segmentation tracking
CREATE TABLE IF NOT EXISTS user_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  segments TEXT[] DEFAULT '{}',
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_segments
CREATE INDEX IF NOT EXISTS idx_user_segments_user_id ON user_segments (user_id);
CREATE INDEX IF NOT EXISTS idx_user_segments_segments ON user_segments USING gin(segments);
CREATE INDEX IF NOT EXISTS idx_user_segments_updated ON user_segments (last_updated);

-- Geographic analytics
CREATE TABLE IF NOT EXISTS geographic_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  country VARCHAR(10) NOT NULL,
  date DATE NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  event_count INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(country, date, event_name)
);

-- Create indexes for geographic_analytics
CREATE INDEX IF NOT EXISTS idx_geographic_analytics_country ON geographic_analytics (country);
CREATE INDEX IF NOT EXISTS idx_geographic_analytics_date ON geographic_analytics (date);
CREATE INDEX IF NOT EXISTS idx_geographic_analytics_event ON geographic_analytics (event_name);

-- User analytics summary (aggregated data)
CREATE TABLE IF NOT EXISTS user_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  completed_bookings INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- in seconds
  session_count INTEGER DEFAULT 0,
  help_clicks INTEGER DEFAULT 0,
  signup_abandoned BOOLEAN DEFAULT false,
  payment_abandoned BOOLEAN DEFAULT false,
  pricing_page_visits INTEGER DEFAULT 0,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for user_analytics
CREATE INDEX IF NOT EXISTS idx_user_analytics_user_id ON user_analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_user_analytics_bookings ON user_analytics (completed_bookings);
CREATE INDEX IF NOT EXISTS idx_user_analytics_duration ON user_analytics (session_duration);
CREATE INDEX IF NOT EXISTS idx_user_analytics_last_activity ON user_analytics (last_activity);

-- Page analytics for understanding user navigation
CREATE TABLE IF NOT EXISTS page_analytics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  page_path VARCHAR(500) NOT NULL UNIQUE,
  avg_session_duration NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  exit_rate NUMERIC DEFAULT 0,
  conversion_rate NUMERIC DEFAULT 0,
  traffic_volume INTEGER DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for page_analytics
CREATE INDEX IF NOT EXISTS idx_page_analytics_path ON page_analytics (page_path);
CREATE INDEX IF NOT EXISTS idx_page_analytics_bounce_rate ON page_analytics (bounce_rate);
CREATE INDEX IF NOT EXISTS idx_page_analytics_conversion_rate ON page_analytics (conversion_rate);
CREATE INDEX IF NOT EXISTS idx_page_analytics_traffic ON page_analytics (traffic_volume);

-- Feature usage analytics
CREATE TABLE IF NOT EXISTS feature_usage (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_name VARCHAR(255) NOT NULL UNIQUE,
  total_views INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  avg_time_spent NUMERIC DEFAULT 0,
  abandonment_rate NUMERIC DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for feature_usage
CREATE INDEX IF NOT EXISTS idx_feature_usage_name ON feature_usage (feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_usage_views ON feature_usage (total_views);
CREATE INDEX IF NOT EXISTS idx_feature_usage_abandonment ON feature_usage (abandonment_rate);

-- Real-time alerts log
CREATE TABLE IF NOT EXISTS analytics_alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_type VARCHAR(255) NOT NULL,
  event_name VARCHAR(255) NOT NULL,
  properties JSONB DEFAULT '{}',
  alert_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for analytics_alerts
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_type ON analytics_alerts (alert_type);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_event ON analytics_alerts (event_name);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_created_at ON analytics_alerts (created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_alerts_sent ON analytics_alerts (alert_sent);

-- Row Level Security (RLS) for analytics tables
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversion_funnels ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_segments ENABLE ROW LEVEL SECURITY;
ALTER TABLE geographic_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE feature_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytics_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for analytics access
-- Allow service role to do everything
DROP POLICY IF EXISTS "Service role can access all analytics" ON analytics_events;
CREATE POLICY  "Service role can access all analytics" ON analytics_events FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all funnels" ON conversion_funnels;
CREATE POLICY  "Service role can access all funnels" ON conversion_funnels FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all segments" ON user_segments;
CREATE POLICY  "Service role can access all segments" ON user_segments FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all geographic" ON geographic_analytics;
CREATE POLICY  "Service role can access all geographic" ON geographic_analytics FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all user analytics" ON user_analytics;
CREATE POLICY  "Service role can access all user analytics" ON user_analytics FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all page analytics" ON page_analytics;
CREATE POLICY  "Service role can access all page analytics" ON page_analytics FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all feature usage" ON feature_usage;
CREATE POLICY  "Service role can access all feature usage" ON feature_usage FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Service role can access all alerts" ON analytics_alerts;
CREATE POLICY  "Service role can access all alerts" ON analytics_alerts FOR ALL USING (auth.role() = 'service_role');

-- Allow authenticated users to read aggregated analytics (for dashboards)
DROP POLICY IF EXISTS "Users can read analytics summaries" ON analytics_events;
CREATE POLICY  "Users can read analytics summaries" ON analytics_events FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can read geographic summaries" ON geographic_analytics;
CREATE POLICY  "Users can read geographic summaries" ON geographic_analytics FOR SELECT USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can read page summaries" ON page_analytics;
CREATE POLICY  "Users can read page summaries" ON page_analytics FOR SELECT USING (auth.role() = 'authenticated');

-- Functions for analytics aggregation
CREATE OR REPLACE FUNCTION calculate_conversion_rate(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date DATE DEFAULT CURRENT_DATE,
  vendor_id_param TEXT DEFAULT NULL
)
RETURNS TABLE(
  funnel_step TEXT,
  step_count BIGINT,
  conversion_rate NUMERIC
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cf.step_name::TEXT,
    COUNT(*)::BIGINT as step_count,
    ROUND(
      (COUNT(*) * 100.0 / 
       (SELECT COUNT(*) FROM conversion_funnels 
        WHERE step_name = 'started' 
        AND created_at >= start_date 
        AND created_at <= end_date)), 2
    ) as conversion_rate
  FROM conversion_funnels cf
  WHERE cf.created_at >= start_date 
    AND cf.created_at <= end_date
    AND (vendor_id_param IS NULL OR cf.properties->>'vendor_id' = vendor_id_param)
  GROUP BY cf.step_name
  ORDER BY step_count DESC;
END;
$$;

-- Function to update user analytics aggregations
CREATE OR REPLACE FUNCTION update_user_analytics(user_id_param TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO user_analytics (user_id, session_count, last_activity)
  VALUES (user_id_param, 1, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    session_count = user_analytics.session_count + 1,
    last_activity = NOW();
END;
$$;

-- Function to increment feature usage
CREATE OR REPLACE FUNCTION track_feature_usage(
  feature_name_param TEXT,
  time_spent_param NUMERIC DEFAULT 0
)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO feature_usage (feature_name, total_views, unique_users, avg_time_spent)
  VALUES (feature_name_param, 1, 1, time_spent_param)
  ON CONFLICT (feature_name) DO UPDATE SET
    total_views = feature_usage.total_views + 1,
    avg_time_spent = (feature_usage.avg_time_spent + time_spent_param) / 2,
    last_updated = NOW();
END;
$$;

-- Create stored procedure for incrementing geographic stats
CREATE OR REPLACE FUNCTION increment_geographic_stats(
  p_country TEXT,
  p_date DATE,
  p_event_name TEXT
) RETURNS void AS $$
BEGIN
  INSERT INTO geographic_analytics (country, date, event_name, event_count)
  VALUES (p_country, p_date, p_event_name, 1)
  ON CONFLICT (country, date, event_name)
  DO UPDATE SET event_count = geographic_analytics.event_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE analytics_events IS 'Raw analytics events for all user interactions';
COMMENT ON TABLE conversion_funnels IS 'Conversion funnel tracking for optimization';
COMMENT ON TABLE user_segments IS 'User behavioral segmentation for personalization';
COMMENT ON TABLE geographic_analytics IS 'Geographic performance and expansion analytics';
COMMENT ON TABLE user_analytics IS 'Aggregated user behavior metrics';
COMMENT ON TABLE page_analytics IS 'Page performance and navigation analytics';
COMMENT ON TABLE feature_usage IS 'Feature adoption and usage tracking';
COMMENT ON TABLE analytics_alerts IS 'Real-time alerts for critical events'; 