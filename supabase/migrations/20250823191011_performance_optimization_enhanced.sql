-- ======================================================================
-- Enhanced Performance Optimization & Scalability Migration
-- Migration: 20250823191011_performance_optimization_enhanced.sql
-- Description: Implements performance optimizations with enhanced security, 
--              cache invalidation, concurrent refresh, and monitoring
-- Safe to re-run: uses IF EXISTS checks and idempotent patterns
-- ======================================================================

BEGIN;

-- ========================================
-- 1. ENHANCED SECURITY & RLS TESTING
-- ========================================

-- Create admin audit log table with enhanced security
CREATE TABLE IF NOT EXISTS admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES profiles(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    request_id TEXT, -- For tracing requests
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log with security considerations
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin 
ON admin_audit_log(admin_user_id, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action 
ON admin_audit_log(action, resource_type, created_at);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_request 
ON admin_audit_log(request_id) WHERE request_id IS NOT NULL;

-- Enhanced function to log admin actions with request context
CREATE OR REPLACE FUNCTION log_admin_action(
    admin_user_id UUID,
    action TEXT,
    resource_type TEXT,
    resource_id UUID DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL,
    request_id TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    log_id UUID;
BEGIN
    INSERT INTO admin_audit_log(
        admin_user_id, action, resource_type, resource_id, 
        old_values, new_values, request_id
    ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
    ) RETURNING id INTO log_id;
    
    -- Log to application logs for real-time monitoring
    RAISE LOG 'Admin action logged: % by user % on % (ID: %)', 
        action, admin_user_id, resource_type, log_id;
    
    RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 2. ENHANCED CACHE INVALIDATION
-- ========================================

-- Create cache table with enhanced TTL and invalidation
CREATE TABLE IF NOT EXISTS query_cache (
    cache_key TEXT PRIMARY KEY,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed TIMESTAMPTZ DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,
    invalidation_tags TEXT[] DEFAULT '{}' -- For semantic invalidation
);

-- Create indexes for cache management
CREATE INDEX IF NOT EXISTS idx_query_cache_expires 
ON query_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_query_cache_created 
ON query_cache(created_at);

CREATE INDEX IF NOT EXISTS idx_query_cache_tags 
ON query_cache USING GIN(invalidation_tags);

CREATE INDEX IF NOT EXISTS idx_query_cache_access 
ON query_cache(last_accessed, access_count);

-- Enhanced cache management functions
CREATE OR REPLACE FUNCTION get_cached_query(cache_key TEXT)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    -- Update access statistics
    UPDATE query_cache 
    SET last_accessed = NOW(), access_count = access_count + 1
    WHERE cache_key = $1 AND expires_at > NOW();
    
    -- Get cached data
    SELECT cache_data INTO cached_data
    FROM query_cache
    WHERE cache_key = $1 AND expires_at > NOW();
    
    RETURN cached_data;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_cached_query(
    cache_key TEXT, 
    cache_data JSONB, 
    ttl_minutes INTEGER DEFAULT 15,
    invalidation_tags TEXT[] DEFAULT '{}'
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO query_cache(cache_key, cache_data, expires_at, invalidation_tags)
    VALUES($1, $2, NOW() + INTERVAL '1 minute' * $3, $4)
    ON CONFLICT(cache_key) 
    DO UPDATE SET 
        cache_data = EXCLUDED.cache_data,
        expires_at = EXCLUDED.expires_at,
        invalidation_tags = EXCLUDED.invalidation_tags,
        last_accessed = NOW(),
        access_count = query_cache.access_count + 1;
END;
$$ LANGUAGE plpgsql;

-- Function to invalidate cache by tags (semantic invalidation)
CREATE OR REPLACE FUNCTION invalidate_cache_by_tags(tags_to_invalidate TEXT[])
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_cache 
    WHERE invalidation_tags && tags_to_invalidate;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log invalidation for monitoring
    RAISE LOG 'Cache invalidated by tags %: % entries removed', 
        tags_to_invalidate, deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clear expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_cache WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup for monitoring
    RAISE LOG 'Expired cache cleaned: % entries removed', deleted_count;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 3. CONCURRENT MATERIALIZED VIEW REFRESH
-- ========================================

-- Create materialized views with unique indexes for CONCURRENT refresh
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    p.id as provider_id,
    p.full_name,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN COALESCE(b.total_amount, 0) ELSE 0 END) as total_revenue,
    AVG(CASE WHEN b.status = 'completed' THEN b.total_amount ELSE NULL END) as avg_booking_value,
    COUNT(DISTINCT b.customer_id) as unique_customers
FROM profiles p
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE p.role = 'vendor'
GROUP BY DATE_TRUNC('day', b.created_at), p.id, p.full_name;

-- Create unique indexes required for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_provider_analytics_unique 
ON provider_analytics_daily(date, provider_id);

CREATE INDEX IF NOT EXISTS idx_provider_analytics_date 
ON provider_analytics_daily(date);

-- Create other materialized views
CREATE MATERIALIZED VIEW IF NOT EXISTS specialty_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    s.id as specialty_id,
    s.name as specialty_name,
    s.path as specialty_path,
    COUNT(b.id) as total_bookings,
    COUNT(DISTINCT b.provider_id) as active_providers,
    COUNT(DISTINCT b.customer_id) as unique_customers,
    SUM(b.total_amount) as total_revenue,
    AVG(b.total_amount) as avg_booking_value
FROM specialties s
LEFT JOIN vendor_specialties vs ON s.id = vs.specialty_id
LEFT JOIN profiles p ON vs.app_user_id = p.id
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE b.status = 'completed'
GROUP BY DATE_TRUNC('day', b.created_at), s.id, s.name, s.path;

CREATE UNIQUE INDEX IF NOT EXISTS idx_specialty_analytics_unique 
ON specialty_analytics_daily(date, specialty_id);

CREATE MATERIALIZED VIEW IF NOT EXISTS geographic_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    pl.city,
    pl.state,
    pl.country,
    COUNT(b.id) as total_bookings,
    COUNT(DISTINCT b.provider_id) as active_providers,
    COUNT(DISTINCT b.customer_id) as unique_customers,
    SUM(b.total_amount) as total_revenue
FROM provider_locations pl
JOIN profiles p ON pl.provider_id = p.id
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE p.role = 'vendor' AND b.status = 'completed'
GROUP BY DATE_TRUNC('day', b.created_at), pl.city, pl.state, pl.country;

CREATE UNIQUE INDEX IF NOT EXISTS idx_geographic_analytics_unique 
ON geographic_analytics_daily(date, city, state, country);

-- Enhanced refresh function with CONCURRENT refresh and monitoring
CREATE OR REPLACE FUNCTION refresh_analytics_views_concurrent()
RETURNS JSONB AS $$
DECLARE
    start_time TIMESTAMPTZ;
    refresh_results JSONB;
    error_count INTEGER := 0;
    success_count INTEGER := 0;
BEGIN
    start_time := NOW();
    
    -- Log refresh start
    PERFORM log_admin_action(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'analytics_refresh_start',
        'materialized_views'
    );
    
    BEGIN
        -- Use CONCURRENT refresh to avoid blocking reads
        REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics_daily;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh provider_analytics_daily: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY specialty_analytics_daily;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh specialty_analytics_daily: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY geographic_analytics_daily;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh geographic_analytics_daily: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY performance_analytics_5min;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh performance_analytics_5min: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY performance_analytics_hourly;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh performance_analytics_hourly: %', SQLERRM;
    END;
    
    -- Log refresh completion
    PERFORM log_admin_action(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'analytics_refresh_complete',
        'materialized_views',
        NULL,
        NULL,
        jsonb_build_object(
            'success_count', success_count,
            'error_count', error_count,
            'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000
        )
    );
    
    -- Return refresh results
    refresh_results := jsonb_build_object(
        'success_count', success_count,
        'error_count', error_count,
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
        'timestamp', NOW()
    );
    
    RETURN refresh_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Smart refresh scheduling function
CREATE OR REPLACE FUNCTION should_refresh_analytics()
RETURNS BOOLEAN AS $$
DECLARE
    last_refresh TIMESTAMPTZ;
    data_freshness TIMESTAMPTZ;
    last_booking_time TIMESTAMPTZ;
BEGIN
    -- Get last refresh time
    SELECT MAX(created_at) INTO last_refresh
    FROM admin_audit_log 
    WHERE action = 'analytics_refresh_complete';
    
    -- Get data freshness (oldest data point)
    SELECT MIN(created_at) INTO data_freshness
    FROM bookings;
    
    -- Get last booking time to check if new data arrived
    SELECT MAX(created_at) INTO last_booking_time
    FROM bookings;
    
    -- Refresh if:
    -- 1. No refresh ever done
    -- 2. Last refresh was more than 6 hours ago
    -- 3. Data is older than 6 hours
    -- 4. New data arrived since last refresh
    RETURN last_refresh IS NULL 
           OR last_refresh < NOW() - INTERVAL '6 hours'
           OR data_freshness < NOW() - INTERVAL '6 hours'
           OR (last_refresh IS NOT NULL AND last_booking_time > last_refresh);
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 4. ENHANCED PERFORMANCE MONITORING
-- ========================================

-- Create performance metrics table with enhanced fields
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    request_id TEXT, -- For request tracing
    cache_hit BOOLEAN DEFAULT false,
    database_queries INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance tracking
CREATE INDEX IF NOT EXISTS idx_performance_metrics_endpoint 
ON performance_metrics(endpoint, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_response_time 
ON performance_metrics(response_time_ms, created_at);

CREATE INDEX IF NOT EXISTS idx_performance_metrics_request 
ON performance_metrics(request_id) WHERE request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_performance_metrics_cache 
ON performance_metrics(cache_hit, created_at);

-- 5-minute granularity materialized view for real-time monitoring
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_analytics_5min AS
SELECT 
    DATE_TRUNC('minute', created_at) - (EXTRACT(minute FROM created_at)::int % 5) * INTERVAL '1 minute' as five_minute_bucket,
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time_ms,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    ROUND(
        (COUNT(CASE WHEN status_code >= 400 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as error_rate_percent,
    COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits,
    ROUND(
        (COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as cache_hit_rate_percent,
    AVG(database_queries) as avg_database_queries
FROM performance_metrics
GROUP BY 1, endpoint, method;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_5min_unique 
ON performance_analytics_5min(five_minute_bucket, endpoint, method);

-- Hourly performance analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_analytics_hourly AS
SELECT 
    DATE_TRUNC('hour', created_at) as hour,
    endpoint,
    method,
    COUNT(*) as request_count,
    AVG(response_time_ms) as avg_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time_ms,
    COUNT(CASE WHEN status_code >= 400 THEN 1 END) as error_count,
    ROUND(
        (COUNT(CASE WHEN status_code >= 400 THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as error_rate_percent,
    COUNT(CASE WHEN cache_hit THEN 1 END) as cache_hits,
    ROUND(
        (COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) as cache_hit_rate_percent
FROM performance_metrics
GROUP BY DATE_TRUNC('hour', created_at), endpoint, method;

CREATE UNIQUE INDEX IF NOT EXISTS idx_performance_hourly_unique 
ON performance_analytics_hourly(hour, endpoint, method);

-- Function to clean old performance data
CREATE OR REPLACE FUNCTION clean_old_performance_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Log cleanup for monitoring
    RAISE LOG 'Old performance data cleaned: % entries older than % days removed', 
        deleted_count, days_to_keep;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. MATERIALIZED VIEW REFRESH LOGGING & TELEMETRY
-- ========================================

-- Track materialized view refreshes for monitoring and debugging
CREATE TABLE IF NOT EXISTS mv_refresh_log (
    id BIGSERIAL PRIMARY KEY,
    mv_name TEXT NOT NULL,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    finished_at TIMESTAMPTZ,
    ok BOOLEAN,
    error TEXT,
    duration_ms INTEGER,
    rows_affected INTEGER
);

-- Create indexes for refresh log analysis
CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_name_time 
ON mv_refresh_log(mv_name, started_at);

CREATE INDEX IF NOT EXISTS idx_mv_refresh_log_status 
ON mv_refresh_log(ok, started_at) WHERE ok = false;

-- Enhanced procedure for concurrent materialized view refresh with telemetry
CREATE OR REPLACE PROCEDURE refresh_mv_concurrent(_mv TEXT)
LANGUAGE plpgsql AS $$
DECLARE
    _start TIMESTAMPTZ := NOW();
    _log_id BIGINT;
    _row_count INTEGER;
BEGIN
    -- Log refresh start
    INSERT INTO mv_refresh_log(mv_name, started_at) 
    VALUES (_mv, _start) RETURNING id INTO _log_id;
    
    -- Get row count before refresh for comparison
    EXECUTE format('SELECT COUNT(*) FROM %I', _mv) INTO _row_count;
    
    -- Execute the refresh
    EXECUTE format('REFRESH MATERIALIZED VIEW CONCURRENTLY %I', _mv);
    
    -- Log successful completion
    UPDATE mv_refresh_log 
    SET finished_at = NOW(), 
        ok = true, 
        duration_ms = EXTRACT(EPOCH FROM (NOW() - _start)) * 1000,
        rows_affected = _row_count
    WHERE id = _log_id;
    
    RAISE LOG 'Successfully refreshed materialized view % in % ms', 
        _mv, EXTRACT(EPOCH FROM (NOW() - _start)) * 1000;
        
EXCEPTION WHEN OTHERS THEN
    -- Log failure
    UPDATE mv_refresh_log 
    SET finished_at = NOW(), 
        ok = false, 
        error = SQLERRM,
        duration_ms = EXTRACT(EPOCH FROM (NOW() - _start)) * 1000
    WHERE id = _log_id;
    
    RAISE LOG 'Failed to refresh materialized view %: %', _mv, SQLERRM;
    RAISE;
END;
$$;

-- ========================================
-- 5. ENHANCED CACHE INVALIDATION WITH QUEUE SYSTEM
-- ========================================

-- Create lightweight cache invalidation queue to prevent trigger storms
CREATE TABLE IF NOT EXISTS cache_invalidation_queue (
    id BIGSERIAL PRIMARY KEY,
    tag TEXT NOT NULL,
    enqueued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3
);

-- Create indexes for queue management
CREATE INDEX IF NOT EXISTS idx_cache_queue_pending 
ON cache_invalidation_queue(processed_at) WHERE processed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_cache_queue_tag_time 
ON cache_invalidation_queue(tag, enqueued_at);

-- Function to enqueue cache invalidation with dedup within time window
CREATE OR REPLACE FUNCTION enqueue_cache_invalidation(_tag TEXT, _dedup_minutes INTEGER DEFAULT 1)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
    -- Dedup within specified window to avoid storms during bulk operations
    INSERT INTO cache_invalidation_queue(tag)
    SELECT _tag
    WHERE NOT EXISTS (
        SELECT 1 FROM cache_invalidation_queue
        WHERE tag = _tag 
        AND enqueued_at > NOW() - INTERVAL '1 minute' * _dedup_minutes
        AND processed_at IS NULL
    );
END;
$$;

-- Enhanced function to invalidate related cache when data changes
CREATE OR REPLACE FUNCTION invalidate_related_cache()
RETURNS TRIGGER AS $$
BEGIN
    -- Invalidate search cache when vendor data changes
    IF TG_TABLE_NAME = 'profiles' THEN
        PERFORM enqueue_cache_invalidation('search:vendors', 2);
        PERFORM enqueue_cache_invalidation('search:provider', 2);
        IF NEW.primary_specialty_id IS NOT NULL THEN
            PERFORM enqueue_cache_invalidation('search:specialty:' || NEW.primary_specialty_id, 2);
        END IF;
    END IF;
    
    -- Invalidate specialty cache when specialties change
    IF TG_TABLE_NAME = 'specialties' THEN
        PERFORM enqueue_cache_invalidation('specialties', 1);
        PERFORM enqueue_cache_invalidation('search:specialties', 1);
    END IF;
    
    -- Invalidate service cache when services change
    IF TG_TABLE_NAME = 'services' THEN
        PERFORM enqueue_cache_invalidation('services', 1);
        PERFORM enqueue_cache_invalidation('search:services', 1);
        PERFORM enqueue_cache_invalidation('search:provider', 1);
    END IF;
    
    -- Invalidate location cache when locations change
    IF TG_TABLE_NAME = 'provider_locations' THEN
        PERFORM enqueue_cache_invalidation('location', 1);
        PERFORM enqueue_cache_invalidation('search:geo', 1);
        PERFORM enqueue_cache_invalidation('search:location', 1);
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cache invalidation
DROP TRIGGER IF EXISTS cache_invalidation_trigger ON profiles;
CREATE TRIGGER cache_invalidation_trigger
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION invalidate_related_cache();

DROP TRIGGER IF EXISTS cache_invalidation_specialties_trigger ON specialties;
CREATE TRIGGER cache_invalidation_specialties_trigger
    AFTER INSERT OR UPDATE OR DELETE ON specialties
    FOR EACH ROW EXECUTE FUNCTION invalidate_related_cache();

DROP TRIGGER IF EXISTS cache_invalidation_services_trigger ON services;
CREATE TRIGGER cache_invalidation_services_trigger
    AFTER INSERT OR UPDATE OR DELETE ON services
    FOR EACH ROW EXECUTE FUNCTION invalidate_related_cache();

DROP TRIGGER IF EXISTS cache_invalidation_locations_trigger ON provider_locations;
CREATE TRIGGER cache_invalidation_locations_trigger
    AFTER INSERT OR UPDATE OR DELETE ON provider_locations
    FOR EACH ROW EXECUTE FUNCTION invalidate_related_cache();

-- ========================================
-- 7. CACHE INVALIDATION WORKER & QUEUE MANAGEMENT
-- ========================================

-- Function to drain the cache invalidation queue with batch processing
CREATE OR REPLACE FUNCTION drain_cache_invalidation_queue(
    _batch_size INTEGER DEFAULT 500,
    _since_minutes INTEGER DEFAULT 60
)
RETURNS JSONB AS $$
DECLARE
    _tags TEXT[];
    _unique_tags TEXT[];
    _processed_count INTEGER;
    _start_time TIMESTAMPTZ := NOW();
BEGIN
    -- Get and remove tags from queue
    WITH deleted_tags AS (
        DELETE FROM cache_invalidation_queue
        WHERE id IN (
            SELECT id FROM cache_invalidation_queue
            WHERE enqueued_at > NOW() - INTERVAL '1 minute' * _since_minutes
            AND processed_at IS NULL
            ORDER BY enqueued_at ASC
            LIMIT _batch_size
        )
        RETURNING tag
    )
    SELECT array_agg(tag) INTO _tags FROM deleted_tags;
    
    -- Mark as processed
    UPDATE cache_invalidation_queue 
    SET processed_at = NOW()
    WHERE tag = ANY(_tags);
    
    -- Get unique tags to avoid duplicate invalidations
    SELECT array_agg(DISTINCT tag) FROM unnest(_tags) AS tag INTO _unique_tags;
    
    -- Bulk invalidate cache by tags
    IF _unique_tags IS NOT NULL AND array_length(_unique_tags, 1) > 0 THEN
        DELETE FROM query_cache 
        WHERE invalidation_tags && _unique_tags;
        
        GET DIAGNOSTICS _processed_count = ROW_COUNT;
        
        -- Log invalidation for monitoring
        RAISE LOG 'Cache invalidation processed: % tags, % cache entries removed', 
            array_length(_unique_tags, 1), _processed_count;
    END IF;
    
    RETURN jsonb_build_object(
        'processed_tags', _unique_tags,
        'cache_entries_removed', COALESCE(_processed_count, 0),
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - _start_time)) * 1000
    );
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old queue entries
CREATE OR REPLACE FUNCTION clean_cache_invalidation_queue(
    _days_to_keep INTEGER DEFAULT 7
)
RETURNS INTEGER AS $$
DECLARE
    _deleted_count INTEGER;
BEGIN
    DELETE FROM cache_invalidation_queue 
    WHERE enqueued_at < NOW() - INTERVAL '1 day' * _days_to_keep
    OR (processed_at IS NOT NULL AND processed_at < NOW() - INTERVAL '1 day' * _days_to_keep);
    
    GET DIAGNOSTICS _deleted_count = ROW_COUNT;
    
    RAISE LOG 'Cache invalidation queue cleaned: % old entries removed', _deleted_count;
    
    RETURN _deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. ENHANCED RLS POLICIES
-- ========================================

-- Enhanced RLS policies for admin tables
DROP POLICY IF EXISTS "Admins can manage all suggestions" ON specialty_suggestions;
CREATE POLICY "Admins can manage all suggestions" ON specialty_suggestions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN app_users au ON ur.app_user_id = au.id 
            WHERE au.auth_user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- service_type_proposals table doesn't exist in current schema

DROP POLICY IF EXISTS "Admins can moderate reviews" ON reviews;
CREATE POLICY "Admins can moderate reviews" ON reviews
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN app_users au ON ur.app_user_id = au.id 
            WHERE au.auth_user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Enhanced RLS policy for admin audit log (only admins can read)
DROP POLICY IF EXISTS "Admins can view audit log" ON admin_audit_log;
CREATE POLICY "Admins can view audit log" ON admin_audit_log
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN app_users au ON ur.app_user_id = au.id 
            WHERE au.auth_user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- ========================================
-- 7. ENHANCED MONITORING & 5-MINUTE ROLLUPS
-- ========================================

-- Enhanced 5-minute rollup view for real-time ops monitoring
CREATE MATERIALIZED VIEW IF NOT EXISTS api_metrics_5m AS
SELECT
    DATE_TRUNC('minute', created_at) - (EXTRACT(minute FROM created_at)::int % 5) * INTERVAL '1 minute' AS bucket,
    endpoint,
    method,
    COUNT(*) AS reqs,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_ms,
    AVG(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS err_rate,
    COUNT(CASE WHEN cache_hit THEN 1 END) AS cache_hits,
    ROUND(
        (COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) AS cache_hit_rate_percent,
    AVG(database_queries) AS avg_db_queries,
    MAX(response_time_ms) AS max_response_time_ms
FROM performance_metrics
GROUP BY 1, 2, 3
WITH NO DATA;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_metrics_5m_unique 
ON api_metrics_5m(bucket, endpoint, method);

-- Enhanced hourly rollup with more granular metrics
CREATE MATERIALIZED VIEW IF NOT EXISTS api_metrics_hourly_enhanced AS
SELECT
    DATE_TRUNC('hour', created_at) AS hour,
    endpoint,
    method,
    COUNT(*) AS reqs,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) AS p95_ms,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) AS p99_ms,
    AVG(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS err_rate,
    COUNT(CASE WHEN cache_hit THEN 1 END) AS cache_hits,
    ROUND(
        (COUNT(CASE WHEN cache_hit THEN 1 END)::DECIMAL / COUNT(*)) * 100, 2
    ) AS cache_hit_rate_percent,
    AVG(database_queries) AS avg_db_queries,
    MAX(response_time_ms) AS max_response_time_ms,
    MIN(response_time_ms) AS min_response_time_ms,
    STDDEV(response_time_ms) AS response_time_stddev
FROM performance_metrics
GROUP BY 1, 2, 3
WITH NO DATA;

-- Create unique index for CONCURRENT refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_api_metrics_hourly_enhanced_unique 
ON api_metrics_hourly_enhanced(hour, endpoint, method);

-- Function to refresh monitoring views concurrently
CREATE OR REPLACE FUNCTION refresh_monitoring_views_concurrent()
RETURNS JSONB AS $$
DECLARE
    start_time TIMESTAMPTZ;
    refresh_results JSONB;
    error_count INTEGER := 0;
    success_count INTEGER := 0;
BEGIN
    start_time := NOW();
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY api_metrics_5m;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh api_metrics_5m: %', SQLERRM;
    END;
    
    BEGIN
        REFRESH MATERIALIZED VIEW CONCURRENTLY api_metrics_hourly_enhanced;
        success_count := success_count + 1;
    EXCEPTION WHEN OTHERS THEN
        error_count := error_count + 1;
        RAISE LOG 'Failed to refresh api_metrics_hourly_enhanced: %', SQLERRM;
    END;
    
    RETURN jsonb_build_object(
        'success_count', success_count,
        'error_count', error_count,
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000
    );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. SCHEDULED MAINTENANCE
-- ========================================

-- Function to perform scheduled maintenance
CREATE OR REPLACE FUNCTION perform_scheduled_maintenance()
RETURNS JSONB AS $$
DECLARE
    maintenance_results JSONB;
    start_time TIMESTAMPTZ;
    cache_cleaned INTEGER;
    performance_cleaned INTEGER;
    views_refreshed JSONB;
BEGIN
    start_time := NOW();
    
    -- Log maintenance start
    PERFORM log_admin_action(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'maintenance_start',
        'scheduled_maintenance'
    );
    
    -- Clean expired cache
    SELECT clean_expired_cache() INTO cache_cleaned;
    
    -- Clean old performance data
    SELECT clean_old_performance_data(30) INTO performance_cleaned;
    
    -- Refresh analytics views if needed
    IF should_refresh_analytics() THEN
        SELECT refresh_analytics_views_concurrent() INTO views_refreshed;
    ELSE
        views_refreshed := '{"refreshed": false, "reason": "not_needed"}'::jsonb;
    END IF;
    
    -- Refresh monitoring views (every 5 minutes for real-time ops)
    PERFORM refresh_monitoring_views_concurrent();
    
    -- Drain cache invalidation queue
    PERFORM drain_cache_invalidation_queue(1000, 60);
    
    -- Clean up old queue entries
    PERFORM clean_cache_invalidation_queue(7);
    
    -- Log maintenance completion
    PERFORM log_admin_action(
        '00000000-0000-0000-0000-000000000000'::UUID,
        'maintenance_complete',
        'scheduled_maintenance',
        NULL,
        NULL,
        jsonb_build_object(
            'cache_cleaned', cache_cleaned,
            'performance_cleaned', performance_cleaned,
            'views_refreshed', views_refreshed,
            'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000
        )
    );
    
    -- Return maintenance results
    maintenance_results := jsonb_build_object(
        'cache_cleaned', cache_cleaned,
        'performance_cleaned', performance_cleaned,
        'views_refreshed', views_refreshed,
        'duration_ms', EXTRACT(EPOCH FROM (NOW() - start_time)) * 1000,
        'timestamp', NOW()
    );
    
    RETURN maintenance_results;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- 9. GRANT PERMISSIONS
-- ========================================

-- Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
-- Grant permissions on materialized views (will be done after they're created);
GRANT SELECT, INSERT ON performance_metrics TO authenticated;
GRANT SELECT ON admin_audit_log TO authenticated;

-- ========================================
-- 10. CREATE SCHEDULED JOBS (if using pg_cron)
-- ========================================

-- Note: These require pg_cron extension to be enabled
-- Uncomment if pg_cron is available

-- Note: pg_cron scheduling requires the pg_cron extension to be enabled
-- Uncomment the following lines if pg_cron is available:

-- Schedule analytics refresh every 6 hours
-- SELECT cron.schedule('refresh-analytics', '0 */6 * * *', 'SELECT refresh_analytics_views_concurrent();');

-- Schedule monitoring refresh every 5 minutes for real-time ops
-- SELECT cron.schedule('refresh-monitoring', '*/5 * * * *', 'SELECT refresh_monitoring_views_concurrent();');

-- Schedule maintenance every day at 2 AM
-- SELECT cron.schedule('daily-maintenance', '0 2 * * *', 'SELECT perform_scheduled_maintenance();');

-- Schedule cache cleanup every hour
-- SELECT cron.schedule('clean-cache', '0 * * * * *', 'SELECT clean_expired_cache();');

-- Schedule cache invalidation queue processing every 2 minutes
-- SELECT cron.schedule('process-cache-queue', '*/2 * * * *', 'SELECT drain_cache_invalidation_queue(500, 60);');

-- Schedule performance data cleanup every day at 3 AM
-- SELECT cron.schedule('clean-performance', '0 3 * * *', 'SELECT clean_old_performance_data(30);');

-- ========================================
-- 11. MIGRATION VERIFICATION
-- ========================================

-- Create function to verify migration success
CREATE OR REPLACE FUNCTION verify_migration_success()
RETURNS JSONB AS $$
DECLARE
    verification_results JSONB;
    table_count INTEGER;
    function_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
BEGIN
    -- Count created tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_name IN ('admin_audit_log', 'query_cache', 'performance_metrics');
    
    -- Count created functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines 
    WHERE routine_name IN (
        'log_admin_action', 'get_cached_query', 'set_cached_query',
        'refresh_analytics_views_concurrent', 'perform_scheduled_maintenance'
    );
    
    -- Count created materialized views
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_name LIKE '%analytics%';
    
    -- Count created indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE indexname LIKE '%analytics%' OR indexname LIKE '%cache%' OR indexname LIKE '%performance%';
    
    verification_results := jsonb_build_object(
        'tables_created', table_count,
        'functions_created', function_count,
        'views_created', view_count,
        'indexes_created', index_count,
        'migration_successful', 
            table_count >= 3 AND function_count >= 5 AND view_count >= 4 AND index_count >= 10,
        'timestamp', NOW()
    );
    
    RETURN verification_results;
END;
$$ LANGUAGE plpgsql;

COMMIT;
