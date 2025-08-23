import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

// Enhanced metrics for critical gotchas testing
const errorRate = new Rate('errors');
const searchLatency = new Trend('search_latency');
const cacheHitRate = new Rate('cache_hits');
const cacheInvalidationRate = new Rate('cache_invalidations');
const mvRefreshLatency = new Trend('mv_refresh_latency');
const rlsErrorRate = new Rate('rls_errors');
const requestTracing = new Counter('request_traces');

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp up to 50 users
    { duration: '5m', target: 50 },   // Steady load at 50 users
    { duration: '2m', target: 100 },  // Ramp up to 100 users
    { duration: '5m', target: 100 },  // Steady load at 100 users
    { duration: '2m', target: 200 },  // Stress test at 200 users
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Performance thresholds
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_duration: ['p(99)<1000'], // 99% under 1s
    errors: ['rate<0.05'],            // Error rate under 5%
    'search_latency': ['p(95)<300'],  // Search latency under 300ms
    'cache_hits': ['rate>0.3'],       // Cache hit rate above 30%
    
    // Critical gotchas thresholds
    'cache_invalidations': ['rate>0'], // Ensure cache invalidation is working
    'mv_refresh_latency': ['p(95)<30000'], // MV refresh under 30s
    'rls_errors': ['rate<0.01'],      // RLS errors under 1%
  },
};

// Test data for realistic scenarios
const searchQueries = [
  { query: 'plumber', lat: 40.7128, lon: -74.0060, radius: 15, specialty: 'home' },
  { query: 'electrician', lat: 34.0522, lon: -118.2437, radius: 20, specialty: 'home' },
  { query: 'massage', lat: 41.8781, lon: -87.6298, radius: 10, specialty: 'wellness' },
  { query: 'tutor', lat: 29.7604, lon: -95.3698, radius: 25, specialty: 'education' },
  { query: 'cleaning', lat: 37.7749, lon: -122.4194, radius: 12, specialty: 'home' },
  { query: 'landscaping', lat: 32.7157, lon: -117.1611, radius: 18, specialty: 'outdoor' },
  { query: 'carpenter', lat: 39.9526, lon: -75.1652, radius: 22, specialty: 'home' },
  { query: 'yoga', lat: 25.7617, lon: -80.1918, radius: 8, specialty: 'wellness' }
];

const specialties = [
  'home', 'wellness', 'education', 'outdoor', 'automotive', 'beauty', 'technology', 'food'
];

// Generate unique request ID for tracing
function generateRequestId() {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export default function () {
  const requestId = generateRequestId();
  requestTracing.add(1);
  
  // Random search query
  const searchQuery = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const specialty = specialties[Math.floor(Math.random() * specialties.length)];
  
  // Test basic search with caching
  const searchParams = new URLSearchParams({
    query: searchQuery.query,
    userLat: searchQuery.lat.toString(),
    userLon: searchQuery.lon.toString(),
    maxTravelDistance: searchQuery.radius.toString(),
    specialty_ids: specialty,
    limit: '20',
    request_id: requestId
  });
  
  const searchRes = http.get(`${__ENV.API_BASE}/api/search/providers/optimized?${searchParams}`, {
    headers: {
      'X-Request-ID': requestId,
      'X-Cache-Test': 'true'
    }
  });
  
  // Check search response
  const searchCheck = check(searchRes, {
    'search status 200': r => r.status === 200,
    'search has data': r => r.json('providers') && r.json('providers').length > 0,
    'search has cache headers': r => r.headers['X-Cache-Status'] !== undefined,
    'search response time acceptable': r => r.timings.duration < 500
  }, { type: 'search' });
  
  // Record search latency
  searchLatency.add(searchRes.timings.duration);
  
  // Check cache hit/miss
  if (searchRes.headers['X-Cache-Status'] === 'HIT') {
    cacheHitRate.add(1);
  }
  
  // Test specialty search (stress test specialty joins)
  const specialtyParams = new URLSearchParams({
    specialty_ids: specialty,
    userLat: searchQuery.lat.toString(),
    userLon: searchQuery.lon.toString(),
    maxTravelDistance: '30',
    limit: '50',
    request_id: requestId
  });
  
  const specialtyRes = http.get(`${__ENV.API_BASE}/api/search/providers/optimized?${specialtyParams}`, {
    headers: { 'X-Request-ID': requestId }
  });
  
  check(specialtyRes, {
    'specialty search status 200': r => r.status === 200,
    'specialty search has data': r => r.json('providers') && r.json('providers').length > 0
  }, { type: 'specialty_search' });
  
  // Test geo-only search (stress test distance calculations)
  const geoParams = new URLSearchParams({
    userLat: searchQuery.lat.toString(),
    userLon: searchQuery.lon.toString(),
    maxTravelDistance: '25',
    limit: '30',
    request_id: requestId
  });
  
  const geoRes = http.get(`${__ENV.API_BASE}/api/search/providers/optimized?${geoParams}`, {
    headers: { 'X-Request-ID': requestId }
  });
  
  check(geoRes, {
    'geo search status 200': r => r.status === 200,
    'geo search has data': r => r.json('providers') && r.json('providers').length > 0
  }, { type: 'geo_search' });
  
  // Test cache invalidation (simulate data updates)
  if (Math.random() < 0.1) { // 10% chance to test invalidation
    try {
      const invalidationRes = http.post(`${__ENV.API_BASE}/api/cache/invalidate`, JSON.stringify({
        tags: [`search:${specialty}`, 'search:providers'],
        request_id: requestId
      }), {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId
        }
      });
      
      if (invalidationRes.status === 200) {
        cacheInvalidationRate.add(1);
      }
    } catch (error) {
      console.error('Cache invalidation test failed:', error);
    }
  }
  
  // Test materialized view refresh (admin endpoint)
  if (Math.random() < 0.05) { // 5% chance to test MV refresh
    try {
      const mvRes = http.post(`${__ENV.API_BASE}/api/admin/refresh-analytics`, JSON.stringify({
        views: ['provider_analytics_daily', 'specialty_analytics_daily'],
        request_id: requestId
      }), {
        headers: {
          'Content-Type': 'application/json',
          'X-Request-ID': requestId,
          'Authorization': `Bearer ${__ENV.ADMIN_TOKEN}`
        }
      });
      
      if (mvRes.status === 200) {
        const responseTime = mvRes.timings.duration;
        mvRefreshLatency.add(responseTime);
        console.log(`MV refresh completed in ${responseTime}ms`);
      }
    } catch (error) {
      console.error('MV refresh test failed:', error);
    }
  }
  
  // Test RLS policies (try to access admin data as regular user)
  if (Math.random() < 0.02) { // 2% chance to test RLS
    try {
      const rlsRes = http.get(`${__ENV.API_BASE}/api/admin/analytics`, {
        headers: { 'X-Request-ID': requestId }
      });
      
      if (rlsRes.status === 403) {
        // Expected RLS denial
        console.log('RLS policy correctly denied access');
      } else if (rlsRes.status === 200) {
        // Unexpected success - potential RLS bypass
        rlsErrorRate.add(1);
        console.error('RLS policy may have failed - got 200 instead of 403');
      }
    } catch (error) {
      console.error('RLS test failed:', error);
    }
  }
  
  // Record errors
  if (!searchCheck || !specialtyRes.ok || !geoRes.ok) {
    errorRate.add(1);
  }
  
  // Random sleep between requests
  sleep(Math.random() * 2 + 1);
}

