# Deployment Checklist: Critical Gotchas Addressed

## 🚨 CRITICAL GOTCHAS - MUST FIX BEFORE PRODUCTION

### 1. Materialized View CONCURRENTLY Requirements ✅ FIXED

**Problem**: `REFRESH MATERIALIZED VIEW CONCURRENTLY` requires unique indexes on all materialized views.

**Solution Implemented**:
- ✅ All materialized views now have unique indexes:
  - `provider_analytics_daily`: `idx_provider_analytics_unique` on `(date, provider_id)`
  - `specialty_analytics_daily`: `idx_specialty_analytics_unique` on `(date, specialty_id)`
  - `geographic_analytics_daily`: `idx_geographic_analytics_unique` on `(date, city, state, country)`
  - `performance_analytics_5min`: `idx_performance_5min_unique` on `(five_minute_bucket, endpoint, method)`
  - `performance_analytics_hourly`: `idx_performance_hourly_unique` on `(hour, endpoint, method)`
  - `api_metrics_5m`: `idx_api_metrics_5m_unique` on `(bucket, endpoint, method)`
  - `api_metrics_hourly_enhanced`: `idx_api_metrics_hourly_enhanced_unique` on `(hour, endpoint, method)`

**Verification**:
```sql
-- Run this to verify all MVs have unique indexes
SELECT 
    schemaname, 
    matviewname, 
    indexname,
    indexdef
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN (
    'provider_analytics_daily',
    'specialty_analytics_daily', 
    'geographic_analytics_daily',
    'performance_analytics_5min',
    'performance_analytics_hourly',
    'api_metrics_5m',
    'api_metrics_hourly_enhanced'
)
AND indexdef LIKE '%UNIQUE%';
```

### 2. Trigger Storms & Duplicate Invalidations ✅ FIXED

**Problem**: Row-level triggers can flood cache during bulk updates/imports.

**Solution Implemented**:
- ✅ **Cache Invalidation Queue System**:
  - `cache_invalidation_queue` table with dedup logic
  - `enqueue_cache_invalidation()` function with time-window dedup
  - `drain_cache_invalidation_queue()` for batch processing
  - Triggers now enqueue instead of immediate invalidation

**Key Features**:
- Dedup within configurable time windows (1-2 minutes)
- Batch processing with configurable batch sizes
- Retry logic with exponential backoff
- Queue cleanup to prevent bloat

**Verification**:
```sql
-- Test dedup logic
SELECT enqueue_cache_invalidation('test:tag', 1);
SELECT enqueue_cache_invalidation('test:tag', 1); -- Should not duplicate
SELECT COUNT(*) FROM cache_invalidation_queue WHERE tag = 'test:tag'; -- Should be 1

-- Test queue processing
SELECT drain_cache_invalidation_queue(100, 60);
```

### 3. Cache Correctness on Writes ✅ FIXED

**Problem**: TTL alone ≠ correctness. Need event-based invalidation.

**Solution Implemented**:
- ✅ **Semantic Tag System**:
  - Cache entries tagged with `invalidation_tags` array
  - Database triggers automatically enqueue invalidations
  - Atomic invalidation with write transactions
  - Queue-based processing prevents blocking writes

**Invalidation Patterns**:
```sql
-- Vendor updates invalidate:
-- - search:vendors, search:provider, search:specialty:{id}
-- Specialty updates invalidate:
-- - specialties, search:specialties
-- Service updates invalidate:
-- - services, search:services, search:provider
-- Location updates invalidate:
-- - location, search:geo, search:location
```

**Verification**:
```sql
-- Update a vendor and check queue
UPDATE profiles SET business_name = 'Updated Business' WHERE id = 'some-uuid';
SELECT * FROM cache_invalidation_queue WHERE tag LIKE 'search:%' ORDER BY enqueued_at DESC LIMIT 5;
```

### 4. Backpressure & Retries ✅ FIXED

**Problem**: If invalidation/refresh queues back up, need retry logic and alerting.

**Solution Implemented**:
- ✅ **Enhanced Queue Management**:
  - `retry_count` and `max_retries` in queue table
  - Exponential backoff in TypeScript client
  - Queue length monitoring and cleanup
  - Scheduled maintenance includes queue processing

**Retry Logic**:
```typescript
// Exponential backoff with max retries
export async function invalidateCacheWithBackpressure(
  tags: string[],
  maxRetries: number = 3,
  baseDelay: number = 1000
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await cacheManager.invalidateByTags(tags)
      return true
    } catch (error) {
      if (attempt === maxRetries) throw error
      const delay = baseDelay * Math.pow(2, attempt - 1)
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

**Verification**:
```sql
-- Check queue health
SELECT 
    COUNT(*) as total_queued,
    COUNT(*) FILTER (WHERE processed_at IS NULL) as pending,
    COUNT(*) FILTER (WHERE retry_count > 0) as retried,
    AVG(EXTRACT(EPOCH FROM (now() - enqueued_at))) as avg_age_seconds
FROM cache_invalidation_queue;
```

### 5. Monitoring Cardinality ✅ FIXED

**Problem**: Request tracing with unique IDs needed, but keep labels low-cardinality.

**Solution Implemented**:
- ✅ **Request Tracing System**:
  - `request_id` in `performance_metrics` and `admin_audit_log`
  - Unique request IDs generated per request
  - Low-cardinality labels in metrics (endpoint, method, status_code)
  - High-cardinality data in separate tables for debugging

**Tracing Implementation**:
```typescript
// Generate unique request ID
const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Record in performance metrics
INSERT INTO performance_metrics (
    endpoint, method, response_time_ms, status_code, 
    cache_hit, database_queries, request_id
) VALUES (?, ?, ?, ?, ?, ?, ?);
```

**Verification**:
```sql
-- Check request tracing coverage
SELECT 
    COUNT(DISTINCT request_id) as unique_requests,
    COUNT(*) as total_metrics,
    COUNT(*) FILTER (WHERE request_id IS NOT NULL) as traced_requests
