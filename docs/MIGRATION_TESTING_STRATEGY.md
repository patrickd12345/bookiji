# Migration Testing Strategy for Performance Optimizations

## Critical RLS Testing Requirements

### Pre-Migration Testing
1. **Staging Environment Setup**
   - Create staging Supabase project with identical schema
   - Load realistic test data (10k+ vendors, 100k+ reviews)
   - Test all RLS policies with various user roles

2. **RLS Policy Validation**
   ```sql
   -- Test admin permissions
   SET LOCAL ROLE authenticated;
   SET LOCAL "request.jwt.claims" = '{"sub": "admin-user-id", "role": "admin"}';
   
   -- Verify admin can access restricted tables
   SELECT * FROM admin_audit_log;
   SELECT * FROM specialty_suggestions;
   
   -- Test non-admin access (should fail)
   SET LOCAL "request.jwt.claims" = '{"sub": "regular-user-id", "role": "vendor"}';
   SELECT * FROM admin_audit_log; -- Should fail
   ```

3. **Auth Context Testing**
   - Test with expired tokens
   - Test with malformed JWT claims
   - Test with missing role information
   - Verify RLS policies fail closed (deny by default)

### Migration Rollback Plan
```sql
-- If RLS policies fail, rollback to previous state
DROP POLICY IF EXISTS "Admins can manage all suggestions" ON specialty_suggestions;
DROP POLICY IF EXISTS "Admins can manage service type proposals" ON service_type_proposals;
DROP POLICY IF EXISTS "Admins can moderate reviews" ON reviews;

-- Restore previous policies
CREATE POLICY "Admins can manage all suggestions" ON specialty_suggestions
    FOR ALL USING (auth.role() = 'admin');
```

## 2. Cache Invalidation Strategy

### Event-Based Cache Invalidation
```typescript
// src/lib/cache/invalidation.ts
export class CacheInvalidationManager {
  private static instance: CacheInvalidationManager;
  private invalidationHooks: Map<string, Set<string>> = new Map();

  static getInstance(): CacheInvalidationManager {
    if (!CacheInvalidationManager.instance) {
      CacheInvalidationManager.instance = new CacheInvalidationManager();
    }
    return CacheInvalidationManager.instance;
  }

  // Register cache keys to invalidate when data changes
  registerInvalidation(dataType: string, cacheKeys: string[]) {
    if (!this.invalidationHooks.has(dataType)) {
      this.invalidationHooks.set(dataType, new Set());
    }
    cacheKeys.forEach(key => this.invalidationHooks.get(dataType)!.add(key));
  }

  // Invalidate cache when data changes
  async invalidateCache(dataType: string, entityId?: string) {
    const keysToInvalidate = this.invalidationHooks.get(dataType) || new Set();
    
    for (const cacheKey of keysToInvalidate) {
      if (entityId && cacheKey.includes(entityId)) {
        await this.clearSpecificCache(cacheKey);
      } else if (!entityId) {
        await this.clearSpecificCache(cacheKey);
      }
    }
  }

  private async clearSpecificCache(cacheKey: string) {
    try {
      await supabase.rpc('clear_cached_query', { cache_key: cacheKey });
      console.log(`Cache invalidated: ${cacheKey}`);
    } catch (error) {
      console.error(`Cache invalidation failed for ${cacheKey}:`, error);
    }
  }
}

// Usage in API endpoints
export async function updateVendorSpecialty(vendorId: string, specialtyId: string) {
  // ... update logic ...
  
  // Invalidate related cache
  const cacheManager = CacheInvalidationManager.getInstance();
  await cacheManager.invalidateCache('vendor_specialties', vendorId);
  await cacheManager.invalidateCache('search_results', vendorId);
}
```

### Cache Invalidation Hooks
```sql
-- Add to migration: cache invalidation triggers
CREATE OR REPLACE FUNCTION invalidate_related_cache()
RETURNS TRIGGER AS $$
BEGIN
  -- Invalidate search cache when vendor data changes
  IF TG_TABLE_NAME = 'profiles' THEN
    PERFORM clear_cached_query_pattern('search:%');
  END IF;
  
  -- Invalidate specialty cache when specialties change
  IF TG_TABLE_NAME = 'specialties' THEN
    PERFORM clear_cached_query_pattern('specialties:%');
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cache invalidation
CREATE TRIGGER cache_invalidation_trigger
  AFTER INSERT OR UPDATE OR DELETE ON profiles
  FOR EACH ROW EXECUTE FUNCTION invalidate_related_cache();
```

## 3. Materialized View Refresh Strategy

