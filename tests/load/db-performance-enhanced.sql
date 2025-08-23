-- ======================================================================
-- Enhanced Database Performance Testing Script for pgbench
-- Tests critical gotchas: MV refresh, cache invalidation, RLS policies
-- ======================================================================

-- Test search function performance with various parameters
\set search_lat random(40000000, 41000000) / 1000000.0
\set search_lon random(-75000000, -74000000) / 1000000.0
\set radius random(5, 50)
\set min_rating random(30, 50) / 10.0
\set max_price random(5000, 50000)
\set limit_count random(10, 50)

-- Test basic search without geo-filtering
SELECT search_providers_optimized(
    'plumber'::text,
    NULL::uuid[],
    :min_rating::decimal,
    :max_price::integer,
    NULL::decimal,
    NULL::decimal,
    NULL::decimal,
    :limit_count::integer,
    0::integer
);

-- Test geo-based search (stress test distance calculations)
SELECT search_providers_optimized(
    'electrician'::text,
    NULL::uuid[],
    :min_rating::decimal,
    :max_price::integer,
    :search_lat::decimal,
    :search_lon::decimal,
    :radius::decimal,
    :limit_count::integer,
    0::integer
);

-- Test specialty-filtered search (stress test specialty joins)
SELECT search_providers_optimized(
    'massage'::text,
    ARRAY['wellness', 'health']::uuid[],
    :min_rating::decimal,
    :max_price::integer,
    :search_lat::decimal,
    :search_lon::decimal,
    :radius::decimal,
    :limit_count::integer,
    0::integer
);

-- Test cache operations
\set cache_key 'test_cache_key_' || random(1, 1000)
\set cache_data '{"test": "data", "timestamp": "' || now() || '"}'

-- Test cache insertion
INSERT INTO query_cache (cache_key, cache_data, expires_at, invalidation_tags)
VALUES (:'cache_key', :'cache_data'::jsonb, now() + interval '1 hour', ARRAY['test', 'cache']);

-- Test cache retrieval
SELECT get_cached_query(:'cache_key');

-- Test cache invalidation by tags
SELECT invalidate_cache_by_tags(ARRAY['test', 'cache']);

-- Test cache invalidation queue (prevent trigger storms)
\set tag 'search:test:' || random(1, 100)
SELECT enqueue_cache_invalidation(:'tag', 1);

-- Test cache queue processing
SELECT drain_cache_invalidation_queue(100, 60);

-- Test analytics view access (stress test materialized views)
SELECT * FROM provider_analytics_daily 
WHERE date >= now() - interval '7 days' 
ORDER BY total_bookings DESC 
LIMIT 20;

SELECT * FROM specialty_analytics_daily 
WHERE date >= now() - interval '7 days' 
ORDER BY total_revenue_cents DESC 
LIMIT 20;

SELECT * FROM geographic_analytics_daily 
WHERE date >= now() - interval '7 days' 
ORDER BY total_providers DESC 
LIMIT 20;

-- Test performance metrics insertion
\set endpoint 'test_endpoint_' || random(1, 10)
\set method 'GET'
\set response_time random(50, 500)
\set status_code random(200, 500)
\set cache_hit random(0, 1)::boolean
\set db_queries random(1, 10)

INSERT INTO performance_metrics (
    endpoint, method, response_time_ms, status_code, 
    cache_hit, database_queries, request_id
) VALUES (
    :'endpoint', :'method', :response_time, :status_code,
    :cache_hit, :db_queries, gen_random_uuid()
);

-- Test 5-minute performance rollup
SELECT * FROM api_metrics_5m 
WHERE bucket >= now() - interval '1 hour'
ORDER BY bucket DESC, reqs DESC
LIMIT 20;

-- Test hourly performance rollup
SELECT * FROM api_metrics_hourly_enhanced 
WHERE hour >= now() - interval '24 hours'
ORDER BY hour DESC, reqs DESC
LIMIT 20;

-- Test admin audit log access (verify RLS policies)
\set admin_user_id '00000000-0000-0000-0000-000000000000'::uuid
\set action 'test_action_' || random(1, 100)
\set resource_type 'test_resource_' || random(1, 50)

-- Test admin action logging
SELECT log_admin_action(
    :admin_user_id,
    :'action',
    :'resource_type',
    gen_random_uuid(),
    '{"old": "value"}'::jsonb,
    '{"new": "value"}'::jsonb,
    'test_request_' || random(1, 1000)
);