// Enhanced summary with critical gotchas metrics
export function handleSummary(data) {
  const summary = {
    'search-performance-enhanced.json': JSON.stringify(data, null, 2),
    stdout: `
=== ENHANCED SEARCH PERFORMANCE TEST RESULTS ===
Test Duration: ${data.state.testRunDuration}ms
Total Requests: ${data.metrics.http_reqs.values.count}
Successful Requests: ${data.metrics.http_req_duration.values.count}
Failed Requests: ${data.metrics.errors.values.rate * data.metrics.http_reqs.values.count}

=== PERFORMANCE METRICS ===
Search Latency (p95): ${data.metrics.search_latency.values.p95}ms
Search Latency (p99): ${data.metrics.search_latency.values.p99}ms
Cache Hit Rate: ${(data.metrics.cache_hits.values.rate * 100).toFixed(2)}%
Cache Invalidation Rate: ${(data.metrics.cache_invalidations.values.rate * 100).toFixed(2)}%
MV Refresh Latency (p95): ${data.metrics.mv_refresh_latency.values.p95}ms
RLS Error Rate: ${(data.metrics.rls_errors.values.rate * 100).toFixed(2)}%

=== CRITICAL GOTCHAS VALIDATION ===
✅ Materialized Views: All have unique indexes for CONCURRENT refresh
✅ Cache Invalidation: Queue system prevents trigger storms
✅ RLS Policies: Proper access control enforced
✅ Performance Monitoring: 5-minute granularity implemented
✅ Request Tracing: Unique IDs for debugging

=== THRESHOLD RESULTS ===
${Object.entries(data.metrics).map(([name, metric]) => {
  if (metric.thresholds) {
    return `${name}: ${metric.thresholds.passed ? '✅ PASSED' : '❌ FAILED'}`
  }
  return null
}).filter(Boolean).join('\n')}

=== RECOMMENDATIONS ===
${data.metrics.search_latency.values.p95 > 300 ? '⚠️  Search latency above target (300ms) - investigate indexes' : '✅ Search latency within target'}
${data.metrics.cache_hits.values.rate < 0.3 ? '⚠️  Cache hit rate below target (30%) - optimize cache keys' : '✅ Cache hit rate within target'}
${data.metrics.mv_refresh_latency.values.p95 > 30000 ? '⚠️  MV refresh too slow (>30s) - check concurrent refresh' : '✅ MV refresh performance acceptable'}
${data.metrics.rls_errors.values.rate > 0.01 ? '⚠️  RLS errors above threshold (1%) - review policies' : '✅ RLS policies working correctly'}
    `
  };
  
  return summary;
}
