import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

const errorRate = new Rate('errors');
const searchLatency = new Trend('search_latency');
const cacheHitRate = new Rate('cache_hits');

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
    http_req_duration: ['p(95)<500'], // 95% under 500ms
    http_req_duration: ['p(99)<1000'], // 99% under 1s
    errors: ['rate<0.05'],            // Error rate under 5%
    'search_latency': ['p(95)<300'],  // Search latency under 300ms
    'cache_hits': ['rate>0.3'],       // Cache hit rate above 30%
  },
};

// Test data for realistic search scenarios
const searchQueries = [
  'plumber',
  'electrician', 
  'house cleaning',
  'landscaping',
  'carpenter',
  'painter',
  'roofer',
  'handyman',
  'gardener',
  'cleaner'
];

const locations = [
  { lat: 40.7128, lon: -74.0060, name: 'New York' },
  { lat: 34.0522, lon: -118.2437, name: 'Los Angeles' },
  { lat: 41.8781, lon: -87.6298, name: 'Chicago' },
  { lat: 29.7604, lon: -95.3698, name: 'Houston' },
  { lat: 39.9526, lon: -75.1652, name: 'Philadelphia' }
];

const specialties = [
  'home-improvement',
  'cleaning',
  'landscaping',
  'electrical',
  'plumbing',
  'painting',
  'roofing',
  'handyman'
];

export default function() {
  // Generate random search parameters
  const query = searchQueries[Math.floor(Math.random() * searchQueries.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  const specialty = specialties[Math.floor(Math.random() * specialties.length)];
  const radius = Math.floor(Math.random() * 30) + 5; // 5-35 km
  
  // Add some randomness to coordinates for realistic distribution
  const lat = location.lat + (Math.random() - 0.5) * 0.1;
  const lon = location.lon + (Math.random() - 0.5) * 0.1;
  
  // Build search parameters
  const params = {
    query,
    userLat: lat.toFixed(6),
    userLon: lon.toFixed(6),
    maxTravelDistance: radius.toString(),
    specialty_ids: specialty,
    min_rating: '4.0',
    limit: '20',
    sort_by: Math.random() > 0.5 ? 'distance' : 'rating'
  };
  
  const startTime = Date.now();
  
  // Make search request
  const response = http.get(`/api/search/providers/optimized?${new URLSearchParams(params)}`);
  
  const endTime = Date.now();
  const latency = endTime - startTime;
  
  // Record metrics
  searchLatency.add(latency);
  errorRate.add(response.status !== 200);
  
  // Check if response indicates cache hit (you might need to add this header in your API)
  const cacheHit = response.headers['X-Cache-Hit'] === 'true';
  cacheHitRate.add(cacheHit);
  
  // Validate response
  const checks = check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => latency < 500,
    'response time < 1s': (r) => latency < 1000,
    'has providers': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.providers && data.providers.length > 0;
      } catch {
        return false;
      }
    },
    'valid response structure': (r) => {
      try {
        const data = JSON.parse(r.body);
        return data.hasOwnProperty('providers') && 
               data.hasOwnProperty('total') && 
               data.hasOwnProperty('pagination');
      } catch {
        return false;
      }
    },
    'cache headers present': (r) => r.headers['X-Cache-Hit'] !== undefined,
  });
  
  // Log errors for debugging
  if (response.status !== 200) {
    console.error(`Search failed: ${response.status} - ${response.body}`);
  }
  
  // Add some think time between requests
  sleep(Math.random() * 2 + 1); // 1-3 seconds
}

export function handleSummary(data) {
  return {
    'search-performance-summary.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: {
        total_requests: data.metrics.http_reqs.values.count,
        total_errors: data.metrics.errors.values.rate * data.metrics.http_reqs.values.count,
        error_rate: data.metrics.errors.values.rate,
        avg_response_time: data.metrics.http_req_duration.values.avg,
        p95_response_time: data.metrics.http_req_duration.values['p(95)'],
        p99_response_time: data.metrics.http_req_duration.values['p(99)'],
        avg_search_latency: data.metrics.search_latency.values.avg,
        p95_search_latency: data.metrics.search_latency.values['p(95)'],
        cache_hit_rate: data.metrics.cache_hits.values.rate,
        requests_per_second: data.metrics.http_reqs.values.rate
      },
      thresholds: {
        response_time_500ms: data.metrics.http_req_duration.values['p(95)'] < 500,
        response_time_1s: data.metrics.http_req_duration.values['p(99)'] < 1000,
        error_rate: data.metrics.errors.values.rate < 0.05,
        search_latency: data.metrics.search_latency.values['p(95)'] < 300,
        cache_hit_rate: data.metrics.cache_hits.values.rate > 0.3
      }
    }, null, 2)
  };
}
