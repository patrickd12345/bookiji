-- ======================================================================
-- Database Performance Testing Script for pgbench
-- Tests the search_providers_optimized function under load
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

-- Test geo-based search
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

-- Test specialty-filtered search
SELECT search_providers_optimized(
    'cleaning'::text,
    ARRAY['00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid],
    :min_rating::decimal,
    :max_price::integer,
    :search_lat::decimal,
    :search_lon::decimal,
    :radius::decimal,
    :limit_count::integer,
    0::integer
);

-- Test cache performance
SELECT get_cached_query('test_cache_key');
SELECT set_cached_query('test_cache_key', '{"test": "data"}'::jsonb, 15, ARRAY['test', 'cache']);

-- Test analytics view refresh (simulate concurrent access)
SELECT COUNT(*) FROM provider_analytics_daily;
SELECT COUNT(*) FROM specialty_analytics_daily;
SELECT COUNT(*) FROM geographic_analytics_daily;

-- Test performance metrics insertion
INSERT INTO performance_metrics (
    endpoint, method, response_time_ms, status_code, 
    cache_hit, database_queries, created_at
) VALUES (
    '/api/search/providers/optimized',
    'GET',
    random(50, 500),
    200,
    random() > 0.5,
    random(1, 10),
    NOW() - (random() * interval '24 hours')
);

-- Test admin audit log access
SELECT COUNT(*) FROM admin_audit_log WHERE action = 'analytics_refresh_complete';
SELECT COUNT(*) FROM admin_audit_log WHERE created_at > NOW() - interval '24 hours';

-- Test cache invalidation
SELECT invalidate_cache_by_tags(ARRAY['search', 'vendor']);
SELECT clean_expired_cache();

-- Test materialized view refresh function
SELECT refresh_analytics_views_concurrent();

-- Test maintenance function
SELECT perform_scheduled_maintenance();

-- Test verification function
SELECT verify_migration_success();