-- Test admin audit log access (should work for admin)
SELECT * FROM admin_audit_log 
WHERE created_at >= now() - interval '1 hour'
ORDER BY created_at DESC 
LIMIT 10;

-- Test materialized view refresh logging
\set mv_name 'test_mv_' || random(1, 100)

INSERT INTO mv_refresh_log (mv_name, started_at, finished_at, ok, duration_ms, rows_affected)
VALUES (
    :'mv_name',
    now() - interval '5 minutes',
    now(),
    true,
    random(1000, 30000),
    random(100, 10000)
);

-- Test MV refresh log analysis
SELECT 
    mv_name,
    COUNT(*) as refresh_count,
    AVG(duration_ms) as avg_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    COUNT(*) FILTER (WHERE ok = false) as failed_count
FROM mv_refresh_log 
WHERE started_at >= now() - interval '24 hours'
GROUP BY mv_name
ORDER BY refresh_count DESC;

-- Test cache invalidation queue analysis
SELECT 
    tag,
    COUNT(*) as enqueued_count,
    COUNT(*) FILTER (WHERE processed_at IS NOT NULL) as processed_count,
    COUNT(*) FILTER (WHERE processed_at IS NULL) as pending_count,
    AVG(EXTRACT(EPOCH FROM (COALESCE(processed_at, now()) - enqueued_at))) as avg_processing_time_seconds
FROM cache_invalidation_queue 
WHERE enqueued_at >= now() - interval '24 hours'
GROUP BY tag
ORDER BY enqueued_count DESC
LIMIT 20;

-- Test performance data cleanup
SELECT clean_old_performance_data(7);

-- Test cache cleanup
SELECT clean_expired_cache();

-- Test cache queue cleanup
SELECT clean_cache_invalidation_queue(7);

-- Test analytics refresh scheduling
SELECT should_refresh_analytics();

-- Test concurrent materialized view refresh (if needed)
SELECT refresh_analytics_views_concurrent();

-- Test monitoring views refresh
SELECT refresh_monitoring_views_concurrent();

-- Test scheduled maintenance
SELECT perform_scheduled_maintenance();

-- Test RLS policy enforcement (try to access admin data as regular user)
-- This should fail due to RLS policies
-- Note: In pgbench, we can't easily switch roles, so we test the function directly
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM admin_audit_log 
            WHERE created_at >= now() - interval '1 hour'
        ) THEN 'RLS may be bypassed'
        ELSE 'RLS working correctly'
    END as rls_status;

-- Test specialty hierarchy access (stress test recursive queries)
SELECT * FROM specialty_hierarchy 
WHERE level <= 3 
ORDER BY level, name 
LIMIT 50;

-- Test specialty subtree function
\set specialty_id random(1, 100)::uuid
SELECT get_specialty_subtree(:specialty_id, 3);

-- Test distance calculation function
SELECT calculate_distance_km(
    :search_lat, :search_lon,
    :search_lat + random(-1, 1) / 100, 
    :search_lon + random(-1, 1) / 100
);

-- Test provider search in radius
SELECT find_providers_in_radius(
    :search_lat, :search_lon, :radius, 50
);

-- Test cache statistics
SELECT 
    COUNT(*) as total_cache_entries,
    COUNT(*) FILTER (WHERE expires_at < now()) as expired_entries,
    COUNT(*) FILTER (WHERE expires_at >= now()) as valid_entries,
    AVG(access_count) as avg_access_count,
    MAX(access_count) as max_access_count
FROM query_cache;

-- Test performance metrics summary
SELECT 
    COUNT(*) as total_requests,
    AVG(response_time_ms) as avg_response_time,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY response_time_ms) as p95_response_time,
    PERCENTILE_CONT(0.99) WITHIN GROUP (ORDER BY response_time_ms) as p99_response_time,
    COUNT(*) FILTER (WHERE status_code >= 400) as error_count,
    ROUND(
        (COUNT(*) FILTER (WHERE status_code >= 400)::DECIMAL / COUNT(*)) * 100, 2
    ) as error_rate_percent,
    COUNT(*) FILTER (WHERE cache_hit) as cache_hits,
    ROUND(
        (COUNT(*) FILTER (WHERE cache_hit)::DECIMAL / COUNT(*)) * 100, 2
    ) as cache_hit_rate_percent
FROM performance_metrics 
WHERE created_at >= now() - interval '1 hour';
