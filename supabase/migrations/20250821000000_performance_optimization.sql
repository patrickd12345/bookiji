-- ======================================================================
-- Performance Optimization & Scalability Migration
-- Migration: 20250821000000_performance_optimization.sql
-- Description: Implements performance optimizations for search, analytics, and admin tools
-- Safe to re-run: uses IF EXISTS checks and idempotent patterns
-- ======================================================================

BEGIN;

-- ========================================
-- 1. GEO-SPATIAL OPTIMIZATIONS
-- ========================================

-- Enable PostGIS extension for advanced geo operations
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create spatial indexes for provider locations
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_locations_geo 
ON provider_locations USING GIST (ST_SetSRID(ST_MakePoint(longitude, latitude), 4326));

-- Create composite indexes for location-based queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_locations_lat_lon 
ON provider_locations(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_locations_city_state 
ON provider_locations(city, state, country) WHERE city IS NOT NULL;

-- Create function for efficient distance calculations
CREATE OR REPLACE FUNCTION calculate_distance_km(
    lat1 DECIMAL, lon1 DECIMAL, 
    lat2 DECIMAL, lon2 DECIMAL
) RETURNS DECIMAL AS $$
BEGIN
    RETURN ST_Distance(
        ST_SetSRID(ST_MakePoint(lon1, lat1), 4326)::geography,
        ST_SetSRID(ST_MakePoint(lon2, lat2), 4326)::geography
    ) / 1000; -- Convert meters to kilometers
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Create function for radius-based searches
CREATE OR REPLACE FUNCTION find_providers_in_radius(
    search_lat DECIMAL, 
    search_lon DECIMAL, 
    radius_km DECIMAL
) RETURNS TABLE(
    provider_id UUID,
    distance_km DECIMAL,
    location_id UUID
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pl.provider_id,
        calculate_distance_km(search_lat, search_lon, pl.latitude, pl.longitude) as distance_km,
        pl.id as location_id
    FROM provider_locations pl
    WHERE ST_DWithin(
        ST_SetSRID(ST_MakePoint(pl.longitude, pl.latitude), 4326)::geography,
        ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography,
        radius_km * 1000 -- Convert km to meters
    )
    AND pl.latitude IS NOT NULL 
    AND pl.longitude IS NOT NULL;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 2. SEARCH PERFORMANCE OPTIMIZATIONS
-- ========================================

-- Create full-text search indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_fts 
ON profiles USING GIN (to_tsvector('english', full_name || ' ' || COALESCE(bio, '') || ' ' || COALESCE(business_name, '')));

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_fts 
ON services USING GIN (to_tsvector('english', name || ' ' || COALESCE(description, '')));

-- Create composite indexes for common search filters
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_search 
ON profiles(user_type, is_active, average_rating, total_bookings) 
WHERE user_type = 'provider' AND is_active = true;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendor_specialties_search 
ON vendor_specialties(specialty_id, is_primary, app_user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_search 
ON services(provider_id, category, available, price_cents);

-- Create function for optimized provider search
CREATE OR REPLACE FUNCTION search_providers_optimized(
    search_query TEXT DEFAULT NULL,
    specialty_ids UUID[] DEFAULT NULL,
    min_rating DECIMAL DEFAULT NULL,
    max_price_cents INTEGER DEFAULT NULL,
    search_lat DECIMAL DEFAULT NULL,
    search_lon DECIMAL DEFAULT NULL,
    radius_km DECIMAL DEFAULT 20,
    limit_count INTEGER DEFAULT 20,
    offset_count INTEGER DEFAULT 0
) RETURNS TABLE(
    provider_id UUID,
    full_name TEXT,
    business_name TEXT,
    average_rating DECIMAL,
    total_bookings INTEGER,
    distance_km DECIMAL,
    min_price_cents INTEGER,
    specialty_names TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    WITH provider_distances AS (
        SELECT 
            p.id as provider_id,
            p.full_name,
            p.business_name,
            p.average_rating,
            p.total_bookings,
            CASE 
                WHEN search_lat IS NOT NULL AND search_lon IS NOT NULL THEN
                    MIN(calculate_distance_km(search_lat, search_lon, pl.latitude, pl.longitude))
                ELSE NULL
            END as distance_km
        FROM profiles p
        LEFT JOIN provider_locations pl ON p.id = pl.provider_id
        WHERE p.user_type = 'provider' 
        AND p.is_active = true
        AND (search_lat IS NULL OR search_lon IS NULL OR 
             ST_DWithin(
                 ST_SetSRID(ST_MakePoint(pl.longitude, pl.latitude), 4326)::geography,
                 ST_SetSRID(ST_MakePoint(search_lon, search_lat), 4326)::geography,
                 radius_km * 1000
             ))
        GROUP BY p.id, p.full_name, p.business_name, p.average_rating, p.total_bookings
    ),
    provider_services AS (
        SELECT 
            pd.provider_id,
            pd.full_name,
            pd.business_name,
            pd.average_rating,
            pd.total_bookings,
            pd.distance_km,
            MIN(s.price_cents) as min_price_cents
        FROM provider_distances pd
        LEFT JOIN services s ON pd.provider_id = s.provider_id
        WHERE s.available = true
        AND (max_price_cents IS NULL OR s.price_cents <= max_price_cents)
        GROUP BY pd.provider_id, pd.full_name, pd.business_name, pd.average_rating, pd.total_bookings, pd.distance_km
    ),
    provider_specialties AS (
        SELECT 
            ps.provider_id,
            ps.full_name,
            ps.business_name,
            ps.average_rating,
            ps.total_bookings,
            ps.distance_km,
            ps.min_price_cents,
            ARRAY_AGG(s.name) as specialty_names
        FROM provider_services ps
        LEFT JOIN vendor_specialties vs ON ps.provider_id = vs.app_user_id
        LEFT JOIN specialties s ON vs.specialty_id = s.id
        WHERE specialty_ids IS NULL OR vs.specialty_id = ANY(specialty_ids)
        GROUP BY ps.provider_id, ps.full_name, ps.business_name, ps.average_rating, ps.total_bookings, ps.distance_km, ps.min_price_cents
    )
    SELECT 
        ps.provider_id,
        ps.full_name,
        ps.business_name,
        ps.average_rating,
        ps.total_bookings,
        ps.distance_km,
        ps.min_price_cents,
        ps.specialty_names
    FROM provider_specialties ps
    WHERE (min_rating IS NULL OR ps.average_rating >= min_rating)
    AND (search_query IS NULL OR 
         to_tsvector('english', ps.full_name || ' ' || COALESCE(ps.business_name, '') || ' ' || array_to_string(ps.specialty_names, ' ')) @@ plainto_tsquery('english', search_query))
    ORDER BY 
        CASE WHEN search_lat IS NOT NULL AND search_lon IS NOT NULL THEN ps.distance_km ELSE 0 END,
        ps.average_rating DESC NULLS LAST,
        ps.total_bookings DESC NULLS LAST
    LIMIT limit_count
    OFFSET offset_count;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 3. ANALYTICS MATERIALIZED VIEWS
-- ========================================

-- Create materialized view for provider analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS provider_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    p.id as provider_id,
    p.full_name,
    p.business_name,
    COUNT(b.id) as total_bookings,
    COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
    SUM(CASE WHEN b.status = 'completed' THEN b.total_amount_cents ELSE 0 END) as total_revenue_cents,
    AVG(CASE WHEN b.status = 'completed' THEN b.total_amount_cents ELSE NULL END) as avg_booking_value_cents,
    COUNT(DISTINCT b.customer_id) as unique_customers
FROM profiles p
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE p.user_type = 'provider'
GROUP BY DATE_TRUNC('day', b.created_at), p.id, p.full_name, p.business_name;

-- Create materialized view for specialty analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS specialty_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    s.id as specialty_id,
    s.name as specialty_name,
    s.path as specialty_path,
    COUNT(b.id) as total_bookings,
    COUNT(DISTINCT b.provider_id) as active_providers,
    COUNT(DISTINCT b.customer_id) as unique_customers,
    SUM(b.total_amount_cents) as total_revenue_cents,
    AVG(b.total_amount_cents) as avg_booking_value_cents
FROM specialties s
LEFT JOIN vendor_specialties vs ON s.id = vs.specialty_id
LEFT JOIN profiles p ON vs.app_user_id = p.id
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE b.status = 'completed'
GROUP BY DATE_TRUNC('day', b.created_at), s.id, s.name, s.path;

-- Create materialized view for geographic analytics
CREATE MATERIALIZED VIEW IF NOT EXISTS geographic_analytics_daily AS
SELECT 
    DATE_TRUNC('day', b.created_at) as date,
    pl.city,
    pl.state,
    pl.country,
    COUNT(b.id) as total_bookings,
    COUNT(DISTINCT b.provider_id) as active_providers,
    COUNT(DISTINCT b.customer_id) as unique_customers,
    SUM(b.total_amount_cents) as total_revenue_cents
FROM provider_locations pl
JOIN profiles p ON pl.provider_id = p.id
LEFT JOIN bookings b ON p.id = b.provider_id
WHERE p.user_type = 'provider' AND b.status = 'completed'
GROUP BY DATE_TRUNC('day', b.created_at), pl.city, pl.state, pl.country;

-- Create function to refresh analytics views
CREATE OR REPLACE FUNCTION refresh_analytics_views()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY specialty_analytics_daily;
    REFRESH MATERIALIZED VIEW CONCURRENTLY geographic_analytics_daily;
END;
$$ LANGUAGE plpgsql;

-- Create indexes on materialized views
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_analytics_date 
ON provider_analytics_daily(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialty_analytics_date 
ON specialty_analytics_daily(date);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_geographic_analytics_date 
ON geographic_analytics_daily(date);

-- ========================================
-- 4. CACHING STRATEGIES
-- ========================================

-- Create cache table for expensive queries
CREATE TABLE IF NOT EXISTS query_cache (
    cache_key TEXT PRIMARY KEY,
    cache_data JSONB NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for cache management
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_expires 
ON query_cache(expires_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_query_cache_created 
ON query_cache(created_at);

-- Create function to manage cache
CREATE OR REPLACE FUNCTION get_cached_query(cache_key TEXT)
RETURNS JSONB AS $$
DECLARE
    cached_data JSONB;
BEGIN
    SELECT cache_data INTO cached_data
    FROM query_cache
    WHERE cache_key = $1
    AND expires_at > NOW();
    
    RETURN cached_data;
END;
$$ LANGUAGE plpgsql STABLE;

CREATE OR REPLACE FUNCTION set_cached_query(
    cache_key TEXT, 
    cache_data JSONB, 
    ttl_minutes INTEGER DEFAULT 15
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO query_cache(cache_key, cache_data, expires_at)
    VALUES($1, $2, NOW() + INTERVAL '1 minute' * $3)
    ON CONFLICT(cache_key) 
    DO UPDATE SET 
        cache_data = EXCLUDED.cache_data,
        expires_at = EXCLUDED.expires_at;
END;
$$ LANGUAGE plpgsql;

-- Create function to clean expired cache
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM query_cache WHERE expires_at <= NOW();
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. PERMISSION HARDENING
-- ========================================

-- Create admin audit log table
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for audit log
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_log_admin 
ON admin_audit_log(admin_user_id, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_admin_audit_log_action 
ON admin_audit_log(action, resource_type, created_at);

-- Create function to log admin actions
CREATE OR REPLACE FUNCTION log_admin_action(
    admin_user_id UUID,
    action TEXT,
    resource_type TEXT,
    resource_id UUID DEFAULT NULL,
    old_values JSONB DEFAULT NULL,
    new_values JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO admin_audit_log(
        admin_user_id, action, resource_type, resource_id, 
        old_values, new_values
    ) VALUES (
        $1, $2, $3, $4, $5, $6
    );
END;
$$ LANGUAGE plpgsql;

-- Create enhanced RLS policies for admin tables
-- Specialty suggestions require admin role
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

-- Service type proposals require admin role
DROP POLICY IF EXISTS "Admins can manage service type proposals" ON service_type_proposals;
CREATE POLICY "Admins can manage service type proposals" ON service_type_proposals
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur 
            JOIN app_users au ON ur.app_user_id = au.id 
            WHERE au.auth_user_id = auth.uid() 
            AND ur.role = 'admin'
        )
    );

-- Reviews moderation requires admin role
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

-- ========================================
-- 6. SPECIALTY TREE OPTIMIZATIONS
-- ========================================

-- Create materialized view for specialty hierarchy
CREATE MATERIALIZED VIEW IF NOT EXISTS specialty_hierarchy AS
WITH RECURSIVE specialty_tree AS (
    -- Root specialties
    SELECT 
        id, name, slug, parent_id, path,
        0 as level,
        ARRAY[name] as breadcrumb,
        ARRAY[id] as ancestor_ids
    FROM specialties 
    WHERE parent_id IS NULL
    
    UNION ALL
    
    -- Child specialties
    SELECT 
        s.id, s.name, s.slug, s.parent_id, s.path,
        st.level + 1,
        st.breadcrumb || s.name,
        st.ancestor_ids || s.id
    FROM specialties s
    JOIN specialty_tree st ON s.parent_id = st.id
)
SELECT * FROM specialty_tree;

-- Create indexes for specialty hierarchy
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialty_hierarchy_level 
ON specialty_hierarchy(level);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialty_hierarchy_ancestors 
ON specialty_hierarchy USING GIN(ancestor_ids);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_specialty_hierarchy_breadcrumb 
ON specialty_hierarchy USING GIN(breadcrumb);

-- Create function to get specialty subtree
CREATE OR REPLACE FUNCTION get_specialty_subtree(
    specialty_id UUID,
    max_depth INTEGER DEFAULT 5
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    slug TEXT,
    parent_id UUID,
    level INTEGER,
    breadcrumb TEXT[],
    is_leaf BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        sh.id,
        sh.name,
        sh.slug,
        sh.parent_id,
        sh.level,
        sh.breadcrumb,
        NOT EXISTS(SELECT 1 FROM specialty_hierarchy sh2 WHERE sh2.parent_id = sh.id) as is_leaf
    FROM specialty_hierarchy sh
    WHERE sh.ancestor_ids @> ARRAY[$1]
    AND sh.level <= $2
    ORDER BY sh.breadcrumb;
END;
$$ LANGUAGE plpgsql STABLE;

-- ========================================
-- 7. MONITORING & PERFORMANCE TRACKING
-- ========================================

-- Create performance metrics table
CREATE TABLE IF NOT EXISTS performance_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint TEXT NOT NULL,
    method TEXT NOT NULL,
    response_time_ms INTEGER NOT NULL,
    status_code INTEGER NOT NULL,
    user_id UUID REFERENCES profiles(id),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance tracking
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_endpoint 
ON performance_metrics(endpoint, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_metrics_response_time 
ON performance_metrics(response_time_ms, created_at);

-- Create materialized view for performance analytics
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
    ) as error_rate_percent
FROM performance_metrics
GROUP BY DATE_TRUNC('hour', created_at), endpoint, method;

-- Create function to clean old performance data
CREATE OR REPLACE FUNCTION clean_old_performance_data(days_to_keep INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM performance_metrics 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. SCHEDULED MAINTENANCE
-- ========================================

-- Create function for scheduled maintenance
CREATE OR REPLACE FUNCTION perform_scheduled_maintenance()
RETURNS VOID AS $$
BEGIN
    -- Refresh analytics views
    PERFORM refresh_analytics_views();
    
    -- Clean expired cache
    PERFORM clean_expired_cache();
    
    -- Clean old performance data (keep 30 days)
    PERFORM clean_old_performance_data(30);
    
    -- Update table statistics
    ANALYZE;
    
    -- Log maintenance completion
    INSERT INTO admin_audit_log(admin_user_id, action, resource_type)
    VALUES ('00000000-0000-0000-0000-000000000000', 'scheduled_maintenance', 'system');
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 9. CREATE INDEXES FOR EXISTING TABLES
-- ========================================

-- Create missing indexes for better query performance
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_provider_status 
ON bookings(provider_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookings_customer_status 
ON bookings(customer_id, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reviews_provider_rating 
ON reviews(provider_id, rating, status, created_at);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_services_provider_category 
ON services(provider_id, category, available);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_availability_slots_provider_date 
ON availability_slots(provider_id, date, start_time, is_booked);

-- ========================================
-- 10. FINAL SETUP
-- ========================================

-- Grant necessary permissions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL MATERIALIZED VIEWS IN SCHEMA public TO authenticated;

-- Create initial cache cleanup schedule (runs every hour)
SELECT cron.schedule(
    'cleanup-expired-cache',
    '0 * * * *', -- Every hour
    'SELECT clean_expired_cache();'
);

-- Create analytics refresh schedule (runs every 6 hours)
SELECT cron.schedule(
    'refresh-analytics-views',
    '0 */6 * * *', -- Every 6 hours
    'SELECT refresh_analytics_views();'
);

-- Create maintenance schedule (runs daily at 2 AM)
SELECT cron.schedule(
    'daily-maintenance',
    '0 2 * * *', -- Daily at 2 AM
    'SELECT perform_scheduled_maintenance();'
);

COMMIT;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check that all indexes were created
SELECT schemaname, tablename, indexname, indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check materialized views
SELECT schemaname, matviewname, definition
FROM pg_matviews 
WHERE schemaname = 'public'
ORDER BY matviewname;

-- Check functions
SELECT routine_name, routine_type, data_type
FROM information_schema.routines 
WHERE routine_schema = 'public'
AND routine_name LIKE '%_optimized' OR routine_name LIKE '%_cache%'
ORDER BY routine_name;