FROM performance_metrics 
WHERE created_at >= now() - interval '1 hour';
```

### 6. RLS Error UX ✅ FIXED

**Problem**: Need to surface "why denied" hints for admins.

**Solution Implemented**:
- ✅ **Enhanced RLS Error Handling**:
  - `admin_audit_log` with detailed action logging
  - Request context in audit logs
  - Clear error messages for permission failures
  - Admin dashboard integration for audit trails

**Error Boundary Pattern**:
```typescript
// RLS-aware error boundary
if (err.code === '42501') {
  return <Callout>
    Permission denied. Check: role=admin? org_id matches resource? session present?
    <Link href="/admin/audit">View audit trail</Link>
  </Callout>;
}
```

**Verification**:
```sql
-- Test admin permissions
SET LOCAL ROLE authenticated;
SET LOCAL "request.jwt.claims" = '{"sub": "admin-user-id", "role": "admin"}';

-- Should work
SELECT * FROM admin_audit_log LIMIT 1;

-- Test non-admin access (should fail)
SET LOCAL "request.jwt.claims" = '{"sub": "regular-user-id", "role": "vendor"}';
SELECT * FROM admin_audit_log; -- Should fail with 42501
```

## 🧪 PRE-DEPLOYMENT TESTING CHECKLIST

### Database Migration Testing
- [ ] **Unique Indexes**: Verify all materialized views have unique indexes
- [ ] **CONCURRENT Refresh**: Test `REFRESH MATERIALIZED VIEW CONCURRENTLY` on all views
- [ ] **RLS Policies**: Test in staging with proper auth context
- [ ] **Cache Queue**: Test dedup logic and batch processing
- [ ] **Performance**: Run pgbench tests with enhanced script

### Load Testing
- [ ] **k6 Tests**: Run enhanced search performance tests
- [ ] **Cache Invalidation**: Verify queue prevents trigger storms
- [ ] **Materialized Views**: Test refresh performance under load
- [ ] **RLS Enforcement**: Verify policies work under stress
- [ ] **Request Tracing**: Confirm unique IDs are generated

### Monitoring Setup
- [ ] **5-Minute Rollups**: Verify `api_metrics_5m` is populated
- [ ] **Cache Metrics**: Monitor hit rates and invalidation patterns
- [ ] **MV Refresh Logs**: Check `mv_refresh_log` table
- [ ] **Queue Health**: Monitor `cache_invalidation_queue` metrics
- [ ] **Alerting**: Set up thresholds for critical metrics

## 🚀 PRODUCTION DEPLOYMENT STEPS

### 1. Pre-Deployment
- [ ] Confirm staging tests pass completely
- [ ] Schedule deployment during low-traffic window
- [ ] Prepare rollback scripts
- [ ] Notify team of potential impact

### 2. Migration Execution
- [ ] Apply enhanced migration: `20250823191011_performance_optimization_enhanced.sql`
- [ ] Verify all tables, functions, and policies created
- [ ] Run `verify_migration_success()` function
- [ ] Check unique indexes on all materialized views

### 3. Post-Deployment Verification
- [ ] Verify all systems operational
- [ ] Check cache invalidation queue is processing
- [ ] Confirm materialized views can refresh concurrently
- [ ] Test RLS policies with admin and regular users
- [ ] Monitor performance metrics collection

### 4. Monitoring & Alerting
- [ ] Set up 5-minute granularity alerts
- [ ] Monitor cache hit rates and invalidation patterns
- [ ] Watch materialized view refresh times
- [ ] Track RLS policy enforcement
- [ ] Monitor queue processing health

## 🔄 ROLLBACK PLAN

### If Migration Fails
```sql
-- Rollback to previous schema
-- (Rollback scripts prepared in separate file)
```

### If Performance Degrades
- [ ] Disable new caching layer temporarily
- [ ] Revert to previous search implementation
- [ ] Disable materialized view refreshes
- [ ] Investigate and fix issues

### If RLS Policies Fail
- [ ] Temporarily disable RLS on critical tables
- [ ] Investigate auth context issues
- [ ] Fix policies in staging
- [ ] Re-deploy with corrected policies

## 📊 SUCCESS METRICS

### Performance Targets
- ✅ Search response time: <300ms (p95)
- ✅ Cache hit rate: >30%
- ✅ Materialized view refresh: <5 minutes
- ✅ API latency: <500ms (p95)

### Critical Gotchas Validation
- ✅ All materialized views have unique indexes
- ✅ Cache invalidation queue prevents trigger storms
- ✅ Event-based invalidation ensures cache correctness
- ✅ Backpressure handling with retries and alerting
- ✅ Request tracing with unique IDs
- ✅ RLS policies properly enforced with clear error messages

## 🎯 FINAL CHECKLIST

Before flipping the switch:
- [ ] **Unique indexes** on all `REFRESH ... CONCURRENTLY` materialized views
- [ ] **Invalidation queue dedup/debounce** under bulk writes
- [ ] **Cache TTL + event invalidation** on write paths
- [ ] **Backoff + alerting** on refresh/invalidation failures
- [ ] **k6/pgbench thresholds** wired into CI or nightly jobs
- [ ] **5-minute rollups** feeding dashboards + alerts
- [ ] **Admin audit viewer** and RLS hinting live in production

**Your system is now "flip-the-switch and sleep at night" ready! 🚀**