### Concurrent Refresh Implementation
```sql
-- Update migration to use CONCURRENT refresh
CREATE OR REPLACE FUNCTION refresh_analytics_views_concurrent()
RETURNS VOID AS $$
BEGIN
  -- Use CONCURRENT refresh to avoid blocking reads
  REFRESH MATERIALIZED VIEW CONCURRENTLY provider_analytics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY specialty_analytics_daily;
  REFRESH MATERIALIZED VIEW CONCURRENTLY geographic_analytics_daily;
  
  -- Log refresh completion
  INSERT INTO admin_audit_log(admin_user_id, action, resource_type)
  VALUES ('00000000-0000-0000-0000-000000000000', 'analytics_refresh', 'materialized_views');
END;
$$ LANGUAGE plpgsql;

-- Create unique indexes required for CONCURRENT refresh
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_provider_analytics_unique 
ON provider_analytics_daily(date, provider_id);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_specialty_analytics_unique 
ON specialty_analytics_daily(date, specialty_id);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_geographic_analytics_unique 
ON geographic_analytics_daily(date, city, state, country);
```

### Smart Refresh Scheduling
```sql
-- Create function to determine if refresh is needed
CREATE OR REPLACE FUNCTION should_refresh_analytics()
RETURNS BOOLEAN AS $$
DECLARE
  last_refresh TIMESTAMPTZ;
  data_freshness TIMESTAMPTZ;
BEGIN
  -- Get last refresh time
  SELECT MAX(created_at) INTO last_refresh
  FROM admin_audit_log 
  WHERE action = 'analytics_refresh';
  
  -- Get data freshness (oldest data point)
  SELECT MIN(created_at) INTO data_freshness
  FROM bookings;
  
  -- Refresh if data is older than 6 hours or if no refresh in 6 hours
  RETURN last_refresh IS NULL 
         OR last_refresh < NOW() - INTERVAL '6 hours'
         OR data_freshness < NOW() - INTERVAL '6 hours';
END;
$$ LANGUAGE plpgsql;
```

## 4. Load Testing Strategy

### k6 Load Test Scripts
```typescript
// tests/load/search-performance.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up
    { duration: '5m', target: 100 }, // Steady load
    { duration: '2m', target: 200 }, // Stress test
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    errors: ['rate<0.1'],             // Error rate under 10%
  },
};

export default function() {
  const searchQueries = [
    'plumber',
    'electrician',
    'house cleaning',
    'landscaping',
    'carpenter'
  ];
  
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const lat = 40.7128 + (Math.random() - 0.5) * 0.1; // NYC area
  const lon = -74.0060 + (Math.random() - 0.5) * 0.1;
  
  const params = {
    query,
    userLat: lat,
    userLon: lon,
    maxTravelDistance: '20',
    limit: '20'
  };
  
  const response = http.get(`/api/search/providers/optimized?${new URLSearchParams(params)}`);
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
    'has providers': (r) => JSON.parse(r.body).providers.length > 0,
  });
  
  errorRate.add(response.status !== 200);
  sleep(1);
}
```

### Database Load Testing
```sql
-- pgbench script for database performance testing
-- tests/load/db-performance.sql

-- Test search function performance
\set search_lat random(40000000, 41000000) / 1000000.0
\set search_lon random(-75000000, -74000000) / 1000000.0
\set radius random(5, 50)

SELECT search_providers_optimized(
  'plumber'::text,
  NULL::uuid[],
  4.0::decimal,
  10000::integer,
  :search_lat::decimal,
  :search_lon::decimal,
  :radius::decimal,
  20::integer,
  0::integer
);

-- Test concurrent searches
\set concurrency 50
\set duration 300
pgbench -f tests/load/db-performance.sql -c :concurrency -t :duration
```

## 5. Enhanced Monitoring Granularity

### Real-Time Performance Monitoring
```typescript
// src/lib/monitoring/realTimeMetrics.ts
export class RealTimeMetricsCollector {
  private static instance: RealTimeMetricsCollector;
  private metricsBuffer: Array<{
    endpoint: string;
    method: string;
    responseTime: number;
    statusCode: number;
    timestamp: number;
  }> = [];
  private flushInterval: NodeJS.Timeout;

  constructor() {
    // Flush metrics every 5 minutes
    this.flushInterval = setInterval(() => {
      this.flushMetrics();
    }, 5 * 60 * 1000);
  }

  recordMetric(endpoint: string, method: string, responseTime: number, statusCode: number) {
    this.metricsBuffer.push({
      endpoint,
      method,
      responseTime,
      statusCode,
      timestamp: Date.now()
    });

    // Flush immediately if buffer is large
    if (this.metricsBuffer.length > 1000) {
      this.flushMetrics();
    }
  }

  private async flushMetrics() {
    if (this.metricsBuffer.length === 0) return;

    const metrics = [...this.metricsBuffer];
    this.metricsBuffer = [];

    try {
      await fetch('/api/analytics/performance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }
}

// Middleware to collect real-time metrics
export function withPerformanceMonitoring(handler: Function) {
  return async (req: NextRequest, ...args: any[]) => {
    const startTime = Date.now();
    
    try {
      const response = await handler(req, ...args);
      
      // Record successful request
      RealTimeMetricsCollector.getInstance().recordMetric(
        req.nextUrl.pathname,
        req.method,
        Date.now() - startTime,
        response.status
      );
      
      return response;
    } catch (error) {
      // Record failed request
      RealTimeMetricsCollector.getInstance().recordMetric(
        req.nextUrl.pathname,
        req.method,
        Date.now() - startTime,
        500
      );
      throw error;
    }
  };
}
```

### 5-Minute Granularity Views
```sql
-- Add to migration: 5-minute granularity views
CREATE MATERIALIZED VIEW IF NOT EXISTS performance_analytics_5min AS
SELECT 
  DATE_TRUNC('minute', created_at) / 5 * 5 as five_minute_bucket,
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
GROUP BY DATE_TRUNC('minute', created_at) / 5 * 5, endpoint, method;

-- Create index for fast queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_performance_5min_bucket 
ON performance_analytics_5min(five_minute_bucket);
```

## 6. Admin UI Audit Log Integration

### Admin Dashboard Audit Log Component
```typescript
// src/components/admin/AuditLogViewer.tsx
export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    action: '',
    resourceType: '',
    dateRange: '24h',
    adminUser: ''
  });

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit-log?' + new URLSearchParams(filters));
      const data = await response.json();
      setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <Select value={filters.action} onValueChange={(value) => setFilters(prev => ({ ...prev, action: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="">All Actions</SelectItem>
            <SelectItem value="suggestion_approved">Suggestion Approved</SelectItem>
            <SelectItem value="suggestion_rejected">Suggestion Rejected</SelectItem>
            <SelectItem value="review_moderated">Review Moderated</SelectItem>
            <SelectItem value="analytics_refresh">Analytics Refresh</SelectItem>
          </SelectContent>
        </Select>
        
        <Button onClick={loadAuditLogs} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Timestamp</TableHead>
              <TableHead>Admin User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Resource</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {auditLogs.map((log) => (
              <TableRow key={log.id}>
                <TableCell>{new Date(log.created_at).toLocaleString()}</TableCell>
                <TableCell>{log.admin_user_id}</TableCell>
                <TableCell>
                  <Badge variant={getActionVariant(log.action)}>
                    {log.action}
                  </Badge>
                </TableCell>
                <TableCell>{log.resource_type}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="sm" onClick={() => showLogDetails(log)}>
                    View Details
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
```

### RLS Error Context in Admin UI
```typescript
// src/components/admin/ErrorBoundary.tsx
export function AdminErrorBoundary({ children }: { children: React.ReactNode }) {
  const [error, setError] = useState<Error | null>(null);
  const [errorContext, setErrorContext] = useState<any>(null);

  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      if (event.error?.message?.includes('permission denied') || 
          event.error?.message?.includes('RLS')) {
        setErrorContext({
          type: 'RLS_POLICY_VIOLATION',
          message: 'Access denied due to Row Level Security policy',
          suggestion: 'Verify your admin role and permissions',
          timestamp: new Date().toISOString()
        });
      }
      setError(event.error);
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  if (error) {
    return (
      <div className="p-6 border border-red-200 rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-800">Access Error</h3>
        <p className="text-red-700 mt-2">{error.message}</p>
        
        {errorContext && (
          <div className="mt-4 p-4 bg-white border rounded">
            <h4 className="font-medium text-gray-900">Error Context</h4>
            <p className="text-sm text-gray-600 mt-1">{errorContext.message}</p>
            <p className="text-sm text-gray-600 mt-1">{errorContext.suggestion}</p>
            <p className="text-xs text-gray-500 mt-2">{errorContext.timestamp}</p>
          </div>
        )}
        
        <Button 
          onClick={() => setError(null)} 
          className="mt-4"
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return children;
}
```

## Migration Execution Checklist

### Pre-Migration
- [ ] Set up staging environment with identical schema
- [ ] Load realistic test data (10k+ vendors, 100k+ reviews)
- [ ] Test all RLS policies with various user roles
- [ ] Run load tests on staging environment
- [ ] Verify cache invalidation works correctly
- [ ] Test materialized view refresh process

### Migration Execution
- [ ] Execute migration during low-traffic window
- [ ] Monitor RLS policy enforcement in real-time
- [ ] Verify admin audit logging is working
- [ ] Test cache invalidation triggers
- [ ] Validate materialized view refresh process

### Post-Migration
- [ ] Run comprehensive load tests
- [ ] Monitor performance metrics at 5-minute granularity
- [ ] Verify admin UI shows audit logs correctly
- [ ] Test RLS error handling in admin interface
- [ ] Validate cache invalidation on data updates

This testing strategy ensures that the performance optimizations don't compromise security or functionality while providing the scalability improvements needed for production use.
